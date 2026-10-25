// Creates the database (if missing) and loads database/schema.sql + database/seed.sql.
// Usage:  npm run db:setup                 (uses .env)
//         NODE_ENV=test npm run db:setup   (uses .env.test)
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const config = require('../src/config/env');

// SQL Server scripts use "GO" to separate batches; the driver needs them run one by one
function readBatches(file) {
  const text = fs.readFileSync(path.join(__dirname, '..', 'database', file), 'utf8');
  return text.split(/^\s*GO\s*$/im).map((batch) => batch.trim()).filter(Boolean);
}

async function setupDatabase() {
  const { database } = config.db;

  // 1. Connect to "master" to create the database itself
  const master = await new sql.ConnectionPool({ ...config.db, database: 'master' }).connect();
  try {
    await master.request()
      .input('name', sql.NVarChar, database)
      .query(`IF DB_ID(@name) IS NULL EXEC('CREATE DATABASE [' + @name + ']')`);
  } finally {
    await master.close();
  }

  // 2. Connect to the app database and run schema + seed
  const pool = await new sql.ConnectionPool(config.db).connect();
  try {
    for (const file of ['schema.sql', 'seed.sql']) {
      for (const batch of readBatches(file)) {
        await pool.request().batch(batch);
      }
    }
  } finally {
    await pool.close();
  }
}

if (require.main === module) {
  setupDatabase()
    .then(() => console.log(`Database "${config.db.database}" is ready (schema + seed loaded)`))
    .catch((err) => {
      console.error('Database setup failed:', err.message);
      process.exit(1);
    });
}

module.exports = setupDatabase;

//this is just for practice 
