const authService = require('../services/auth.service');

// POST /api/v1/auth/login
async function login(req, res) {
  const { email, password } = req.validated.body;
  const data = await authService.login(email, password);
  res.status(200).json({ success: true, message: 'Login successful', data });
}

module.exports = { login };
