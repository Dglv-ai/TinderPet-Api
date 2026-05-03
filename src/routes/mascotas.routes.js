const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/mascotas.controller');
const { verificarToken } = require('../middlewares/auth');
const { crearUpload } = require('../config/cloudinary');
const validar = require('../middlewares/validar');

const uploadFoto = crearUpload('pawbook/mascotas');

const reglasCrear = [
  body('nombre').trim().notEmpty().withMessage('El nombre de la mascota es requerido.')
    .isLength({ max: 80 }).withMessage('Nombre demasiado largo.'),
  body('especie').trim().notEmpty().withMessage('La especie es requerida.'),
  body('edadAnios').optional().isInt({ min: 0 }).withMessage('Edad en años inválida.'),
  body('edadMeses').optional().isInt({ min: 0, max: 11 }).withMessage('Meses debe ser entre 0 y 11.'),
];

router.get('/',    verificarToken, ctrl.listarMascotas);
router.get('/:id', verificarToken, ctrl.obtenerMascota);

router.post('/',
  verificarToken,
  uploadFoto.single('foto'),
  reglasCrear,
  validar,
  ctrl.crearMascota
);

router.put('/:id',
  verificarToken,
  uploadFoto.single('foto'),
  [
    ...reglasCrear.map(r => r.optional ? r : r),   // hacemos todos opcionales en update
    body('estado').optional().isIn(['NORMAL', 'ADOPTION', 'LOST']).withMessage('Estado inválido.'),
  ],
  validar,
  ctrl.actualizarMascota
);

router.delete('/:id', verificarToken, ctrl.eliminarMascota);

module.exports = router;