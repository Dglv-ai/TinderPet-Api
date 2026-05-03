-- ══════════════════════════════════════════════════════════════
--  PAWBOOK — Seeds (datos de prueba)
--  Ejecutar DESPUÉS del schema.sql
-- ══════════════════════════════════════════════════════════════
-- Contraseña para todos los usuarios de prueba: "Test1234!"
-- Hash bcrypt generado con saltRounds=10

INSERT INTO usuarios (id, nombre_completo, email, password_hash, ciudad, rol, puntos) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Carlos Mamani',    'carlos@test.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVzBzpL4NK', 'Santa Cruz de la Sierra', 'USUARIO',  120),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Sofía Torrez',     'sofia@test.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVzBzpL4NK', 'Santa Cruz de la Sierra', 'USUARIO',  85),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'Vet Peluzitos',    'vet@test.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVzBzpL4NK', 'Santa Cruz de la Sierra', 'NEGOCIO',  200);

INSERT INTO mascotas (id, owner_id, nombre, raza, especie, edad_anios, edad_meses, descripcion, estado) VALUES
  ('b1b2c3d4-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'Rocky',  'Labrador',     'Perro', 2, 3,  'Muy juguetón y amigable', 'NORMAL'),
  ('b1b2c3d4-0002-0002-0002-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'Luna',   'Siamés',       'Gato',  1, 8,  'Independiente y cariñosa', 'ADOPTION'),
  ('b1b2c3d4-0003-0003-0003-000000000003', 'a1b2c3d4-0002-0002-0002-000000000002', 'Toby',   'Golden Retriever', 'Perro', 3, 0, 'Se perdió el 1 de mayo', 'LOST');

INSERT INTO publicaciones (autor_id, mascota_id, descripcion_texto, categoria, telefono_autor) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'b1b2c3d4-0001-0001-0001-000000000001', 'Rocky disfrutando el parque 🐕', 'NORMAL', '77700001'),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'b1b2c3d4-0002-0002-0002-000000000002', 'Luna busca un hogar con amor ❤️', 'ADOPTION', '77700001'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'b1b2c3d4-0003-0003-0003-000000000003', '🚨 PERDIDO — Toby, zona Equipetrol. Llamen por favor', 'LOST', '77700002');

INSERT INTO veterinarias (nombre, direccion, telefono, rating, abierto_ahora, horario, tipo, maps_url) VALUES
  ('Clínica Veterinaria El Patio', 'Av. Alemana 2do anillo, Santa Cruz', '77712345', 4.8, TRUE,  'Lun-Sáb 8:00-20:00', 'VETERINARIA',   'https://maps.google.com/?q=-17.783,-63.182'),
  ('Petco Santa Cruz',             'Shopping Bolívar, Santa Cruz',        '77798765', 4.5, TRUE,  'Todos los días 10:00-21:00', 'TIENDA', 'https://maps.google.com/?q=-17.790,-63.175'),
  ('Café Pet Friendly Patitas',    'Calle Beni esq. Warnes, Santa Cruz',  '77745678', 4.6, FALSE, 'Mié-Dom 15:00-22:00', 'PET_FRIENDLY',  'https://maps.google.com/?q=-17.795,-63.185');