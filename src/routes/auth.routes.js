const router = require('express').Router();
const { body } = require('express-validator');
const { registro, login, me } = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth');
const validar = require('../middlewares/validar');

const reglas = {
  registro: [
    body('nombreCompleto').trim().notEmpty().withMessage('El nombre completo es requerido.')
      .isLength({ min: 3, max: 120 }).withMessage('El nombre debe tener entre 3 y 120 caracteres.'),
    body('email').isEmail().withMessage('Email inválido.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres.')
      .matches(/[A-Z]/).withMessage('Debe contener al menos una mayúscula.')
      .matches(/[0-9]/).withMessage('Debe contener al menos un número.'),
    body('rol').optional().isIn(['USUARIO', 'NEGOCIO']).withMessage('Rol inválido.'),
  ],
  login: [
    body('email').isEmail().withMessage('Email inválido.').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es requerida.'),
  ]
};

router.post('/registro', reglas.registro, validar, registro);
router.post('/login',    reglas.login,    validar, login);
router.get('/me',        verificarToken,  me);

module.exports = router;