const { query, getClient } = require('../config/database');
const { ok, creado, error, noEncontrado } = require('../utils/respuesta');
const { parsearPaginacion, metaPaginacion } = require('../utils/paginacion');

/**
 * Normaliza los IDs para la restricción CHECK (usuario1_id < usuario2_id).
 * Siempre el menor UUID va como usuario1.
 */
function ordenarIds(id1, id2) {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

// ─── GET /api/chats ───────────────────────────────────────────
// Lista todas las conversaciones del usuario autenticado con preview
async function listarChats(req, res, next) {
  try {
    const miId = req.usuario.id;

    const { rows } = await query(
      `SELECT
         ch.id AS chat_id,
         CASE WHEN ch.usuario1_id = $1 THEN ch.usuario2_id ELSE ch.usuario1_id END AS otro_usuario_id,
         u.nombre_completo   AS otro_usuario_nombre,
         u.foto_perfil_url   AS otro_usuario_foto,
         ult.texto           AS ultimo_mensaje,
         ult.created_at      AS ultimo_mensaje_tiempo,
         COUNT(CASE WHEN msg.leido = FALSE AND msg.emisor_id <> $1 THEN 1 END) AS no_leidos
       FROM chats ch
       JOIN usuarios u ON u.id = CASE WHEN ch.usuario1_id = $1 THEN ch.usuario2_id ELSE ch.usuario1_id END
       LEFT JOIN LATERAL (
         SELECT texto, created_at FROM mensajes
         WHERE chat_id = ch.id
         ORDER BY created_at DESC LIMIT 1
       ) ult ON TRUE
       LEFT JOIN mensajes msg ON msg.chat_id = ch.id
       WHERE ch.usuario1_id = $1 OR ch.usuario2_id = $1
       GROUP BY ch.id, u.nombre_completo, u.foto_perfil_url, ult.texto, ult.created_at
       ORDER BY ult.created_at DESC NULLS LAST`,
      [miId]
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/chats ──────────────────────────────────────────
// Crea o recupera un chat entre dos usuarios
async function crearOBuscarChat(req, res, next) {
  try {
    const miId = req.usuario.id;
    const { otroUsuarioId } = req.body;

    if (miId === otroUsuarioId) return error(res, 'No puedes chatear contigo mismo.');

    // Verificar que el otro usuario existe
    const { rows: otro } = await query(
      'SELECT id FROM usuarios WHERE id = $1 AND activo = TRUE', [otroUsuarioId]
    );
    if (otro.length === 0) return noEncontrado(res, 'Usuario');

    const [u1, u2] = ordenarIds(miId, otroUsuarioId);

    // Intentar obtener chat existente
    const { rows: existente } = await query(
      'SELECT id FROM chats WHERE usuario1_id = $1 AND usuario2_id = $2', [u1, u2]
    );

    if (existente.length > 0) {
      return ok(res, { chatId: existente[0].id, esNuevo: false });
    }

    // Crear nuevo
    const { rows } = await query(
      'INSERT INTO chats (usuario1_id, usuario2_id) VALUES ($1, $2) RETURNING id',
      [u1, u2]
    );

    return creado(res, { chatId: rows[0].id, esNuevo: true }, 'Chat iniciado.');
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/chats/:chatId/mensajes ──────────────────────────
async function listarMensajes(req, res, next) {
  try {
    const { chatId } = req.params;
    const miId = req.usuario.id;
    const { pagina, limite, offset } = parsearPaginacion(req.query);

    // Verificar que el usuario pertenece al chat
    const { rows: chat } = await query(
      'SELECT id FROM chats WHERE id = $1 AND (usuario1_id = $2 OR usuario2_id = $2)',
      [chatId, miId]
    );
    if (chat.length === 0) return noEncontrado(res, 'Chat');

    const [{ rows }, { rows: total }] = await Promise.all([
      query(
        `SELECT id, emisor_id, texto, leido, created_at
         FROM mensajes
         WHERE chat_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [chatId, limite, offset]
      ),
      query('SELECT COUNT(*) FROM mensajes WHERE chat_id = $1', [chatId])
    ]);

    // Marcar como leídos los mensajes que NO envié yo
    await query(
      'UPDATE mensajes SET leido = TRUE WHERE chat_id = $1 AND emisor_id <> $2 AND leido = FALSE',
      [chatId, miId]
    );

    // Los mensajes vienen DESC, revertir para mostrar en orden cronológico
    return ok(res, {
      mensajes: rows.reverse(),
      paginacion: metaPaginacion(total[0].count, pagina, limite)
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/chats/:chatId/mensajes ─────────────────────────
async function enviarMensaje(req, res, next) {
  try {
    const { chatId } = req.params;
    const miId = req.usuario.id;
    const { texto } = req.body;

    // Verificar pertenencia al chat
    const { rows: chat } = await query(
      'SELECT id FROM chats WHERE id = $1 AND (usuario1_id = $2 OR usuario2_id = $2)',
      [chatId, miId]
    );
    if (chat.length === 0) return noEncontrado(res, 'Chat');

    const { rows } = await query(
      'INSERT INTO mensajes (chat_id, emisor_id, texto) VALUES ($1, $2, $3) RETURNING *',
      [chatId, miId, texto.trim()]
    );

    return creado(res, rows[0], 'Mensaje enviado.');
  } catch (err) {
    next(err);
  }
}

module.exports = { listarChats, crearOBuscarChat, listarMensajes, enviarMensaje };