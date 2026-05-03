const { query } = require('../config/database');
const { ok, noEncontrado } = require('../utils/respuesta');

// ─── GET /api/veterinarias ────────────────────────────────────
async function listarVeterinarias(req, res, next) {
  try {
    const { tipo } = req.query;

    let sql = 'SELECT * FROM veterinarias';
    const valores = [];

    if (tipo) {
      sql += ' WHERE tipo = $1';
      valores.push(tipo.toUpperCase());
    }

    sql += ' ORDER BY rating DESC, nombre ASC';

    const { rows } = await query(sql, valores);
    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/veterinarias/:id ────────────────────────────────
async function obtenerVeterinaria(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM veterinarias WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return noEncontrado(res, 'Veterinaria');
    return ok(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listarVeterinarias, obtenerVeterinaria };