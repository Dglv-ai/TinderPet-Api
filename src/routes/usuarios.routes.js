const router = require('express').Router();
const { body, query } = require('express-validator');
const ctrl = require('../controllers/usuarios.controller');
const { verificarToken } = require('../middlewares/auth');
const { crearUpload } = require('../config/cloudinary');
const validar = require('../middlewares/validar');

const uploadFoto = crearUpload('pawbook/perfiles');

router.get('/buscar',
  verificarToken,
  query('q').notEmpty().withMessage('El parámetro q es requerido.'),
  validar,
  ctrl.buscarUsuarios
);

router.get('/:id', verificarToken, ctrl.obtenerPerfil);

router.put('/:id',
  verificarToken,
  uploadFoto.single('foto'),
  [
    body('nombreCompleto').optional().trim()
      .isLength({ min: 3, max: 120 }).withMessage('Nombre inválido.'),
    body('ciudad').optional().trim()
      .isLength({ max: 100 }).withMessage('Ciudad demasiado larga.'),
  ],
  validar,
  ctrl.actualizarPerfil
);

router.post('/:id/seguir',        verificarToken, ctrl.seguir);
router.delete('/:id/seguir',      verificarToken, ctrl.dejarDeSeguir);
router.get('/:id/seguidores',     verificarToken, ctrl.obtenerSeguidores);

module.exports = router;