-- =========================================================================
-- Índices para Optimización de Rendimiento y Escalabilidad
-- =========================================================================

-- 1. Índice para tabla de Transacciones Bancarias (Búsquedas y ordenamiento por fecha)
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON public.transacciones_bancarias(fecha DESC);

-- 2. Índice para tabla de Donaciones (Ordenamiento por fecha de ingreso)
CREATE INDEX IF NOT EXISTS idx_donaciones_fecha ON public.donaciones(fecha DESC);

-- 3. Índice para relación Donaciones -> Proyectos (Filtrado por proyecto)
CREATE INDEX IF NOT EXISTS idx_donaciones_proyecto ON public.donaciones(proyecto_id);

-- 4. Índice para tabla de Comprobantes de Gasto (Ordenamiento por fecha de gasto)
CREATE INDEX IF NOT EXISTS idx_comprobantes_fecha ON public.comprobantes_gasto(fecha_gasto DESC);

-- 5. Índice para relación Comprobantes -> Proyectos
CREATE INDEX IF NOT EXISTS idx_comprobantes_proyecto ON public.comprobantes_gasto(proyecto_id);
