/**
 * Helpers para respuestas HTTP consistentes.
 * Formato: { exito, mensaje, datos?, meta? }
 */

function ok(res, datos, mensaje = 'OK', status = 200) {
  return res.status(status).json({ exito: true, mensaje, datos });
}

function creado(res, datos, mensaje = 'Recurso creado exitosamente.') {
  return res.status(201).json({ exito: true, mensaje, datos });
}

function paginado(res, datos, paginacion, mensaje = 'OK') {
  return res.status(200).json({
    exito: true,
    mensaje,
    datos,
    paginacion  // { pagina, limite, total, totalPaginas }
  });
}

function error(res, mensaje, status = 400, detalles = null) {
  const cuerpo = { exito: false, mensaje };
  if (detalles) cuerpo.detalles = detalles;
  return res.status(status).json(cuerpo);
}

function noAutorizado(res, mensaje = 'No autorizado. Token inválido o expirado.') {
  return res.status(401).json({ exito: false, mensaje });
}

function prohibido(res, mensaje = 'No tienes permisos para esta acción.') {
  return res.status(403).json({ exito: false, mensaje });
}

function noEncontrado(res, recurso = 'Recurso') {
  return res.status(404).json({ exito: false, mensaje: `${recurso} no encontrado.` });
}

module.exports = { ok, creado, paginado, error, noAutorizado, prohibido, noEncontrado };