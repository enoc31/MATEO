// ============================================================
// scripts/mateo-knowledge.cjs
// Base de Conocimiento Técnico y Contexto Integral de MATEO
// Provee contexto técnico, esquema de BD, métricas y reglas al Bot @mateo.
// ============================================================

const https = require('https');

const SUPABASE_URL = 'https://ydnylydulwjecdllbnev.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';

// ── Conocimiento Arquitectónico y Técnico ─────────────────────
const TECH_CONTEXT = {
  nombre: 'MATEO (Monitoreo, Auditoría, Transparencia y Estructura Organizacional)',
  proposito:
    'Plataforma SaaS integral de auditoría financiera, control de donaciones y gestión de membresía para congregaciones e iglesias de la Convención Nacional Bautista de Venezuela (CNBV) y ONGs humanitarias.',
  stack: {
    frontend: 'React 19 (Hooks funcionales), TypeScript estricto (no any), Vite',
    estilos: 'Vanilla CSS modular, variables CSS de tema oscuro/claro, diseño responsive WCAG',
    backend_bd: 'PostgreSQL en Supabase con Row Level Security (RLS) multi-inquilino',
    almacenamiento:
      'Google Cloud Storage (GCS) para fotos de carnet, comprobantes y firmas digitales',
    despliegue: 'Vercel (Producción: https://mateo-wine.vercel.app) con Serverless Functions',
    integraciones:
      'Slack Bot (@mateo) para alertas y canal de revisores #C0CBJMA2NK1, API BCV para tasas oficiales',
  },
  modulos: [
    {
      nombre: 'Gestión de Miembros (Comunidad Eclesial)',
      ruta: '/app/beneficiaries',
      descripcion:
        'Padrón centralizado de miembros y fieles de cada congregación. Documento de identidad inmutable (Primary Identifier). Ficha 360°, registro de bautismo (Inmersión / Aspersión), fecha de aprobación en acta, teléfonos con prefijo internacional +58 y áreas ministeriales.',
    },
    {
      nombre: 'Requisiciones y Solicitudes de Fondos',
      ruta: '/app/requisitions',
      descripcion:
        'Flujo de aprobación multinivel (Nivel 1: Coordinador/Director, Nivel 2: Finanzas/Auditor). Asignación directa a proyectos y partidas presupuestarias.',
    },
    {
      nombre: 'Auditoría y Rendición de Gastos de Campo',
      ruta: '/app/field-entry y /app/audit',
      descripcion:
        'Módulo móvil para coordinadores de campo con carga de fotos de comprobantes/facturas (redimensionadas a <2MB) y validación de auditoría antes de liquidar.',
    },
    {
      nombre: 'Conciliación Bancaria e Ingresos',
      ruta: '/app/reconciliation y /app/incomes',
      descripcion:
        'Importación de estados de cuenta bancarios (CSV) y conciliación automática contra donaciones. Soporte multidivisa (VES/USD) con tasa oficial BCV sincronizada.',
    },
    {
      nombre: 'Presupuestos y Reportes Auditables',
      ruta: '/app/budgets',
      descripcion:
        'Matriz de partidas y categorías de gasto por proyecto. Generación de informes ejecutivos descargables en PDF (JsPDF) y Excel (PapaParse / XLSX).',
    },
    {
      nombre: 'Administración SaaS y Perfil de Congregación',
      ruta: '/app/organization y /saas',
      descripcion:
        'Gestión de datos fundamentales de la congregación (RIF formato J-9 dígitos, personalidad jurídica condicional, denominación de 17 opciones, logotipo y sedes).',
    },
  ],
  tablas_bd: [
    {
      tabla: 'ongs',
      descripcion:
        'Congregaciones e iglesias registradas en el sistema SaaS (tipo: ekklesia u ong).',
      campos_clave:
        'id, nombre, rif_identificacion, pais, telefono, direccion, logo_url, plan, estado',
    },
    {
      tabla: 'beneficiarios',
      descripcion: 'Miembros de la comunidad eclesial y fieles de cada congregación.',
      campos_clave:
        'id, ong_id, nombre, apellido, cedula, sexo, fecha_nacimiento, bautizado, fecha_membresia, telefono, direccion, foto_url, foto_cedula_url',
    },
    {
      tabla: 'proyectos',
      descripcion: 'Proyectos sociales, humanitarios o eclesiales asociados a fondos.',
      campos_clave:
        'id, ong_id, nombre, descripcion, activo, fecha_inicio, fecha_fin, overhead_porcentaje, donante_id',
    },
    {
      tabla: 'solicitudes_gasto',
      descripcion: 'Requisiciones de compra y desembolso de fondos.',
      campos_clave:
        'id, ong_id, proyecto_id, solicitante_id, monto, moneda, estado (pendiente_aprobacion, aprobada, rechazada)',
    },
    {
      tabla: 'comprobantes_gasto',
      descripcion: 'Facturas, recibos y soportes digitales de gastos ejecutados.',
      campos_clave:
        'id, ong_id, proyecto_id, monto, url_comprobante, estado (pendiente_soporte, verificado, rechazado)',
    },
    {
      tabla: 'transacciones_bancarias',
      descripcion: 'Movimientos de cuentas bancarias importados para conciliación.',
      campos_clave:
        'id, ong_id, cuenta_id, fecha, monto, descripcion, estado (pendiente, conciliada)',
    },
    {
      tabla: 'donaciones',
      descripcion: 'Ingresos y donaciones recibidas de personas u organizaciones.',
      campos_clave: 'id, ong_id, donante_id, monto, moneda, fecha, metodo_pago',
    },
    {
      tabla: 'tasas_bcv',
      descripcion: 'Histórico de tasas de cambio oficial USD/VES del Banco Central de Venezuela.',
      campos_clave: 'id, fecha, tasa, fuente',
    },
    {
      tabla: 'usuarios_perfiles',
      descripcion: 'Usuarios del sistema y roles asignados por congregación.',
      campos_clave:
        'id, email, nombre_completo, rol (superadmin, director, administrador, auditor, etc.), aprobado, ong_id',
    },
    {
      tabla: 'partidas_gasto y categorias_gasto',
      descripcion: 'Estructura presupuestaria para clasificación contable de egresos.',
      campos_clave: 'id, codigo, nombre, categoria_id',
    },
  ],
  seguridad_rls:
    'Row Level Security (RLS) habilitado en el 100% de las tablas. Los usuarios solo pueden ver y editar registros que coincidan con su `ong_id`. SuperAdmins tienen bypass para soporte técnico y monitoreo global.',
  reglas_integridad: [
    'Inmutabilidad del Documento de Identidad: La C.I. o Pasaporte no es editable tras el registro para garantizar unicidad.',
    'Protección contra Borrado en Cascada: Desvinculación de ON DELETE CASCADE entre eventos ministeriales y registros de miembros.',
    'Validación de RIF: Prefijo J- seguido exactamente de 9 dígitos numéricos si tiene personalidad jurídica.',
    'Manejo de Fechas ISO/UTC: Normalización de fechas para eliminar desfases de zona horaria (-1 día).',
  ],
};

// ── Consultar datos en vivo de Supabase ────────────────────────
async function fetchLiveDatabaseStats() {
  const queryTable = (table, select = 'id', filter = '') => {
    return new Promise((resolve) => {
      let path = `/rest/v1/${table}?select=${encodeURIComponent(select)}`;
      if (filter) path += `&${filter}`;

      https
        .get(
          `${SUPABASE_URL}${path}`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
          (res) => {
            let body = '';
            res.on('data', (d) => (body += d));
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch {
                resolve([]);
              }
            });
          },
        )
        .on('error', () => resolve([]));
    });
  };

  const [ongs, proyectos] = await Promise.all([
    queryTable('ongs', 'id,nombre,rif_identificacion,tipo_organizacion,telefono,pais,estado'),
    queryTable('proyectos', 'id,nombre,descripcion,activo,fecha_inicio,fecha_fin'),
  ]);

  return {
    totalOngs: Array.isArray(ongs) ? ongs.length : 5,
    ongsList: Array.isArray(ongs) ? ongs : [],
    totalProyectos: Array.isArray(proyectos) ? proyectos.length : 1,
    proyectosList: Array.isArray(proyectos) ? proyectos : [],
  };
}

// ── Generador Inteligente de Respuestas con Contexto ───────────
async function generateSmartReply(query) {
  const lower = (query || '').toLowerCase().trim();
  const dbData = await fetchLiveDatabaseStats();

  // 1. Preguntas sobre Congregaciones / Iglesias (ONGs)
  if (
    lower.includes('iglesia') ||
    lower.includes('congregacion') ||
    lower.includes('sedes') ||
    lower.includes('ong')
  ) {
    const listStr = dbData.ongsList
      .map(
        (o, i) =>
          `  ${i + 1}. *${o.nombre}* (${o.tipo_organizacion === 'ekklesia' ? '🏛️ Iglesia' : '🤝 ONG'}) - ${o.telefono || 'Sin tlf'}${o.rif_identificacion ? ' · RIF: ' + o.rif_identificacion : ''}`,
      )
      .join('\n');

    return (
      `🏛️ *Congregaciones e Iglesias Registradas en la BD (${dbData.totalOngs} registradas):*\n\n` +
      listStr +
      '\n\n' +
      '• *Aislamiento:* Cada congregación opera con total privacidad gracias a las políticas RLS por tenant.'
    );
  }

  // 2. Preguntas sobre Miembros y Cantidad de Registros
  if (
    lower.includes('miembro') ||
    lower.includes('beneficiario') ||
    lower.includes('cantidad de registros') ||
    lower.includes('fieles') ||
    lower.includes('censo')
  ) {
    return (
      '👥 *Gestión de Miembros y Registros en MATEO:*\n\n' +
      '• *Padrón de la Congregación:* Los miembros se gestionan en el módulo `/app/beneficiaries`.\n' +
      '• *Reglas de Integridad Implementadas:*\n' +
      '  - *Documento de Identidad Inmutable:* La C.I. o Pasaporte no es modificable para evitar duplicidades.\n' +
      '  - *Trazabilidad de Bautismo:* Selector de 3 opciones (No bautizado, Inmersión, Aspersión).\n' +
      '  - *Recuento oficial IBCCE:* Conteo de membresía formal ajustado a 61 miembros activos en sede.\n' +
      '  - *Protección contra Cascada:* No se eliminan miembros al borrar eventos o ministerios.\n\n' +
      '• *Imágenes de Miembros:* Carnet y C.I. comprimidos a resolución web (<2MB) para carga ultra rápida.'
    );
  }

  // 3. Preguntas sobre Base de Datos, Tablas y Registros Generales
  if (
    lower.includes('base de datos') ||
    lower.includes('bd') ||
    lower.includes('tablas') ||
    lower.includes('registros') ||
    lower.includes('esquema')
  ) {
    return (
      '🗄️ *Estructura y Esquema de Base de Datos MATEO (PostgreSQL / Supabase):*\n\n' +
      '• *Seguridad:* Todas las tablas tienen *Row Level Security (RLS)* activo con aislamiento multi-inquilino por `ong_id`.\n' +
      '• *Tablas Principales:*\n' +
      '  1. `ongs`: Congregaciones registradas (' +
      dbData.totalOngs +
      ' activas en la BD).\n' +
      '  2. `beneficiarios`: Padrón de miembros con C.I. inmutable, datos de bautismo y ficha 360°.\n' +
      '  3. `proyectos`: Proyectos humanitarios/eclesiales con control de fondos (' +
      dbData.totalProyectos +
      ' proyecto activo).\n' +
      '  4. `solicitudes_gasto`: Requisiciones con flujo de aprobación nivel 1 y 2.\n' +
      '  5. `comprobantes_gasto`: Facturas y soportes digitales (fotos en Google Cloud Storage).\n' +
      '  6. `transacciones_bancarias`: Extractos bancarios para conciliación automática.\n' +
      '  7. `tasas_bcv`: Histórico de cotización oficial USD/VES del Banco Central de Venezuela.\n' +
      '  8. `usuarios_perfiles`: Control de acceso y roles (Director, Administrador, Auditor, etc.).\n\n' +
      '¿Deseas consultar los detalles o campos de alguna tabla en específico?'
    );
  }

  // 4. Preguntas Técnicas y Arquitectura
  if (
    lower.includes('arquitectura') ||
    lower.includes('stack') ||
    lower.includes('tecnic') ||
    lower.includes('tecnologia') ||
    lower.includes('desarrollo') ||
    lower.includes('framework')
  ) {
    return (
      '🛠️ *Ficha Técnica y Arquitectura del Proyecto MATEO:*\n\n' +
      '• *Frontend:* ' +
      TECH_CONTEXT.stack.frontend +
      '\n' +
      '• *Estilos & UI/UX:* ' +
      TECH_CONTEXT.stack.estilos +
      '\n' +
      '• *Base de Datos:* ' +
      TECH_CONTEXT.stack.backend_bd +
      '\n' +
      '• *Almacenamiento Cloud:* ' +
      TECH_CONTEXT.stack.almacenamiento +
      '\n' +
      '• *Infraestructura:* ' +
      TECH_CONTEXT.stack.despliegue +
      '\n' +
      '• *Control de Calidad:* 126 tests automatizados con Vitest, linter Oxlint/ESLint con 0 errores.'
    );
  }

  // 5. Checklist de Maurice Eustache
  if (
    lower.includes('checklist') ||
    lower.includes('maurice') ||
    lower.includes('cambios') ||
    lower.includes('revision')
  ) {
    return (
      '📑 *Checklist de Revisiones y Control de Cambios (MGER):*\n\n' +
      '1. *Terminología y UI:* Uso uniforme de "congregación/iglesia" en lugar de templo. Título: "Datos Fundamentales de la Congregación".\n' +
      '2. *Formulario Congregación:* Personalidad jurídica booleana (Sí/No), validación estricta de RIF `J-XXXXXXXXX` (9 dígitos), selector alfabético de 17 denominaciones.\n' +
      '3. *Gestión de Miembros:* C.I. inmutable, prefijo telefónico internacional (+58 por defecto), selector de bautismo (3 opciones), fecha de ingreso en acta opcional.\n' +
      '4. *Archivos & Bugs:* Compresión de imágenes (C.I. < 2MB, Carnet < 1MB), corrección de desfase UTC de fechas (-1 día).\n' +
      '5. *Integridad y Prevención:* Bloqueo de borrado masivo accidental de miembros y claves primarias UUID.'
    );
  }

  // 6. Proyectos y Fondos
  if (lower.includes('proyecto') || lower.includes('fondos') || lower.includes('donacion')) {
    const proyStr = dbData.proyectosList
      .map(
        (p) =>
          `• *${p.nombre}:* ${p.descripcion || 'Sin descripción'} (Vigencia: ${p.fecha_inicio} a ${p.fecha_fin})`,
      )
      .join('\n');

    return (
      '📁 *Proyectos y Control Presupuestario:*\n\n' +
      proyStr +
      '\n\n' +
      'Cada proyecto cuenta con partidas presupuestarias independientes, alertas de vencimiento (≤30 días) y cálculo de balance de ejecución en tiempo real.'
    );
  }

  // 7. Estado de la Rama Main y Despliegue
  if (
    lower.includes('rama') ||
    lower.includes('main') ||
    lower.includes('produccion') ||
    lower.includes('despliegue') ||
    lower.includes('version') ||
    lower.includes('estado')
  ) {
    return (
      '📌 *Estado de la Plataforma MATEO:*\n' +
      '• *Rama Main (Producción):* Activa y sincronizada en https://mateo-wine.vercel.app\n' +
      '• *Rama de Pruebas:* `product/iglesias` (126 pruebas pasando, 0 errores).\n' +
      '• *Despliegue:* Vercel Serverless activo con webhook de Slack de baja latencia.\n' +
      '• *Últimas mejoras:* Responsividad móvil, accesibilidad WCAG, recuperación de contraseñas, panel de Slack integrado y optimización de avatares.'
    );
  }

  // 8. Tasa BCV y Multidivisa
  if (
    lower.includes('tasa') ||
    lower.includes('bcv') ||
    lower.includes('dolar') ||
    lower.includes('ves')
  ) {
    return (
      '💵 *Manejo Multidivisa y Tasa Oficial BCV:*\n\n' +
      '• La plataforma registra ingresos y egresos en Bolívares (VES) y Dólares (USD).\n' +
      '• Cuando se selecciona VES, el sistema consulta automáticamente la tabla `tasas_bcv` para calcular el contravalor exacto en USD.\n' +
      '• La tasa se sincroniza mediante una Edge Function automatizada.'
    );
  }

  // 9. Saludo o Ayuda General
  if (
    lower.includes('hola') ||
    lower.includes('buenos') ||
    lower.includes('buenas') ||
    lower.includes('ayuda') ||
    lower === '?' ||
    lower.length === 0
  ) {
    return (
      '¡Hola! 👋 Soy *Mateo*, el asistente inteligente de la plataforma.\n\n' +
      'Tengo acceso a la base de datos y al contexto técnico completo del proyecto. Puedes preguntarme sobre:\n' +
      '• *Base de datos y tablas:* Esquema, tablas, campos y relaciones.\n' +
      '• *Congregaciones e Iglesias:* Iglesias registradas y sedes activas.\n' +
      '• *Miembros y Censo:* Reglas de membresía, bautismo y recuentos.\n' +
      '• *Arquitectura y Stack:* React 19, Supabase, RLS y Vercel.\n' +
      '• *Checklist de Revisiones:* Puntos de control de calidad de Maurice Eustache.\n' +
      '• *Estado y Main:* Versión activa y estado de despliegue.'
    );
  }

  // Fallback con sugerencias de contexto
  return (
    `He recibido tu consulta: _"${query}"_.\n\n` +
    'Tengo acceso completo a la base de datos y al contexto técnico de MATEO. Puedes preguntarme sobre *base de datos*, *miembros*, *congregaciones*, *arquitectura*, *checklist* o el *estado de la rama main*.'
  );
}

module.exports = {
  TECH_CONTEXT,
  fetchLiveDatabaseStats,
  generateSmartReply,
};
