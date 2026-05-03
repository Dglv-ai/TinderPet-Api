require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function iniciar() {
if (process.env.DB_HOST) {
  //await testConnection();
}  app.listen(PORT, () => {
    console.log(`\n🐾 Pawbook API corriendo en puerto ${PORT}`);
    console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   http://localhost:${PORT}/api\n`);
  });
}

iniciar();