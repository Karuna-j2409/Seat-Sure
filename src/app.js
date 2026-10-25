// Builds the Express app (without starting it) so tests can import it directly
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const { getPool } = require('./config/db');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// ---- Security & parsing middleware ----
app.use(helmet());                              // secure HTTP headers
app.use(cors({ origin: config.corsOrigin }));   // which websites may call this API
app.use(express.json({ limit: '10kb' }));       // parse JSON, reject huge bodies

if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev')); // request logs
}

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.nodeEnv === 'test',
    message: { success: false, message: 'Too many requests, please try again later' },
  })
);

// ---- Health check (used by monitoring tools / load balancers) ----
app.get('/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'up', uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

// ---- API routes ----
app.use('/api/v1', routes);

// ---- Errors (must be last) ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
