// Login for both admins and students. The token's "role" decides what the user may do.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../config/db');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

async function findAccount(email) {
  const pool = await getPool();

  const admin = await pool.request()
    .input('email', sql.VarChar(100), email)
    .query('SELECT admin_id AS id, name, email, password_hash FROM Admins WHERE email = @email');
  if (admin.recordset[0]) return { ...admin.recordset[0], role: 'admin' };

  const student = await pool.request()
    .input('email', sql.VarChar(100), email)
    .query('SELECT student_id AS id, name, email, password_hash FROM Students WHERE email = @email');
  if (student.recordset[0]) return { ...student.recordset[0], role: 'student' };

  return null;
}

async function login(email, password) {
  const account = await findAccount(email);

  // Same message for unknown email and wrong password (prevents user enumeration)
  const passwordOk = account && (await bcrypt.compare(password, account.password_hash));
  if (!passwordOk) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = jwt.sign(
    { sub: account.id, email: account.email, role: account.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    expiresIn: config.jwt.expiresIn,
    user: { id: account.id, name: account.name, email: account.email, role: account.role },
  };
}

module.exports = { login };
