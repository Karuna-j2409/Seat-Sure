// Courses: listing with live seat counts, and creating new courses
const { sql, getPool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { isDuplicateKey } = require('../utils/sqlErrors');

// LEFT JOIN keeps courses that have zero enrollments.
// COUNT(e.enrollment_id) ignores the NULLs that LEFT JOIN produces, so empty courses count as 0.
const COURSES_WITH_SEATS = `
  SELECT c.course_id,
         c.course_name,
         c.capacity,
         COUNT(e.enrollment_id)              AS enrolled,
         c.capacity - COUNT(e.enrollment_id) AS seats_left
  FROM Courses c
  LEFT JOIN Enrollments e ON e.course_id = c.course_id
`;
const GROUP_BY = 'GROUP BY c.course_id, c.course_name, c.capacity';

async function findAll({ onlyAvailable }) {
  const pool = await getPool();
  const having = onlyAvailable ? 'HAVING c.capacity - COUNT(e.enrollment_id) > 0' : '';
  const result = await pool.request().query(
    `${COURSES_WITH_SEATS} ${GROUP_BY} ${having} ORDER BY c.course_id`
  );
  return result.recordset;
}

async function findById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query(`${COURSES_WITH_SEATS} WHERE c.course_id = @id ${GROUP_BY}`);
  return result.recordset[0] || null;
}

async function create({ course_name, capacity }) {
  const pool = await getPool();
  try {
    const result = await pool.request()
      .input('name', sql.VarChar(100), course_name)
      .input('capacity', sql.Int, capacity)
      .query(`INSERT INTO Courses (course_name, capacity)
              OUTPUT INSERTED.course_id
              VALUES (@name, @capacity)`);
    return findById(result.recordset[0].course_id);
  } catch (err) {
    if (isDuplicateKey(err)) throw ApiError.conflict(`Course "${course_name}" already exists`);
    throw err;
  }
}

module.exports = { findAll, findById, create };
