import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Project, ExpenseCategory, Budget, ExpenseReceipt } from '../../services/api';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export const BudgetsAndReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<ExpenseReceipt[]>([]);

  // Formulario de asignación
  const [projectId, setProjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [montoAsignado, setMontoAsignado] = useState('');
  const [periodo, setPeriodo] = useState('2026-ANUAL');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, catList, bList, expList] = await Promise.all([
        api.getProjects(),
        api.getCategories(),
        api.getBudgets(),
        api.getExpenses()
      ]);
      setProjects(projList);
      setCategories(catList);
      setBudgets(bList);
      setExpenses(expList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !categoryId || !montoAsignado) {
      alert('Por favor complete todos los campos.');
      return;
    }

    setSubmitting(true);
    try {
      const mockBudgets = JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');
      const existingIdx = mockBudgets.findIndex((b: Budget) => 
        b.proyecto_id === projectId && b.categoria_id === categoryId && b.periodo === periodo
      );

      if (existingIdx !== -1) {
        mockBudgets[existingIdx].monto_asignado = parseFloat(montoAsignado);
      } else {
        mockBudgets.push({
          id: `b-${Date.now()}`,
          proyecto_id: projectId,
          categoria_id: categoryId,
          monto_asignado: parseFloat(montoAsignado),
          monto_ejecutado: 0,
          periodo: periodo
        });
      }

      localStorage.setItem('cnbv_budgets', JSON.stringify(mockBudgets));
      alert('Presupuesto asignado con éxito.');
      setMontoAsignado('');
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Error al asignar el presupuesto.');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 1. GENERACIÓN DE REPORTE EXCEL (xlsx)
  // =========================================================================
  const handleExportExcel = () => {
    try {
      // Hoja 1: Resumen Presupuestario
      const resumenData = budgets.map(b => {
        const projName = projects.find(p => p.id === b.proyecto_id)?.nombre || 'N/A';
        const catName = categories.find(c => c.id === b.categoria_id)?.nombre || 'N/A';
        return {
          'Proyecto': projName,
          'Categoría de Gasto': catName,
          'Monto Presupuestado (USD)': b.monto_asignado,
          'Monto Ejecutado (USD)': b.monto_ejecutado,
          'Disponible (USD)': b.monto_asignado - b.monto_ejecutado,
          '% Ejecución': b.monto_asignado > 0 ? `${((b.monto_ejecutado / b.monto_asignado) * 100).toFixed(1)}%` : '0%'
        };
      });

      // Hoja 2: Egresos Aprobados
      const egresostData = expenses.filter(e => e.estado === 'aprobado').map(e => {
        const projName = projects.find(p => p.id === e.proyecto_id)?.nombre || 'N/A';
        const catName = categories.find(c => c.id === e.categoria_id)?.nombre || 'N/A';
        return {
          'Fecha': e.fecha_gasto,
          'Proyecto': projName,
          'Categoría': catName,
          'Descripción del Gasto': e.descripcion,
          'Monto (USD)': e.monto,
          'Solicitado Por': e.solicitante_nombre || 'Coordinador',
          'Estado Conciliación': e.transaccion_id ? 'Conciliado con Banco' : 'Pendiente Conciliar'
        };
      });

      const wb = XLSX.utils.book_new();
      
      const wsResumen = XLSX.utils.json_to_sheet(resumenData);
      const wsEgresos = XLSX.utils.json_to_sheet(egresostData);

      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Presupuestario');
      XLSX.utils.book_append_sheet(wb, wsEgresos, 'Egresos Aprobados');

      XLSX.writeFile(wb, `Reporte_Auditoria_CNBV_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Error al generar archivo Excel.');
    }
  };

  // =========================================================================
  // 2. GENERACIÓN DE REPORTE PDF (jsPDF)
  // =========================================================================
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Colores de la paleta
      doc.setTextColor(47, 90, 174); // Azul Batista
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('CONVENCIÓN NACIONAL BAUTISTA DE VENEZUELA', 105, 20, { align: 'center' });
      
      doc.setTextColor(7, 58, 17); // Verde Iglesia
      doc.setFontSize(12);
      doc.text('Reporte de Auditoría y Rendición de Cuentas de Fondos', 105, 28, { align: 'center' });
      
      doc.setTextColor(39, 38, 38); // Gris Oscuro
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 15, 38);
      doc.text('Destinatario: Dirección de Administración y Cooperación Internacional', 15, 43);

      doc.setDrawColor(226, 232, 240);
      doc.line(15, 48, 195, 48);

      // Tabla de Resumen
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('1. RESUMEN EJECUTIVO DE PROYECTOS', 15, 56);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Proyecto', 15, 65);
      doc.text('Presupuestado', 110, 65);
      doc.text('Ejecutado', 145, 65);
      doc.text('% Ejec.', 175, 65);
      
      doc.setFont('Helvetica', 'normal');
      doc.line(15, 67, 195, 67);

      let yOffset = 73;
      projects.forEach(proj => {
        const projBudgets = budgets.filter(b => b.proyecto_id === proj.id);
        const assigned = projBudgets.reduce((sum, b) => sum + b.monto_asignado, 0);
        const executed = projBudgets.reduce((sum, b) => sum + b.monto_ejecutado, 0);
        const percent = assigned > 0 ? ((executed / assigned) * 100).toFixed(1) + '%' : '0.0%';

        doc.text(proj.nombre.substring(0, 45), 15, yOffset);
        doc.text(`$${assigned.toFixed(2)}`, 110, yOffset);
        doc.text(`$${executed.toFixed(2)}`, 145, yOffset);
        doc.text(percent, 175, yOffset);

        doc.line(15, yOffset + 2, 195, yOffset + 2);
        yOffset += 8;
      });

      // Sumatorias Totales
      const totalB = budgets.reduce((sum, b) => sum + b.monto_asignado, 0);
      const totalE = budgets.reduce((sum, b) => sum + b.monto_ejecutado, 0);
      
      doc.setFont('Helvetica', 'bold');
      doc.text('TOTAL CONSOLIDADO', 15, yOffset);
      doc.text(`$${totalB.toFixed(2)}`, 110, yOffset);
      doc.text(`$${totalE.toFixed(2)}`, 145, yOffset);
      doc.text(totalB > 0 ? ((totalE / totalB) * 100).toFixed(1) + '%' : '0.0%', 175, yOffset);

      // Tabla de Recibos Recientes
      yOffset += 15;
      doc.text('2. DETALLE DE GASTOS AUDITADOS Y CONCILIADOS', 15, yOffset);
      yOffset += 8;

      doc.setFontSize(8);
      doc.text('Fecha', 15, yOffset);
      doc.text('Concepto', 35, yOffset);
      doc.text('Categoría', 115, yOffset);
      doc.text('Monto', 165, yOffset);
      doc.text('Conciliado', 180, yOffset);
      doc.line(15, yOffset + 2, 195, yOffset + 2);
      
      doc.setFont('Helvetica', 'normal');
      yOffset += 7;

      const approvedExpenses = expenses.filter(e => e.estado === 'aprobado');
      approvedExpenses.slice(0, 15).forEach(e => {
        if (yOffset > 270) {
          doc.addPage();
          yOffset = 20;
          doc.setFont('Helvetica', 'bold');
          doc.text('Detalle de Gastos (Continuación)', 15, yOffset);
          yOffset += 8;
          doc.line(15, yOffset, 195, yOffset);
          yOffset += 6;
          doc.setFont('Helvetica', 'normal');
        }

        const catName = categories.find(c => c.id === e.categoria_id)?.nombre || 'Otros';

        doc.text(e.fecha_gasto, 15, yOffset);
        doc.text(e.descripcion.substring(0, 42), 35, yOffset);
        doc.text(catName.substring(0, 25), 115, yOffset);
        doc.text(`$${e.monto.toFixed(2)}`, 165, yOffset);
        doc.text(e.transaccion_id ? 'Sí (Banco)' : 'No', 180, yOffset);

        doc.line(15, yOffset + 2, 195, yOffset + 2);
        yOffset += 7;
      });

      // Pie de Página Firma
      if (yOffset > 240) {
        doc.addPage();
        yOffset = 30;
      } else {
        yOffset += 20;
      }

      doc.setFont('Helvetica', 'bold');
      doc.text('Firmas Responsables:', 15, yOffset);
      yOffset += 15;
      
      doc.line(15, yOffset, 80, yOffset);
      doc.line(115, yOffset, 180, yOffset);
      
      doc.setFontSize(7);
      doc.text('Director de Finanzas CNBV', 15, yOffset + 4);
      doc.text('Auditor Principal CNBV', 115, yOffset + 4);

      doc.save(`Reporte_Auditoria_CNBV_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="animate-fade-in-up">
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 700 }}>Presupuestos y Rendición de Cuentas</h2>
          <p style={{ color: 'var(--neutral-dark)', opacity: 0.8, fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Gestiona los presupuestos asignados a cada campaña y genera reportes oficiales para donantes en PDF y Excel.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportExcel} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
            🟢 Exportar Excel (.xlsx)
          </button>
          
          <button onClick={handleExportPDF} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            🔴 Generar Reporte PDF (.pdf)
          </button>
        </div>
      </div>

      {/* Contenido en dos columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Columna Izquierda: Listado de Presupuestos Activos */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Distribución Presupuestaria Vigente</h3>
          
          {loading ? (
            <div>Cargando datos...</div>
          ) : budgets.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
              No se han definido presupuestos para ningún proyecto todavía.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', fontWeight: 700 }}>
                    <th style={{ padding: '0.5rem 0.25rem' }}>Proyecto</th>
                    <th style={{ padding: '0.5rem 0.25rem' }}>Categoría</th>
                    <th style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>Presupuesto</th>
                    <th style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>Ejecutado</th>
                    <th style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map(b => {
                    const projName = projects.find(p => p.id === b.proyecto_id)?.nombre || 'N/A';
                    const catName = categories.find(c => c.id === b.categoria_id)?.nombre || 'N/A';
                    const disponible = b.monto_asignado - b.monto_ejecutado;
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0.25rem', fontWeight: 500 }}>
                          {projName.length > 25 ? projName.substring(0, 25) + '...' : projName}
                        </td>
                        <td style={{ padding: '0.75rem 0.25rem', opacity: 0.8 }}>{catName}</td>
                        <td style={{ padding: '0.75rem 0.25rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(b.monto_asignado)}</td>
                        <td style={{ padding: '0.75rem 0.25rem', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(b.monto_ejecutado)}</td>
                        <td style={{ padding: '0.75rem 0.25rem', textAlign: 'right', color: disponible < 100 ? 'var(--danger)' : 'var(--primary)', fontWeight: 700 }}>
                          {formatCurrency(disponible)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Columna Derecha: Formulario para Asignar Presupuesto */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 className="card-title">Asignar o Modificar Presupuesto</h3>
          
          <form onSubmit={handleCreateBudget}>
            {/* Proyecto */}
            <div className="form-group">
              <label className="form-label">Seleccionar Proyecto *</label>
              <select
                className="form-input form-select"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">Selecciona el Proyecto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            {/* Categoría */}
            <div className="form-group">
              <label className="form-label">Seleccionar Categoría de Gasto *</label>
              <select
                className="form-input form-select"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">Selecciona la Categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Monto Asignado */}
              <div className="form-group">
                <label className="form-label">Monto Asignado (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={montoAsignado}
                  onChange={e => setMontoAsignado(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Período */}
              <div className="form-group">
                <label className="form-label">Período de Ejecución *</label>
                <select
                  className="form-input form-select"
                  value={periodo}
                  onChange={e => setPeriodo(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="2026-ANUAL">2026 ANUAL</option>
                  <option value="2026-Q1">2026 Primer Trimestre</option>
                  <option value="2026-Q2">2026 Segundo Trimestre</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}
              disabled={submitting}
            >
              {submitting ? 'Asignando presupuesto...' : 'Guardar Asignación Presupuestaria'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
