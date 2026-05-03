const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { ok, creado, error, noAutorizado } = require('../utils/respuesta');

// ─── POST /api/auth/registro ──────────────────────────────────
async function registro(req, res, next) {
  try {
    const { nombreCompleto, email, password, ciudad, rol } = req.body;

    // ¿El email ya existe?
    const existe = await query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (existe.rows.length > 0) {
      return error(res, 'Ya existe una cuenta con ese email.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, ciudad, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre_completo, email, ciudad, rol, puntos, created_at`,
      [nombreCompleto.trim(), email.toLowerCase(), passwordHash, ciudad || 'Santa Cruz de la Sierra', rol || 'USUARIO']
    );

    const usuario = rows[0];
    const token = generarToken(usuario);

    return creado(res, { token, usuario: formatearUsuario(usuario) }, 'Cuenta creada exitosamente.');
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      `SELECT id, nombre_completo, email, password_hash, foto_perfil_url,
              ciudad, rol, puntos, activo
       FROM usuarios WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return noAutorizado(res, 'Credenciales incorrectas.');
    }

    const usuario = rows[0];

    if (!usuario.activo) {
      return error(res, 'Cuenta desactivada. Contacta soporte.', 403);
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return noAutorizado(res, 'Credenciales incorrectas.');
    }

    const token = generarToken(usuario);

    return ok(res, { token, usuario: formatearUsuario(usuario) }, 'Inicio de sesión exitoso.');
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────
async function me(req, res, next) {
  try {
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
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return noAutorizado(res, 'Usuario no encontrado.');
    }

    return ok(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function formatearUsuario(u) {
  const { password_hash, ...sinPassword } = u;
  return sinPassword;
}

module.exports = { registro, login, me };