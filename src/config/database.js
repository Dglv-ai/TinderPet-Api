const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

/**
 * Ejecuta una query con parámetros opcionales.
 * Uso: const { rows } = await query('SELECT * FROM usuarios WHERE id = $1', [id]);
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    const duracion = Date.now() - start;
    console.log(`  📦 query [${duracion}ms]:`, text.slice(0, 80));
  }
  return result;
}

/**
 * Obtiene un cliente del pool para transacciones manuales.
 * Recuerda llamar client.release() al terminar.
 */
async function getClient() {
  return pool.connect();
}

/**
 * Verifica la conexión al arrancar el servidor.
 */
async function testConnection() {
  try {
    const { rows } = await query('SELECT NOW() as ahora');
    console.log(`✅ PostgreSQL conectado — ${rows[0].ahora}`);
  } catch (err) {
    console.error('❌ No se pudo conectar a PostgreSQL:', err.message);
   // process.exit(1);
  }
}

module.exports = { query, getClient, testConnection };  