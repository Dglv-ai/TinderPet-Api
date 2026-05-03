const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const mascotasRoutes = require('./routes/mascotas.routes');
const publicacionesRoutes = require('./routes/publicaciones.routes');
const chatsRoutes = require('./routes/chats.routes');
//const veterinariasRoutes = require('./routes/veterinarias.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ─── Seguridad ────────────────────────────────────────────────
app.use(helmet());
app.use(cors());

// Rate limiting global: 100 requests por 15 min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { exito: false, mensaje: 'Demasiadas solicitudes, intenta más tarde.' }
}));

// Rate limiting estricto para auth: 10 intentos por 15 min
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { exito: false, mensaje: 'Demasiados intentos de autenticación, espera 15 minutos.' }
});

// ─── Parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health check ─────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    exito: true,
    mensaje: '🐾 Pawbook API funcionando',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ─── Rutas ────────────────────────────────────────────────────
app.use('/api/auth', limiteAuth, authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/mascotas', mascotasRoutes);
app.use('/api/publicaciones', publicacionesRoutes);
app.use('/api/chats', chatsRoutes);
//app.use('/api/veterinarias', veterinariasRoutes);

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ exito: false, mensaje: 'Endpoint no encontrado.' });
});

// ─── Error handler global ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;