// One shared SQL Server connection pool for the whole application.
// getPool() connects on first use; if the connection fails, the next call retries.
const sql = require('mssql');
const config = require('./env');

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config.db).connect().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close();
    poolPromise = null;
  }
}

module.exports = { sql, getPool, closePool };
