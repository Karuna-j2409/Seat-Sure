// Integration tests: real Express app + real SQL Server test database (seatsure_test)
const request = require('supertest');
const app = require('../src/app');
const { closePool } = require('../src/config/db');
const setupDatabase = require('../scripts/setup-db');

const API = '/api/v1';
const tokens = {};

async function login(email, password) {
  const res = await request(app).post(`${API}/auth/login`).send({ email, password });
  return res.body.data.token;
}

const as = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

beforeAll(async () => {
  await setupDatabase(); // fresh schema + seed before the suite
  tokens.admin = await login('admin@seatsure.edu', 'Admin@123');
  tokens.karuna = await login('karuna.sharma@college.edu', 'Student@123'); // student 1
  tokens.diya = await login('diya.iyer@college.edu', 'Student@123');       // student 3
});

afterAll(async () => {
  await closePool();
});

describe('Health check', () => {
  test('GET /health reports the database is up', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('up');
  });
});

describe('Authentication & authorization', () => {
  test('admin login returns role "admin"', async () => {
    const res = await request(app).post(`${API}/auth/login`).send({ email: 'admin@seatsure.edu', password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  test('student login returns role "student"', async () => {
    const res = await request(app).post(`${API}/auth/login`).send({ email: 'diya.iyer@college.edu', password: 'Student@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('student');
  });

  test('wrong password returns 401', async () => {
    const res = await request(app).post(`${API}/auth/login`).send({ email: 'admin@seatsure.edu', password: 'nope' });
    expect(res.status).toBe(401);
  });

  test('protected route without a token returns 401', async () => {
    const res = await request(app).get(`${API}/students`);
    expect(res.status).toBe(401);
  });

  test('student cannot list all students (403)', async () => {
    const res = await request(app).get(`${API}/students`).set(as('diya'));
    expect(res.status).toBe(403);
  });

  test("student cannot view another student's enrollments (403)", async () => {
    const res = await request(app).get(`${API}/students/1/enrollments`).set(as('diya'));
    expect(res.status).toBe(403);
  });

  test('student cannot create a course (403)', async () => {
    const res = await request(app).post(`${API}/courses`).set(as('diya')).send({ course_name: 'Hack 101', capacity: 5 });
    expect(res.status).toBe(403);
  });
});

describe('Courses', () => {
  test('GET /courses lists all courses with seat counts (public)', async () => {
    const res = await request(app).get(`${API}/courses`);
    expect(res.status).toBe(200);
    const cloud = res.body.data.find((c) => c.course_name === 'Cloud Computing Lab');
    const ml = res.body.data.find((c) => c.course_name === 'Machine Learning Basics');
    expect(cloud).toMatchObject({ capacity: 2, enrolled: 2, seats_left: 0 });
    expect(ml).toMatchObject({ enrolled: 0, seats_left: 25 }); // LEFT JOIN keeps empty courses
  });

  test('GET /courses?available=true hides full courses', async () => {
    const res = await request(app).get(`${API}/courses?available=true`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.course_name)).not.toContain('Cloud Computing Lab');
    expect(res.body.data.every((c) => c.seats_left > 0)).toBe(true);
  });

  test('GET /courses?available=maybe returns 400', async () => {
    const res = await request(app).get(`${API}/courses?available=maybe`);
    expect(res.status).toBe(400);
  });

  test('GET /courses/3 returns one course', async () => {
    const res = await request(app).get(`${API}/courses/3`);
    expect(res.status).toBe(200);
    expect(res.body.data.course_name).toBe('Cloud Computing Lab');
  });

  test('GET /courses/999 returns 404', async () => {
    const res = await request(app).get(`${API}/courses/999`);
    expect(res.status).toBe(404);
  });

  test('admin creates a course (201)', async () => {
    const res = await request(app)
      .post(`${API}/courses`)
      .set(as('admin'))
      .send({ course_name: 'Cyber Security Essentials', capacity: 20 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ course_id: 5, capacity: 20, enrolled: 0, seats_left: 20 });
  });

  test('duplicate course name returns 409', async () => {
    const res = await request(app)
      .post(`${API}/courses`)
      .set(as('admin'))
      .send({ course_name: 'Cloud Computing Lab', capacity: 10 });
    expect(res.status).toBe(409);
  });

  test('invalid capacity returns 400', async () => {
    const res = await request(app).post(`${API}/courses`).set(as('admin')).send({ course_name: 'Zero', capacity: 0 });
    expect(res.status).toBe(400);
  });
});

describe('Students', () => {
  test('admin lists students with pagination, without password hashes', async () => {
    const res = await request(app).get(`${API}/students?page=1&limit=2`).set(as('admin'));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect(res.body.data[0]).not.toHaveProperty('password_hash');
  });

  test('admin creates a student (201) who can then log in', async () => {
    const res = await request(app)
      .post(`${API}/students`)
      .set(as('admin'))
      .send({ name: 'Neha Joshi', email: 'Neha.Joshi@college.edu', password: 'Neha@2026' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ student_id: 5, email: 'neha.joshi@college.edu' });
    expect(res.body.data).not.toHaveProperty('password_hash');

    tokens.neha = await login('neha.joshi@college.edu', 'Neha@2026');
    expect(tokens.neha).toEqual(expect.any(String));
  });

  test('duplicate email returns 409', async () => {
    const res = await request(app)
      .post(`${API}/students`)
      .set(as('admin'))
      .send({ name: 'Copy', email: 'karuna.sharma@college.edu', password: 'Copy@2026' });
    expect(res.status).toBe(409);
  });

  test('weak password returns 400', async () => {
    const res = await request(app)
      .post(`${API}/students`)
      .set(as('admin'))
      .send({ name: 'Weak', email: 'weak@college.edu', password: 'short' });
    expect(res.status).toBe(400);
  });

  test('student can view their own profile', async () => {
    const res = await request(app).get(`${API}/students/3`).set(as('diya'));
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Diya Iyer');
  });

  test('admin gets 404 for a missing student', async () => {
    const res = await request(app).get(`${API}/students/999`).set(as('admin'));
    expect(res.status).toBe(404);
  });
});

describe('Enrollment rules', () => {
  test('student enrolls themself (201) and seats_left decreases', async () => {
    const res = await request(app).post(`${API}/students/3/enrollments`).set(as('diya')).send({ course_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.seats_left).toBe(28);
  });

  test('duplicate enrollment returns 409', async () => {
    const res = await request(app).post(`${API}/students/3/enrollments`).set(as('diya')).send({ course_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already enrolled/);
  });

  test('enrolling in a full course returns 409', async () => {
    const res = await request(app).post(`${API}/students/4/enrollments`).set(as('admin')).send({ course_id: 3 });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/full/);
  });

  test('student cannot enroll someone else (403)', async () => {
    const res = await request(app).post(`${API}/students/4/enrollments`).set(as('diya')).send({ course_id: 2 });
    expect(res.status).toBe(403);
  });

  test('missing course_id returns 400', async () => {
    const res = await request(app).post(`${API}/students/3/enrollments`).set(as('diya')).send({});
    expect(res.status).toBe(400);
  });

  test('unknown course returns 404', async () => {
    const res = await request(app).post(`${API}/students/3/enrollments`).set(as('diya')).send({ course_id: 999 });
    expect(res.status).toBe(404);
  });

  test('admin enrolling an unknown student returns 404', async () => {
    const res = await request(app).post(`${API}/students/999/enrollments`).set(as('admin')).send({ course_id: 1 });
    expect(res.status).toBe(404);
  });

  test("student views their own courses (INNER JOIN)", async () => {
    const res = await request(app).get(`${API}/students/1/enrollments`).set(as('karuna'));
    expect(res.status).toBe(200);
    expect(res.body.data.total_courses).toBe(2);
    expect(res.body.data.courses.map((c) => c.course_name)).toEqual([
      'Full Stack Web Development',
      'Cloud Computing Lab',
    ]);
  });

  test('student cancels their enrollment and the seat is released', async () => {
    const res = await request(app).delete(`${API}/students/1/enrollments/3`).set(as('karuna'));
    expect(res.status).toBe(200);

    const course = await request(app).get(`${API}/courses/3`);
    expect(course.body.data.seats_left).toBe(1);
  });

  test('cancelling a non-existent enrollment returns 404', async () => {
    const res = await request(app).delete(`${API}/students/1/enrollments/3`).set(as('karuna'));
    expect(res.status).toBe(404);
  });

  test('new student enrolls in the new course', async () => {
    const res = await request(app).post(`${API}/students/5/enrollments`).set(as('neha')).send({ course_id: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.seats_left).toBe(19);
  });
});

describe('Concurrency: transaction + row lock', () => {
  test('4 simultaneous requests for the LAST seat -> exactly one succeeds', async () => {
    // Cloud Computing Lab currently has 1 seat left (Karuna cancelled above).
    // Students 1, 3, 4 and 5 are not enrolled in it; all four try at the same instant.
    const results = await Promise.all(
      [1, 3, 4, 5].map((studentId) =>
        request(app).post(`${API}/students/${studentId}/enrollments`).set(as('admin')).send({ course_id: 3 })
      )
    );
    const statuses = results.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(3);

    const course = await request(app).get(`${API}/courses/3`);
    expect(course.body.data).toMatchObject({ enrolled: 2, seats_left: 0 }); // never over capacity
  });
});

describe('Unknown routes', () => {
  test('returns 404 JSON', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
