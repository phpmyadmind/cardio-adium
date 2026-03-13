require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool;

async function initDatabase() {
  const dbName = process.env.DB_NAME?.trim() || 'cardio_adium';
  const connConfig = {
    host: process.env.DB_HOST?.trim() || 'localhost',
    user: process.env.DB_USER?.trim() || 'root',
    password: process.env.DB_PASSWORD?.trim() || '',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    multipleStatements: true,
  };

  const conn = await mysql.createConnection(connConfig);

  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  let schema = fs.readFileSync(schemaPath, 'utf8');
  schema = schema.replace(/cardio_adium/g, dbName);

  await conn.query(schema);
  await conn.end();

  pool = mysql.createPool({
    ...connConfig,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  await runMigrations(pool, dbName);

  console.log(`Base de datos "${dbName}" inicializada correctamente`);
  return pool;
}

async function runMigrations(pool, dbName) {
  const migrationsDir = path.join(__dirname, '../../database/migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        if (stmt) await pool.execute(stmt);
      }
      console.log(`Migración aplicada: ${file}`);
    } catch (err) {
      const isDupColumn = err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060 || (err.message && err.message.includes('Duplicate column'));
      if (isDupColumn) {
        console.log(`Migración ${file}: columna ya existe, omitiendo`);
      } else {
        throw err;
      }
    }
  }
}

const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params || []);
  return rows;
};

const getConnection = () => pool.getConnection();

module.exports = { initDatabase, get pool() { return pool; }, query, getConnection };
