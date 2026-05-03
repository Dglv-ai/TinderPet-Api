const { validationResult } = require('express-validator');
const { error } = require('../utils/respuesta');

/**
 * Middleware que revisa el resultado de express-validator.
 * Si hay errores, responde 400 con los detalles formateados.
 * Usar DESPUÉS de las reglas de validación.
 */
function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    const detalles = errores.array().map(e => ({
      campo: e.path,
      mensaje: e.msg
    }));
    return error(res, 'Error de validación.', 400, detalles);
  }
  next();
}

module.exports = validar;