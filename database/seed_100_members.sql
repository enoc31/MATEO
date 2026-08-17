-- =========================================================================
-- SCRIPT SQL: Inserción de 100 Miembros Ficticios de Prueba para Ekklesia
-- Copiar y ejecutar en el SQL Editor de Supabase
-- =========================================================================

DO $$
DECLARE
    v_ong_id UUID;
    v_jornada_id UUID;
    v_nombres TEXT[] := ARRAY[
        'Carlos', 'Ana', 'María', 'José', 'Luis', 'Carmen', 'Jesús', 'Sofía', 
        'Gabriel', 'Elena', 'Pedro', 'Alejandro', 'Andrea', 'Diego', 'Daniela', 
        'Juan', 'Manuel', 'Patricia', 'Ricardo', 'Valentina', 'Roberto', 'Isabel',
        'Fernando', 'Camila', 'Javier', 'Mariana', 'Francisco', 'Gabriela', 'Rafael', 'Lucía'
    ];
    v_apellidos TEXT[] := ARRAY[
        'Rodríguez', 'González', 'Hernández', 'Pérez', 'Martínez', 'Sánchez', 'Díaz', 
        'López', 'Gómez', 'Flores', 'Morales', 'Romero', 'Mendoza', 'Castillo', 
        'Silva', 'Vargas', 'Rojas', 'Medina', 'Moreno', 'Gutiérrez', 'Navarro', 'Torres'
    ];
    v_cargos TEXT[] := ARRAY[
        'PASTOR / OBISPO O SIMILAR',
        'DIÁCONO / ANCIANO O SIMILAR',
        'MINISTRO / COORDINADOR / LÍDER O SIMILAR',
        'MIEMBRO GENERAL', 'MIEMBRO GENERAL', 'MIEMBRO GENERAL', 'MIEMBRO GENERAL'
    ];
    v_instruccion TEXT[] := ARRAY['Bachillerato', 'Técnico', 'Universitario', 'Posgrado'];
    v_enfermedades TEXT[] := ARRAY['Ninguna', 'Ninguna', 'Ninguna', 'Hipertensión leve', 'Alergia a AINEs', 'Ninguna'];
    v_direcciones TEXT[] := ARRAY['Av. Universidad', 'Urb. Santa Fe', 'Calle Las Flores', 'Av. Bolívar', 'Urb. El Bosque', 'Av. Francisco de Miranda'];

    v_nombre TEXT;
    v_apellido TEXT;
    v_cedula TEXT;
    v_sexo TEXT;
    v_fnac DATE;
    v_fmemb DATE;
    v_cargo TEXT;
    v_bautizado BOOLEAN;
    v_phone TEXT;
    v_email TEXT;
    v_meta JSONB;
    v_tipo_donacion TEXT[];
    v_ben_id_str TEXT;
    i INT;
BEGIN
    -- 1. Obtener una ONG registrada con ID UUID válido
    SELECT id INTO v_ong_id 
    FROM public.ongs 
    WHERE id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Si no existe ninguna ONG válida, asignar UUID genérico
    IF v_ong_id IS NULL THEN
        v_ong_id := '11111111-1111-1111-1111-111111111111'::uuid;
    END IF;

    -- 2. Seleccionar una jornada existente que posea ID en formato UUID válido
    SELECT id INTO v_jornada_id 
    FROM public.jornadas 
    WHERE (ong_id = v_ong_id OR ong_id IS NULL)
      AND id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LIMIT 1;

    -- Si no existe una jornada válida con UUID, crear una nueva automáticamente
    IF v_jornada_id IS NULL THEN
        v_jornada_id := gen_random_uuid();
        BEGIN
            INSERT INTO public.jornadas (id, nombre, fecha, beneficios_entregados, activa, ong_id)
            VALUES (
                v_jornada_id,
                'Padrón Congregacional Ekklesia',
                CURRENT_DATE,
                'Ekklesia - Registro de Miembro Congregacional',
                TRUE,
                v_ong_id
            );
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.jornadas (id, nombre, fecha, beneficios_entregados, activa)
            VALUES (
                v_jornada_id,
                'Padrón Congregacional Ekklesia',
                CURRENT_DATE,
                'Ekklesia - Registro de Miembro Congregacional',
                TRUE
            );
        END;
    END IF;

    -- 3. Generar e insertar 100 miembros ficticios con datos realistas
    FOR i IN 1..100 LOOP
        v_nombre := v_nombres[1 + floor(random() * array_length(v_nombres, 1))::int];
        v_apellido := v_apellidos[1 + floor(random() * array_length(v_apellidos, 1))::int];
        v_cedula := 'V-' || (10000000 + floor(random() * 20000000))::text;
        
        IF (i % 2 = 0) THEN
            v_sexo := 'Femenino';
        ELSE
            v_sexo := 'Masculino';
        END IF;

        v_fnac := DATE '1965-01-01' + (floor(random() * 14000)::int * INTERVAL '1 day');
        v_fmemb := DATE '2018-01-01' + (floor(random() * 2500)::int * INTERVAL '1 day');
        v_cargo := v_cargos[1 + floor(random() * array_length(v_cargos, 1))::int];
        v_bautizado := (random() > 0.25); -- 75% Bautizados

        v_phone := '04' || (ARRAY['14', '24', '12', '16'])[1 + floor(random() * 4)::int] || '-' || (1000000 + floor(random() * 9000000))::text;
        v_email := lower(translate(v_nombre, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) || '.' || lower(translate(v_apellido, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) || i || '@gmail.com';

        -- Construir payload JSONB de metadata
        v_meta := jsonb_build_object(
            'direccion', v_direcciones[1 + floor(random() * array_length(v_direcciones, 1))::int],
            'telefono', v_phone,
            'email', v_email,
            'redes_sociales', '@' || lower(v_nombre) || lower(v_apellido),
            'bautizado', v_bautizado,
            'grado_instruccion', v_instruccion[1 + floor(random() * array_length(v_instruccion, 1))::int],
            'enfermedad', v_enfermedades[1 + floor(random() * array_length(v_enfermedades, 1))::int],
            'fecha_membresia', v_fmemb,
            'cargo_eclesiastico', v_cargo,
            'areas_ministeriales', ARRAY['PROCLAMACIÓN', 'ADORACIÓN', 'SERVICIO']
        );

        v_tipo_donacion := ARRAY[
            CASE WHEN v_bautizado THEN 'Bautizado' ELSE 'Activo' END,
            'Ekklesia',
            v_cargo,
            'META:' || v_meta::text
        ];

        v_ben_id_str := 'ben-seed-' || i || '-' || floor(random() * 100000)::text;

        -- Inserción compatible tanto si la tabla posee columnas físicas como si usa metadata
        BEGIN
            INSERT INTO public.beneficiarios (
                id,
                jornada_id,
                ong_id,
                nombre,
                apellido,
                cedula,
                sexo,
                fecha_nacimiento,
                tipo_donacion,
                url_firma,
                created_at,
                direccion,
                telefono,
                email,
                redes_sociales,
                bautizado,
                grado_instruccion,
                enfermedad,
                fecha_membresia,
                cargo_eclesiastico,
                areas_ministeriales
            ) VALUES (
                v_ben_id_str,
                v_jornada_id,
                v_ong_id,
                v_nombre,
                v_apellido,
                v_cedula,
                v_sexo,
                v_fnac,
                v_tipo_donacion,
                NULL,
                NOW() - (i || ' hours')::INTERVAL,
                v_meta->>'direccion',
                v_phone,
                v_email,
                v_meta->>'redes_sociales',
                v_bautizado,
                v_meta->>'grado_instruccion',
                v_meta->>'enfermedad',
                v_fmemb,
                v_cargo,
                ARRAY['PROCLAMACIÓN', 'ADORACIÓN', 'SERVICIO']
            );
        EXCEPTION WHEN undefined_column THEN
            -- Fallback si las columnas físicas extendidas no están en la tabla
            INSERT INTO public.beneficiarios (
                id,
                jornada_id,
                ong_id,
                nombre,
                apellido,
                cedula,
                sexo,
                fecha_nacimiento,
                tipo_donacion,
                url_firma,
                created_at
            ) VALUES (
                v_ben_id_str,
                v_jornada_id,
                v_ong_id,
                v_nombre,
                v_apellido,
                v_cedula,
                v_sexo,
                v_fnac,
                v_tipo_donacion,
                NULL,
                NOW() - (i || ' hours')::INTERVAL
            );
        END;

    END LOOP;

    RAISE NOTICE '¡Éxito! Se generaron e insertaron 100 miembros ficticios para Ekklesia.';
END $$;
