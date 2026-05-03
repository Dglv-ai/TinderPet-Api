const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 5;

/**
 * Crea un middleware multer con almacenamiento en Cloudinary.
 * @param {string} carpeta - Carpeta en Cloudinary (ej: 'pawbook/perfiles')
 */
function crearUpload(carpeta) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: carpeta,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, webp).'), false);
      }
    },
  });
}

/**
 * Elimina una imagen de Cloudinary por su public_id.
 * @param {string} publicId
 */
async function eliminarImagen(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error al eliminar imagen de Cloudinary:', err.message);
  }
}

/**
 * Extrae el public_id de una URL de Cloudinary.
 * Ejemplo: https://res.cloudinary.com/demo/image/upload/v123/pawbook/perfiles/abc.jpg
 * → pawbook/perfiles/abc
 */
function extraerPublicId(url) {
  if (!url || !url.includes('cloudinary')) return null;
  const partes = url.split('/upload/');
  if (partes.length < 2) return null;
  const conVersion = partes[1];
  // Remueve versión si existe (v1234567890/)
  const sinVersion = conVersion.replace(/^v\d+\//, '');
  // Remueve extensión
  return sinVersion.replace(/\.[^.]+$/, '');
}

module.exports = { cloudinary, crearUpload, eliminarImagen, extraerPublicId };