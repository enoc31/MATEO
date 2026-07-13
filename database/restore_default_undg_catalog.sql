-- Crear la función de base de datos para restaurar el catálogo base UNDG
CREATE OR REPLACE FUNCTION public.restore_default_undg_catalog()
RETURNS void AS $$
DECLARE
  cat1_id UUID;
  cat2_id UUID;
  cat3_id UUID;
  cat4_id UUID;
  cat5_id UUID;
  base_ong UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- 1. Restaurar Categorías Base (si no existen se crean, si existen se mantiene el ID)
  SELECT id INTO cat1_id FROM public.categorias_gasto WHERE nombre = '1. Costos Directos de Intervención (Bienes y Servicios)' AND ong_id = base_ong;
  IF cat1_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id) 
    VALUES ('1. Costos Directos de Intervención (Bienes y Servicios)', 'Compra y distribución de bienes de ayuda y atención humanitaria directa.', base_ong)
    RETURNING id INTO cat1_id;
  END IF;

  SELECT id INTO cat2_id FROM public.categorias_gasto WHERE nombre = '2. Costos de Transporte, Logística y Almacenamiento' AND ong_id = base_ong;
  IF cat2_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id) 
    VALUES ('2. Costos de Transporte, Logística y Almacenamiento', 'Fletes, almacenamiento y movilización local de suministros de ayuda.', base_ong)
    RETURNING id INTO cat2_id;
  END IF;

  SELECT id INTO cat3_id FROM public.categorias_gasto WHERE nombre = '3. Costos de Personal (Recursos Humanos)' AND ong_id = base_ong;
  IF cat3_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id) 
    VALUES ('3. Costos de Personal (Recursos Humanos)', 'Salarios, honorarios y pólizas de seguros del personal asignado.', base_ong)
    RETURNING id INTO cat3_id;
  END IF;

  SELECT id INTO cat4_id FROM public.categorias_gasto WHERE nombre = '4. Gastos de Oficina y Funcionamiento (Costos Indirectos y Operativos)' AND ong_id = base_ong;
  IF cat4_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id) 
    VALUES ('4. Gastos de Oficina y Funcionamiento (Costos Indirectos y Operativos)', 'Costos operativos de bases de campo, seguridad y gastos indirectos (overhead).', base_ong)
    RETURNING id INTO cat4_id;
  END IF;

  SELECT id INTO cat5_id FROM public.categorias_gasto WHERE nombre = '5. Visibilidad, Monitoreo y Evaluación' AND ong_id = base_ong;
  IF cat5_id IS NULL THEN
    INSERT INTO public.categorias_gasto (nombre, descripcion, ong_id) 
    VALUES ('5. Visibilidad, Monitoreo y Evaluación', 'Reportes obligatorios, rendición de cuentas, auditorías y material de visibilidad de donantes.', base_ong)
    RETURNING id INTO cat5_id;
  END IF;

  -- 2. Insertar o actualizar partidas por (codigo, ong_id) usando el constraint de unicidad 'unique_partida_codigo_ong'
  -- Categoría 1
  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat1_id, '1.1', 'Artículos No Alimentarios (NFI)', 'Compra y distribución de kits de emergencia, lonas, carpas, mantas, utensilios.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat1_id, '1.2', 'Agua, Saneamiento e Higiene (WASH)', 'Letrinas de emergencia, pastillas potabilizadoras, camiones cisterna, kits de higiene.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat1_id, '1.3', 'Asistencia Sanitaria de Urgencia', 'Medicamentos esenciales, clínicas móviles, insumos de trauma, generadores de clínicas.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat1_id, '1.4', 'Seguridad Alimentaria y Nutrición', 'Alimentos de primera necesidad y suplementos nutricionales.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat1_id, '1.5', 'Programas de Transferencias Monetarias (PTM)', 'Dinero en efectivo o vales entregados directamente a beneficiarios.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  -- Categoría 2
  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat2_id, '2.1', 'Transporte y Envíos', 'Fletes terrestres, marítimos o aéreos para movilizar la ayuda a las zonas afectadas.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat2_id, '2.2', 'Almacenamiento', 'Alquiler de bodegas, almacenes temporales y costos de estiba.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat2_id, '2.3', 'Logística Local', 'Combustible local, peajes, alquiler de vehículos 4x4 de operación.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  -- Categoría 3
  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat3_id, '3.1', 'Personal Local e Internacional', 'Salarios y dietas de coordinadores, médicos, ingenieros WASH y logistas.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat3_id, '3.2', 'Seguridad Social y Seguros', 'Pólizas de seguro médico y accidentes de riesgo especial para zonas de desastre.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  -- Categoría 4
  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat4_id, '4.1', 'Costos de Oficina sobre el Terreno', 'Alquiler de oficinas/bases, internet satelital, luz, agua y papelería contable.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat4_id, '4.2', 'Gestión de Seguridad', 'Equipamiento de comunicación (radios VHF), personal de vigilancia, kits de evacuación.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat4_id, '4.3', 'Costos Indirectos (Overhead)', 'Porcentaje destinado a gastos centrales de administración y contabilidad general.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  -- Categoría 5
  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat5_id, '5.1', 'Visibilidad', 'Banners, chalecos identificadores de personal, y calcomanías para logos de donantes.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

  INSERT INTO public.partidas_gasto (categoria_id, codigo, nombre, descripcion, ong_id) VALUES
  (cat5_id, '5.2', 'Monitoreo, Evaluación y Rendición de Cuentas', 'Viajes de control de hitos, auditorías del proyecto y elaboración de reportes de impacto.', base_ong)
  ON CONFLICT ON CONSTRAINT unique_partida_codigo_ong DO UPDATE 
  SET categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
