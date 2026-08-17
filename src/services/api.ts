import { supabase } from '../supabaseClient';
import type { UserRole } from '../context/AuthContext';
export type { UserRole };
import { uploadToGCS } from './storage';

// Interfaces del Dominio
export interface Donante {
  id: string;
  nombre: string;
  tipo: 'nacional' | 'extranjero';
  pais?: string;
  contacto?: string;
  email?: string;
  activo: boolean;
}

export interface Project {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string;
  overhead_porcentaje?: number;
  donante_id?: string | null;
  ong_id?: string;
  ongs?: {
    nombre: string;
  } | null;
}

export interface ExpenseCategory {
  id: string;
  nombre: string;
  descripcion: string;
  ong_id?: string;
  /** true cuando es parte del catálogo estándar UNDG compartido */
  es_catalogo_undg?: boolean;
}

export interface PartidaGasto {
  id: string;
  categoria_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  ong_id?: string;
  /** true cuando es parte del catálogo estándar UNDG compartido */
  es_catalogo_undg?: boolean;
}

export interface Budget {
  id: string;
  proyecto_id: string;
  partida_id: string;
  monto_asignado: number;
  monto_ejecutado: number;
  monto_comprometido: number;
  periodo: string;
}

export interface BankTransaction {
  id: string;
  fecha: string;
  referencia: string;
  descripcion: string;
  monto: number; // Positivo = Ingreso, Negativo = Egreso
  estado: 'pendiente' | 'conciliado';
  csv_metadata?: {
    rowNumber?: number;
    fileName?: string;
    moneda?: 'USD' | 'VES';
  } | null;
}

export interface TasaBCV {
  id: string;
  fecha: string;
  tasa: number;
  fuente: 'bcv_api' | 'manual' | 'historico_csv';
  created_at: string;
}

export interface Donation {
  id: string;
  proyecto_id: string | null;
  transaccion_id: string | null;
  donante: string;
  monto: number; // compatible con monto_usd
  descripcion: string;
  fecha: string;
  moneda: 'USD' | 'VES';
  medio_pago: 'efectivo' | 'transferencia';
  monto_original: number;
  tasa_bcv: number | null;
  monto_usd: number;
  monto_ves: number | null;
  created_at?: string;
}

export interface Jornada {
  id: string;
  nombre: string;
  fecha: string;
  beneficios_entregados: string;
  proyecto_id: string;
  activa: boolean;
  ong_id?: string;
  created_at?: string;
}

export interface Beneficiary {
  id: string;
  jornada_id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  sexo: string;
  fecha_nacimiento: string;
  tipo_donacion?: string[];
  url_firma: string | null;
  ip_captura?: string;
  ong_id?: string;
  created_at: string;
  // Campos extendidos de Miembro (Ekklesia)
  direccion?: string;
  telefono?: string;
  email?: string;
  redes_sociales?: string;
  foto_url?: string | null;
  foto_cedula_url?: string | null;
  bautizado?: boolean;
  grado_instruccion?: string;
  enfermedad?: string;
  fecha_membresia?: string;
  huella_url?: string | null;
  cargo_eclesiastico?:
    | 'PASTOR / OBISPO O SIMILAR'
    | 'DIÁCONO / ANCIANO O SIMILAR'
    | 'MINISTRO / COORDINADOR / LÍDER O SIMILAR'
    | 'MIEMBRO GENERAL';
  areas_ministeriales?: (
    'PROCLAMACIÓN' | 'ENSEÑANZA' | 'SERVICIO' | 'COMPAÑERISMO' | 'ADORACIÓN'
  )[];
}

export interface ExpenseReceipt {
  id: string;
  proyecto_id: string;
  partida_id: string;
  transaccion_id: string | null;
  solicitante_id: string;
  solicitante_nombre?: string;
  monto: number;
  descripcion: string;
  fecha_gasto: string;
  url_comprobante: string | null;
  url_pago: string | null;
  solicitud_id?: string | null;
  estado: 'pendiente_soporte' | 'pendiente_revision' | 'aprobado' | 'rechazado';
  comentarios_auditoria: string | null;
  auditado_por?: string;
  auditado_at?: string;
  ong_id?: string;
}

export interface ProjectExecutionMetric {
  id?: string;
  nombre: string;
  Presupuesto: number;
  Ejecutado: number;
}

export interface DashboardMetrics {
  totalInflows: number;
  reconciledInflows: number;
  unreconciledInflows: number;
  totalOutflows: number;
  expensesByCategory: Record<string, number>;
  projectExecution: ProjectExecutionMetric[];
}

export interface UserWithOng {
  id: string;
  email: string;
  nombre_completo: string;
  rol: UserRole;
  aprobado: boolean;
  ong_id: string;
  created_at: string;
  ongs?: {
    nombre: string;
  } | null;
}

export interface CreateOngParams {
  nombre: string;
  logoUrl?: string | null;
  rif_identificacion?: string | null;
  pais?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  sitio_web?: string | null;
  plan?: 'trial' | 'pro' | 'enterprise';
  estado?: 'trial' | 'activo' | 'suspendido';
  tipo_organizacion?: 'ong' | 'ekklesia';
}

export interface UpdateOngParams {
  nombre?: string;
  logo_url?: string | null;
  tipo_organizacion?: 'ong' | 'ekklesia';
  rif_identificacion?: string | null;
  pais?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  sitio_web?: string | null;
}

export interface Ong {
  id: string;
  nombre: string;
  logo_url: string | null;
  rif_identificacion?: string | null;
  pais?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  sitio_web?: string | null;
  plan?: 'trial' | 'pro' | 'enterprise';
  estado?: 'trial' | 'activo' | 'suspendido';
  tipo_organizacion?: 'ong' | 'ekklesia';
  trial_ends_at?: string | null;
  created_at?: string;
}

export interface Invitation {
  id: string;
  ong_id: string;
  email: string;
  rol: UserRole;
  token: string;
  estado: 'pendiente' | 'aceptada' | 'expirada';
  invitado_por?: string | null;
  created_at: string;
  expires_at: string;
  ong_nombre?: string;
}

// Determinar si Supabase está configurado correctamente
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return (
    url && url !== 'https://placeholder-url.supabase.co' && key && key !== 'placeholder-anon-key'
  );
};

export const isSimulationMode = !isSupabaseConfigured();

// =========================================================================
// MOCK DATA PARA MODO SIMULACIÓN (INSPIRADO EN CNBV)
// =========================================================================
const INITIAL_DONANTES: Donante[] = [
  // Nacionales
  {
    id: 'don-nac-1',
    nombre: 'Fondo Lazos de Amor',
    tipo: 'nacional',
    pais: 'Venezuela',
    contacto: '',
    email: '',
    activo: true,
  },
  // Extranjeros
  {
    id: 'don-ext-1',
    nombre: 'Alianza Bautista Mundial',
    tipo: 'extranjero',
    pais: 'Internacional',
    contacto: '',
    email: '',
    activo: true,
  },
  {
    id: 'don-ext-2',
    nombre: 'Tearfund',
    tipo: 'extranjero',
    pais: 'Reino Unido',
    contacto: '',
    email: '',
    activo: true,
  },
  {
    id: 'don-ext-3',
    nombre: 'Junta Misionera Internacional',
    tipo: 'extranjero',
    pais: 'Estados Unidos',
    contacto: '',
    email: '',
    activo: true,
  },
  {
    id: 'don-ext-4',
    nombre: 'Convención Bautista Europea',
    tipo: 'extranjero',
    pais: 'Europa',
    contacto: '',
    email: '',
    activo: true,
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    nombre: 'Proyecto Alimentación Infantil Zulia',
    descripcion:
      'Programa de comedores comunitarios para niños en comunidades vulnerables de Maracaibo y San Francisco.',
    activo: true,
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-12-31',
    overhead_porcentaje: 7.0,
    donante_id: 'don-ext-1',
  },
  {
    id: 'proj-2',
    nombre: 'Operación Ayuda Médica Apure',
    descripcion:
      'Distribución de insumos médicos básicos, medicinas de control y jornadas médicas gratuitas en zonas fronterizas.',
    activo: true,
    fecha_inicio: '2026-02-15',
    fecha_fin: '2026-08-31',
    overhead_porcentaje: 8.5,
    donante_id: 'don-ext-3',
  },
  {
    id: 'proj-3',
    nombre: 'Logística y Refugios Táchira',
    descripcion:
      'Apoyo con albergues temporales, mantas, agua potable y enseres para familias damnificadas por lluvias.',
    activo: true,
    fecha_inicio: '2026-03-01',
    fecha_fin: '2026-09-30',
    overhead_porcentaje: 10.0,
    donante_id: 'don-nac-1',
  },
];

const INITIAL_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'cat-1',
    nombre: '1. Costos Directos de Intervención (Bienes y Servicios)',
    descripcion: 'Compra y distribución de bienes de ayuda y atención humanitaria directa.',
  },
  {
    id: 'cat-2',
    nombre: '2. Costos de Transporte, Logística y Almacenamiento',
    descripcion: 'Fletes, almacenamiento y movilización local de suministros de ayuda.',
  },
  {
    id: 'cat-3',
    nombre: '3. Costos de Personal (Recursos Humanos)',
    descripcion: 'Salarios, honorarios y pólizas de seguros del personal asignado.',
  },
  {
    id: 'cat-4',
    nombre: '4. Gastos de Oficina y Funcionamiento (Costos Indirectos y Operativos)',
    descripcion: 'Costos operativos de bases de campo, seguridad y gastos indirectos (overhead).',
  },
  {
    id: 'cat-5',
    nombre: '5. Visibilidad, Monitoreo y Evaluación',
    descripcion:
      'Reportes obligatorios, rendición de cuentas, auditorías y material de visibilidad de donantes.',
  },
];

const INITIAL_PARTIDAS: PartidaGasto[] = [
  // Categoría 1
  {
    id: 'part-11',
    categoria_id: 'cat-1',
    codigo: '1.1',
    nombre: 'Artículos No Alimentarios (NFI)',
    descripcion: 'Compra y distribución de kits de emergencia, lonas, carpas, mantas, utensilios.',
  },
  {
    id: 'part-12',
    categoria_id: 'cat-1',
    codigo: '1.2',
    nombre: 'Agua, Saneamiento e Higiene (WASH)',
    descripcion:
      'Letrinas de emergencia, pastillas potabilizadoras, camiones cisterna, kits de higiene.',
  },
  {
    id: 'part-13',
    categoria_id: 'cat-1',
    codigo: '1.3',
    nombre: 'Asistencia Sanitaria de Urgencia',
    descripcion:
      'Medicamentos esenciales, clínicas móviles, insumos de trauma, generadores de clínicas.',
  },
  {
    id: 'part-14',
    categoria_id: 'cat-1',
    codigo: '1.4',
    nombre: 'Seguridad Alimentaria y Nutrición',
    descripcion: 'Alimentos de primera necesidad y suplementos nutricionales.',
  },
  {
    id: 'part-15',
    categoria_id: 'cat-1',
    codigo: '1.5',
    nombre: 'Programas de Transferencias Monetarias (PTM)',
    descripcion: 'Dinero en efectivo o vales entregados directamente a beneficiarios.',
  },

  // Categoría 2
  {
    id: 'part-21',
    categoria_id: 'cat-2',
    codigo: '2.1',
    nombre: 'Transporte y Envíos',
    descripcion: 'Fletes terrestres, marítimos o aéreos para movilizar la ayuda.',
  },
  {
    id: 'part-22',
    categoria_id: 'cat-2',
    codigo: '2.2',
    nombre: 'Almacenamiento',
    descripcion: 'Alquiler de bodegas, almacenes temporales y costos de estiba.',
  },
  {
    id: 'part-23',
    categoria_id: 'cat-2',
    codigo: '2.3',
    nombre: 'Logística Local',
    descripcion: 'Combustible local, peajes, alquiler de vehículos 4x4 de operación.',
  },

  // Categoría 3
  {
    id: 'part-31',
    categoria_id: 'cat-3',
    codigo: '3.1',
    nombre: 'Personal Local e Internacional',
    descripcion: 'Salarios y dietas de coordinadores, médicos, ingenieros WASH y logistas.',
  },
  {
    id: 'part-32',
    categoria_id: 'cat-3',
    codigo: '3.2',
    nombre: 'Seguridad Social y Seguros',
    descripcion: 'Pólizas de seguro médico y accidentes de riesgo especial para zonas de desastre.',
  },

  // Categoría 4
  {
    id: 'part-41',
    categoria_id: 'cat-4',
    codigo: '4.1',
    nombre: 'Costos de Oficina sobre el Terreno',
    descripcion: 'Alquiler de oficinas/bases, internet satelital, luz, agua y papelería contable.',
  },
  {
    id: 'part-42',
    categoria_id: 'cat-4',
    codigo: '4.2',
    nombre: 'Gestión de Seguridad',
    descripcion:
      'Equipamiento de comunicación (radios VHF), personal de vigilancia, kits de evacuación.',
  },
  {
    id: 'part-43',
    categoria_id: 'cat-4',
    codigo: '4.3',
    nombre: 'Costos Indirectos (Overhead)',
    descripcion: 'Porcentaje destinado a gastos centrales de administración contable de la sede.',
  },

  // Categoría 5
  {
    id: 'part-51',
    categoria_id: 'cat-5',
    codigo: '5.1',
    nombre: 'Visibilidad',
    descripcion:
      'Banners, chalecos identificadores de personal, y calcomanías para logos de donantes.',
  },
  {
    id: 'part-52',
    categoria_id: 'cat-5',
    codigo: '5.2',
    nombre: 'Monitoreo, Evaluación y Rendición de Cuentas',
    descripcion: 'Viajes de control de hitos, auditorías del proyecto y elaboración de reportes.',
  },
];

const INITIAL_BUDGETS: Budget[] = [
  // Proyecto 1
  {
    id: 'b-1',
    proyecto_id: 'proj-1',
    partida_id: 'part-14',
    monto_asignado: 15000.0,
    monto_ejecutado: 4850.0,
    monto_comprometido: 0,
    periodo: '2026-ANUAL',
  },
  {
    id: 'b-2',
    proyecto_id: 'proj-1',
    partida_id: 'part-23',
    monto_asignado: 3000.0,
    monto_ejecutado: 1200.0,
    monto_comprometido: 0,
    periodo: '2026-ANUAL',
  },
  {
    id: 'b-3',
    proyecto_id: 'proj-1',
    partida_id: 'part-41',
    monto_asignado: 1000.0,
    monto_ejecutado: 350.0,
    monto_comprometido: 0,
    periodo: '2026-ANUAL',
  },
  // Proyecto 2
  {
    id: 'b-4',
    proyecto_id: 'proj-2',
    partida_id: 'part-13',
    monto_asignado: 25000.0,
    monto_ejecutado: 12500.0,
    monto_comprometido: 0,
    periodo: '2026-ANUAL',
  },
  {
    id: 'b-5',
    proyecto_id: 'proj-2',
    partida_id: 'part-23',
    monto_asignado: 4000.0,
    monto_ejecutado: 890.0,
    monto_comprometido: 0,
    periodo: '2026-ANUAL',
  },
  // Proyecto 3
  {
    id: 'b-6',
    proyecto_id: 'proj-3',
    partida_id: 'part-22',
    monto_asignado: 10000.0,
    monto_ejecutado: 6200.0,
    monto_comprometido: 0,
    periodo: '2026-ANUAL',
  },
];

const INITIAL_BANK_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'tx-1',
    fecha: '2026-06-01',
    referencia: 'REF-82910',
    descripcion: 'TRANSFERENCIA RECIBIDA DONANTE ALIANZA BAUTISTA',
    monto: 35000.0,
    estado: 'pendiente',
  },
  {
    id: 'tx-2',
    fecha: '2026-06-02',
    referencia: 'REF-33412',
    descripcion: 'DONACION OFRENDA TEMPLO METROPOLITANO CARACAS',
    monto: 12000.0,
    estado: 'pendiente',
  },
  {
    id: 'tx-3',
    fecha: '2026-06-05',
    referencia: 'PAGO-88122',
    descripcion: 'COMPRA DROGUERIA FARMA-SALUD SUMINISTROS',
    monto: -12500.0,
    estado: 'pendiente',
  },
  {
    id: 'tx-4',
    fecha: '2026-06-10',
    referencia: 'REF-92011',
    descripcion: 'PAGO ALIMENTOS POLAR COMEDOR MARACAIBO',
    monto: -4850.0,
    estado: 'pendiente',
  },
  {
    id: 'tx-5',
    fecha: '2026-06-12',
    referencia: 'PAGO-00129',
    descripcion: 'COMPRA COLCHONES REFUGIO SAN CRISTOBAL',
    monto: -6200.0,
    estado: 'pendiente',
  },
  {
    id: 'tx-6',
    fecha: '2026-06-15',
    referencia: 'RET-33100',
    descripcion: 'PAGO RECTIFICACION FLETE CAMIONES VALENCIA',
    monto: -1200.0,
    estado: 'pendiente',
  },
  {
    id: 'tx-7',
    fecha: '2026-06-18',
    referencia: 'PAGO-55291',
    descripcion: 'FACTURA ESTACION SERVICIO EL PACIFICO COMB',
    monto: -890.0,
    estado: 'pendiente',
  },
  {
    id: 'tx-8',
    fecha: '2026-06-20',
    referencia: 'REF-11928',
    descripcion: 'TRANSFERENCIA RECIBIDA IGLESIA LAS ACACIAS',
    monto: 5000.0,
    estado: 'pendiente',
  },
  {
    id: 'tx-9',
    fecha: '2026-06-22',
    referencia: 'PAGO-38190',
    descripcion: 'COMPRA MATERIAL SANITARIO FARMACIA SOCIAL',
    monto: -820.0,
    estado: 'pendiente',
  },
];

const INITIAL_EXPENSES: ExpenseReceipt[] = [
  {
    id: 'exp-1',
    proyecto_id: 'proj-1',
    partida_id: 'part-14',
    transaccion_id: null,
    solicitante_id: 'coord-1',
    solicitante_nombre: 'José Rodríguez (Coordinador Zulia)',
    monto: 4850.0,
    descripcion:
      'Compra de víveres, arroz, granos y harina para el comedor infantil Maracaibo Oeste.',
    fecha_gasto: '2026-06-08',
    url_comprobante: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=600',
    url_pago: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600',
    estado: 'pendiente_revision',
    comentarios_auditoria: null,
  },
  {
    id: 'exp-2',
    proyecto_id: 'proj-2',
    partida_id: 'part-13',
    transaccion_id: null,
    solicitante_id: 'coord-2',
    solicitante_nombre: 'Hna. María Gómez (Coordinadora Médica)',
    monto: 12500.0,
    descripcion:
      'Compra de antibióticos y analgésicos para las jornadas de salud en el Alto Apure.',
    fecha_gasto: '2026-06-04',
    url_comprobante: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600',
    url_pago: null,
    estado: 'pendiente_revision',
    comentarios_auditoria: null,
  },
  {
    id: 'exp-3',
    proyecto_id: 'proj-3',
    partida_id: 'part-22',
    transaccion_id: 'tx-5', // Pre-conciliado en el mock
    solicitante_id: 'coord-3',
    solicitante_nombre: 'Carlos Silva (Logística Táchira)',
    monto: 6200.0,
    descripcion:
      'Adquisición de 40 colchonetas y mantas térmicas para el Refugio Bautista San Cristóbal.',
    fecha_gasto: '2026-06-11',
    url_comprobante: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=600',
    url_pago: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600',
    estado: 'aprobado',
    comentarios_auditoria: 'Soporte y factura fiscal adjuntos. Conciliación automática correcta.',
  },
  {
    id: 'exp-4',
    proyecto_id: 'proj-1',
    partida_id: 'part-23',
    transaccion_id: 'tx-6',
    solicitante_id: 'coord-1',
    solicitante_nombre: 'José Rodríguez (Coordinador Zulia)',
    monto: 1200.0,
    descripcion: 'Pago de flete camión con comida desde el Centro Bautista en Caracas a Maracaibo.',
    fecha_gasto: '2026-06-14',
    url_comprobante: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=600',
    url_pago: null,
    estado: 'aprobado',
    comentarios_auditoria: 'Recibo de flete verificado.',
  },
];

const INITIAL_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben-001',
    jornada_id: 'jor-mock',
    nombre: 'Maria',
    apellido: 'Gonzalez',
    cedula: '12345678',
    sexo: 'Femenino',
    fecha_nacimiento: '1980-05-15',
    url_firma: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ben-002',
    jornada_id: 'jor-mock',
    nombre: 'Jose',
    apellido: 'Perez',
    cedula: 'V-87654321',
    sexo: 'Femenino',
    fecha_nacimiento: '1992-10-22',
    url_firma: null,
    created_at: new Date(Date.now() - 86400000).toISOString(), // Ayer
  },
];

const INITIAL_TASAS_BCV: TasaBCV[] = [
  {
    id: 'rate-1',
    fecha: '2026-07-04',
    tasa: 652.9726,
    fuente: 'bcv_api',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rate-2',
    fecha: '2026-07-03',
    tasa: 652.9726,
    fuente: 'bcv_api',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rate-3',
    fecha: '2026-07-02',
    tasa: 651.5,
    fuente: 'bcv_api',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rate-4',
    fecha: '2026-07-01',
    tasa: 650.12,
    fuente: 'bcv_api',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_DONATIONS: Donation[] = [
  {
    id: 'don-1',
    proyecto_id: 'proj-1',
    transaccion_id: null,
    donante: 'Alianza Bautista Internacional',
    monto: 35000.0,
    descripcion: 'Fondo internacional etiquetado para Zulia.',
    fecha: '2026-06-01',
    moneda: 'USD',
    medio_pago: 'transferencia',
    monto_original: 35000.0,
    tasa_bcv: null,
    monto_usd: 35000.0,
    monto_ves: null,
  },
];

// Helper para inicializar LocalStorage en modo simulación
const initLocalStorage = () => {
  if (!localStorage.getItem('cnbv_donantes')) {
    localStorage.setItem('cnbv_donantes', JSON.stringify(INITIAL_DONANTES));
  }
  if (!localStorage.getItem('cnbv_projects')) {
    localStorage.setItem('cnbv_projects', JSON.stringify(INITIAL_PROJECTS));
  }
  if (!localStorage.getItem('cnbv_categories')) {
    localStorage.setItem('cnbv_categories', JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem('cnbv_budgets')) {
    localStorage.setItem('cnbv_budgets', JSON.stringify(INITIAL_BUDGETS));
  }
  if (!localStorage.getItem('cnbv_bank_transactions')) {
    localStorage.setItem('cnbv_bank_transactions', JSON.stringify(INITIAL_BANK_TRANSACTIONS));
  }
  if (!localStorage.getItem('cnbv_expenses')) {
    localStorage.setItem('cnbv_expenses', JSON.stringify(INITIAL_EXPENSES));
  }
  if (!localStorage.getItem('cnbv_donations')) {
    localStorage.setItem('cnbv_donations', JSON.stringify(INITIAL_DONATIONS));
  }
  if (!localStorage.getItem('cnbv_requisitions')) {
    localStorage.setItem('cnbv_requisitions', JSON.stringify([]));
  }
  if (!localStorage.getItem('cnbv_partidas')) {
    localStorage.setItem('cnbv_partidas', JSON.stringify(INITIAL_PARTIDAS));
  }
  if (!localStorage.getItem('cnbv_tasas_bcv')) {
    localStorage.setItem('cnbv_tasas_bcv', JSON.stringify(INITIAL_TASAS_BCV));
  }
  if (!localStorage.getItem('cnbv_beneficiaries')) {
    localStorage.setItem('cnbv_beneficiaries', JSON.stringify(INITIAL_BENEFICIARIES));
  }
};

if (isSimulationMode) {
  initLocalStorage();
}

let seedingPromise: Promise<void> | null = null;

const ensureCategoriesAndPartidas = async () => {
  if (isSimulationMode) return;

  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    const { data: cats, error: errCats } = await supabase.from('categorias_gasto').select('id');
    if (errCats) throw errCats;

    if (!cats || cats.length === 0) {
      const seededCats: ExpenseCategory[] = [];
      for (const cat of INITIAL_CATEGORIES) {
        const { data: newCat, error: insertError } = await supabase
          .from('categorias_gasto')
          .insert([{ nombre: cat.nombre, descripcion: cat.descripcion }])
          .select()
          .single();
        if (insertError) throw insertError;
        seededCats.push(newCat as ExpenseCategory);
      }

      const catMap: Record<string, string> = {
        'cat-1': seededCats.find((c) => c.nombre.startsWith('1.'))!.id,
        'cat-2': seededCats.find((c) => c.nombre.startsWith('2.'))!.id,
        'cat-3': seededCats.find((c) => c.nombre.startsWith('3.'))!.id,
        'cat-4': seededCats.find((c) => c.nombre.startsWith('4.'))!.id,
        'cat-5': seededCats.find((c) => c.nombre.startsWith('5.'))!.id,
      };

      const partidasToInsert = INITIAL_PARTIDAS.map((p) => ({
        categoria_id: catMap[p.categoria_id],
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
      }));

      const { error: partError } = await supabase.from('partidas_gasto').insert(partidasToInsert);
      if (partError) throw partError;
    }
  })();

  try {
    await seedingPromise;
  } catch (e) {
    seedingPromise = null;
    throw e;
  }
};

// =========================================================================
// SERVICIOS / MÉTODOS DE LA API (SUPABASE O LOCALSTORAGE)
// =========================================================================
export const api = {
  // --- DONANTES ---
  getDonantes: async (): Promise<Donante[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('donantes').select('*').order('nombre');
      if (error) throw error;
      return data as Donante[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_donantes') || '[]');
    }
  },

  createDonante: async (donante: Omit<Donante, 'id'>, ongId?: string): Promise<Donante> => {
    if (!isSimulationMode) {
      const payload = ongId ? { ...donante, ong_id: ongId } : donante;
      const { data, error } = await supabase.from('donantes').insert([payload]).select().single();
      if (error) throw error;
      return data as Donante;
    } else {
      const donantes = JSON.parse(localStorage.getItem('cnbv_donantes') || '[]');
      const newDonante = {
        ...donante,
        id: `don-${Date.now()}`,
        ...(ongId ? { ong_id: ongId } : {}),
      };
      donantes.push(newDonante);
      localStorage.setItem('cnbv_donantes', JSON.stringify(donantes));
      return newDonante;
    }
  },

  // --- PROYECTOS ---
  getProjects: async (): Promise<Project[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*, ongs (nombre)')
        .order('nombre');
      if (error) throw error;
      return data as Project[];
    } else {
      // Resolve ongs join from localStorage so PDF names are correct
      const projects: Project[] = JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
      const ongs: Array<{ id: string; nombre: string }> = JSON.parse(
        localStorage.getItem('cnbv_ongs') || '[]',
      );
      return projects.map((p) => ({
        ...p,
        ongs: p.ong_id
          ? (ongs.find((o) => o.id === p.ong_id) ?? null)
            ? { nombre: ongs.find((o) => o.id === p.ong_id)!.nombre }
            : null
          : null,
      }));
    }
  },

  createProject: async (project: Omit<Project, 'id'>, ongId?: string): Promise<Project> => {
    if (!isSimulationMode) {
      const payload = ongId ? { ...project, ong_id: ongId } : project;
      const { data, error } = await supabase.from('proyectos').insert([payload]).select().single();
      if (error) throw error;
      return data as Project;
    } else {
      const projects = JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
      const newProject = {
        ...project,
        id: `proj-${Date.now()}`,
        ...(ongId ? { ong_id: ongId } : {}),
      };
      projects.push(newProject);
      localStorage.setItem('cnbv_projects', JSON.stringify(projects));
      return newProject;
    }
  },

  // --- CATEGORÍAS ---
  getCategories: async (): Promise<ExpenseCategory[]> => {
    if (!isSimulationMode) {
      await ensureCategoriesAndPartidas();
      const { data, error } = await supabase.from('categorias_gasto').select('*').order('nombre');
      if (error) throw error;
      return data as ExpenseCategory[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_categories') || '[]');
    }
  },

  // --- PARTIDAS ---
  getPartidas: async (): Promise<PartidaGasto[]> => {
    if (!isSimulationMode) {
      await ensureCategoriesAndPartidas();
      const { data, error } = await supabase.from('partidas_gasto').select('*').order('codigo');
      if (error) throw error;
      return data as PartidaGasto[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_partidas') || '[]');
    }
  },

  // --- DASHBOARD METRICS (RPC) ---
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.rpc('get_dashboard_metrics');
      if (error) throw error;
      return data as DashboardMetrics;
    } else {
      // Retorno simulado si no hay BD
      return {
        totalInflows: 0,
        reconciledInflows: 0,
        unreconciledInflows: 0,
        totalOutflows: 0,
        expensesByCategory: {},
        projectExecution: [],
      };
    }
  },

  // --- REPORTES Y AUDITORÍA ---
  getBudgets: async (): Promise<Budget[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('presupuestos').select('*');
      if (error) throw error;
      return data as Budget[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');
    }
  },

  // --- TRANSACCIONES BANCARIAS ---
  getBankTransactions: async (): Promise<BankTransaction[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('transacciones_bancarias')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as BankTransaction[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');
    }
  },

  getBankTransactionsPaginated: async (
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ data: BankTransaction[]; count: number }> => {
    if (!isSimulationMode) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('transacciones_bancarias')
        .select('*', { count: 'exact' })
        .order('fecha', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data as BankTransaction[], count: count || 0 };
    } else {
      const all = JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      return { data: all.slice(from, to), count: all.length };
    }
  },

  importBankTransactions: async (
    txs: Omit<BankTransaction, 'id' | 'estado'>[],
    ongId?: string,
  ): Promise<BankTransaction[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('transacciones_bancarias')
        .insert(
          txs.map((tx) => ({ ...tx, estado: 'pendiente', ...(ongId ? { ong_id: ongId } : {}) })),
        )
        .select();
      if (error) throw error;
      return data as BankTransaction[];
    } else {
      const current = JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');
      const newTxs = txs.map((tx) => ({
        ...tx,
        id: `tx-${Math.random().toString(36).substr(2, 9)}`,
        estado: 'pendiente' as const,
      }));
      const updated = [...newTxs, ...current];
      localStorage.setItem('cnbv_bank_transactions', JSON.stringify(updated));
      return newTxs;
    }
  },

  // --- EGRESOS / COMPROBANTES DE GASTO ---
  getExpenses: async (): Promise<ExpenseReceipt[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('comprobantes_gasto')
        .select('*')
        .order('fecha_gasto', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as ExpenseReceipt[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
    }
  },

  getExpensesPaginated: async (
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ data: ExpenseReceipt[]; count: number }> => {
    if (!isSimulationMode) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('comprobantes_gasto')
        .select('*', { count: 'exact' })
        .order('fecha_gasto', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data as ExpenseReceipt[], count: count || 0 };
    } else {
      const all = JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      return { data: all.slice(from, to), count: all.length };
    }
  },

  getRecentExpensesByUserId: async (
    userId: string,
    limit: number = 20,
  ): Promise<ExpenseReceipt[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('comprobantes_gasto')
        .select('*')
        .eq('solicitante_id', userId)
        .order('fecha_gasto', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ExpenseReceipt[];
    } else {
      const all: ExpenseReceipt[] = JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
      return all.filter((e) => e.solicitante_id === userId).slice(0, limit);
    }
  },

  getExpenseById: async (id: string): Promise<ExpenseReceipt | null> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('comprobantes_gasto')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as ExpenseReceipt;
    } else {
      const expenses = JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
      return expenses.find((e: ExpenseReceipt) => e.id === id) || null;
    }
  },

  createExpense: async (
    expense: Omit<
      ExpenseReceipt,
      'id' | 'estado' | 'comentarios_auditoria' | 'transaccion_id' | 'url_pago'
    >,
    file?: File,
    pagoFile?: File,
  ): Promise<ExpenseReceipt> => {
    let fileUrl: string | null = null;
    let pagoFileUrl: string | null = null;

    if (file) {
      if (!isSimulationMode) {
        // Subida a GCS y registro en documentos_adjuntos (Fase 1)
        const uploadResponse = await uploadToGCS(file);
        fileUrl = uploadResponse.url;
      } else {
        // En simulación convertimos a Base64 local o simulamos una URL
        fileUrl = URL.createObjectURL(file);
      }
    }

    if (pagoFile) {
      if (!isSimulationMode) {
        // Subida a GCS
        const uploadResponse = await uploadToGCS(pagoFile);
        pagoFileUrl = uploadResponse.url;
      } else {
        // En simulación convertimos a Base64 local o simulamos una URL
        pagoFileUrl = URL.createObjectURL(pagoFile);
      }
    }

    const newExpense: Omit<ExpenseReceipt, 'id'> = {
      ...expense,
      transaccion_id: null,
      estado: 'pendiente_revision',
      comentarios_auditoria: null,
      url_comprobante: fileUrl || expense.url_comprobante,
      url_pago: pagoFileUrl || null,
    };

    if (!isSimulationMode) {
      // Construcción estricta del payload para evitar cualquier propiedad fantasma (como solicitante_nombre)
      const dbExpense: Record<string, unknown> = {
        proyecto_id: newExpense.proyecto_id,
        partida_id: newExpense.partida_id,
        transaccion_id: newExpense.transaccion_id,
        solicitante_id: newExpense.solicitante_id,
        solicitud_id: newExpense.solicitud_id,
        monto: newExpense.monto,
        descripcion: newExpense.descripcion,
        fecha_gasto: newExpense.fecha_gasto,
        url_comprobante: newExpense.url_comprobante,
        url_pago: newExpense.url_pago,
        estado: newExpense.estado,
        comentarios_auditoria: newExpense.comentarios_auditoria,
      };
      if (expense.ong_id) dbExpense.ong_id = expense.ong_id;

      const { data, error } = await supabase
        .from('comprobantes_gasto')
        .insert([dbExpense])
        .select()
        .single();
      if (error) throw error;
      return data as ExpenseReceipt;
    } else {
      const expenses = JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
      const created = {
        ...newExpense,
        id: `exp-${Date.now()}`,
        solicitante_nombre: expense.solicitante_nombre || 'Coordinador de Campo',
      };
      expenses.unshift(created);
      localStorage.setItem('cnbv_expenses', JSON.stringify(expenses));
      return created;
    }
  },

  updateExpenseStatus: async (
    expenseId: string,
    estado: ExpenseReceipt['estado'],
    comentarios: string | null,
    auditorId: string,
  ): Promise<ExpenseReceipt> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('comprobantes_gasto')
        .update({
          estado,
          comentarios_auditoria: comentarios,
          auditado_por: auditorId,
          auditado_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .select()
        .single();
      if (error) throw error;
      return data as ExpenseReceipt;
    } else {
      const expenses = JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
      const index = expenses.findIndex((e: ExpenseReceipt) => e.id === expenseId);
      if (index === -1) throw new Error('Expense not found');

      const updated = {
        ...expenses[index],
        estado,
        comentarios_auditoria: comentarios,
        auditado_por: auditorId,
        auditado_at: new Date().toISOString(),
      };

      // Si se aprueba el gasto en modo simulación, actualizar la ejecución presupuestaria
      if (estado === 'aprobado' && expenses[index].estado !== 'aprobado') {
        const budgets = JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');
        const bIndex = budgets.findIndex(
          (b: Budget) =>
            b.proyecto_id === updated.proyecto_id && b.partida_id === updated.partida_id,
        );
        if (bIndex !== -1) {
          budgets[bIndex].monto_ejecutado += updated.monto;
          localStorage.setItem('cnbv_budgets', JSON.stringify(budgets));
        }
      } else if (estado !== 'aprobado' && expenses[index].estado === 'aprobado') {
        const budgets = JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');
        const bIndex = budgets.findIndex(
          (b: Budget) =>
            b.proyecto_id === updated.proyecto_id && b.partida_id === updated.partida_id,
        );
        if (bIndex !== -1) {
          budgets[bIndex].monto_ejecutado = Math.max(
            0,
            budgets[bIndex].monto_ejecutado - updated.monto,
          );
          localStorage.setItem('cnbv_budgets', JSON.stringify(budgets));
        }
      }

      expenses[index] = updated;
      localStorage.setItem('cnbv_expenses', JSON.stringify(expenses));
      return updated;
    }
  },

  // --- CONCILIACIÓN BANCARIA ---
  reconcileExpense: async (
    expenseId: string,
    transactionId: string,
  ): Promise<{ expense: ExpenseReceipt; transaction: BankTransaction }> => {
    if (!isSimulationMode) {
      // 1. Vincular el gasto con la transacción
      const { data: expenseData, error: expError } = await supabase
        .from('comprobantes_gasto')
        .update({ transaccion_id: transactionId, updated_at: new Date().toISOString() })
        .eq('id', expenseId)
        .select()
        .single();
      if (expError) throw expError;

      // 2. Marcar la transacción bancaria como conciliada
      const { data: txData, error: txError } = await supabase
        .from('transacciones_bancarias')
        .update({ estado: 'conciliado' })
        .eq('id', transactionId)
        .select()
        .single();
      if (txError) throw txError;

      return {
        expense: expenseData as ExpenseReceipt,
        transaction: txData as BankTransaction,
      };
    } else {
      const expenses = JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
      const transactions = JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');

      const expIndex = expenses.findIndex((e: ExpenseReceipt) => e.id === expenseId);
      const txIndex = transactions.findIndex((t: BankTransaction) => t.id === transactionId);

      if (expIndex === -1 || txIndex === -1) throw new Error('Expense or Transaction not found');

      expenses[expIndex].transaccion_id = transactionId;
      transactions[txIndex].estado = 'conciliado';

      localStorage.setItem('cnbv_expenses', JSON.stringify(expenses));
      localStorage.setItem('cnbv_bank_transactions', JSON.stringify(transactions));

      return {
        expense: expenses[expIndex],
        transaction: transactions[txIndex],
      };
    }
  },

  reconcileDonation: async (
    donationId: string,
    transactionId: string,
  ): Promise<{ donation: Donation; transaction: BankTransaction }> => {
    if (!isSimulationMode) {
      // 1. Vincular la donación con la transacción
      const { data: donationData, error: donError } = await supabase
        .from('donaciones')
        .update({ transaccion_id: transactionId })
        .eq('id', donationId)
        .select()
        .single();
      if (donError) throw donError;

      // 2. Marcar la transacción bancaria como conciliada
      const { data: txData, error: txError } = await supabase
        .from('transacciones_bancarias')
        .update({ estado: 'conciliado' })
        .eq('id', transactionId)
        .select()
        .single();
      if (txError) throw txError;

      return {
        donation: donationData as Donation,
        transaction: txData as BankTransaction,
      };
    } else {
      const donations = JSON.parse(localStorage.getItem('cnbv_donations') || '[]');
      const transactions = JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');

      const donIndex = donations.findIndex((d: Donation) => d.id === donationId);
      const txIndex = transactions.findIndex((t: BankTransaction) => t.id === transactionId);

      if (donIndex === -1 || txIndex === -1) throw new Error('Donation or Transaction not found');

      donations[donIndex].transaccion_id = transactionId;
      transactions[txIndex].estado = 'conciliado';

      localStorage.setItem('cnbv_donations', JSON.stringify(donations));
      localStorage.setItem('cnbv_bank_transactions', JSON.stringify(transactions));

      return {
        donation: donations[donIndex],
        transaction: transactions[txIndex],
      };
    }
  },

  reconcileCashDonation: async (donationId: string): Promise<Donation> => {
    if (!isSimulationMode) {
      // 1. Obtener los detalles de la donación
      const { data: donation, error: getError } = await supabase
        .from('donaciones')
        .select('*')
        .eq('id', donationId)
        .single();
      if (getError) throw getError;
      if (!donation) throw new Error('Donation not found');

      // 2. Crear una transacción bancaria virtual (de tipo caja efectivo)
      const { data: virtualTx, error: txError } = await supabase
        .from('transacciones_bancarias')
        .insert([
          {
            fecha: donation.fecha,
            referencia: 'CAJA-' + donationId.split('-')[0].toUpperCase(),
            descripcion: `[CAJA EFECTIVO] Recepción de Aporte - ${donation.donante}`,
            monto: donation.monto_original || donation.monto,
            estado: 'conciliado',
            csv_metadata: { moneda: donation.moneda, tipo: 'efectivo_caja' },
            ...(donation.ong_id ? { ong_id: donation.ong_id } : {}),
          },
        ])
        .select()
        .single();
      if (txError) throw txError;

      // 3. Vincular la donación con esta transacción
      const { data: updatedDonation, error: linkError } = await supabase
        .from('donaciones')
        .update({ transaccion_id: virtualTx.id })
        .eq('id', donationId)
        .select()
        .single();
      if (linkError) throw linkError;

      return updatedDonation as Donation;
    } else {
      const donations = JSON.parse(localStorage.getItem('cnbv_donations') || '[]');
      const transactions = JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');

      const donIndex = donations.findIndex((d: Donation) => d.id === donationId);
      if (donIndex === -1) throw new Error('Donation not found');

      const donation = donations[donIndex];
      const virtualTxId = `tx-caja-${Date.now()}`;

      // Crear transacción virtual
      const virtualTx = {
        id: virtualTxId,
        fecha: donation.fecha,
        referencia: 'CAJA-' + donationId.split('-')[0].toUpperCase(),
        descripcion: `[CAJA EFECTIVO] Recepción de Aporte - ${donation.donante}`,
        monto: donation.monto_original || donation.monto,
        estado: 'conciliado',
        csv_metadata: { moneda: donation.moneda, tipo: 'efectivo_caja' },
      };

      transactions.push(virtualTx);
      donations[donIndex].transaccion_id = virtualTxId;

      localStorage.setItem('cnbv_donations', JSON.stringify(donations));
      localStorage.setItem('cnbv_bank_transactions', JSON.stringify(transactions));

      return donations[donIndex];
    }
  },

  // --- DONACIONES ---
  getDonations: async (): Promise<Donation[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('donaciones')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as Donation[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_donations') || '[]');
    }
  },

  createDonation: async (
    donation: Omit<Donation, 'id'> & { vinculo_transaccion_ids?: string[] },
  ): Promise<Donation> => {
    const { vinculo_transaccion_ids, ...donationData } = donation;

    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('donaciones')
        .insert([donationData])
        .select()
        .single();
      if (error) throw error;

      // Conciliar las transacciones vinculadas
      const targetIds =
        vinculo_transaccion_ids ||
        (donationData.transaccion_id ? [donationData.transaccion_id] : []);
      if (targetIds.length > 0) {
        const { error: txError } = await supabase
          .from('transacciones_bancarias')
          .update({ estado: 'conciliado' })
          .in('id', targetIds);
        if (txError) console.error('Error updating bank transactions state:', txError);
      }

      return data as Donation;
    } else {
      const donations = JSON.parse(localStorage.getItem('cnbv_donations') || '[]');
      const created = {
        ...donationData,
        id: `don-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      donations.unshift(created);
      localStorage.setItem('cnbv_donations', JSON.stringify(donations));

      // Conciliar las transacciones vinculadas en simulación
      const targetIds =
        vinculo_transaccion_ids ||
        (donationData.transaccion_id ? [donationData.transaccion_id] : []);
      if (targetIds.length > 0) {
        const transactions = JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');
        let updated = false;
        targetIds.forEach((id) => {
          const txIndex = transactions.findIndex((t: BankTransaction) => t.id === id);
          if (txIndex !== -1) {
            transactions[txIndex].estado = 'conciliado';
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem('cnbv_bank_transactions', JSON.stringify(transactions));
        }
      }

      return created;
    }
  },

  // --- TASAS BCV ---
  getTasasBCV: async (): Promise<TasaBCV[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('tasas_bcv')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as TasaBCV[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_tasas_bcv') || '[]');
    }
  },

  getTasaByDate: async (fecha: string): Promise<TasaBCV | null> => {
    if (!isSimulationMode) {
      // Intentar obtener la tasa exacta para esa fecha
      const { data, error } = await supabase
        .from('tasas_bcv')
        .select('*')
        .eq('fecha', fecha)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as TasaBCV;

      // Si no hay tasa exacta para esa fecha, retornar la más reciente anterior
      const { data: recent, error: recentErr } = await supabase
        .from('tasas_bcv')
        .select('*')
        .lt('fecha', fecha)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recentErr) throw recentErr;
      return (recent as TasaBCV) || null;
    } else {
      const tasas: TasaBCV[] = JSON.parse(localStorage.getItem('cnbv_tasas_bcv') || '[]');
      // Buscar exacta
      const exacta = tasas.find((t) => t.fecha === fecha);
      if (exacta) return exacta;
      // Buscar la más reciente anterior
      const anteriores = tasas
        .filter((t) => t.fecha < fecha)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      return anteriores[0] || null;
    }
  },

  upsertTasaBCV: async (tasa: Omit<TasaBCV, 'id' | 'created_at'>): Promise<TasaBCV> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('tasas_bcv')
        .upsert(tasa, { onConflict: 'ong_id,fecha' })
        .select()
        .single();
      if (error) throw error;
      return data as TasaBCV;
    } else {
      const tasas = JSON.parse(localStorage.getItem('cnbv_tasas_bcv') || '[]');
      const index = tasas.findIndex((t: TasaBCV) => t.fecha === tasa.fecha);
      const updatedTasa = {
        ...tasa,
        id: index !== -1 ? tasas[index].id : `rate-${Date.now()}`,
        created_at: index !== -1 ? tasas[index].created_at : new Date().toISOString(),
      };
      if (index !== -1) {
        tasas[index] = updatedTasa;
      } else {
        tasas.unshift(updatedTasa);
      }
      localStorage.setItem('cnbv_tasas_bcv', JSON.stringify(tasas));
      return updatedTasa;
    }
  },

  bulkUpsertTasasBCV: async (
    tasasInput: Array<{
      fecha: string;
      tasa: number;
      fuente?: 'bcv_api' | 'manual' | 'historico_csv';
    }>,
  ): Promise<TasaBCV[]> => {
    const formatted = tasasInput.map((t) => ({
      fecha: t.fecha,
      tasa: t.tasa,
      fuente: t.fuente || 'historico_csv',
    }));

    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('tasas_bcv')
        .upsert(formatted, { onConflict: 'ong_id,fecha' })
        .select();
      if (error) throw error;
      return data as TasaBCV[];
    } else {
      const tasas = JSON.parse(localStorage.getItem('cnbv_tasas_bcv') || '[]');
      const result: TasaBCV[] = [];
      for (const t of formatted) {
        const index = tasas.findIndex((x: TasaBCV) => x.fecha === t.fecha);
        const updatedTasa = {
          ...t,
          id: index !== -1 ? tasas[index].id : `rate-${Math.random().toString(36).substr(2, 9)}`,
          created_at: index !== -1 ? tasas[index].created_at : new Date().toISOString(),
        };
        if (index !== -1) {
          tasas[index] = updatedTasa;
        } else {
          tasas.unshift(updatedTasa);
        }
        result.push(updatedTasa);
      }
      localStorage.setItem('cnbv_tasas_bcv', JSON.stringify(tasas));
      return result;
    }
  },

  // --- GESTIÓN DE USUARIOS ---
  getUsers: async (ongId?: string): Promise<UserWithOng[]> => {
    if (!isSimulationMode) {
      let query = supabase
        .from('usuarios_perfiles')
        .select('*, ongs(id, nombre, logo_url)')
        .order('nombre_completo');

      if (ongId) {
        query = query.eq('ong_id', ongId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UserWithOng[];
    } else {
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}') as Record<
        string,
        UserWithOng
      >;
      const ongs = JSON.parse(localStorage.getItem('cnbv_ongs') || '[]') as Ong[];
      return Object.values(profiles)
        .filter((p) => !ongId || p.ong_id === ongId)
        .map((p) => {
          const ong = ongs.find((o) => o.id === p.ong_id);
          return {
            ...p,
            ongs: ong
              ? { nombre: ong.nombre }
              : { nombre: 'Convención Nacional Bautista de Venezuela' },
          };
        });
    }
  },

  updateUserProfile: async (
    userId: string,
    updates: { rol?: UserRole; aprobado?: boolean; ong_id?: string },
  ): Promise<UserWithOng> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('usuarios_perfiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*, ongs(id, nombre, logo_url)');

      if (error) {
        throw new Error(`Error en Supabase al actualizar usuario: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error(
          'No se pudo actualizar el perfil en la base de datos debido a las políticas RLS. Por favor ejecuta el script de migración fix_user_update_rls.sql en el SQL Editor de Supabase.',
        );
      }

      const updatedUser = data[0] as UserWithOng;

      // Si se aprobó el usuario, enviar correo de notificación usando la Edge Function
      if (updates.aprobado === true && updatedUser) {
        supabase.functions
          .invoke('notify-approval', {
            body: { email: updatedUser.email, nombre: updatedUser.nombre_completo },
          })
          .then(({ error: fnErr }) => {
            if (fnErr) console.error('Error invoking notify-approval Edge Function:', fnErr);
          })
          .catch((e) => console.error('Exception calling notify-approval Edge Function:', e));
      }

      return updatedUser;
    } else {
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}') as Record<
        string,
        UserWithOng
      >;
      if (!profiles[userId]) throw new Error('User profile not found in simulation');

      const updated = {
        ...profiles[userId],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      profiles[userId] = updated;
      localStorage.setItem('cnbv_profiles', JSON.stringify(profiles));

      // Si se aprobó el usuario, registrar simulación de envío
      if (updates.aprobado === true) {
        console.log(`[Simulación SMTP] Correo de aprobación enviado a ${updated.email}`);
      }

      return updated;
    }
  },

  adminCreateUser: async (userData: {
    email: string;
    password: string;
    nombre_completo: string;
    rol: UserRole;
    ong_id?: string;
  }): Promise<{ user?: unknown; message?: string; error?: string }> => {
    if (!isSimulationMode) {
      // Import { supabase } from '../supabaseClient'
      // We will use supabase.functions.invoke
      // To avoid circular dependency or import issues here, we can just use the global supabase client that api.ts already imports.
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: userData,
      });
      if (error) {
        console.error('Edge Function Error:', error);
        throw new Error(error.message || 'Error executing edge function');
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      return data;
    } else {
      // En modo simulación
      throw new Error('Creación de usuario por administrador no soportada en modo simulación');
    }
  },

  adminDeleteUser: async (userId: string): Promise<{ message?: string; error?: string }> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });
      if (error) {
        console.error('Edge Function Delete User Error:', error);
        throw new Error(error.message || 'Error executing delete-user edge function');
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      return data;
    } else {
      // Modo simulación: simulamos borrar de localStorage
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}') as Record<
        string,
        UserWithOng
      >;
      if (profiles[userId]) {
        delete profiles[userId];
        localStorage.setItem('cnbv_profiles', JSON.stringify(profiles));
        return { message: 'Usuario simulado eliminado exitosamente.' };
      }
      throw new Error('Usuario no encontrado en modo simulación');
    }
  },

  getJornadas: async (): Promise<Jornada[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('jornadas')
        .select('*')
        .order('fecha', { ascending: false });
      if (error) console.warn('Error getJornadas', error);
      return data || [];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_jornadas') || '[]');
    }
  },

  getJornadaById: async (id: string): Promise<Jornada | null> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('jornadas').select('*').eq('id', id).single();
      if (error) return null;
      return data as Jornada;
    } else {
      const all = JSON.parse(localStorage.getItem('cnbv_jornadas') || '[]');
      return all.find((j: Jornada) => j.id === id) || null;
    }
  },

  createJornada: async (
    jornada: Omit<Jornada, 'id' | 'created_at'>,
    ongId?: string,
  ): Promise<Jornada> => {
    const newJornada: Jornada & { ong_id?: string } = {
      id: `jor-${Date.now()}`,
      ...jornada,
      created_at: new Date().toISOString(),
      ...(ongId ? { ong_id: ongId } : {}),
    };
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('jornadas')
        .insert([newJornada])
        .select()
        .single();
      if (error) throw error;
      return data as Jornada;
    } else {
      const all = JSON.parse(localStorage.getItem('cnbv_jornadas') || '[]');
      const updated = [newJornada, ...all];
      localStorage.setItem('cnbv_jornadas', JSON.stringify(updated));
      return newJornada;
    }
  },

  updateJornadaStatus: async (id: string, activa: boolean): Promise<void> => {
    if (!isSimulationMode) {
      const { error } = await supabase.from('jornadas').update({ activa }).eq('id', id);
      if (error) throw error;
    } else {
      const all = JSON.parse(localStorage.getItem('cnbv_jornadas') || '[]');
      const index = all.findIndex((j: Jornada) => j.id === id);
      if (index !== -1) {
        all[index].activa = activa;
        localStorage.setItem('cnbv_jornadas', JSON.stringify(all));
      }
    }
  },

  deleteJornada: async (id: string, deleteBeneficiaries: boolean): Promise<void> => {
    if (!isSimulationMode) {
      if (deleteBeneficiaries) {
        const { error: bError } = await supabase
          .from('beneficiarios')
          .delete()
          .eq('jornada_id', id);
        if (bError) throw bError;
      } else {
        const { error: uError } = await supabase
          .from('beneficiarios')
          .update({ jornada_id: null })
          .eq('jornada_id', id);
        if (uError) throw uError;
      }
      const { error: jError } = await supabase.from('jornadas').delete().eq('id', id);
      if (jError) throw jError;
    } else {
      const allJornadas = JSON.parse(localStorage.getItem('cnbv_jornadas') || '[]');
      const filteredJornadas = allJornadas.filter((j: Jornada) => j.id !== id);
      localStorage.setItem('cnbv_jornadas', JSON.stringify(filteredJornadas));

      const allBen = JSON.parse(localStorage.getItem('cnbv_beneficiarios') || '[]');
      if (deleteBeneficiaries) {
        const filteredBen = allBen.filter((b: any) => b.jornada_id !== id);
        localStorage.setItem('cnbv_beneficiarios', JSON.stringify(filteredBen));
      } else {
        const updatedBen = allBen.map((b: any) =>
          b.jornada_id === id ? { ...b, jornada_id: null } : b,
        );
        localStorage.setItem('cnbv_beneficiarios', JSON.stringify(updatedBen));
      }
    }
  },

  getBeneficiaries: async (): Promise<Beneficiary[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('beneficiarios')
        .select('*')
        .order('created_at', { ascending: false });
      if (error && error.code !== '42P01') {
        console.warn('Error getBeneficiaries', error);
      }
      return data || [];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_beneficiaries') || '[]');
    }
  },

  saveBeneficiary: async (
    beneficiary: Omit<Beneficiary, 'id' | 'created_at' | 'url_firma'>,
    signatureFile?: File,
    ongId?: string,
  ): Promise<Beneficiary> => {
    let url_firma: string | null = null;
    if (signatureFile) {
      if (!isSimulationMode) {
        const uploadResponse = await uploadToGCS(signatureFile);
        url_firma = uploadResponse.url;
      } else {
        url_firma = URL.createObjectURL(signatureFile);
      }
    }

    let finalJornadaId = beneficiary.jornada_id;
    const isEkklesiaSource = finalJornadaId === 'general-ekklesia';

    // Asegurar que jornada_id cumpla con la Foreign Key de la base de datos marcando el origen Ekklesia
    if (!finalJornadaId || finalJornadaId === 'general-ekklesia' || finalJornadaId === 'general') {
      try {
        const existingJornadas = await api.getJornadas();
        let validJornada = existingJornadas.find(
          (j) =>
            j.nombre.includes('Ekklesia') &&
            (!ongId || j.ong_id === ongId || (j as any).ong_id === ongId),
        );

        if (!validJornada) {
          validJornada = existingJornadas.find(
            (j) => !ongId || j.ong_id === ongId || (j as any).ong_id === ongId,
          );
        }

        if (validJornada) {
          finalJornadaId = validJornada.id;
        } else {
          // Auto-crear una jornada de sistema identificada como Ekklesia
          const newSystemJornada = await api.createJornada(
            {
              nombre: isEkklesiaSource ? 'Padrón Congregacional Ekklesia' : 'Padrón General',
              fecha: new Date().toISOString().split('T')[0],
              beneficios_entregados: isEkklesiaSource
                ? 'Ekklesia - Registro de Miembro Congregacional'
                : 'Registro General',
              proyecto_id: '',
              activa: true,
            },
            ongId,
          );
          finalJornadaId = newSystemJornada.id;
        }
      } catch (err) {
        console.warn('Error resolviendo jornada_id para el miembro:', err);
      }
    }

    const newBen: Beneficiary = {
      id: `ben-${Date.now()}`,
      ...beneficiary,
      jornada_id: finalJornadaId,
      url_firma,
      created_at: new Date().toISOString(),
      ...(ongId ? { ong_id: ongId } : {}),
    };

    if (!isSimulationMode) {
      const { error } = await supabase.from('beneficiarios').insert([newBen]);

      if (error) throw error;
      return newBen;
    } else {
      const all = JSON.parse(localStorage.getItem('cnbv_beneficiaries') || '[]');
      const updated = [newBen, ...all];
      localStorage.setItem('cnbv_beneficiaries', JSON.stringify(updated));
      return newBen;
    }
  },

  // --- GESTIÓN DE ONGs (SaaS) ---
  getOngs: async (): Promise<Ong[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('ongs').select('*').order('nombre');
      if (error) throw error;
      return data as Ong[];
    } else {
      let ongs = JSON.parse(localStorage.getItem('cnbv_ongs') || '[]') as Ong[];
      if (ongs.length === 0) {
        ongs = [
          {
            id: '11111111-1111-1111-1111-111111111111',
            nombre: 'Convención Nacional Bautista de Venezuela',
            logo_url: 'https://cnbv.org/wp-content/uploads/2020/09/logo-cnbv.jpg',
            created_at: new Date().toISOString(),
          },
        ];
        localStorage.setItem('cnbv_ongs', JSON.stringify(ongs));
      }
      return ongs;
    }
  },

  createOng: async (
    dataOrName: string | CreateOngParams,
    logoUrl?: string | null,
  ): Promise<Ong> => {
    let params: CreateOngParams;
    if (typeof dataOrName === 'string') {
      params = { nombre: dataOrName, logoUrl };
    } else {
      params = dataOrName;
    }

    const fourteenDaysLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const insertPayload = {
      nombre: params.nombre,
      logo_url: params.logoUrl || null,
      rif_identificacion: params.rif_identificacion || null,
      pais: params.pais || 'Venezuela',
      telefono: params.telefono || null,
      direccion: params.direccion || null,
      sitio_web: params.sitio_web || null,
      plan: params.plan || 'trial',
      estado: params.estado || 'trial',
      tipo_organizacion: params.tipo_organizacion || 'ong',
      trial_ends_at: fourteenDaysLater,
    };

    if (!isSimulationMode) {
      let finalData: Ong;
      const { data, error } = await supabase.from('ongs').insert([insertPayload]).select().single();

      // Graceful fallback si la base de datos de Supabase aún no tiene aplicadas las nuevas columnas de la migración
      if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        console.warn(
          'Aviso de esquema Supabase: Intentando inserción de fallback con columnas estándar...',
          error.message,
        );
        const basicPayload = {
          nombre: params.nombre,
          logo_url: params.logoUrl || null,
        };
        const basicRes = await supabase.from('ongs').insert([basicPayload]).select().single();
        if (basicRes.error) throw basicRes.error;
        finalData = {
          ...basicRes.data,
          ...insertPayload, // mantener en respuesta cliente los datos del trial
        } as Ong;
      } else if (error) {
        throw error;
      } else {
        finalData = data as Ong;
      }

      return finalData;
    } else {
      const ongs = JSON.parse(localStorage.getItem('cnbv_ongs') || '[]') as Ong[];
      const newOng: Ong = {
        id: `ong-${Math.random().toString(36).substr(2, 9)}`,
        ...insertPayload,
        created_at: new Date().toISOString(),
      };
      ongs.push(newOng);
      localStorage.setItem('cnbv_ongs', JSON.stringify(ongs));
      return newOng;
    }
  },

  updateOng: async (id: string, updates: UpdateOngParams): Promise<Ong> => {
    if (!isSimulationMode) {
      let finalData: Ong;
      const { data, error } = await supabase
        .from('ongs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        console.warn(
          'Aviso de esquema Supabase: Intentando actualización fallback sin tipo_organizacion...',
          error.message,
        );
        const { tipo_organizacion, ...basicUpdates } = updates;
        const basicRes = await supabase
          .from('ongs')
          .update(basicUpdates)
          .eq('id', id)
          .select()
          .single();
        if (basicRes.error) throw basicRes.error;
        finalData = {
          ...basicRes.data,
          ...(tipo_organizacion ? { tipo_organizacion } : {}),
        } as Ong;
      } else if (error) {
        throw error;
      } else {
        finalData = data as Ong;
      }

      return finalData;
    } else {
      const ongs = JSON.parse(localStorage.getItem('cnbv_ongs') || '[]') as Ong[];
      const idx = ongs.findIndex((o) => o.id === id);
      if (idx === -1) throw new Error('Organización no encontrada');

      const updated = {
        ...ongs[idx],
        ...updates,
      };
      ongs[idx] = updated;
      localStorage.setItem('cnbv_ongs', JSON.stringify(ongs));
      return updated;
    }
  },

  // --- CATÁLOGO PERSONALIZADO ---
  getCatalog: async (): Promise<{ categories: ExpenseCategory[]; partidas: PartidaGasto[] }> => {
    if (isSimulationMode) {
      return { categories: [], partidas: [] };
    }
    const [{ data: cats, error: catsErr }, { data: parts, error: partsErr }] = await Promise.all([
      supabase
        .from('categorias_gasto')
        .select('id, nombre, descripcion, ong_id, es_catalogo_undg')
        .order('nombre'),
      supabase
        .from('partidas_gasto')
        .select('id, categoria_id, codigo, nombre, descripcion, ong_id, es_catalogo_undg')
        .order('codigo'),
    ]);
    if (catsErr) throw catsErr;
    if (partsErr) throw partsErr;
    return {
      categories: (cats ?? []) as ExpenseCategory[],
      partidas: (parts ?? []) as PartidaGasto[],
    };
  },

  /** Devuelve los IDs de todas las partidas del catálogo estándar UNDG */
  getUNDGPartidaIds: async (): Promise<string[]> => {
    if (isSimulationMode) return [];
    const { data, error } = await supabase
      .from('partidas_gasto')
      .select('id')
      .eq('es_catalogo_undg', true);
    if (error) throw error;
    return (data ?? []).map((r: { id: string }) => r.id);
  },

  createCategoria: async (
    data: { nombre: string; descripcion?: string },
    ongId: string,
  ): Promise<ExpenseCategory> => {
    if (isSimulationMode) throw new Error('No disponible en modo simulación');
    const { data: cat, error } = await supabase
      .from('categorias_gasto')
      .insert([{ ...data, ong_id: ongId }])
      .select()
      .single();
    if (error) throw error;
    return cat as ExpenseCategory;
  },

  deleteCategoria: async (categoriaId: string): Promise<void> => {
    if (isSimulationMode) throw new Error('No disponible en modo simulación');
    const { error } = await supabase.from('categorias_gasto').delete().eq('id', categoriaId);
    if (error) throw error;
  },

  createPartida: async (
    data: { categoria_id: string; codigo: string; nombre: string; descripcion?: string },
    ongId: string,
  ): Promise<PartidaGasto> => {
    if (isSimulationMode) throw new Error('No disponible en modo simulación');
    const { data: partida, error } = await supabase
      .from('partidas_gasto')
      .insert([{ ...data, ong_id: ongId }])
      .select()
      .single();
    if (error) throw error;
    return partida as PartidaGasto;
  },

  deletePartida: async (partidaId: string): Promise<void> => {
    if (isSimulationMode) throw new Error('No disponible en modo simulación');
    const { error } = await supabase.from('partidas_gasto').delete().eq('id', partidaId);
    if (error) throw error;
  },

  restoreDefaultCatalog: async (): Promise<void> => {
    if (isSimulationMode) throw new Error('No disponible en modo simulación');
    const { error } = await supabase.rpc('restore_default_undg_catalog');
    if (error) throw error;
  },

  getProjectPartidas: async (proyectoId: string): Promise<PartidaGasto[]> => {
    if (isSimulationMode) {
      // En simulación devolvemos todas las de la ONG
      return api.getPartidas();
    }
    const { data, error } = await supabase
      .from('proyectos_partidas')
      .select(
        'partida_id, partidas_gasto(id, categoria_id, codigo, nombre, descripcion, ong_id, es_catalogo_undg)',
      )
      .eq('proyecto_id', proyectoId);

    if (error) throw error;

    const rows = data as unknown as Array<{
      partida_id: string;
      partidas_gasto: PartidaGasto | PartidaGasto[] | null;
    }>;

    return (rows ?? [])
      .map((row) => {
        if (!row.partidas_gasto) return null;
        return Array.isArray(row.partidas_gasto) ? row.partidas_gasto[0] : row.partidas_gasto;
      })
      .filter(Boolean) as PartidaGasto[];
  },

  setProjectPartidas: async (
    proyectoId: string,
    partidaIds: string[],
    ongId: string,
  ): Promise<void> => {
    if (isSimulationMode) return;

    // 1. Eliminar relaciones existentes del proyecto
    const { error: deleteError } = await supabase
      .from('proyectos_partidas')
      .delete()
      .eq('proyecto_id', proyectoId);
    if (deleteError) throw deleteError;

    if (partidaIds.length === 0) return;

    // 2. Insertar las nuevas
    const toInsert = partidaIds.map((pId) => ({
      proyecto_id: proyectoId,
      partida_id: pId,
      ong_id: ongId,
    }));

    const { error: insertError } = await supabase.from('proyectos_partidas').insert(toInsert);
    if (insertError) throw insertError;
  },
};

// =========================================================================
// 5. API Y TIPOS DE REQUISICIONES (SOLICITUDES DE GASTO)
// =========================================================================
export type RequisitionStatus =
  'pendiente_aprobacion_1' | 'pendiente_aprobacion_2' | 'aprobada_ejecucion' | 'rechazada';

export interface Requisition {
  id: string;
  codigo?: string;
  solicitante_id: string;
  solicitante_nombre?: string;
  proyecto_id: string;
  proyecto_nombre?: string;
  partida_id: string;
  partida_nombre?: string;
  partida_codigo?: string;
  categoria_nombre?: string;
  monto_solicitado: number;
  motivo: string;
  estado: RequisitionStatus;

  // Aprobadores
  validador_1_id: string | null;
  validador_1_nombre?: string;
  validado_1_at: string | null;
  validador_2_id: string | null;
  validador_2_nombre?: string;
  validado_2_at: string | null;

  // Rechazos
  rechazado_por: string | null;
  rechazado_at: string | null;
  motivo_rechazo: string | null;

  created_at: string;
  updated_at: string;
}

interface RawRequisition {
  id: string;
  codigo?: string;
  solicitante_id: string;
  proyecto_id: string;
  partida_id: string;
  monto_solicitado: number;
  motivo: string;
  estado: RequisitionStatus;
  validador_1_id: string | null;
  validado_1_at: string | null;
  validador_2_id: string | null;
  validado_2_at: string | null;
  rechazado_por: string | null;
  rechazado_at: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  updated_at: string;
  solicitante?: { nombre_completo: string } | null;
  validador_1?: { nombre_completo: string } | null;
  validador_2?: { nombre_completo: string } | null;
  proyecto?: { nombre: string } | null;
  partida?: {
    nombre: string;
    codigo: string;
    categoria?: { nombre: string } | null;
  } | null;
}

export const requisitionsApi = {
  getRequisitions: async (): Promise<Requisition[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('solicitudes_gasto')
        .select(
          `
          *,
          solicitante:usuarios_perfiles!solicitante_id(nombre_completo),
          validador_1:usuarios_perfiles!validador_1_id(nombre_completo),
          validador_2:usuarios_perfiles!validador_2_id(nombre_completo),
          proyecto:proyectos(nombre),
          partida:partidas_gasto(
            nombre,
            codigo,
            categoria:categorias_gasto(nombre)
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as RawRequisition[]).map((row) => ({
        ...row,
        solicitante_nombre: row.solicitante?.nombre_completo,
        validador_1_nombre: row.validador_1?.nombre_completo,
        validador_2_nombre: row.validador_2?.nombre_completo,
        proyecto_nombre: row.proyecto?.nombre,
        partida_nombre: row.partida?.nombre,
        partida_codigo: row.partida?.codigo,
        categoria_nombre: row.partida?.categoria?.nombre,
      }));
    } else {
      const reqs = JSON.parse(localStorage.getItem('cnbv_requisitions') || '[]') as Requisition[];
      const projects = JSON.parse(localStorage.getItem('cnbv_projects') || '[]') as Project[];
      const partidas = JSON.parse(localStorage.getItem('cnbv_partidas') || '[]') as PartidaGasto[];
      const categories = JSON.parse(
        localStorage.getItem('cnbv_categories') || '[]',
      ) as ExpenseCategory[];
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}') as Record<
        string,
        UserWithOng
      >;

      return reqs.map((r) => {
        const p = projects.find((x) => x.id === r.proyecto_id);
        const part = partidas.find((x) => x.id === r.partida_id);
        const cat = part ? categories.find((x) => x.id === part.categoria_id) : null;
        const user = profiles[r.solicitante_id];
        return {
          ...r,
          proyecto_nombre: p ? p.nombre : 'Proyecto Zulia',
          partida_nombre: part ? part.nombre : 'Artículos No Alimentarios',
          partida_codigo: part ? part.codigo : '1.1',
          categoria_nombre: cat ? cat.nombre : 'Costos Directos',
          solicitante_nombre: user ? user.nombre_completo : 'Coordinador',
        };
      });
    }
  },

  getRecentRequisitionsByUserId: async (
    userId: string,
    limit: number = 30,
  ): Promise<Requisition[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('solicitudes_gasto')
        .select(
          `
          *,
          solicitante:usuarios_perfiles!solicitante_id(nombre_completo),
          proyecto:proyectos(nombre),
          partida:partidas_gasto(
            nombre,
            codigo,
            categoria:categorias_gasto(nombre)
          )
        `,
        )
        .eq('solicitante_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as RawRequisition[]).map((row) => ({
        ...row,
        solicitante_nombre: row.solicitante?.nombre_completo,
        proyecto_nombre: row.proyecto?.nombre,
        partida_nombre: row.partida?.nombre,
        partida_codigo: row.partida?.codigo,
        categoria_nombre: row.partida?.categoria?.nombre,
      }));
    } else {
      return (await requisitionsApi.getRequisitions())
        .filter((r) => r.solicitante_id === userId)
        .slice(0, limit);
    }
  },

  getApprovedRequisitions: async (limit: number = 50): Promise<Requisition[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('solicitudes_gasto')
        .select(
          `
          *,
          solicitante:usuarios_perfiles!solicitante_id(nombre_completo),
          proyecto:proyectos(nombre),
          partida:partidas_gasto(
            nombre,
            codigo,
            categoria:categorias_gasto(nombre)
          )
        `,
        )
        .eq('estado', 'aprobada_ejecucion')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as RawRequisition[]).map((row) => ({
        ...row,
        solicitante_nombre: row.solicitante?.nombre_completo,
        proyecto_nombre: row.proyecto?.nombre,
        partida_nombre: row.partida?.nombre,
        partida_codigo: row.partida?.codigo,
        categoria_nombre: row.partida?.categoria?.nombre,
      }));
    } else {
      return (await requisitionsApi.getRequisitions())
        .filter((r) => r.estado === 'aprobada_ejecucion')
        .slice(0, limit);
    }
  },

  createRequisition: async (
    req: Omit<
      Requisition,
      | 'id'
      | 'estado'
      | 'created_at'
      | 'updated_at'
      | 'validador_1_id'
      | 'validador_2_id'
      | 'validado_1_at'
      | 'validado_2_at'
      | 'rechazado_por'
      | 'rechazado_at'
      | 'motivo_rechazo'
    >,
    ongId?: string,
  ): Promise<Requisition> => {
    if (!isSimulationMode) {
      const payload = ongId ? { ...req, ong_id: ongId } : req;
      const { data, error } = await supabase
        .from('solicitudes_gasto')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as Requisition;
    } else {
      const reqs = JSON.parse(localStorage.getItem('cnbv_requisitions') || '[]');
      const newReq: Requisition = {
        ...req,
        id: `req-${Date.now()}`,
        estado: 'pendiente_aprobacion_1',
        validador_1_id: null,
        validado_1_at: null,
        validador_2_id: null,
        validado_2_at: null,
        rechazado_por: null,
        rechazado_at: null,
        motivo_rechazo: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(ongId ? { ong_id: ongId } : {}),
      };
      reqs.unshift(newReq);
      localStorage.setItem('cnbv_requisitions', JSON.stringify(reqs));
      return newReq;
    }
  },

  approveRequisition: async (
    requisitionId: string,
    validadorId: string,
    currentStatus: RequisitionStatus,
  ): Promise<Requisition> => {
    const nextStatus: RequisitionStatus =
      currentStatus === 'pendiente_aprobacion_1' ? 'pendiente_aprobacion_2' : 'aprobada_ejecucion';

    const updates: Partial<Requisition> =
      currentStatus === 'pendiente_aprobacion_1'
        ? {
            validador_1_id: validadorId,
            validado_1_at: new Date().toISOString(),
            estado: nextStatus,
          }
        : {
            validador_2_id: validadorId,
            validado_2_at: new Date().toISOString(),
            estado: nextStatus,
          };

    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('solicitudes_gasto')
        .update(updates)
        .eq('id', requisitionId)
        .select()
        .single();
      if (error) throw error;
      return data as Requisition;
    } else {
      const reqs = JSON.parse(localStorage.getItem('cnbv_requisitions') || '[]');
      const index = reqs.findIndex((r: Requisition) => r.id === requisitionId);
      if (index === -1) throw new Error('Solicitud no encontrada');

      const updated = { ...reqs[index], ...updates, updated_at: new Date().toISOString() };
      reqs[index] = updated;
      localStorage.setItem('cnbv_requisitions', JSON.stringify(reqs));

      // En simulación, si pasa a 'aprobada_ejecucion', reservamos presupuesto (monto_comprometido)
      if (nextStatus === 'aprobada_ejecucion') {
        const budgets = JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');
        const bIndex = budgets.findIndex(
          (b: Budget) =>
            b.proyecto_id === updated.proyecto_id && b.partida_id === updated.partida_id,
        );
        if (bIndex !== -1) {
          budgets[bIndex].monto_comprometido =
            (budgets[bIndex].monto_comprometido || 0) + updated.monto_solicitado;
          localStorage.setItem('cnbv_budgets', JSON.stringify(budgets));
        }
      }

      return updated;
    }
  },

  rejectRequisition: async (
    requisitionId: string,
    auditorId: string,
    motivo: string,
  ): Promise<Requisition> => {
    const updates: Partial<Requisition> = {
      estado: 'rechazada',
      rechazado_por: auditorId,
      rechazado_at: new Date().toISOString(),
      motivo_rechazo: motivo,
    };

    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('solicitudes_gasto')
        .update(updates)
        .eq('id', requisitionId)
        .select()
        .single();
      if (error) throw error;
      return data as Requisition;
    } else {
      const reqs = JSON.parse(localStorage.getItem('cnbv_requisitions') || '[]');
      const index = reqs.findIndex((r: Requisition) => r.id === requisitionId);
      if (index === -1) throw new Error('Solicitud no encontrada');

      const original = reqs[index];
      const updated = { ...original, ...updates, updated_at: new Date().toISOString() };
      reqs[index] = updated;
      localStorage.setItem('cnbv_requisitions', JSON.stringify(reqs));

      // Si estaba en aprobada_ejecucion y se rechaza, liberamos el monto comprometido
      if (original.estado === 'aprobada_ejecucion') {
        const budgets = JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');
        const bIndex = budgets.findIndex(
          (b: Budget) =>
            b.proyecto_id === updated.proyecto_id && b.partida_id === updated.partida_id,
        );
        if (bIndex !== -1) {
          budgets[bIndex].monto_comprometido = Math.max(
            0,
            (budgets[bIndex].monto_comprometido || 0) - updated.monto_solicitado,
          );
          localStorage.setItem('cnbv_budgets', JSON.stringify(budgets));
        }
      }

      return updated;
    }
  },

  // =========================================================================
  // GESTIÓN DE INVITACIONES EXCLUSIVAS DE TENANT (ONG)
  // =========================================================================
  createInvitation: async (params: {
    email: string;
    rol: UserRole;
    ong_id: string;
    invitado_por?: string;
  }): Promise<Invitation> => {
    const token = `inv-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      ong_id: params.ong_id,
      email: params.email.trim().toLowerCase(),
      rol: params.rol,
      token,
      estado: 'pendiente' as const,
      invitado_por: params.invitado_por || null,
      expires_at: expiresAt,
    };

    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('invitaciones')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as Invitation;
    } else {
      const list = JSON.parse(localStorage.getItem('cnbv_invitations') || '[]') as Invitation[];
      const newInv: Invitation = {
        id: `inv-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      list.push(newInv);
      localStorage.setItem('cnbv_invitations', JSON.stringify(list));
      return newInv;
    }
  },

  getInvitationByToken: async (token: string): Promise<Invitation> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('invitaciones')
        .select('*, ongs(nombre)')
        .eq('token', token.trim())
        .single();
      if (error) throw error;
      const inv = data as any;
      return {
        ...inv,
        ong_nombre: inv.ongs?.nombre || 'Organización',
      } as Invitation;
    } else {
      const list = JSON.parse(localStorage.getItem('cnbv_invitations') || '[]') as Invitation[];
      const found = list.find((i) => i.token === token.trim() && i.estado === 'pendiente');
      if (!found) throw new Error('La invitación no existe o ya ha sido utilizada.');

      const ongs = JSON.parse(localStorage.getItem('cnbv_ongs') || '[]') as Ong[];
      const matchedOng = ongs.find((o) => o.id === found.ong_id);
      return {
        ...found,
        ong_nombre: matchedOng?.nombre || 'Organización (Simulado)',
      };
    }
  },

  acceptInvitation: async function (params: {
    token: string;
    nombreCompleto: string;
    password: string;
  }): Promise<void> {
    if (!isSimulationMode) {
      // Delegate to the Edge Function which uses admin.createUser with email_confirm: true
      // This bypasses the "Email not confirmed" error that signUp() triggers.
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'accept-invitation',
        {
          body: {
            token: params.token,
            nombreCompleto: params.nombreCompleto.trim(),
            password: params.password,
          },
        },
      );

      if (fnError) throw new Error(fnError.message || 'Error al activar la cuenta.');
      if (fnData?.error) throw new Error(fnData.error);

      // Sign the user in automatically after account activation
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: fnData.email,
        password: params.password,
      });
      if (signInErr) throw signInErr;
    } else {
      const inv = await this.getInvitationByToken(params.token);
      const list = JSON.parse(localStorage.getItem('cnbv_invitations') || '[]') as Invitation[];
      const idx = list.findIndex((i) => i.token === params.token);
      if (idx !== -1) {
        list[idx].estado = 'aceptada';
        localStorage.setItem('cnbv_invitations', JSON.stringify(list));
      }

      const userId = `user-inv-${Date.now()}`;
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      profiles[userId] = {
        id: userId,
        email: inv.email,
        nombre_completo: params.nombreCompleto.trim(),
        rol: inv.rol,
        aprobado: true,
        ong_id: inv.ong_id,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('cnbv_profiles', JSON.stringify(profiles));
    }
  },
};
