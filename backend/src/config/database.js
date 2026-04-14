const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'academia_db',
  user:     process.env.DB_USER     || 'academia_user',
  password: process.env.DB_PASSWORD || 'LocalPass123',
  max:      20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en cliente idle:', err.message);
});

/**
 * Ejecutar query con parámetros
 * @param {string} text
 * @param {Array}  params
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtener cliente para transacciones manuales
 */
const getClient = () => pool.connect();

/**
 * Ejecutar operación dentro de una transacción
 * @param {Function} fn — recibe (client) y debe retornar Promise
 */
const transaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, transaction, pool };
