-- ══════════════════════════════════════════════════════════════
--  PAWBOOK — Schema PostgreSQL
--  Ejecutar en Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────

CREATE TYPE rol_usuario AS ENUM ('USUARIO', 'NEGOCIO');
CREATE TYPE estado_mascota AS ENUM ('NORMAL', 'ADOPTION', 'LOST');
CREATE TYPE categoria_post AS ENUM ('NORMAL', 'ADOPTION', 'LOST', 'FOUND');
CREATE TYPE tipo_veterinaria AS ENUM ('VETERINARIA', 'PET_FRIENDLY', 'TIENDA');

-- ─── USUARIOS ─────────────────────────────────────────────────

CREATE TABLE usuarios (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_completo     VARCHAR(120)  NOT NULL,
  email               VARCHAR(254)  NOT NULL UNIQUE,
  password_hash       VARCHAR(255)  NOT NULL,
  foto_perfil_url     TEXT,
  foto_perfil_public_id TEXT,                        -- para eliminar de Cloudinary
  ciudad              VARCHAR(100)  DEFAULT 'Santa Cruz de la Sierra',
  rol                 rol_usuario   NOT NULL DEFAULT 'USUARIO',
  puntos              INTEGER       NOT NULL DEFAULT 0,
  activo              BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

-- ─── SEGUIDORES ───────────────────────────────────────────────

CREATE TABLE seguidores (
  seguidor_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  seguido_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (seguidor_id, seguido_id),
  CHECK (seguidor_id <> seguido_id)
);

-- ─── MASCOTAS ─────────────────────────────────────────────────

CREATE TABLE mascotas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre      VARCHAR(80)  NOT NULL,
  raza        VARCHAR(100),
  especie     VARCHAR(80)  NOT NULL,
  edad_anios  SMALLINT     NOT NULL DEFAULT 0 CHECK (edad_anios >= 0),
  edad_meses  SMALLINT     NOT NULL DEFAULT 0 CHECK (edad_meses >= 0 AND edad_meses < 12),
  descripcion TEXT,
  foto_url    TEXT,
  foto_public_id TEXT,
  estado      estado_mascota NOT NULL DEFAULT 'NORMAL',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mascotas_owner ON mascotas(owner_id);
CREATE INDEX idx_mascotas_estado ON mascotas(estado);

-- ─── PUBLICACIONES ────────────────────────────────────────────

CREATE TABLE publicaciones (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  autor_id            UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mascota_id          UUID REFERENCES mascotas(id) ON DELETE SET NULL,
  imagen_url          TEXT,
  imagen_public_id    TEXT,
  descripcion_texto   TEXT,
  categoria           categoria_post NOT NULL DEFAULT 'NORMAL',
  ubicacion_referencia VARCHAR(200),
  telefono_autor      VARCHAR(20),
  fecha_publicacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_publicaciones_autor    ON publicaciones(autor_id);
CREATE INDEX idx_publicaciones_categoria ON publicaciones(categoria);
CREATE INDEX idx_publicaciones_fecha    ON publicaciones(fecha_publicacion DESC);

-- ─── ME GUSTA ─────────────────────────────────────────────────

CREATE TABLE me_gusta (
  publicacion_id  UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (publicacion_id, usuario_id)
);

-- ─── COMENTARIOS ──────────────────────────────────────────────

CREATE TABLE comentarios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacion_id  UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  autor_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  texto           TEXT NOT NULL CHECK (LENGTH(texto) > 0 AND LENGTH(texto) <= 500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comentarios_publicacion ON comentarios(publicacion_id);

-- ─── CHATS ────────────────────────────────────────────────────

CREATE TABLE chats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario1_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  usuario2_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario1_id, usuario2_id),
  CHECK (usuario1_id < usuario2_id)   -- evita duplicados (A,B) y (B,A)
);

-- ─── MENSAJES ─────────────────────────────────────────────────

CREATE TABLE mensajes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  emisor_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL CHECK (LENGTH(texto) > 0 AND LENGTH(texto) <= 1000),
  leido       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mensajes_chat   ON mensajes(chat_id, created_at DESC);
CREATE INDEX idx_mensajes_emisor ON mensajes(emisor_id);

-- ─── VETERINARIAS ─────────────────────────────────────────────

CREATE TABLE veterinarias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      VARCHAR(150) NOT NULL,
  direccion   TEXT NOT NULL,
  telefono    VARCHAR(20),
  foto_url    TEXT,
  rating      NUMERIC(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  abierto_ahora BOOLEAN DEFAULT FALSE,
  horario     VARCHAR(200),
  tipo        tipo_veterinaria NOT NULL DEFAULT 'VETERINARIA',
  maps_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TRIGGERS: updated_at automático ──────────────────────────

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_mascotas_updated_at
  BEFORE UPDATE ON mascotas
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ─── VISTA: publicaciones enriquecidas ────────────────────────
-- Usada internamente para no repetir JOINs en cada query

CREATE VIEW v_publicaciones AS
SELECT
  p.id,
  p.autor_id,
  u.nombre_completo       AS nombre_autor,
  u.foto_perfil_url       AS foto_perfil_autor_url,
  p.mascota_id,
  m.nombre                AS nombre_mascota,
  p.imagen_url,
  p.descripcion_texto,
  p.categoria,
  p.ubicacion_referencia,
  p.telefono_autor,
  p.fecha_publicacion,
  COUNT(DISTINCT mg.usuario_id)  AS conteo_me_gusta,
  COUNT(DISTINCT c.id)           AS conteo_comentarios
FROM publicaciones p
JOIN usuarios u ON u.id = p.autor_id
LEFT JOIN mascotas m ON m.id = p.mascota_id
LEFT JOIN me_gusta mg ON mg.publicacion_id = p.id
LEFT JOIN comentarios c ON c.publicacion_id = p.id
GROUP BY p.id, u.nombre_completo, u.foto_perfil_url, m.nombre;