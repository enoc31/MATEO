-- Parche SQL: Índices para mejorar el rendimiento de consultas y la escalabilidad
-- Estos índices mejoran dramáticamente la velocidad al usar ORDER BY fecha DESC

-- 1. Índice para tabla transacciones_bancarias (columna fecha)
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha 
ON public.transacciones_bancarias (fecha DESC);

-- 2. Índice para tabla comprobantes_gasto (columna fecha_gasto)
CREATE INDEX IF NOT EXISTS idx_comprobantes_fecha 
ON public.comprobantes_gasto (fecha_gasto DESC);

-- 3. Índice para tabla donaciones (columna fecha)
CREATE INDEX IF NOT EXISTS idx_donaciones_fecha 
ON public.donaciones (fecha DESC);

-- Opcional: Para ayudar con las peticiones de conciliación
CREATE INDEX IF NOT EXISTS idx_transacciones_estado 
ON public.transacciones_bancarias (estado);
