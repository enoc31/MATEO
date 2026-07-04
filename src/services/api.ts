import { supabase } from '../supabaseClient';
import type { UserRole } from '../context/AuthContext';

// Interfaces del Dominio
export interface Project {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string;
  overhead_porcentaje?: number;
}

export interface ExpenseCategory {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface PartidaGasto {
  id: string;
  categoria_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
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
}

export interface Donation {
  id: string;
  proyecto_id: string | null;
  transaccion_id: string | null;
  donante: string;
  monto: number;
  descripcion: string;
  fecha: string;
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
}

// Determinar si Supabase está configurado correctamente
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && url !== 'https://placeholder-url.supabase.co' && key && key !== 'placeholder-anon-key';
};

export const isSimulationMode = !isSupabaseConfigured();

// =========================================================================
// MOCK DATA PARA MODO SIMULACIÓN (INSPIRADO EN CNBV)
// =========================================================================
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    nombre: 'Proyecto Alimentación Infantil Zulia',
    descripcion: 'Programa de comedores comunitarios para niños en comunidades vulnerables de Maracaibo y San Francisco.',
    activo: true,
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-12-31',
    overhead_porcentaje: 7.00
  },
  {
    id: 'proj-2',
    nombre: 'Operación Ayuda Médica Apure',
    descripcion: 'Distribución de insumos médicos básicos, medicinas de control y jornadas médicas gratuitas en zonas fronterizas.',
    activo: true,
    fecha_inicio: '2026-02-15',
    fecha_fin: '2026-08-31',
    overhead_porcentaje: 8.50
  },
  {
    id: 'proj-3',
    nombre: 'Logística y Refugios Táchira',
    descripcion: 'Apoyo con albergues temporales, mantas, agua potable y enseres para familias damnificadas por lluvias.',
    activo: true,
    fecha_inicio: '2026-03-01',
    fecha_fin: '2026-09-30',
    overhead_porcentaje: 10.00
  }
];

const INITIAL_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-1', nombre: '1. Costos Directos de Intervención (Bienes y Servicios)', descripcion: 'Compra y distribución de bienes de ayuda y atención humanitaria directa.' },
  { id: 'cat-2', nombre: '2. Costos de Transporte, Logística y Almacenamiento', descripcion: 'Fletes, almacenamiento y movilización local de suministros de ayuda.' },
  { id: 'cat-3', nombre: '3. Costos de Personal (Recursos Humanos)', descripcion: 'Salarios, honorarios y pólizas de seguros del personal asignado.' },
  { id: 'cat-4', nombre: '4. Gastos de Oficina y Funcionamiento (Costos Indirectos y Operativos)', descripcion: 'Costos operativos de bases de campo, seguridad y gastos indirectos (overhead).' },
  { id: 'cat-5', nombre: '5. Visibilidad, Monitoreo y Evaluación', descripcion: 'Reportes obligatorios, rendición de cuentas, auditorías y material de visibilidad de donantes.' }
];

const INITIAL_PARTIDAS: PartidaGasto[] = [
  // Categoría 1
  { id: 'part-11', categoria_id: 'cat-1', codigo: '1.1', nombre: 'Artículos No Alimentarios (NFI)', descripcion: 'Compra y distribución de kits de emergencia, lonas, carpas, mantas, utensilios.' },
  { id: 'part-12', categoria_id: 'cat-1', codigo: '1.2', nombre: 'Agua, Saneamiento e Higiene (WASH)', descripcion: 'Letrinas de emergencia, pastillas potabilizadoras, camiones cisterna, kits de higiene.' },
  { id: 'part-13', categoria_id: 'cat-1', codigo: '1.3', nombre: 'Asistencia Sanitaria de Urgencia', descripcion: 'Medicamentos esenciales, clínicas móviles, insumos de trauma, generadores de clínicas.' },
  { id: 'part-14', categoria_id: 'cat-1', codigo: '1.4', nombre: 'Seguridad Alimentaria y Nutrición', descripcion: 'Alimentos de primera necesidad y suplementos nutricionales.' },
  { id: 'part-15', categoria_id: 'cat-1', codigo: '1.5', nombre: 'Programas de Transferencias Monetarias (PTM)', descripcion: 'Dinero en efectivo o vales entregados directamente a beneficiarios.' },

  // Categoría 2
  { id: 'part-21', categoria_id: 'cat-2', codigo: '2.1', nombre: 'Transporte y Envíos', descripcion: 'Fletes terrestres, marítimos o aéreos para movilizar la ayuda.' },
  { id: 'part-22', categoria_id: 'cat-2', codigo: '2.2', nombre: 'Almacenamiento', descripcion: 'Alquiler de bodegas, almacenes temporales y costos de estiba.' },
  { id: 'part-23', categoria_id: 'cat-2', codigo: '2.3', nombre: 'Logística Local', descripcion: 'Combustible local, peajes, alquiler de vehículos 4x4 de operación.' },

  // Categoría 3
  { id: 'part-31', categoria_id: 'cat-3', codigo: '3.1', nombre: 'Personal Local e Internacional', descripcion: 'Salarios y dietas de coordinadores, médicos, ingenieros WASH y logistas.' },
  { id: 'part-32', categoria_id: 'cat-3', codigo: '3.2', nombre: 'Seguridad Social y Seguros', descripcion: 'Pólizas de seguro médico y accidentes de riesgo especial para zonas de desastre.' },

  // Categoría 4
  { id: 'part-41', categoria_id: 'cat-4', codigo: '4.1', nombre: 'Costos de Oficina sobre el Terreno', descripcion: 'Alquiler de oficinas/bases, internet satelital, luz, agua y papelería contable.' },
  { id: 'part-42', categoria_id: 'cat-4', codigo: '4.2', nombre: 'Gestión de Seguridad', descripcion: 'Equipamiento de comunicación (radios VHF), personal de vigilancia, kits de evacuación.' },
  { id: 'part-43', categoria_id: 'cat-4', codigo: '4.3', nombre: 'Costos Indirectos (Overhead)', descripcion: 'Porcentaje destinado a gastos centrales de administración contable de la sede.' },

  // Categoría 5
  { id: 'part-51', categoria_id: 'cat-5', codigo: '5.1', nombre: 'Visibilidad', descripcion: 'Banners, chalecos identificadores de personal, y calcomanías para logos de donantes.' },
  { id: 'part-52', categoria_id: 'cat-5', codigo: '5.2', nombre: 'Monitoreo, Evaluación y Rendición de Cuentas', descripcion: 'Viajes de control de hitos, auditorías del proyecto y elaboración de reportes.' }
];

const INITIAL_BUDGETS: Budget[] = [
  // Proyecto 1
  { id: 'b-1', proyecto_id: 'proj-1', partida_id: 'part-14', monto_asignado: 15000.00, monto_ejecutado: 4850.00, monto_comprometido: 0, periodo: '2026-ANUAL' },
  { id: 'b-2', proyecto_id: 'proj-1', partida_id: 'part-23', monto_asignado: 3000.00, monto_ejecutado: 1200.00, monto_comprometido: 0, periodo: '2026-ANUAL' },
  { id: 'b-3', proyecto_id: 'proj-1', partida_id: 'part-41', monto_asignado: 1000.00, monto_ejecutado: 350.00, monto_comprometido: 0, periodo: '2026-ANUAL' },
  // Proyecto 2
  { id: 'b-4', proyecto_id: 'proj-2', partida_id: 'part-13', monto_asignado: 25000.00, monto_ejecutado: 12500.00, monto_comprometido: 0, periodo: '2026-ANUAL' },
  { id: 'b-5', proyecto_id: 'proj-2', partida_id: 'part-23', monto_asignado: 4000.00, monto_ejecutado: 890.00, monto_comprometido: 0, periodo: '2026-ANUAL' },
  // Proyecto 3
  { id: 'b-6', proyecto_id: 'proj-3', partida_id: 'part-22', monto_asignado: 10000.00, monto_ejecutado: 6200.00, monto_comprometido: 0, periodo: '2026-ANUAL' }
];

const INITIAL_BANK_TRANSACTIONS: BankTransaction[] = [
  { id: 'tx-1', fecha: '2026-06-01', referencia: 'REF-82910', descripcion: 'TRANSFERENCIA RECIBIDA DONANTE ALIANZA BAUTISTA', monto: 35000.00, estado: 'pendiente' },
  { id: 'tx-2', fecha: '2026-06-02', referencia: 'REF-33412', descripcion: 'DONACION OFRENDA TEMPLO METROPOLITANO CARACAS', monto: 12000.00, estado: 'pendiente' },
  { id: 'tx-3', fecha: '2026-06-05', referencia: 'PAGO-88122', descripcion: 'COMPRA DROGUERIA FARMA-SALUD SUMINISTROS', monto: -12500.00, estado: 'pendiente' },
  { id: 'tx-4', fecha: '2026-06-10', referencia: 'REF-92011', descripcion: 'PAGO ALIMENTOS POLAR COMEDOR MARACAIBO', monto: -4850.00, estado: 'pendiente' },
  { id: 'tx-5', fecha: '2026-06-12', referencia: 'PAGO-00129', descripcion: 'COMPRA COLCHONES REFUGIO SAN CRISTOBAL', monto: -6200.00, estado: 'pendiente' },
  { id: 'tx-6', fecha: '2026-06-15', referencia: 'RET-33100', descripcion: 'PAGO RECTIFICACION FLETE CAMIONES VALENCIA', monto: -1200.00, estado: 'pendiente' },
  { id: 'tx-7', fecha: '2026-06-18', referencia: 'PAGO-55291', descripcion: 'FACTURA ESTACION SERVICIO EL PACIFICO COMB', monto: -890.00, estado: 'pendiente' },
  { id: 'tx-8', fecha: '2026-06-20', referencia: 'REF-11928', descripcion: 'TRANSFERENCIA RECIBIDA IGLESIA LAS ACACIAS', monto: 5000.00, estado: 'pendiente' },
  { id: 'tx-9', fecha: '2026-06-22', referencia: 'PAGO-38190', descripcion: 'COMPRA MATERIAL SANITARIO FARMACIA SOCIAL', monto: -820.00, estado: 'pendiente' }
];

const INITIAL_EXPENSES: ExpenseReceipt[] = [
  {
    id: 'exp-1',
    proyecto_id: 'proj-1',
    partida_id: 'part-14',
    transaccion_id: null,
    solicitante_id: 'coord-1',
    solicitante_nombre: 'José Rodríguez (Coordinador Zulia)',
    monto: 4850.00,
    descripcion: 'Compra de víveres, arroz, granos y harina para el comedor infantil Maracaibo Oeste.',
    fecha_gasto: '2026-06-08',
    url_comprobante: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=600',
    url_pago: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600',
    estado: 'pendiente_revision',
    comentarios_auditoria: null
  },
  {
    id: 'exp-2',
    proyecto_id: 'proj-2',
    partida_id: 'part-13',
    transaccion_id: null,
    solicitante_id: 'coord-2',
    solicitante_nombre: 'Hna. María Gómez (Coordinadora Médica)',
    monto: 12500.00,
    descripcion: 'Compra de antibióticos y analgésicos para las jornadas de salud en el Alto Apure.',
    fecha_gasto: '2026-06-04',
    url_comprobante: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600',
    url_pago: null,
    estado: 'pendiente_revision',
    comentarios_auditoria: null
  },
  {
    id: 'exp-3',
    proyecto_id: 'proj-3',
    partida_id: 'part-22',
    transaccion_id: 'tx-5', // Pre-conciliado en el mock
    solicitante_id: 'coord-3',
    solicitante_nombre: 'Carlos Silva (Logística Táchira)',
    monto: 6200.00,
    descripcion: 'Adquisición de 40 colchonetas y mantas térmicas para el Refugio Bautista San Cristóbal.',
    fecha_gasto: '2026-06-11',
    url_comprobante: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=600',
    url_pago: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600',
    estado: 'aprobado',
    comentarios_auditoria: 'Soporte y factura fiscal adjuntos. Conciliación automática correcta.'
  },
  {
    id: 'exp-4',
    proyecto_id: 'proj-1',
    partida_id: 'part-23',
    transaccion_id: 'tx-6',
    solicitante_id: 'coord-1',
    solicitante_nombre: 'José Rodríguez (Coordinador Zulia)',
    monto: 1200.00,
    descripcion: 'Pago de flete camión con comida desde el Centro Bautista en Caracas a Maracaibo.',
    fecha_gasto: '2026-06-14',
    url_comprobante: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=600',
    url_pago: null,
    estado: 'aprobado',
    comentarios_auditoria: 'Recibo de flete verificado.'
  }
];

const INITIAL_DONATIONS: Donation[] = [
  {
    id: 'don-1',
    proyecto_id: 'proj-1',
    transaccion_id: null,
    donante: 'Alianza Bautista Internacional',
    monto: 35000.00,
    descripcion: 'Fondo internacional etiquetado para Zulia.',
    fecha: '2026-06-01'
  }
];

// Helper para inicializar LocalStorage en modo simulación
const initLocalStorage = () => {
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
};

if (isSimulationMode) {
  initLocalStorage();
}

// =========================================================================
// SERVICIOS / MÉTODOS DE LA API (SUPABASE O LOCALSTORAGE)
// =========================================================================
export const api = {
  // --- PROYECTOS ---
  getProjects: async (): Promise<Project[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('proyectos').select('*').order('nombre');
      if (error) throw error;
      return data as Project[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
    }
  },

  createProject: async (project: Omit<Project, 'id'>): Promise<Project> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('proyectos').insert([project]).select().single();
      if (error) throw error;
      return data as Project;
    } else {
      const projects = JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
      const newProject = { ...project, id: `proj-${Date.now()}` };
      projects.push(newProject);
      localStorage.setItem('cnbv_projects', JSON.stringify(projects));
      return newProject;
    }
  },

  // --- CATEGORÍAS ---
  getCategories: async (): Promise<ExpenseCategory[]> => {
    if (!isSimulationMode) {
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
      const { data, error } = await supabase.from('partidas_gasto').select('*').order('codigo');
      if (error) throw error;
      return data as PartidaGasto[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_partidas') || '[]');
    }
  },

  // --- PRESUPUESTOS ---
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
      const { data, error } = await supabase.from('transacciones_bancarias').select('*').order('fecha', { ascending: false });
      if (error) throw error;
      return data as BankTransaction[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');
    }
  },

  importBankTransactions: async (txs: Omit<BankTransaction, 'id' | 'estado'>[]): Promise<BankTransaction[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('transacciones_bancarias').insert(
        txs.map(tx => ({ ...tx, estado: 'pendiente' }))
      ).select();
      if (error) throw error;
      return data as BankTransaction[];
    } else {
      const current = JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');
      const newTxs = txs.map(tx => ({
        ...tx,
        id: `tx-${Math.random().toString(36).substr(2, 9)}`,
        estado: 'pendiente' as const
      }));
      const updated = [...newTxs, ...current];
      localStorage.setItem('cnbv_bank_transactions', JSON.stringify(updated));
      return newTxs;
    }
  },

  // --- EGRESOS / COMPROBANTES DE GASTO ---
  getExpenses: async (): Promise<ExpenseReceipt[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('comprobantes_gasto').select('*').order('fecha_gasto', { ascending: false });
      if (error) throw error;
      return data as ExpenseReceipt[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
    }
  },

  createExpense: async (
    expense: Omit<ExpenseReceipt, 'id' | 'estado' | 'comentarios_auditoria' | 'transaccion_id' | 'url_pago'>, 
    file?: File,
    pagoFile?: File
  ): Promise<ExpenseReceipt> => {
    let fileUrl: string | null = null;
    let pagoFileUrl: string | null = null;

    if (file) {
      if (!isSimulationMode) {
        // Subida real a Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_recibo.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(fileName);
        fileUrl = publicUrl;
      } else {
        // En simulación convertimos a Base64 local o simulamos una URL
        fileUrl = URL.createObjectURL(file);
      }
    }

    if (pagoFile) {
      if (!isSimulationMode) {
        // Subida real a Supabase Storage
        const fileExt = pagoFile.name.split('.').pop();
        const fileName = `${Date.now()}_pago.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(fileName, pagoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(fileName);
        pagoFileUrl = publicUrl;
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
      url_pago: pagoFileUrl || null
    };

    if (!isSimulationMode) {
      const { data, error } = await supabase.from('comprobantes_gasto').insert([newExpense]).select().single();
      if (error) throw error;
      return data as ExpenseReceipt;
    } else {
      const expenses = JSON.parse(localStorage.getItem('cnbv_expenses') || '[]');
      const created = {
        ...newExpense,
        id: `exp-${Date.now()}`,
        solicitante_nombre: expense.solicitante_nombre || 'Coordinador de Campo'
      };
      expenses.unshift(created);
      localStorage.setItem('cnbv_expenses', JSON.stringify(expenses));
      return created;
    }
  },

  updateExpenseStatus: async (expenseId: string, estado: ExpenseReceipt['estado'], comentarios: string | null, auditorId: string): Promise<ExpenseReceipt> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('comprobantes_gasto')
        .update({
          estado,
          comentarios_auditoria: comentarios,
          auditado_por: auditorId,
          auditado_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
        auditado_at: new Date().toISOString()
      };

      // Si se aprueba el gasto en modo simulación, actualizar la ejecución presupuestaria
      if (estado === 'aprobado' && expenses[index].estado !== 'aprobado') {
        const budgets = JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');
        const bIndex = budgets.findIndex((b: Budget) => b.proyecto_id === updated.proyecto_id && b.partida_id === updated.partida_id);
        if (bIndex !== -1) {
          budgets[bIndex].monto_ejecutado += updated.monto;
          localStorage.setItem('cnbv_budgets', JSON.stringify(budgets));
        }
      } else if (estado !== 'aprobado' && expenses[index].estado === 'aprobado') {
        const budgets = JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');
        const bIndex = budgets.findIndex((b: Budget) => b.proyecto_id === updated.proyecto_id && b.partida_id === updated.partida_id);
        if (bIndex !== -1) {
          budgets[bIndex].monto_ejecutado = Math.max(0, budgets[bIndex].monto_ejecutado - updated.monto);
          localStorage.setItem('cnbv_budgets', JSON.stringify(budgets));
        }
      }

      expenses[index] = updated;
      localStorage.setItem('cnbv_expenses', JSON.stringify(expenses));
      return updated;
    }
  },

  // --- CONCILIACIÓN BANCARIA ---
  reconcileExpense: async (expenseId: string, transactionId: string): Promise<{ expense: ExpenseReceipt; transaction: BankTransaction }> => {
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
        transaction: txData as BankTransaction
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
        transaction: transactions[txIndex]
      };
    }
  },

  // --- DONACIONES ---
  getDonations: async (): Promise<Donation[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('donaciones').select('*').order('fecha', { ascending: false });
      if (error) throw error;
      return data as Donation[];
    } else {
      return JSON.parse(localStorage.getItem('cnbv_donations') || '[]');
    }
  },

  createDonation: async (donation: Omit<Donation, 'id'>): Promise<Donation> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase.from('donaciones').insert([donation]).select().single();
      if (error) throw error;
      return data as Donation;
    } else {
      const donations = JSON.parse(localStorage.getItem('cnbv_donations') || '[]');
      const created = { ...donation, id: `don-${Date.now()}` };
      donations.unshift(created);
      localStorage.setItem('cnbv_donations', JSON.stringify(donations));

      // Si viene ligada a una transacción bancaria, marcarla como conciliada en simulación
      if (donation.transaccion_id) {
        const transactions = JSON.parse(localStorage.getItem('cnbv_bank_transactions') || '[]');
        const txIndex = transactions.findIndex((t: BankTransaction) => t.id === donation.transaccion_id);
        if (txIndex !== -1) {
          transactions[txIndex].estado = 'conciliado';
          localStorage.setItem('cnbv_bank_transactions', JSON.stringify(transactions));
        }
      }

      return created;
    }
  },

  // --- GESTIÓN DE USUARIOS ---
  getUsers: async (): Promise<any[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('usuarios_perfiles')
        .select('*')
        .order('nombre_completo');
      if (error) throw error;
      return data;
    } else {
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      return Object.values(profiles);
    }
  },

  updateUserProfile: async (userId: string, updates: { rol?: UserRole; aprobado?: boolean }): Promise<any> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('usuarios_perfiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      if (!profiles[userId]) throw new Error('User profile not found in simulation');
      
      const updated = {
        ...profiles[userId],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      profiles[userId] = updated;
      localStorage.setItem('cnbv_profiles', JSON.stringify(profiles));
      return updated;
    }
  }
};

// =========================================================================
// 5. API Y TIPOS DE REQUISICIONES (SOLICITUDES DE GASTO)
// =========================================================================
export type RequisitionStatus = 'pendiente_aprobacion_1' | 'pendiente_aprobacion_2' | 'aprobada_ejecucion' | 'rechazada';

export interface Requisition {
  id: string;
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

export const requisitionsApi = {
  getRequisitions: async (): Promise<Requisition[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('solicitudes_gasto')
        .select(`
          *,
          solicitante:usuarios_perfiles!solicitante_id(nombre_completo),
          proyecto:proyectos(nombre),
          partida:partidas_gasto(
            nombre,
            codigo,
            categoria:categorias_gasto(nombre)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data as any[]).map(row => ({
        ...row,
        solicitante_nombre: row.solicitante?.nombre_completo,
        proyecto_nombre: row.proyecto?.nombre,
        partida_nombre: row.partida?.nombre,
        partida_codigo: row.partida?.codigo,
        categoria_nombre: row.partida?.categoria?.nombre
      }));
    } else {
      const reqs = JSON.parse(localStorage.getItem('cnbv_requisitions') || '[]');
      const projects = JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
      const partidas = JSON.parse(localStorage.getItem('cnbv_partidas') || '[]');
      const categories = JSON.parse(localStorage.getItem('cnbv_categories') || '[]');
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      
      return reqs.map((r: any) => {
        const p = projects.find((x: any) => x.id === r.proyecto_id);
        const part = partidas.find((x: any) => x.id === r.partida_id);
        const cat = part ? categories.find((x: any) => x.id === part.categoria_id) : null;
        const user = profiles[r.solicitante_id];
        return {
          ...r,
          proyecto_nombre: p ? p.nombre : 'Proyecto Zulia',
          partida_nombre: part ? part.nombre : 'Artículos No Alimentarios',
          partida_codigo: part ? part.codigo : '1.1',
          categoria_nombre: cat ? cat.nombre : 'Costos Directos',
          solicitante_nombre: user ? user.nombre_completo : 'Coordinador'
        };
      });
    }
  },

  createRequisition: async (req: Omit<Requisition, 'id' | 'estado' | 'created_at' | 'updated_at' | 'validador_1_id' | 'validador_2_id' | 'validado_1_at' | 'validado_2_at' | 'rechazado_por' | 'rechazado_at' | 'motivo_rechazo'>): Promise<Requisition> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('solicitudes_gasto')
        .insert([req])
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
        updated_at: new Date().toISOString()
      };
      reqs.unshift(newReq);
      localStorage.setItem('cnbv_requisitions', JSON.stringify(reqs));
      return newReq;
    }
  },

  approveRequisition: async (requisitionId: string, validadorId: string, currentStatus: RequisitionStatus): Promise<Requisition> => {
    let nextStatus: RequisitionStatus = currentStatus === 'pendiente_aprobacion_1' 
      ? 'pendiente_aprobacion_2' 
      : 'aprobada_ejecucion';

    const updates: Partial<Requisition> = currentStatus === 'pendiente_aprobacion_1' 
      ? { validador_1_id: validadorId, validado_1_at: new Date().toISOString(), estado: nextStatus }
      : { validador_2_id: validadorId, validado_2_at: new Date().toISOString(), estado: nextStatus };

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
        const bIndex = budgets.findIndex((b: Budget) => b.proyecto_id === updated.proyecto_id && b.partida_id === updated.partida_id);
        if (bIndex !== -1) {
          budgets[bIndex].monto_comprometido = (budgets[bIndex].monto_comprometido || 0) + updated.monto_solicitado;
          localStorage.setItem('cnbv_budgets', JSON.stringify(budgets));
        }
      }

      return updated;
    }
  },

  rejectRequisition: async (requisitionId: string, auditorId: string, motivo: string): Promise<Requisition> => {
    const updates: Partial<Requisition> = {
      estado: 'rechazada',
      rechazado_por: auditorId,
      rechazado_at: new Date().toISOString(),
      motivo_rechazo: motivo
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
        const bIndex = budgets.findIndex((b: Budget) => b.proyecto_id === updated.proyecto_id && b.partida_id === updated.partida_id);
        if (bIndex !== -1) {
          budgets[bIndex].monto_comprometido = Math.max(0, (budgets[bIndex].monto_comprometido || 0) - updated.monto_solicitado);
          localStorage.setItem('cnbv_budgets', JSON.stringify(budgets));
        }
      }

      return updated;
    }
  }
};
