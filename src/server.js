// Entry point: checks the database, starts the HTTP server, shuts down cleanly
const app = require('./app');
const config = require('./config/env');
const { getPool, closePool } = require('./config/db');

async function start() {
  try {
    await getPool();
    console.log(`Connected to SQL Server database "${config.db.database}"`);
  } catch (err) {
    console.error('Could not connect to SQL Server:', err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`SeatSure API running at http://localhost:${config.port} (${config.nodeEnv})`);
  });

  // Graceful shutdown: finish in-flight requests, then close DB connections
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
