const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;
const MAX_PAGE_SIZE     = parseInt(process.env.MAX_PAGE_SIZE)     || 50;

/**
 * Extrae y valida los parámetros de paginación del query string.
 * @returns {{ pagina, limite, offset }}
 */
function parsearPaginacion(query) {
  let pagina = parseInt(query.pagina) || 1;
  let limite = parseInt(query.limite) || DEFAULT_PAGE_SIZE;

  if (pagina < 1) pagina = 1;
  if (limite < 1) limite = 1;
  if (limite > MAX_PAGE_SIZE) limite = MAX_PAGE_SIZE;

  const offset = (pagina - 1) * limite;
  return { pagina, limite, offset };
}

/**
 * Construye el objeto de metadata de paginación para la respuesta.
 */
function metaPaginacion(total, pagina, limite) {
  return {
    pagina,
    limite,
    total: parseInt(total),
    totalPaginas: Math.ceil(total / limite)
  };
}

module.exports = { parsearPaginacion, metaPaginacion };