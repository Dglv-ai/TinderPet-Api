require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    if (process.env.DB_HOST) {
      await testConnection(); // opcional, NO bloquea
    }
  } catch (err) {
    console.error("DB error:", err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🐾 Pawbook API corriendo en puerto ${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API lista en puerto ${PORT}`);
  });
}

iniciar();