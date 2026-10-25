// Loads environment variables from .env (or .env.test when running tests)
// and fails fast if a required one is missing.
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '../../', envFile), quiet: true });

const required = ['DB_SERVER', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  db: {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT) || 1433,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',                                 // true for Azure SQL
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true', // true for local dev
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
};
