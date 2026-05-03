const { query } = require('../config/database');
const { ok, creado, error, noEncontrado, prohibido } = require('../utils/respuesta');
const { eliminarImagen } = require('../config/cloudinary');

// ─── GET /api/mascotas?ownerId= ───────────────────────────────
async function listarMascotas(req, res, next) {
  try {
    const { ownerId, estado, especie } = req.query;

    const condiciones = [];
    const valores = [];
    let i = 1;

    if (ownerId)  { condiciones.push(`owner_id = $${i++}`); valores.push(ownerId); }
    if (estado)   { condiciones.push(`estado = $${i++}`);   valores.push(estado.toUpperCase()); }
    if (especie)  { condiciones.push(`especie ILIKE $${i++}`); valores.push(`%${especie}%`); }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT m.*, u.nombre_completo AS nombre_duenio, u.foto_perfil_url AS foto_duenio
       FROM mascotas m
       JOIN usuarios u ON u.id = m.owner_id
       ${where}
       ORDER BY m.created_at DESC`,
      valores
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/mascotas/:id ────────────────────────────────────
async function obtenerMascota(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT m.*, u.nombre_completo AS nombre_duenio, u.foto_perfil_url AS foto_duenio
       FROM mascotas m
       JOIN usuarios u ON u.id = m.owner_id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) return noEncontrado(res, 'Mascota');
    return ok(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/mascotas ───────────────────────────────────────
async function crearMascota(req, res, next) {
  try {
    const { nombre, raza, especie, edadAnios, edadMeses, descripcion } = req.body;

    let fotoUrl = null;
    let fotoPublicId = null;
    if (req.file) {
      fotoUrl = req.file.path;
      fotoPublicId = req.file.filename;
    }

    const { rows } = await query(
      `INSERT INTO mascotas (owner_id, nombre, raza, especie, edad_anios, edad_meses, descripcion, foto_url, foto_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.usuario.id, nombre.trim(), raza?.trim() || null, especie.trim(),
       parseInt(edadAnios) || 0, parseInt(edadMeses) || 0,
       descripcion?.trim() || null, fotoUrl, fotoPublicId]
    );

    return creado(res, rows[0], 'Mascota registrada exitosamente.');
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/mascotas/:id ────────────────────────────────────
async function actualizarMascota(req, res, next) {
  try {
    const { id } = req.params;

    // Verificar propiedad
    const { rows: actual } = await query('SELECT owner_id, foto_public_id FROM mascotas WHERE id = $1', [id]);
    if (actual.length === 0) return noEncontrado(res, 'Mascota');
    if (actual[0].owner_id !== req.usuario.id) return prohibido(res);

    const { nombre, raza, especie, edadAnios, edadMeses, descripcion, estado } = req.body;

    let fotoUrl, fotoPublicId;
    if (req.file) {
      if (actual[0].foto_public_id) await eliminarImagen(actual[0].foto_public_id);
      fotoUrl = req.file.path;
      fotoPublicId = req.file.filename;
    }

    const campos = [];
    const valores = [];
    let i = 1;

    if (nombre)     { campos.push(`nombre = $${i++}`);      valores.push(nombre.trim()); }
    if (raza)       { campos.push(`raza = $${i++}`);        valores.push(raza.trim()); }
    if (especie)    { campos.push(`especie = $${i++}`);     valores.push(especie.trim()); }
    if (edadAnios !== undefined) { campos.push(`edad_anios = $${i++}`); valores.push(parseInt(edadAnios) || 0); }
    if (edadMeses !== undefined) { campos.push(`edad_meses = $${i++}`); valores.push(parseInt(edadMeses) || 0); }
    if (descripcion !== undefined) { campos.push(`descripcion = $${i++}`); valores.push(descripcion.trim()); }
    if (estado)     { campos.push(`estado = $${i++}`);      valores.push(estado.toUpperCase()); }
    if (fotoUrl)    { campos.push(`foto_url = $${i++}`);    valores.push(fotoUrl); }
    if (fotoPublicId) { campos.push(`foto_public_id = $${i++}`); valores.push(fotoPublicId); }

    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar.');

    valores.push(id);
    const { rows } = await query(
      `UPDATE mascotas SET ${campos.join(', ')} WHERE id = $${i} RETURNING *`,
      valores
    );

    return ok(res, rows[0], 'Mascota actualizada.');
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/mascotas/:id ─────────────────────────────────
async function eliminarMascota(req, res, next) {
  try {
    const { id } = req.params;

    const { rows } = await query('SELECT owner_id, foto_public_id FROM mascotas WHERE id = $1', [id]);
    if (rows.length === 0) return noEncontrado(res, 'Mascota');
    if (rows[0].owner_id !== req.usuario.id) return prohibido(res);

    if (rows[0].foto_public_id) await eliminarImagen(rows[0].foto_public_id);

    await query('DELETE FROM mascotas WHERE id = $1', [id]);
    return ok(res, null, 'Mascota eliminada.');
  } catch (err) {
    next(err);
  }
}

module.exports = { listarMascotas, obtenerMascota, crearMascota, actualizarMascota, eliminarMascota };