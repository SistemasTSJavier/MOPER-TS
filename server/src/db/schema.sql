-- Usuarios para login (gerente, RH, control). Rol: admin (ve todo y puede crear), gerente (firma gerente), rh (firma RH), control (firma control).
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'gerente', 'rh', 'control')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Folios: secuencial único. Preview muestra (last_number+1): 0280, 0281, 0282...
-- Al firmar conformidad se asigna getNextFolio() y se incrementa last_number.
CREATE TABLE IF NOT EXISTS folio_sequence (
  id INT PRIMARY KEY DEFAULT 1,
  last_number INT NOT NULL DEFAULT 279
);

INSERT INTO folio_sequence (id, last_number) VALUES (1, 279) ON CONFLICT (id) DO NOTHING;

-- Oficiales (para autocompletado)
CREATE TABLE IF NOT EXISTS oficiales (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  curp VARCHAR(18) UNIQUE NOT NULL,
  fecha_ingreso DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Servicios y Puestos (catálogos)
CREATE TABLE IF NOT EXISTS servicios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS puestos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO servicios (nombre) VALUES
  ('Seguridad'), ('Operaciones'), ('Logística'), ('Administración'), ('Control de Acceso')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO puestos (nombre) VALUES
  ('Oficial'), ('Supervisor'), ('Coordinador'), ('Jefe de Turno'), ('Analista')
ON CONFLICT (nombre) DO NOTHING;

-- Registros MOPER (todo texto libre: sin base de oficiales ni catálogos)
CREATE TABLE IF NOT EXISTS moper_registros (
  id SERIAL PRIMARY KEY,
  folio TEXT,
  oficial_id INT REFERENCES oficiales(id),
  oficial_nombre TEXT,
  fecha_hora TIMESTAMPTZ DEFAULT NOW(),
  curp VARCHAR(18),
  fecha_ingreso DATE,
  fecha_inicio_efectiva DATE,
  servicio_actual_id INT REFERENCES servicios(id),
  servicio_nuevo_id INT REFERENCES servicios(id),
  puesto_actual_id INT REFERENCES puestos(id),
  puesto_nuevo_id INT REFERENCES puestos(id),
  servicio_actual_nombre TEXT,
  servicio_nuevo_nombre TEXT,
  puesto_actual_nombre TEXT,
  puesto_nuevo_nombre TEXT,
  sueldo_actual DECIMAL(12,2),
  sueldo_nuevo DECIMAL(12,2),
  motivo TEXT,
  creado_por TEXT,
  solicitado_por TEXT,
  fecha_llenado TEXT,
  fecha_registro TEXT,
  codigo_acceso TEXT UNIQUE,
  -- Firmas (workflow: imagen = firma dibujada en canvas)
  firma_conformidad_at TIMESTAMPTZ,
  firma_conformidad_nombre TEXT,
  firma_conformidad_imagen TEXT,
  firma_rh_at TIMESTAMPTZ,
  firma_rh_nombre TEXT,
  firma_rh_imagen TEXT,
  firma_gerente_at TIMESTAMPTZ,
  firma_gerente_nombre TEXT,
  firma_gerente_imagen TEXT,
  firma_control_at TIMESTAMPTZ,
  firma_control_nombre TEXT,
  firma_control_imagen TEXT,
  completado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_moper_folio_unique ON moper_registros(folio) WHERE folio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moper_folio ON moper_registros(folio);
CREATE INDEX IF NOT EXISTS idx_moper_oficial ON moper_registros(oficial_id);
