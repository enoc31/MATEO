-- =============================================================================
-- MATEO / CNBV — Consolidated Production Baseline Schema Migration
-- Project Ref: ydnylydulwjecdllbnev
-- Target Postgres: 17
-- Safe & Idempotent: uses IF NOT EXISTS, CREATE OR REPLACE, and guarded DO blocks.
-- =============================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 2. ENUM TYPES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_role'
  ) THEN
    CREATE TYPE public.user_role AS ENUM (
      'administrador',
      'auditor',
      'coordinador',
      'director',
      'auxiliar_campo',
      'donante',
      'super_admin'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'expense_status'
  ) THEN
    CREATE TYPE public.expense_status AS ENUM (
      'pendiente_soporte',
      'pendiente_revision',
      'aprobado',
      'rechazado'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'transaction_status'
  ) THEN
    CREATE TYPE public.transaction_status AS ENUM (
      'pendiente',
      'conciliado'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'requisition_status'
  ) THEN
    CREATE TYPE public.requisition_status AS ENUM (
      'pendiente_aprobacion_1',
      'pendiente_aprobacion_2',
      'aprobada_ejecucion',
      'rechazada'
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 3. SEQUENCES & CORE MULTI-TENANT TABLES (17 TABLES)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.solicitudes_gasto_seq START 1;

-- 3.1 ongs
CREATE TABLE IF NOT EXISTS public.ongs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  logo_url TEXT,
  rif_identificacion TEXT,
  pais TEXT DEFAULT 'Venezuela',
  telefono TEXT,
  direccion TEXT,
  sitio_web TEXT,
  plan TEXT DEFAULT 'trial',
  estado TEXT DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  tipo_organizacion TEXT DEFAULT 'ong',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.2 usuarios_perfiles
CREATE TABLE IF NOT EXISTS public.usuarios_perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre_completo TEXT,
  rol public.user_role NOT NULL DEFAULT 'coordinador'::public.user_role,
  aprobado BOOLEAN NOT NULL DEFAULT FALSE,
  ong_id UUID REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.3 donantes
CREATE TABLE IF NOT EXISTS public.donantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('nacional', 'extranjero')),
  pais TEXT,
  contacto TEXT,
  email TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.4 proyectos
CREATE TABLE IF NOT EXISTS public.proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_inicio DATE,
  fecha_fin DATE,
  presu_total NUMERIC(15, 2) DEFAULT 0.00,
  overhead_porcentaje NUMERIC(5, 2) DEFAULT 7.00,
  donante_id UUID REFERENCES public.donantes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.usuarios_perfiles(id),
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.5 categorias_gasto
CREATE TABLE IF NOT EXISTS public.categorias_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  es_catalogo_undg BOOLEAN NOT NULL DEFAULT FALSE,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_categoria_nombre_ong UNIQUE (nombre, ong_id)
);

-- 3.6 partidas_gasto
CREATE TABLE IF NOT EXISTS public.partidas_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.categorias_gasto(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  es_catalogo_undg BOOLEAN NOT NULL DEFAULT FALSE,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_partida_nombre_ong UNIQUE (categoria_id, nombre, ong_id),
  CONSTRAINT unique_partida_codigo_ong UNIQUE (codigo, ong_id)
);

-- 3.7 proyectos_partidas
CREATE TABLE IF NOT EXISTS public.proyectos_partidas (
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  partida_id UUID NOT NULL REFERENCES public.partidas_gasto(id) ON DELETE CASCADE,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  PRIMARY KEY (proyecto_id, partida_id)
);

-- 3.8 presupuestos
CREATE TABLE IF NOT EXISTS public.presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  partida_id UUID NOT NULL REFERENCES public.partidas_gasto(id) ON DELETE CASCADE,
  monto_asignado NUMERIC(15, 2) NOT NULL CHECK (monto_asignado >= 0),
  monto_ejecutado NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (monto_ejecutado >= 0),
  monto_comprometido NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (monto_comprometido >= 0),
  periodo TEXT NOT NULL,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_proyecto_partida_periodo UNIQUE (proyecto_id, partida_id, periodo)
);

-- 3.9 transacciones_bancarias
CREATE TABLE IF NOT EXISTS public.transacciones_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  referencia TEXT,
  descripcion TEXT NOT NULL,
  monto NUMERIC(15, 2) NOT NULL,
  estado public.transaction_status NOT NULL DEFAULT 'pendiente'::public.transaction_status,
  csv_metadata JSONB,
  imported_by UUID REFERENCES public.usuarios_perfiles(id),
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.10 donaciones
CREATE TABLE IF NOT EXISTS public.donaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE SET NULL,
  transaccion_id UUID REFERENCES public.transacciones_bancarias(id) ON DELETE SET NULL,
  donante TEXT NOT NULL DEFAULT 'Anónimo',
  monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
  descripcion TEXT,
  fecha DATE NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'USD',
  medio_pago TEXT NOT NULL DEFAULT 'transferencia',
  monto_original NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tasa_bcv NUMERIC(14, 4),
  monto_usd NUMERIC(15, 2),
  monto_ves NUMERIC(15, 2),
  created_by UUID REFERENCES public.usuarios_perfiles(id),
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.11 solicitudes_gasto
CREATE TABLE IF NOT EXISTS public.solicitudes_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT DEFAULT ('REQ-' || LPAD(nextval('public.solicitudes_gasto_seq')::TEXT, 4, '0')),
  solicitante_id UUID NOT NULL REFERENCES public.usuarios_perfiles(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  partida_id UUID NOT NULL REFERENCES public.partidas_gasto(id) ON DELETE RESTRICT,
  monto_solicitado NUMERIC(15, 2) NOT NULL CHECK (monto_solicitado > 0),
  motivo TEXT NOT NULL,
  estado public.requisition_status NOT NULL DEFAULT 'pendiente_aprobacion_1'::public.requisition_status,
  validador_1_id UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
  validado_1_at TIMESTAMPTZ,
  validador_2_id UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
  validado_2_at TIMESTAMPTZ,
  rechazado_por UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
  rechazado_at TIMESTAMPTZ,
  motivo_rechazo TEXT,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT check_distinct_validators CHECK (
    validador_1_id IS NULL
    OR validador_2_id IS NULL
    OR validador_1_id <> validador_2_id
  )
);

-- 3.12 comprobantes_gasto
CREATE TABLE IF NOT EXISTS public.comprobantes_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  partida_id UUID NOT NULL REFERENCES public.partidas_gasto(id) ON DELETE RESTRICT,
  transaccion_id UUID REFERENCES public.transacciones_bancarias(id) ON DELETE SET NULL,
  solicitante_id UUID NOT NULL REFERENCES public.usuarios_perfiles(id),
  solicitud_id UUID REFERENCES public.solicitudes_gasto(id) ON DELETE SET NULL,
  monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL,
  fecha_gasto DATE NOT NULL,
  url_comprobante TEXT,
  url_pago TEXT,
  estado public.expense_status NOT NULL DEFAULT 'pendiente_revision'::public.expense_status,
  comentarios_auditoria TEXT,
  auditado_por UUID REFERENCES public.usuarios_perfiles(id),
  auditado_at TIMESTAMPTZ,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.13 documentos_adjuntos
CREATE TABLE IF NOT EXISTS public.documentos_adjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios_perfiles(id) ON DELETE CASCADE,
  url_archivo_gcs TEXT NOT NULL,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('FACTURA', 'COMPROBANTE', 'PRESUPUESTO', 'OTRO')),
  estado_revision TEXT NOT NULL DEFAULT 'PENDIENTE',
  emisor_proveedor TEXT,
  fecha_emision DATE,
  moneda TEXT,
  monto_subtotal NUMERIC(15, 2),
  monto_impuestos NUMERIC(15, 2),
  monto_total NUMERIC(15, 2),
  comprobante_id UUID REFERENCES public.comprobantes_gasto(id) ON DELETE SET NULL,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.14 invitaciones
CREATE TABLE IF NOT EXISTS public.invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  rol public.user_role NOT NULL DEFAULT 'coordinador'::public.user_role,
  token TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  invitado_por UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- 3.15 tasas_bcv
CREATE TABLE IF NOT EXISTS public.tasas_bcv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  tasa NUMERIC(14, 4) NOT NULL CHECK (tasa > 0),
  fuente TEXT NOT NULL DEFAULT 'bcv_api',
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasas_bcv_ong_fecha_unique UNIQUE (ong_id, fecha)
);

-- 3.16 jornadas
CREATE TABLE IF NOT EXISTS public.jornadas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre TEXT NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  beneficios_entregados TEXT,
  proyecto_id TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3.17 beneficiarios
CREATE TABLE IF NOT EXISTS public.beneficiarios (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  jornada_id TEXT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cedula TEXT,
  sexo TEXT,
  fecha_nacimiento DATE,
  tipo_donacion TEXT[] DEFAULT '{}'::TEXT[],
  url_firma TEXT,
  ip_captura TEXT,
  huella_url TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  redes_sociales TEXT,
  foto_url TEXT,
  foto_cedula_url TEXT,
  bautizado BOOLEAN DEFAULT FALSE,
  grado_instruccion TEXT,
  enfermedad TEXT,
  fecha_membresia DATE,
  cargo_eclesiastico TEXT DEFAULT 'MIEMBRO GENERAL',
  areas_ministeriales TEXT[],
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- -----------------------------------------------------------------------------
-- 4. IDEMPOTENT COLUMN & CONSTRAINT RECONCILIATION FOR EXISTING SCHEMAS
-- -----------------------------------------------------------------------------
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS rif_identificacion TEXT;
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Venezuela';
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS sitio_web TEXT;
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial';
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'trial';
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.ongs ADD COLUMN IF NOT EXISTS tipo_organizacion TEXT DEFAULT 'ong';

ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS presu_total NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS overhead_porcentaje NUMERIC(5, 2) DEFAULT 7.00;
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS donante_id UUID;

ALTER TABLE public.categorias_gasto ADD COLUMN IF NOT EXISTS es_catalogo_undg BOOLEAN DEFAULT FALSE;
ALTER TABLE public.partidas_gasto ADD COLUMN IF NOT EXISTS es_catalogo_undg BOOLEAN DEFAULT FALSE;

ALTER TABLE public.comprobantes_gasto ADD COLUMN IF NOT EXISTS url_pago TEXT;
ALTER TABLE public.solicitudes_gasto ADD COLUMN IF NOT EXISTS codigo TEXT;

ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'USD';
ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS medio_pago TEXT DEFAULT 'transferencia';
ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS monto_original NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS tasa_bcv NUMERIC(14, 4);
ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS monto_usd NUMERIC(15, 2);
ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS monto_ves NUMERIC(15, 2);

ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS ip_captura TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS huella_url TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS redes_sociales TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS foto_cedula_url TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS bautizado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS grado_instruccion TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS enfermedad TEXT;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS fecha_membresia DATE;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS cargo_eclesiastico TEXT DEFAULT 'MIEMBRO GENERAL';
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS areas_ministeriales TEXT[];

-- Ensure legacy global uniqueness constraints and NOT NULL blockers are safely reconciled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categorias_gasto_nombre_key') THEN
    ALTER TABLE public.categorias_gasto DROP CONSTRAINT categorias_gasto_nombre_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_categoria_partida') THEN
    ALTER TABLE public.partidas_gasto DROP CONSTRAINT unique_categoria_partida;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_codigo') THEN
    ALTER TABLE public.partidas_gasto DROP CONSTRAINT unique_codigo;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partidas_gasto_codigo_key') THEN
    ALTER TABLE public.partidas_gasto DROP CONSTRAINT partidas_gasto_codigo_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasas_bcv_fecha_unique') THEN
    ALTER TABLE public.tasas_bcv DROP CONSTRAINT tasas_bcv_fecha_unique;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios_perfiles'
      AND column_name = 'ong_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.usuarios_perfiles ALTER COLUMN ong_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beneficiarios'
      AND column_name = 'jornada_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.beneficiarios ALTER COLUMN jornada_id DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_categoria_nombre_ong'
  ) THEN
    ALTER TABLE public.categorias_gasto
      ADD CONSTRAINT unique_categoria_nombre_ong UNIQUE (nombre, ong_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_partida_nombre_ong'
  ) THEN
    ALTER TABLE public.partidas_gasto
      ADD CONSTRAINT unique_partida_nombre_ong UNIQUE (categoria_id, nombre, ong_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_partida_codigo_ong'
  ) THEN
    ALTER TABLE public.partidas_gasto
      ADD CONSTRAINT unique_partida_codigo_ong UNIQUE (codigo, ong_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasas_bcv_ong_fecha_unique'
  ) THEN
    ALTER TABLE public.tasas_bcv
      ADD CONSTRAINT tasas_bcv_ong_fecha_unique UNIQUE (ong_id, fecha);
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 5. HARDENED HELPER & TRIGGER FUNCTIONS (SECURITY DEFINER SET search_path = public)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_ong_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ong_id
  FROM public.usuarios_perfiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_perfiles
    WHERE id = auth.uid()
      AND rol = 'super_admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol::text
  FROM public.usuarios_perfiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.set_ong_id_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ong_id UUID;
BEGIN
  IF NEW.ong_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT up.ong_id
  INTO v_ong_id
  FROM public.usuarios_perfiles up
  WHERE up.id = auth.uid()
  LIMIT 1;

  IF v_ong_id IS NOT NULL THEN
    NEW.ong_id := v_ong_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Never trust raw_user_meta_data for rol or aprobado (always force lowest privilege).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_ong_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
  v_target_ong_id UUID;
  v_raw_ong_id TEXT;
BEGIN
  v_raw_ong_id := NULLIF(BTRIM(NEW.raw_user_meta_data->>'ong_id'), '');

  IF v_raw_ong_id IS NOT NULL
     AND v_raw_ong_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT o.id
    INTO v_target_ong_id
    FROM public.ongs o
    WHERE o.id = v_raw_ong_id::uuid
    LIMIT 1;
  END IF;

  IF v_target_ong_id IS NULL THEN
    SELECT o.id
    INTO v_target_ong_id
    FROM public.ongs o
    WHERE o.id = v_base_ong_id
    LIMIT 1;
  END IF;

  INSERT INTO public.usuarios_perfiles (
    id,
    email,
    nombre_completo,
    rol,
    aprobado,
    ong_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'nombre_completo'), ''), 'Nuevo Usuario'),
    'coordinador'::public.user_role,
    FALSE,
    v_target_ong_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.seed_new_ong(p_ong_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tasa_base NUMERIC(14, 4);
BEGIN
  SELECT t.tasa
  INTO v_tasa_base
  FROM public.tasas_bcv t
  WHERE t.ong_id = '11111111-1111-1111-1111-111111111111'::uuid
  ORDER BY t.fecha DESC
  LIMIT 1;

  IF v_tasa_base IS NOT NULL THEN
    INSERT INTO public.tasas_bcv (ong_id, tasa, fecha)
    VALUES (p_ong_id, v_tasa_base, CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_ong()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_new_ong(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_new_ong ON public.ongs;
CREATE TRIGGER trg_on_new_ong
  AFTER INSERT ON public.ongs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_ong();

CREATE OR REPLACE FUNCTION public.restore_default_undg_catalog()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat1_id UUID;
  v_cat2_id UUID;
  v_cat3_id UUID;
  v_cat4_id UUID;
  v_cat5_id UUID;
  v_base_ong UUID := '11111111-1111-1111-1111-111111111111'::uuid;
BEGIN
  SELECT c.id INTO v_cat1_id
  FROM public.categorias_gasto c
  WHERE c.nombre = '1. Costos Directos de Intervención (Bienes y Servicios)'
    AND c.ong_id = v_base_ong
  LIMIT 1;
  IF v_cat1_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id, es_catalogo_undg)
    VALUES (
      '1. Costos Directos de Intervención (Bienes y Servicios)',
      'Compra y distribución de bienes de ayuda y atención humanitaria directa.',
      v_base_ong,
      TRUE
    )
    RETURNING id INTO v_cat1_id;
  END IF;

  SELECT c.id INTO v_cat2_id
  FROM public.categorias_gasto c
  WHERE c.nombre = '2. Costos de Transporte, Logística y Almacenamiento'
    AND c.ong_id = v_base_ong
  LIMIT 1;
  IF v_cat2_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id, es_catalogo_undg)
    VALUES (
      '2. Costos de Transporte, Logística y Almacenamiento',
      'Fletes, almacenamiento y movilización local de suministros de ayuda.',
      v_base_ong,
      TRUE
    )
    RETURNING id INTO v_cat2_id;
  END IF;

  SELECT c.id INTO v_cat3_id
  FROM public.categorias_gasto c
  WHERE c.nombre = '3. Costos de Personal (Recursos Humanos)'
    AND c.ong_id = v_base_ong
  LIMIT 1;
  IF v_cat3_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id, es_catalogo_undg)
    VALUES (
      '3. Costos de Personal (Recursos Humanos)',
      'Salarios, honorarios y pólizas de seguros del personal asignado.',
      v_base_ong,
      TRUE
    )
    RETURNING id INTO v_cat3_id;
  END IF;

  SELECT c.id INTO v_cat4_id
  FROM public.categorias_gasto c
  WHERE c.nombre = '4. Gastos de Oficina y Funcionamiento (Costos Indirectos y Operativos)'
    AND c.ong_id = v_base_ong
  LIMIT 1;
  IF v_cat4_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id, es_catalogo_undg)
    VALUES (
      '4. Gastos de Oficina y Funcionamiento (Costos Indirectos y Operativos)',
      'Costos operativos de bases de campo, seguridad y gastos indirectos (overhead).',
      v_base_ong,
      TRUE
    )
    RETURNING id INTO v_cat4_id;
  END IF;

  SELECT c.id INTO v_cat5_id
  FROM public.categorias_gasto c
  WHERE c.nombre = '5. Visibilidad, Monitoreo y Evaluación'
    AND c.ong_id = v_base_ong
  LIMIT 1;
  IF v_cat5_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id, es_catalogo_undg)
    VALUES (
      '5. Visibilidad, Monitoreo y Evaluación',
      'Reportes obligatorios, rendición de cuentas, auditorías y material de visibilidad de donantes.',
      v_base_ong,
      TRUE
    )
    RETURNING id INTO v_cat5_id;
  END IF;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id, es_catalogo_undg)
  VALUES
    (v_cat1_id, '1.1', 'Artículos No Alimentarios (NFI)', 'Compra y distribución de kits de emergencia, lonas, carpas, mantas, utensilios.', v_base_ong, TRUE),
    (v_cat1_id, '1.2', 'Agua, Saneamiento e Higiene (WASH)', 'Letrinas de emergencia, pastillas potabilizadoras, camiones cisterna, kits de higiene.', v_base_ong, TRUE),
    (v_cat1_id, '1.3', 'Asistencia Sanitaria de Urgencia', 'Medicamentos esenciales, clínicas móviles, insumos de trauma, generadores de clínicas.', v_base_ong, TRUE),
    (v_cat1_id, '1.4', 'Seguridad Alimentaria y Nutrición', 'Alimentos de primera necesidad y suplementos nutricionales.', v_base_ong, TRUE),
    (v_cat1_id, '1.5', 'Programas de Transferencias Monetarias (PTM)', 'Dinero en efectivo o vales entregados directamente a beneficiarios.', v_base_ong, TRUE),
    (v_cat2_id, '2.1', 'Transporte y Envíos', 'Fletes terrestres, marítimos o aéreos para movilizar la ayuda a las zonas afectadas.', v_base_ong, TRUE),
    (v_cat2_id, '2.2', 'Almacenamiento', 'Alquiler de bodegas, almacenes temporales y costos de estiba.', v_base_ong, TRUE),
    (v_cat2_id, '2.3', 'Logística Local', 'Combustible local, peajes, alquiler de vehículos 4x4 de operación.', v_base_ong, TRUE),
    (v_cat3_id, '3.1', 'Personal Local e Internacional', 'Salarios y dietas de coordinadores, médicos, ingenieros WASH y logistas.', v_base_ong, TRUE),
    (v_cat3_id, '3.2', 'Seguridad Social y Seguros', 'Pólizas de seguro médico y accidentes de riesgo especial para zonas de desastre.', v_base_ong, TRUE),
    (v_cat4_id, '4.1', 'Costos de Oficina sobre el Terreno', 'Alquiler de oficinas/bases, internet satelital, luz, agua y papelería contable.', v_base_ong, TRUE),
    (v_cat4_id, '4.2', 'Gestión de Seguridad', 'Equipamiento de comunicación (radios VHF), personal de vigilancia, kits de evacuación.', v_base_ong, TRUE),
    (v_cat4_id, '4.3', 'Costos Indirectos (Overhead)', 'Porcentaje destinado a gastos centrales de administración y contabilidad general.', v_base_ong, TRUE),
    (v_cat5_id, '5.1', 'Visibilidad', 'Banners, chalecos identificadores de personal, y calcomanías para logos de donantes.', v_base_ong, TRUE),
    (v_cat5_id, '5.2', 'Monitoreo, Evaluación y Rendición de Cuentas', 'Viajes de control de hitos, auditorías del proyecto y elaboración de reportes de impacto.', v_base_ong, TRUE)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE
  SET categoria_id = EXCLUDED.categoria_id,
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      es_catalogo_undg = TRUE;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. BUSINESS LOGIC TRIGGERS & DEFAULT ong_id ASSIGNMENTS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_presupuesto_ejecutado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_periodo TEXT;
  v_monto_solicitado NUMERIC(15, 2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_periodo := TO_CHAR(OLD.fecha_gasto, 'YYYY') || '-ANUAL';
    IF OLD.estado = 'aprobado'::public.expense_status THEN
      UPDATE public.presupuestos
      SET monto_ejecutado = GREATEST(0.00, monto_ejecutado - OLD.monto),
          updated_at = NOW()
      WHERE proyecto_id = OLD.proyecto_id
        AND partida_id = OLD.partida_id
        AND periodo = v_periodo;
    END IF;
    RETURN NULL;
  END IF;

  v_periodo := TO_CHAR(NEW.fecha_gasto, 'YYYY') || '-ANUAL';

  IF (TG_OP = 'INSERT' AND NEW.estado = 'aprobado'::public.expense_status)
     OR (TG_OP = 'UPDATE' AND NEW.estado = 'aprobado'::public.expense_status AND OLD.estado <> 'aprobado'::public.expense_status) THEN
    UPDATE public.presupuestos
    SET monto_ejecutado = monto_ejecutado + NEW.monto,
        updated_at = NOW()
    WHERE proyecto_id = NEW.proyecto_id
      AND partida_id = NEW.partida_id
      AND periodo = v_periodo;

    IF NEW.solicitud_id IS NOT NULL THEN
      SELECT sg.monto_solicitado
      INTO v_monto_solicitado
      FROM public.solicitudes_gasto sg
      WHERE sg.id = NEW.solicitud_id;

      IF v_monto_solicitado IS NOT NULL THEN
        UPDATE public.presupuestos
        SET monto_comprometido = GREATEST(0.00, monto_comprometido - v_monto_solicitado),
            updated_at = NOW()
        WHERE proyecto_id = NEW.proyecto_id
          AND partida_id = NEW.partida_id
          AND periodo = v_periodo;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE'
        AND OLD.estado = 'aprobado'::public.expense_status
        AND NEW.estado <> 'aprobado'::public.expense_status THEN
    UPDATE public.presupuestos
    SET monto_ejecutado = GREATEST(0.00, monto_ejecutado - OLD.monto),
        updated_at = NOW()
    WHERE proyecto_id = OLD.proyecto_id
      AND partida_id = OLD.partida_id
      AND periodo = v_periodo;

    IF OLD.solicitud_id IS NOT NULL THEN
      SELECT sg.monto_solicitado
      INTO v_monto_solicitado
      FROM public.solicitudes_gasto sg
      WHERE sg.id = OLD.solicitud_id;

      IF v_monto_solicitado IS NOT NULL THEN
        UPDATE public.presupuestos
        SET monto_comprometido = monto_comprometido + v_monto_solicitado,
            updated_at = NOW()
        WHERE proyecto_id = OLD.proyecto_id
          AND partida_id = OLD.partida_id
          AND periodo = v_periodo;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_presupuesto_ejecutado ON public.comprobantes_gasto;
CREATE TRIGGER tr_update_presupuesto_ejecutado
  AFTER INSERT OR UPDATE OR DELETE ON public.comprobantes_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_presupuesto_ejecutado();

CREATE OR REPLACE FUNCTION public.check_requisition_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.validador_1_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.usuarios_perfiles up
      WHERE up.id = NEW.validador_1_id
        AND up.rol IN ('administrador'::public.user_role, 'director'::public.user_role)
    ) THEN
      RAISE EXCEPTION 'El primer validador debe tener rol Administrador o Director.';
    END IF;

    IF NEW.validador_1_id = NEW.solicitante_id THEN
      RAISE EXCEPTION 'El solicitante no puede aprobar su propia solicitud.';
    END IF;
  END IF;

  IF NEW.validador_2_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.usuarios_perfiles up
      WHERE up.id = NEW.validador_2_id
        AND up.rol IN ('administrador'::public.user_role, 'director'::public.user_role)
    ) THEN
      RAISE EXCEPTION 'El segundo validador debe tener rol Administrador o Director.';
    END IF;

    IF NEW.validador_2_id = NEW.solicitante_id THEN
      RAISE EXCEPTION 'El solicitante no puede aprobar su propia solicitud.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'rechazada'::public.requisition_status
       AND NEW.estado <> 'rechazada'::public.requisition_status THEN
      RAISE EXCEPTION 'No se puede modificar el estado de una solicitud ya rechazada.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_requisition_rules ON public.solicitudes_gasto;
CREATE TRIGGER tr_check_requisition_rules
  BEFORE INSERT OR UPDATE ON public.solicitudes_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.check_requisition_rules();

CREATE OR REPLACE FUNCTION public.sync_presupuesto_requisicion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_periodo TEXT;
BEGIN
  v_periodo := TO_CHAR(NEW.created_at, 'YYYY') || '-ANUAL';

  IF NEW.estado = 'aprobada_ejecucion'::public.requisition_status
     AND OLD.estado <> 'aprobada_ejecucion'::public.requisition_status THEN
    UPDATE public.presupuestos
    SET monto_comprometido = monto_comprometido + NEW.monto_solicitado,
        updated_at = NOW()
    WHERE proyecto_id = NEW.proyecto_id
      AND partida_id = NEW.partida_id
      AND periodo = v_periodo;
  ELSIF NEW.estado = 'rechazada'::public.requisition_status
        AND OLD.estado = 'aprobada_ejecucion'::public.requisition_status THEN
    UPDATE public.presupuestos
    SET monto_comprometido = GREATEST(0.00, monto_comprometido - OLD.monto_solicitado),
        updated_at = NOW()
    WHERE proyecto_id = OLD.proyecto_id
      AND partida_id = OLD.partida_id
      AND periodo = v_periodo;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_presupuesto_requisicion ON public.solicitudes_gasto;
CREATE TRIGGER tr_sync_presupuesto_requisicion
  AFTER UPDATE ON public.solicitudes_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_presupuesto_requisicion();

CREATE OR REPLACE FUNCTION public.check_project_partida_relation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.proyectos_partidas pp
    WHERE pp.proyecto_id = NEW.proyecto_id
      AND pp.partida_id = NEW.partida_id
  ) THEN
    RAISE EXCEPTION 'La partida contable seleccionada (ID: %) no está asociada al proyecto seleccionado (ID: %).', NEW.partida_id, NEW.proyecto_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_comprobante_partida ON public.comprobantes_gasto;
CREATE TRIGGER trg_check_comprobante_partida
  BEFORE INSERT OR UPDATE ON public.comprobantes_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.check_project_partida_relation();

DROP TRIGGER IF EXISTS trg_check_solicitud_partida ON public.solicitudes_gasto;
CREATE TRIGGER trg_check_solicitud_partida
  BEFORE INSERT OR UPDATE ON public.solicitudes_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.check_project_partida_relation();

-- Attach automatic ong_id trigger and default across tenant-scoped tables
ALTER TABLE public.proyectos ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.categorias_gasto ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.partidas_gasto ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.proyectos_partidas ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.presupuestos ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.transacciones_bancarias ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.comprobantes_gasto ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.donaciones ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.tasas_bcv ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.jornadas ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.beneficiarios ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.solicitudes_gasto ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.documentos_adjuntos ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.donantes ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'proyectos',
    'categorias_gasto',
    'partidas_gasto',
    'proyectos_partidas',
    'presupuestos',
    'comprobantes_gasto',
    'donaciones',
    'transacciones_bancarias',
    'tasas_bcv',
    'jornadas',
    'beneficiarios',
    'solicitudes_gasto',
    'documentos_adjuntos',
    'donantes'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_ong_id ON public.%I', v_table);
    EXECUTE format(
      'CREATE TRIGGER trg_set_ong_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_ong_id_from_user()',
      v_table
    );
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 7. VIEWS & CANONICAL DASHBOARD RPC (SECURITY INVOKER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_miembros_ekklesia
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.ong_id,
  b.jornada_id,
  b.nombre,
  b.apellido,
  b.cedula,
  b.sexo,
  b.fecha_nacimiento,
  b.direccion,
  b.telefono,
  b.email,
  b.redes_sociales,
  b.foto_url,
  b.foto_cedula_url,
  b.bautizado,
  b.grado_instruccion,
  b.enfermedad,
  b.fecha_membresia,
  b.cargo_eclesiastico,
  b.areas_ministeriales,
  b.created_at
FROM public.beneficiarios b
WHERE 'Ekklesia' = ANY(b.tipo_donacion)
   OR b.cargo_eclesiastico IS NOT NULL
   OR b.jornada_id IN (
     SELECT j.id
     FROM public.jornadas j
     WHERE j.nombre LIKE '%Ekklesia%'
   );

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ong_id UUID;
  v_total_inflows NUMERIC := 0;
  v_reconciled_inflows NUMERIC := 0;
  v_unreconciled_inflows NUMERIC := 0;
  v_total_outflows NUMERIC := 0;
  v_expenses_by_category JSON := '{}'::json;
  v_project_execution JSON := '[]'::json;
BEGIN
  SELECT up.ong_id
  INTO v_ong_id
  FROM public.usuarios_perfiles up
  WHERE up.id = auth.uid()
  LIMIT 1;

  IF v_ong_id IS NULL THEN
    RETURN json_build_object(
      'totalInflows', 0,
      'reconciledInflows', 0,
      'unreconciledInflows', 0,
      'totalOutflows', 0,
      'expensesByCategory', '{}'::json,
      'projectExecution', '[]'::json
    );
  END IF;

  -- 1. Inflows from donations (multi-currency USD with fallback to legacy monto)
  SELECT
    COALESCE(SUM(COALESCE(d.monto_usd, d.monto)), 0),
    COALESCE(SUM(CASE WHEN d.transaccion_id IS NOT NULL THEN COALESCE(d.monto_usd, d.monto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN d.transaccion_id IS NULL THEN COALESCE(d.monto_usd, d.monto) ELSE 0 END), 0)
  INTO v_total_inflows, v_reconciled_inflows, v_unreconciled_inflows
  FROM public.donaciones d
  WHERE d.ong_id = v_ong_id;

  -- 2. Approved outflows
  SELECT COALESCE(SUM(cg.monto), 0)
  INTO v_total_outflows
  FROM public.comprobantes_gasto cg
  WHERE cg.estado = 'aprobado'::public.expense_status
    AND cg.ong_id = v_ong_id;

  -- 3. Outflows grouped by category_id
  SELECT COALESCE(json_object_agg(COALESCE(cat.categoria_key, 'otros'), cat.total_monto), '{}'::json)
  INTO v_expenses_by_category
  FROM (
    SELECT
      pg.categoria_id::text AS categoria_key,
      SUM(cg.monto) AS total_monto
    FROM public.comprobantes_gasto cg
    LEFT JOIN public.partidas_gasto pg ON cg.partida_id = pg.id
    WHERE cg.estado = 'aprobado'::public.expense_status
      AND cg.ong_id = v_ong_id
    GROUP BY pg.categoria_id
  ) cat;

  -- 4. Project execution (Expand/Contract compatible keys: Presupuesto/Ejecutado/id + presupuestado/ejecutado)
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'nombre', p.nombre,
        'Presupuesto', COALESCE(b.asignado, 0),
        'Ejecutado', COALESCE(exec_tot.ejecutado, b.ejecutado, 0),
        'presupuestado', COALESCE(b.asignado, 0),
        'ejecutado', COALESCE(exec_tot.ejecutado, b.ejecutado, 0)
      )
    ),
    '[]'::json
  )
  INTO v_project_execution
  FROM public.proyectos p
  LEFT JOIN (
    SELECT
      pr.proyecto_id,
      SUM(pr.monto_asignado) AS asignado,
      SUM(pr.monto_ejecutado) AS ejecutado
    FROM public.presupuestos pr
    WHERE pr.ong_id = v_ong_id
    GROUP BY pr.proyecto_id
  ) b ON b.proyecto_id = p.id
  LEFT JOIN (
    SELECT
      cg.proyecto_id,
      SUM(cg.monto) AS ejecutado
    FROM public.comprobantes_gasto cg
    WHERE cg.estado = 'aprobado'::public.expense_status
      AND cg.ong_id = v_ong_id
    GROUP BY cg.proyecto_id
  ) exec_tot ON exec_tot.proyecto_id = p.id
  WHERE p.ong_id = v_ong_id
    AND (p.activo = TRUE OR COALESCE(b.asignado, 0) > 0);

  RETURN json_build_object(
    'totalInflows', v_total_inflows,
    'reconciledInflows', v_reconciled_inflows,
    'unreconciledInflows', v_unreconciled_inflows,
    'totalOutflows', v_total_outflows,
    'expensesByCategory', v_expenses_by_category,
    'projectExecution', v_project_execution
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (ENABLE + FORCE + STRICT MULTI-TENANT POLICIES)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_table TEXT;
  v_pol RECORD;
  v_all_tables TEXT[] := ARRAY[
    'ongs',
    'usuarios_perfiles',
    'donantes',
    'proyectos',
    'categorias_gasto',
    'partidas_gasto',
    'proyectos_partidas',
    'presupuestos',
    'transacciones_bancarias',
    'donaciones',
    'solicitudes_gasto',
    'comprobantes_gasto',
    'documentos_adjuntos',
    'invitaciones',
    'tasas_bcv',
    'jornadas',
    'beneficiarios'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_all_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_table);
  END LOOP;

  -- Drop any legacy accumulated policies so re-runs stay free of permissive OR leaks
  FOR v_pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(v_all_tables)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_pol.tablename);
  END LOOP;
END
$$;

-- 8.1 ongs (public read for org branding/selector; no open public INSERT)
CREATE POLICY "ongs_public_read"
  ON public.ongs
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "ongs_super_admin_insert"
  ON public.ongs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "ongs_admin_update"
  ON public.ongs
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      id = public.get_user_ong_id()
      AND public.get_user_role() IN ('administrador', 'director')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      id = public.get_user_ong_id()
      AND public.get_user_role() IN ('administrador', 'director')
    )
  );

CREATE POLICY "ongs_super_admin_delete"
  ON public.ongs
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- 8.2 usuarios_perfiles (no public open INSERT; no self-escalation UPDATE)
CREATE POLICY "sel_perfiles_aislamiento"
  ON public.usuarios_perfiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR ong_id = public.get_user_ong_id()
  );

CREATE POLICY "ins_perfiles_trigger"
  ON public.usuarios_perfiles
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "upd_perfiles_aislamiento"
  ON public.usuarios_perfiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.get_user_role() = 'administrador'
      AND ong_id = public.get_user_ong_id()
      AND rol NOT IN ('super_admin'::public.user_role, 'administrador'::public.user_role)
      AND id <> auth.uid()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.get_user_role() = 'administrador'
      AND ong_id = public.get_user_ong_id()
      AND rol NOT IN ('super_admin'::public.user_role, 'administrador'::public.user_role)
      AND id <> auth.uid()
    )
  );

CREATE POLICY "del_perfiles_super_admin"
  ON public.usuarios_perfiles
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- 8.3 donantes
CREATE POLICY "aislamiento_ong_donantes"
  ON public.donantes
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- 8.4 proyectos
CREATE POLICY "aislamiento_ong_proyectos"
  ON public.proyectos
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

CREATE POLICY "proyectos_anon_read_active"
  ON public.proyectos
  FOR SELECT
  TO anon
  USING (activo = TRUE);

-- 8.5 categorias_gasto (shared UNDG base + tenant-owned custom rows)
CREATE POLICY "Lectura de categorias: base y propias"
  ON public.categorias_gasto
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR ong_id = '11111111-1111-1111-1111-111111111111'::uuid
  );

CREATE POLICY "Inserción de categorias propias"
  ON public.categorias_gasto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

CREATE POLICY "Actualización de categorias propias"
  ON public.categorias_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

CREATE POLICY "Eliminación de categorias propias"
  ON public.categorias_gasto
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

-- 8.6 partidas_gasto (shared UNDG base read + tenant-owned write)
CREATE POLICY "Lectura de partidas por ong"
  ON public.partidas_gasto
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR ong_id = '11111111-1111-1111-1111-111111111111'::uuid
  );

CREATE POLICY "Escritura de partidas por ong"
  ON public.partidas_gasto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

CREATE POLICY "Actualizacion de partidas por ong"
  ON public.partidas_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

CREATE POLICY "Eliminacion de partidas por ong"
  ON public.partidas_gasto
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

-- 8.7 proyectos_partidas
CREATE POLICY "aislamiento_ong_proyectos_partidas"
  ON public.proyectos_partidas
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- 8.8 presupuestos
CREATE POLICY "aislamiento_ong_presupuestos"
  ON public.presupuestos
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- 8.9 transacciones_bancarias
CREATE POLICY "aislamiento_ong_transacciones"
  ON public.transacciones_bancarias
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- 8.10 donaciones
CREATE POLICY "Lectura de donaciones por ong y rol"
  ON public.donaciones
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director', 'coordinador', 'donante', 'super_admin')
  );

CREATE POLICY "Insercion de donaciones por ong"
  ON public.donaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director')
  );

CREATE POLICY "Actualizacion de donaciones por ong"
  ON public.donaciones
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director')
  );

CREATE POLICY "Eliminacion de donaciones por ong"
  ON public.donaciones
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director')
  );

-- 8.11 solicitudes_gasto
CREATE POLICY "Visualización de solicitudes según rol"
  ON public.solicitudes_gasto
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND (
      auth.uid() = solicitante_id
      OR public.get_user_role() IN ('administrador', 'auditor', 'director', 'super_admin')
    )
  );

CREATE POLICY "Coordinadores pueden crear solicitudes"
  ON public.solicitudes_gasto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND auth.uid() = solicitante_id
    AND public.get_user_role() IN ('coordinador', 'administrador', 'director')
  );

CREATE POLICY "Roles autorizados aprueban o rechazan solicitudes ONG"
  ON public.solicitudes_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director')
  );

CREATE POLICY "Administradores pueden eliminar solicitudes de su ONG"
  ON public.solicitudes_gasto
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

-- 8.12 comprobantes_gasto
CREATE POLICY "Lectura de comprobantes para roles autorizados"
  ON public.comprobantes_gasto
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND (
      auth.uid() = solicitante_id
      OR public.get_user_role() IN ('administrador', 'auditor', 'director', 'super_admin')
    )
  );

CREATE POLICY "Coordinadores pueden insertar comprobantes"
  ON public.comprobantes_gasto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND auth.uid() = solicitante_id
  );

CREATE POLICY "Coordinadores pueden modificar sus comprobantes pendientes"
  ON public.comprobantes_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND auth.uid() = solicitante_id
    AND estado IN ('pendiente_soporte'::public.expense_status, 'pendiente_revision'::public.expense_status)
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND auth.uid() = solicitante_id
    AND estado IN ('pendiente_soporte'::public.expense_status, 'pendiente_revision'::public.expense_status)
  );

CREATE POLICY "Auditores y Admins modifican comprobantes de su ONG"
  ON public.comprobantes_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'auditor', 'director')
  );

CREATE POLICY "Administradores pueden eliminar comprobantes de su ONG"
  ON public.comprobantes_gasto
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

-- 8.13 documentos_adjuntos
CREATE POLICY "aislamiento_ong_documentos"
  ON public.documentos_adjuntos
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- 8.14 invitaciones
CREATE POLICY "Administradores leen invitaciones de su ONG"
  ON public.invitaciones
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'super_admin')
  );

CREATE POLICY "Administradores crean invitaciones para su ONG"
  ON public.invitaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'super_admin')
  );

CREATE POLICY "Administradores actualizan invitaciones de su ONG"
  ON public.invitaciones
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'super_admin')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'super_admin')
  );

CREATE POLICY "Administradores eliminan invitaciones de su ONG"
  ON public.invitaciones
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'super_admin')
  );

CREATE POLICY "Lectura publica de invitacion por token"
  ON public.invitaciones
  FOR SELECT
  TO anon
  USING (estado = 'pendiente');

-- 8.15 tasas_bcv
CREATE POLICY "Lectura de tasas BCV por ong"
  ON public.tasas_bcv
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR ong_id = '11111111-1111-1111-1111-111111111111'::uuid
  );

CREATE POLICY "Administradores y directores insertan tasas de su ONG"
  ON public.tasas_bcv
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

CREATE POLICY "Administradores y directores actualizan tasas de su ONG"
  ON public.tasas_bcv
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

CREATE POLICY "Administradores y directores eliminan tasas de su ONG"
  ON public.tasas_bcv
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role() IN ('administrador', 'director')
  );

-- 8.16 jornadas (authenticated tenant isolation + anon read of active jornadas for /registro)
CREATE POLICY "aislamiento_ong_jornadas"
  ON public.jornadas
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

CREATE POLICY "jornadas_anon_read_active"
  ON public.jornadas
  FOR SELECT
  TO anon
  USING (activa = TRUE);

-- 8.17 beneficiarios (authenticated tenant isolation + scoped anon registration insert for /registro)
CREATE POLICY "aislamiento_ong_beneficiarios"
  ON public.beneficiarios
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

CREATE POLICY "beneficiarios_anon_insert"
  ON public.beneficiarios
  FOR INSERT
  TO anon
  WITH CHECK (
    jornada_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.jornadas j
      WHERE j.id = beneficiarios.jornada_id
        AND j.activa = TRUE
        AND j.ong_id = beneficiarios.ong_id
    )
  );

-- -----------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON public.transacciones_bancarias (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transacciones_estado ON public.transacciones_bancarias (estado);
CREATE INDEX IF NOT EXISTS idx_donaciones_fecha ON public.donaciones (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_donaciones_proyecto ON public.donaciones (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_fecha ON public.comprobantes_gasto (fecha_gasto DESC);
CREATE INDEX IF NOT EXISTS idx_comprobantes_gasto_proyecto ON public.comprobantes_gasto (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_gasto_partida ON public.comprobantes_gasto (partida_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_gasto_proyecto ON public.solicitudes_gasto (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_proyecto_partida ON public.presupuestos (proyecto_id, partida_id);
CREATE INDEX IF NOT EXISTS idx_tasas_bcv_fecha ON public.tasas_bcv (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON public.invitaciones (token);
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON public.invitaciones (email);
CREATE INDEX IF NOT EXISTS idx_invitaciones_ong ON public.invitaciones (ong_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_cargo_eclesiastico ON public.beneficiarios (cargo_eclesiastico);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_bautizado ON public.beneficiarios (bautizado);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_email ON public.beneficiarios (email);

-- Multi-tenant ong_id lookup indexes for RLS filter performance
CREATE INDEX IF NOT EXISTS idx_usuarios_perfiles_ong ON public.usuarios_perfiles (ong_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_ong ON public.proyectos (ong_id);
CREATE INDEX IF NOT EXISTS idx_donaciones_ong ON public.donaciones (ong_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_gasto_ong ON public.comprobantes_gasto (ong_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_gasto_ong ON public.solicitudes_gasto (ong_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_ong ON public.jornadas (ong_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_ong ON public.beneficiarios (ong_id);

-- -----------------------------------------------------------------------------
-- 10. REALTIME PUBLICATION REGISTRATION (GUARDED)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'beneficiarios'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.beneficiarios;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'solicitudes_gasto'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_gasto;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comprobantes_gasto'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comprobantes_gasto;
    END IF;
  END IF;
END
$$;
