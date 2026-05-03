const { query } = require('../config/database');
const { ok, creado, error, noEncontrado, prohibido, paginado } = require('../utils/respuesta');
const { parsearPaginacion, metaPaginacion } = require('../utils/paginacion');
const { eliminarImagen } = require('../config/cloudinary');

// ─── GET /api/publicaciones ───────────────────────────────────
// Feed paginado con filtros opcionales: categoria, autorId
async function listarPublicaciones(req, res, next) {
  try {
    const { pagina, limite, offset } = parsearPaginacion(req.query);
    const { categoria, autorId } = req.query;
    const usuarioActualId = req.usuario?.id || null;

    const condiciones = [];
    const valores = [];
    let i = 1;

    if (categoria) { condiciones.push(`p.categoria = $${i++}`); valores.push(categoria.toUpperCase()); }
    if (autorId)   { condiciones.push(`p.autor_id = $${i++}`); valores.push(autorId); }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Query principal con me_gusta activo para el usuario actual
    const sqlPublicaciones = `
      SELECT
        p.id,
        p.autor_id,
        u.nombre_completo       AS nombre_autor,
        u.foto_perfil_url       AS foto_perfil_autor_url,
        p.mascota_id,
        m.nombre                AS nombre_mascota,
        p.imagen_url,
        p.descripcion_texto,
        p.categoria,
        p.ubicacion_referencia,
        p.telefono_autor,
        p.fecha_publicacion,
        COUNT(DISTINCT mg.usuario_id)  AS conteo_me_gusta,
        COUNT(DISTINCT c.id)           AS conteo_comentarios,
        BOOL_OR(mg.usuario_id = $${i}) AS me_gusta_activo
      FROM publicaciones p
      JOIN usuarios u     ON u.id = p.autor_id
      LEFT JOIN mascotas m ON m.id = p.mascota_id
      LEFT JOIN me_gusta mg ON mg.publicacion_id = p.id
      LEFT JOIN comentarios c ON c.publicacion_id = p.id
      ${where}
      GROUP BY p.id, u.nombre_completo, u.foto_perfil_url, m.nombre
      ORDER BY p.fecha_publicacion DESC
      LIMIT $${i + 1} OFFSET $${i + 2}
    `;

    const sqlTotal = `SELECT COUNT(*) FROM publicaciones p ${where}`;

    valores.push(usuarioActualId);  // para BOOL_OR
    const valoresConPag = [...valores, limite, offset];
    const valoresSinPag = valores.slice(0, -1); // sin usuarioActualId para el count

    const [{ rows }, { rows: total }] = await Promise.all([
      query(sqlPublicaciones, valoresConPag),
      query(sqlTotal, valoresSinPag)
    ]);

    return paginado(res, rows, metaPaginacion(total[0].count, pagina, limite));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/publicaciones/:id ───────────────────────────────
async function obtenerPublicacion(req, res, next) {
  try {
    const { id } = req.params;
    const usuarioActualId = req.usuario?.id || null;

    const { rows } = await query(
      `SELECT
         p.id, p.autor_id,
         u.nombre_completo AS nombre_autor, u.foto_perfil_url AS foto_perfil_autor_url,
         p.mascota_id, m.nombre AS nombre_mascota,
         p.imagen_url, p.descripcion_texto, p.categoria,
         p.ubicacion_referencia, p.telefono_autor, p.fecha_publicacion,
         COUNT(DISTINCT mg.usuario_id) AS conteo_me_gusta,
         COUNT(DISTINCT c.id) AS conteo_comentarios,
         BOOL_OR(mg.usuario_id = $2) AS me_gusta_activo
       FROM publicaciones p
       JOIN usuarios u ON u.id = p.autor_id
       LEFT JOIN mascotas m ON m.id = p.mascota_id
       LEFT JOIN me_gusta mg ON mg.publicacion_id = p.id
       LEFT JOIN comentarios c ON c.publicacion_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.nombre_completo, u.foto_perfil_url, m.nombre`,
      [id, usuarioActualId]
    );

    if (rows.length === 0) return noEncontrado(res, 'Publicación');
    return ok(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/publicaciones ──────────────────────────────────
async function crearPublicacion(req, res, next) {
  try {
    const { mascotaId, descripcionTexto, categoria, ubicacionReferencia, telefonoAutor } = req.body;

    let imagenUrl = null;
    let imagenPublicId = null;
    if (req.file) {
      imagenUrl = req.file.path;
      imagenPublicId = req.file.filename;
    }

    // Validar que si categoria es LOST o FOUND, debe haber descripción
    const cat = (categoria || 'NORMAL').toUpperCase();
    if ((cat === 'LOST' || cat === 'FOUND') && !descripcionTexto && !imagenUrl) {
      return error(res, 'Las publicaciones de tipo LOST/FOUND requieren descripción o imagen.');
    }

    const { rows } = await query(
      `INSERT INTO publicaciones
         (autor_id, mascota_id, imagen_url, imagen_public_id, descripcion_texto,
          categoria, ubicacion_referencia, telefono_autor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.usuario.id, mascotaId || null, imagenUrl, imagenPublicId,
       descripcionTexto?.trim() || null, cat,
       ubicacionReferencia?.trim() || null, telefonoAutor?.trim() || null]
    );

    return creado(res, rows[0], 'Publicación creada.');
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/publicaciones/:id ───────────────────────────
async function eliminarPublicacion(req, res, next) {
  try {
    const { id } = req.params;

    const { rows } = await query(
      'SELECT autor_id, imagen_public_id FROM publicaciones WHERE id = $1', [id]
    );
    if (rows.length === 0) return noEncontrado(res, 'Publicación');
    if (rows[0].autor_id !== req.usuario.id) return prohibido(res);

    if (rows[0].imagen_public_id) await eliminarImagen(rows[0].imagen_public_id);

    await query('DELETE FROM publicaciones WHERE id = $1', [id]);
    return ok(res, null, 'Publicación eliminada.');
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/publicaciones/:id/me-gusta ────────────────────
async function darMeGusta(req, res, next) {
  try {
    const { id } = req.params;

    const { rows: pub } = await query('SELECT id FROM publicaciones WHERE id = $1', [id]);
    if (pub.length === 0) return noEncontrado(res, 'Publicación');

    await query(
      'INSERT INTO me_gusta (publicacion_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, req.usuario.id]
    );

    const { rows } = await query(
      'SELECT COUNT(*) AS total FROM me_gusta WHERE publicacion_id = $1', [id]
    );

    return ok(res, { conteoMeGusta: parseInt(rows[0].total), meGustaActivo: true }, 'Me gusta registrado.');
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/publicaciones/:id/me-gusta ──────────────────
async function quitarMeGusta(req, res, next) {
  try {
    const { id } = req.params;

    await query('DELETE FROM me_gusta WHERE publicacion_id = $1 AND usuario_id = $2', [id, req.usuario.id]);

    const { rows } = await query(
      'SELECT COUNT(*) AS total FROM me_gusta WHERE publicacion_id = $1', [id]
    );

    return ok(res, { conteoMeGusta: parseInt(rows[0].total), meGustaActivo: false }, 'Me gusta quitado.');
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/publicaciones/:id/comentarios ──────────────────
async function listarComentarios(req, res, next) {
  try {
    const { id } = req.params;
    const { pagina, limite, offset } = parsearPaginacion(req.query);

    const [{ rows }, { rows: total }] = await Promise.all([
      query(
        `SELECT c.id, c.texto, c.created_at,
                u.id AS autor_id, u.nombre_completo AS nombre_autor, u.foto_perfil_url
         FROM comentarios c
         JOIN usuarios u ON u.id = c.autor_id
         WHERE c.publicacion_id = $1
         ORDER BY c.created_at ASC
         LIMIT $2 OFFSET $3`,
        [id, limite, offset]
      ),
      query('SELECT COUNT(*) FROM comentarios WHERE publicacion_id = $1', [id])
    ]);

    return paginado(res, rows, metaPaginacion(total[0].count, pagina, limite));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/publicaciones/:id/comentarios ─────────────────
async function agregarComentario(req, res, next) {
  try {
    const { id } = req.params;
    const { texto } = req.body;

    const { rows: pub } = await query('SELECT id FROM publicaciones WHERE id = $1', [id]);
    if (pub.length === 0) return noEncontrado(res, 'Publicación');

    const { rows } = await query(
      `INSERT INTO comentarios (publicacion_id, autor_id, texto) VALUES ($1, $2, $3)
       RETURNING id, texto, created_at`,
      [id, req.usuario.id, texto.trim()]
    );

    return creado(res, rows[0], 'Comentario agregado.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarPublicaciones, obtenerPublicacion, crearPublicacion, eliminarPublicacion,
  darMeGusta, quitarMeGusta, listarComentarios, agregarComentario
};