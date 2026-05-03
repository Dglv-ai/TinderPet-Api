const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { ok, error, noEncontrado, prohibido } = require('../utils/respuesta');
const { eliminarImagen, extraerPublicId } = require('../config/cloudinary');
const { parsearPaginacion, metaPaginacion } = require('../utils/paginacion');

// ─── GET /api/usuarios/:id ────────────────────────────────────
async function obtenerPerfil(req, res, next) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT
         u.id, u.nombre_completo, u.email, u.foto_perfil_url,
         u.ciudad, u.rol, u.puntos, u.created_at,
         COUNT(DISTINCT s1.seguidor_id) AS conteo_seguidores,
         COUNT(DISTINCT s2.seguido_id)  AS conteo_siguiendo,
         COUNT(DISTINCT p.id)           AS conteo_publicaciones
       FROM usuarios u
       LEFT JOIN seguidores s1 ON s1.seguido_id  = u.id
       LEFT JOIN seguidores s2 ON s2.seguidor_id = u.id
       LEFT JOIN publicaciones p ON p.autor_id   = u.id
       WHERE u.id = $1 AND u.activo = TRUE
       GROUP BY u.id`,
      [id]
    );

    if (rows.length === 0) return noEncontrado(res, 'Usuario');

    // ¿El usuario autenticado ya sigue a este perfil?
    let sigo = false;
    if (req.usuario) {
      const { rows: r } = await query(
        'SELECT 1 FROM seguidores WHERE seguidor_id = $1 AND seguido_id = $2',
        [req.usuario.id, id]
      );
      sigo = r.length > 0;
    }

    return ok(res, { ...rows[0], sigo });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/usuarios/:id ────────────────────────────────────
async function actualizarPerfil(req, res, next) {
  try {
    const { id } = req.params;

    if (req.usuario.id !== id) return prohibido(res);

    const { nombreCompleto, ciudad } = req.body;

    // Manejo de imagen nueva
    let fotoUrl = undefined;
    let fotoPublicId = undefined;

    if (req.file) {
      // Eliminar foto anterior si existe
      const { rows: actual } = await query(
        'SELECT foto_perfil_public_id FROM usuarios WHERE id = $1', [id]
      );
      if (actual[0]?.foto_perfil_public_id) {
        await eliminarImagen(actual[0].foto_perfil_public_id);
      }
      fotoUrl = req.file.path;
      fotoPublicId = req.file.filename;
    }

    const campos = [];
    const valores = [];
    let i = 1;

    if (nombreCompleto) { campos.push(`nombre_completo = $${i++}`); valores.push(nombreCompleto.trim()); }
    if (ciudad)         { campos.push(`ciudad = $${i++}`);          valores.push(ciudad.trim()); }
    if (fotoUrl)        { campos.push(`foto_perfil_url = $${i++}`); valores.push(fotoUrl); }
    if (fotoPublicId)   { campos.push(`foto_perfil_public_id = $${i++}`); valores.push(fotoPublicId); }

    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar.');

    valores.push(id);
    const { rows } = await query(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${i}
       RETURNING id, nombre_completo, email, foto_perfil_url, ciudad, rol, puntos`,
      valores
    );

    return ok(res, rows[0], 'Perfil actualizado.');
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/usuarios/:id/seguir ───────────────────────────
async function seguir(req, res, next) {
  try {
    const { id } = req.params;      // a quién seguir
    const miId = req.usuario.id;

    if (miId === id) return error(res, 'No puedes seguirte a ti mismo.');

    // Verificar que el usuario objetivo existe
    const { rows: objetivo } = await query('SELECT id FROM usuarios WHERE id = $1 AND activo = TRUE', [id]);
    if (objetivo.length === 0) return noEncontrado(res, 'Usuario');

    await query(
      'INSERT INTO seguidores (seguidor_id, seguido_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [miId, id]
    );

    return ok(res, null, 'Ahora sigues a este usuario.');
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/usuarios/:id/seguir ─────────────────────────
async function dejarDeSeguir(req, res, next) {
  try {
    const { id } = req.params;
    await query('DELETE FROM seguidores WHERE seguidor_id = $1 AND seguido_id = $2', [req.usuario.id, id]);
    return ok(res, null, 'Dejaste de seguir a este usuario.');
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/usuarios/:id/seguidores ─────────────────────────
async function obtenerSeguidores(req, res, next) {
  try {
    const { id } = req.params;
    const { pagina, limite, offset } = parsearPaginacion(req.query);

    const [{ rows }, { rows: total }] = await Promise.all([
      query(
        `SELECT u.id, u.nombre_completo, u.foto_perfil_url, u.ciudad
         FROM seguidores s JOIN usuarios u ON u.id = s.seguidor_id
         WHERE s.seguido_id = $1 AND u.activo = TRUE
         ORDER BY s.created_at DESC
         LIMIT $2 OFFSET $3`,
        [id, limite, offset]
      ),
      query('SELECT COUNT(*) FROM seguidores WHERE seguido_id = $1', [id])
    ]);

    return ok(res, { seguidores: rows, paginacion: metaPaginacion(total[0].count, pagina, limite) });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/usuarios/buscar?q= ─────────────────────────────
async function buscarUsuarios(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return error(res, 'El término de búsqueda debe tener al menos 2 caracteres.');

    const { pagina, limite, offset } = parsearPaginacion(req.query);

    const termino = `%${q}%`;

    const [{ rows }, { rows: total }] = await Promise.all([
      query(
        `SELECT id, nombre_completo, foto_perfil_url, ciudad, rol
         FROM usuarios
         WHERE activo = TRUE AND (nombre_completo ILIKE $1 OR email ILIKE $1)
         ORDER BY nombre_completo
         LIMIT $2 OFFSET $3`,
        [termino, limite, offset]
      ),
      query(
        `SELECT COUNT(*) FROM usuarios WHERE activo = TRUE AND (nombre_completo ILIKE $1 OR email ILIKE $1)`,
        [termino]
      )
    ]);

    return ok(res, { usuarios: rows, paginacion: metaPaginacion(total[0].count, pagina, limite) });
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenerPerfil, actualizarPerfil, seguir, dejarDeSeguir, obtenerSeguidores, buscarUsuarios };