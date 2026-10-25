// Authentication (who are you?) and authorization (what are you allowed to do?)
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

// Requires a valid JWT:  Authorization: Bearer <token>
function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Authentication token is missing'));
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret); // { sub, email, role }
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

// Allows only the listed roles, e.g. authorize('admin')
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden());
  }
  next();
};

// Admins can act on any student; a student can act only on their own :id
function selfOrAdmin(req, res, next) {
  const { role, sub } = req.user;
  if (role === 'admin' || (role === 'student' && sub === Number(req.params.id))) {
    return next();
  }
  next(ApiError.forbidden('Students can only access their own records'));
}

module.exports = { authenticate, authorize, selfOrAdmin };
