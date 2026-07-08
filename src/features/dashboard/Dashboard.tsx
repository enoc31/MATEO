import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, Clock, Upload, Scale } from 'lucide-react';
import { api } from '../../services/api';
import type { ExpenseCategory } from '../../services/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catList, metricsData] = await Promise.all([
          api.getCategories(),
          api.getDashboardMetrics()
        ]);
        setCategories(catList);
        setMetrics(metricsData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 600 }}>Cargando tableros...</div>
      </div>
    );
  }

  // Si falla la carga, usar fallbacks
  const data = metrics || {
    totalInflows: 0,
    reconciledInflows: 0,
    unreconciledInflows: 0,
    totalOutflows: 0,
    expensesByCategory: {},
    projectExecution: []
  };

  const { totalInflows, reconciledInflows, unreconciledInflows, totalOutflows, expensesByCategory, projectExecution } = data;
  const availableBalance = reconciledInflows - totalOutflows;

  // Ejecución Presupuestaria Total
  const totalBudgeted = projectExecution.reduce((sum: number, p: any) => sum + Number(p.Presupuesto || 0), 0);
  const totalExecuted = projectExecution.reduce((sum: number, p: any) => sum + Number(p.Ejecutado || 0), 0);
  const budgetExecutionPercent = totalBudgeted > 0 ? (totalExecuted / totalBudgeted) * 100 : 0;

  // --- 2. PREPARACIÓN DE DATOS PARA GRÁFICOS ---
  const CATEGORY_COLORS = ['#2f5aae', '#073a11', '#008fa6', '#be574b', '#e2af13', '#64748b'];

  const categoryData = Object.keys(expensesByCategory).map((catId, index) => {
    const catObj = categories.find(c => c.id === catId);
    const catName = catObj ? catObj.nombre.split(' (')[0].replace(/^\d+\.\s+/, '') : 'Otros';
    return {
      name: catName,
      value: Number(expensesByCategory[catId] || 0),
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    };
  });

  // Mostrar todos los proyectos que vienen de la base de datos (activos o con presupuesto)
  const projectExecutionData = projectExecution;

  // Formateador de moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="animate-fade-in-up">
      {/* Encabezado del Dashboard */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 700 }}>Tablero Informativo en Tiempo Real</h2>
        <p style={{ color: 'var(--neutral-dark)', opacity: 0.8, fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Monitoreo global de fondos recibidos, ejecución de ayuda humanitaria y control de auditoría.
        </p>
      </div>

      {/* Tarjetas de Métricas (KPIs) */}
      <div className="grid-cols-3" style={{ marginBottom: '2rem' }}>
        {/* Total Entradas */}
        <div className="card" style={{ borderLeft: '5px solid var(--primary)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--neutral-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Entradas (Ingresos Registrados)
              </p>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginTop: '0.35rem', fontWeight: 800 }}>
                {formatCurrency(totalInflows)}
              </h3>
            </div>
            <span style={{ display: 'flex', alignItems: 'center' }}><Download size={36} color="var(--primary)" /></span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} color="var(--success)" /> Disponible (Conciliado):</span>
              <strong style={{ color: 'var(--success)' }}>{formatCurrency(reconciledInflows)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} color="#d97706" /> No Disponible (Pendiente):</span>
              <strong style={{ color: '#d97706' }}>{formatCurrency(unreconciledInflows)}</strong>
            </div>
          </div>
        </div>

        {/* Total Salidas */}
        <div className="card" style={{ borderLeft: '5px solid var(--secondary)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Egresos (Gastos Ejecutados)
              </p>
              <h3 style={{ fontSize: '1.6rem', color: 'var(--secondary)', marginTop: '0.5rem', fontWeight: 700 }}>
                {formatCurrency(totalOutflows)}
              </h3>
            </div>
            <span style={{ display: 'flex', alignItems: 'center' }}><Upload size={32} color="var(--secondary)" /></span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.6, marginTop: '0.75rem' }}>
            Egresos correspondientes a comprobantes debidamente auditados y aprobados.
          </div>
        </div>

        {/* Balance Neto */}
        <div className="card" style={{ borderLeft: '5px solid var(--accent)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Fondo de Reserva Disponible
              </p>
              <h3 style={{ fontSize: '1.6rem', color: 'var(--accent)', marginTop: '0.5rem', fontWeight: 700 }}>
                {formatCurrency(availableBalance)}
              </h3>
            </div>
            <span style={{ display: 'flex', alignItems: 'center' }}><Scale size={32} color="var(--accent)" /></span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.6, marginTop: '0.75rem' }}>
            Fondos reales líquidos disponibles en banco/caja (Ingresos conciliados - Egresos aprobados).
          </div>
        </div>
      </div>

      {/* Fila de Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Gráfico 1: Ejecución Presupuestaria por Proyecto */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
          <h4 className="card-title">Ejecución Presupuestaria por Proyecto</h4>
          <div style={{ flex: 1, minHeight: 0 }}>
            {projectExecutionData.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-dark)', opacity: 0.6 }}>
                No hay presupuestos asignados para mostrar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectExecutionData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="Presupuesto" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ejecutado" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Distribución de Gastos por Categoría */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
          <h4 className="card-title">Egresos por Categoría de Ayuda</h4>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', minHeight: 0 }}>
            {categoryData.length === 0 ? (
              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-dark)', opacity: 0.6 }}>
                No hay gastos aprobados para mostrar distribución.
              </div>
            ) : (
              <>
                <div style={{ width: '55%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Leyenda de Categorías */}
                <div style={{ width: '45%', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {categoryData.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: entry.color }}></div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{entry.name}</span>
                        <span style={{ color: 'var(--neutral-dark)', opacity: 0.7 }}>
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Control Presupuestario Global y Estado del Presupuesto */}
      <div className="card">
        <h4 className="card-title">Ejecución del Presupuesto General Consolidado</h4>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Monto Ejecutado vs Asignado</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
            {formatCurrency(totalExecuted)} / {formatCurrency(totalBudgeted)} ({budgetExecutionPercent.toFixed(1)}%)
          </span>
        </div>

        {/* Barra de Progreso */}
        <div style={{ 
          width: '100%', 
          height: '24px', 
          backgroundColor: '#e2e8f0', 
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '1rem'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, budgetExecutionPercent)}%`,
            backgroundColor: budgetExecutionPercent > 90 ? 'var(--danger)' : 
                             budgetExecutionPercent > 75 ? 'var(--warning)' : 'var(--primary)',
            transition: 'width 0.5s ease',
            borderRadius: '9999px'
          }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ backgroundColor: 'var(--neutral-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.7, fontWeight: 500 }}>Presupuesto Total Asignado</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{formatCurrency(totalBudgeted)}</div>
          </div>
          <div style={{ backgroundColor: 'var(--neutral-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.7, fontWeight: 500 }}>Presupuesto Ejecutado (Aprobado)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--success)' }}>{formatCurrency(totalExecuted)}</div>
          </div>
          <div style={{ backgroundColor: 'var(--neutral-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.7, fontWeight: 500 }}>Disponible por Ejecutar</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--primary)' }}>
              {formatCurrency(Math.max(0, totalBudgeted - totalExecuted))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
