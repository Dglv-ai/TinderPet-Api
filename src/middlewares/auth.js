const jwt = require('jsonwebtoken');
const { noAutorizado } = require('../utils/respuesta');

/**
 * Middleware: verifica el token JWT en el header Authorization.
 * Si es válido, adjunta el payload a req.usuario.
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return noAutorizado(res, 'Token no proporcionado.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, email, rol, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return noAutorizado(res, 'Token expirado. Inicia sesión nuevamente.');
    }
    return noAutorizado(res, 'Token inválido.');
  }
}

/**
 * Middleware: solo permite acceso a usuarios con rol NEGOCIO.
 * Usar DESPUÉS de verificarToken.
 */
function soloNegocio(req, res, next) {
  if (req.usuario.rol !== 'NEGOCIO') {
    return res.status(403).json({ exito: false, mensaje: 'Acceso reservado para cuentas de negocio.' });
  }
  next();
}

module.exports = { verificarToken, soloNegocio };