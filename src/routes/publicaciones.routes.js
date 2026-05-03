const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/publicaciones.controller');
const { verificarToken } = require('../middlewares/auth');
const { crearUpload } = require('../config/cloudinary');
const validar = require('../middlewares/validar');

const uploadImagen = crearUpload('pawbook/publicaciones');
console.log({
  verificarToken,
  listar: ctrl.listarPublicaciones
});
router.get('/',    verificarToken, ctrl.listarPublicaciones);
router.get('/:id', verificarToken, ctrl.obtenerPublicacion);

router.post('/',
  verificarToken,
  uploadImagen.single('imagen'),
  [
    body('categoria').optional().isIn(['NORMAL', 'ADOPTION', 'LOST', 'FOUND']).withMessage('Categoría inválida.'),
    body('descripcionTexto').optional().trim().isLength({ max: 1000 }).withMessage('Descripción demasiado larga.'),
    body('telefonoAutor').optional().trim().isLength({ max: 20 }),
  ],
  validar,
  ctrl.crearPublicacion
);

router.delete('/:id', verificarToken, ctrl.eliminarPublicacion);

// Me gusta
router.post('/:id/me-gusta',   verificarToken, ctrl.darMeGusta);
router.delete('/:id/me-gusta', verificarToken, ctrl.quitarMeGusta);

// Comentarios
router.get('/:id/comentarios', verificarToken, ctrl.listarComentarios);
router.post('/:id/comentarios',
  verificarToken,
  body('texto').trim().notEmpty().withMessage('El comentario no puede estar vacío.')
    .isLength({ max: 500 }).withMessage('Comentario demasiado largo (máx 500 caracteres).'),
  validar,
  ctrl.agregarComentario
);

module.exports = router;