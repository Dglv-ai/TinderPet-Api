/**
 * Middleware global de manejo de errores.
 * Captura cualquier error no manejado y responde de forma consistente.
 */
function errorHandler(err, req, res, next) {
  console.error(`\n❌ Error no manejado [${req.method} ${req.path}]:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Error de Multer (archivo muy grande o tipo inválido)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      exito: false,
      mensaje: `El archivo supera el tamaño máximo permitido (${process.env.MAX_FILE_SIZE_MB || 5}MB).`
    });
  }

  if (err.message && err.message.includes('Solo se permiten imágenes')) {
    return res.status(400).json({ exito: false, mensaje: err.message });
  }

  // Error de PostgreSQL — violación de unicidad (ej: email duplicado)
  if (err.code === '23505') {
    return res.status(409).json({ exito: false, mensaje: 'Ya existe un registro con esos datos.' });
  }

  // Error de PostgreSQL — violación de FK
  if (err.code === '23503') {
    return res.status(400).json({ exito: false, mensaje: 'Referencia inválida. El recurso relacionado no existe.' });
  }

  // Error genérico
  const status = err.status || err.statusCode || 500;
  const mensaje = status === 500 ? 'Error interno del servidor.' : err.message;

  res.status(status).json({ exito: false, mensaje });
}

module.exports = errorHandler;