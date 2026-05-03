const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/chats.controller');
const { verificarToken } = require('../middlewares/auth');
const validar = require('../middlewares/validar');

router.get('/',    verificarToken, ctrl.listarChats);

router.post('/',
  verificarToken,
  body('otroUsuarioId').notEmpty().isUUID().withMessage('ID de usuario inválido.'),
  validar,
  ctrl.crearOBuscarChat
);

router.get('/:chatId/mensajes',   verificarToken, ctrl.listarMensajes);

router.post('/:chatId/mensajes',
  verificarToken,
  body('texto').trim().notEmpty().withMessage('El mensaje no puede estar vacío.')
    .isLength({ max: 1000 }).withMessage('Mensaje demasiado largo (máx 1000 caracteres).'),
  validar,
  ctrl.enviarMensaje
);

module.exports = router;