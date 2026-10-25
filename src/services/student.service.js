// Students: list, get, create (password is hashed, never returned)
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { isDuplicateKey } = require('../utils/sqlErrors');

const COLUMNS = 'student_id, name, email, created_at'; // password_hash is deliberately excluded

async function findAll({ page, limit }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('offset', sql.Int, (page - 1) * limit)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT COUNT(*) AS total FROM Students;
      SELECT ${COLUMNS} FROM Students
      ORDER BY student_id
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `);
  return { total: result.recordsets[0][0].total, rows: result.recordsets[1] };
}

async function findById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query(`SELECT ${COLUMNS} FROM Students WHERE student_id = @id`);
  return result.recordset[0] || null;
}

async function create({ name, email, password }) {
  const pool = await getPool();
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.request()
      .input('name', sql.VarChar(100), name)
      .input('email', sql.VarChar(100), email)
      .input('hash', sql.Char(60), passwordHash)
      .query(`INSERT INTO Students (name, email, password_hash)
              OUTPUT INSERTED.student_id
              VALUES (@name, @email, @hash)`);
    return findById(result.recordset[0].student_id);
  } catch (err) {
    if (isDuplicateKey(err)) throw ApiError.conflict(`Email ${email} is already registered`);
    throw err;
  }
}

module.exports = { findAll, findById, create };
