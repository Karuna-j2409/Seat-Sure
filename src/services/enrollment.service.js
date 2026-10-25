// Enrollments: the core business logic (seat limits + no duplicates), done inside a transaction
const { sql, getPool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { isDuplicateKey } = require('../utils/sqlErrors');

async function findByStudent(studentId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('sid', sql.Int, studentId)
    .query(`
      SELECT e.enrollment_id, c.course_id, c.course_name, e.enrolled_on
      FROM Enrollments e
      INNER JOIN Courses c ON c.course_id = e.course_id
      WHERE e.student_id = @sid
      ORDER BY e.enrolled_on, e.enrollment_id
    `);
  return result.recordset;
}

/**
 * Enrolls a student in a course.
 * All checks and the INSERT run in ONE transaction, and the course row is locked
 * (UPDLOCK, HOLDLOCK) so two students can never take the same last seat.
 */
async function enroll(studentId, courseId) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  // Every query inside the transaction must use a Request bound to it
  const query = (text, params = {}) => {
    const request = new sql.Request(transaction);
    Object.entries(params).forEach(([name, value]) => request.input(name, sql.Int, value));
    return request.query(text);
  };

  try {
    // 1. Student must exist
    const student = await query('SELECT student_id FROM Students WHERE student_id = @sid', { sid: studentId });
    if (student.recordset.length === 0) throw ApiError.notFound(`Student ${studentId} not found`);

    // 2. Lock the course row: concurrent enrollments for THIS course now wait in line
    const course = await query(
      'SELECT course_name, capacity FROM Courses WITH (UPDLOCK, HOLDLOCK) WHERE course_id = @cid',
      { cid: courseId }
    );
    if (course.recordset.length === 0) throw ApiError.notFound(`Course ${courseId} not found`);
    const { course_name: courseName, capacity } = course.recordset[0];

    // 3. No duplicate enrollment
    const existing = await query(
      'SELECT 1 FROM Enrollments WHERE student_id = @sid AND course_id = @cid',
      { sid: studentId, cid: courseId }
    );
    if (existing.recordset.length > 0) {
      throw ApiError.conflict(`Student ${studentId} is already enrolled in ${courseName}`);
    }

    // 4. Seat available?
    const count = await query('SELECT COUNT(*) AS enrolled FROM Enrollments WHERE course_id = @cid', { cid: courseId });
    const { enrolled } = count.recordset[0];
    if (enrolled >= capacity) {
      throw ApiError.conflict(`${courseName} is full (${enrolled}/${capacity} seats taken)`);
    }

    // 5. All checks passed
    const inserted = await query(
      `INSERT INTO Enrollments (student_id, course_id)
       OUTPUT INSERTED.enrollment_id, INSERTED.enrolled_on
       VALUES (@sid, @cid)`,
      { sid: studentId, cid: courseId }
    );

    await transaction.commit();

    return {
      enrollment_id: inserted.recordset[0].enrollment_id,
      student_id: studentId,
      course_id: courseId,
      course_name: courseName,
      enrolled_on: inserted.recordset[0].enrolled_on,
      seats_left: capacity - enrolled - 1,
    };
  } catch (err) {
    await transaction.rollback().catch(() => {}); // releases the lock; ignore if already aborted
    if (isDuplicateKey(err)) throw ApiError.conflict('Student is already enrolled in this course');
    throw err;
  }
}

// A single DELETE statement is already atomic, so no explicit transaction is needed
async function cancel(studentId, courseId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('sid', sql.Int, studentId)
    .input('cid', sql.Int, courseId)
    .query('DELETE FROM Enrollments WHERE student_id = @sid AND course_id = @cid');
  return result.rowsAffected[0] > 0;
}

module.exports = { findByStudent, enroll, cancel };
