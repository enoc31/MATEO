import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import type {
  Project,
  ExpenseCategory,
  PartidaGasto,
  Budget,
  ExpenseReceipt,
} from '../../services/api';
import { CreateProjectModal } from './CreateProjectModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../context/AuthContext';

export const BudgetsAndReports: React.FC = () => {
  const navigate = useNavigate();
  const { activeOng } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [partidas, setPartidas] = useState<PartidaGasto[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<ExpenseReceipt[]>([]);

  // Selection
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('2026-ANUAL');

  // Compute unique periods dynamically
  const uniquePeriods = Array.from(new Set(budgets.map((b) => b.periodo))).sort();

  useEffect(() => {
    if (uniquePeriods.length > 0 && !uniquePeriods.includes(filterPeriodo)) {
      setFilterPeriodo(uniquePeriods[0]);
    }
  }, [uniquePeriods, filterPeriodo]);

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const handleProjectCreated = async (newProjId: string) => {
    await loadData();
    setFilterProjectId(newProjId);
    navigate('/app/budget-wizard');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, catList, partList, bList, expList] = await Promise.all([
        api.getProjects(),
        api.getCategories(),
        api.getPartidas(),
        api.getBudgets(),
        api.getExpenses(),
      ]);
      setProjects(projList);
      setCategories(catList);
      setPartidas(partList);
      setBudgets(bList);
      setExpenses(expList);

      // Auto-select first project if available
      if (projList.length > 0 && !filterProjectId) {
        setFilterProjectId(projList[0].id);
      }
    } catch (err) {
      console.error('Error loading budgets page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFilteredBudgets = () => {
    return budgets.filter((b) => b.proyecto_id === filterProjectId && b.periodo === filterPeriodo);
  };

  const getPartidaBudgetInfo = (partidaId: string) => {
    const b = budgets.find(
      (x) =>
        x.proyecto_id === filterProjectId &&
        x.partida_id === partidaId &&
        x.periodo === filterPeriodo,
    );
    return {
      asignado: b ? b.monto_asignado : 0,
      ejecutado: b ? b.monto_ejecutado : 0,
      comprometido: b ? b.monto_comprometido || 0 : 0,
      disponible: b ? b.monto_asignado - b.monto_ejecutado - (b.monto_comprometido || 0) : 0,
    };
  };

  // Summaries
  const selectedProject = projects.find((p) => p.id === filterProjectId);
  const overheadPct =
    selectedProject?.overhead_porcentaje !== undefined ? selectedProject.overhead_porcentaje : 7.0;

  // Dynamically resolve Category 4's ID
  const cat4 = categories.find((c) => c.nombre.startsWith('4.'));
  const cat4Id = cat4 ? cat4.id : 'c4000000-0000-0000-0000-000000000004';

  const calculateDirectCostsSum = () => {
    let sum = 0;
    partidas.forEach((p) => {
      if (p.categoria_id !== cat4Id) {
        sum += getPartidaBudgetInfo(p.id).asignado;
      }
    });
    return sum;
  };

  const directCostsTotal = calculateDirectCostsSum();
  const calculatedOverhead = parseFloat((directCostsTotal * (overheadPct / 100)).toFixed(2));

  const getCategoryTotal = (
    catId: string,
    field: 'asignado' | 'ejecutado' | 'comprometido' | 'disponible',
  ) => {
    let sum = 0;
    const catPartidas = partidas.filter((p) => p.categoria_id === catId);

    catPartidas.forEach((p) => {
      const info = getPartidaBudgetInfo(p.id);
      if (p.codigo === '4.3') {
        if (field === 'asignado') sum += calculatedOverhead;
        else if (field === 'ejecutado') sum += info.ejecutado;
        else if (field === 'comprometido') sum += info.comprometido;
        else if (field === 'disponible')
          sum += calculatedOverhead - info.ejecutado - info.comprometido;
      } else {
        sum += info[field];
      }
    });
    return sum;
  };

  const projectTotalAsignado = directCostsTotal + getCategoryTotal(cat4Id, 'asignado');
  const projectTotalEjecutado = budgets
    .filter((b) => b.proyecto_id === filterProjectId && b.periodo === filterPeriodo)
    .reduce((sum, b) => sum + b.monto_ejecutado, 0);
  const projectTotalComprometido = budgets
    .filter((b) => b.proyecto_id === filterProjectId && b.periodo === filterPeriodo)
    .reduce((sum, b) => sum + (b.monto_comprometido || 0), 0);
  const projectTotalDisponible =
    projectTotalAsignado - projectTotalEjecutado - projectTotalComprometido;

  // =========================================================================
  // 1. GENERACIÓN DE REPORTE EXCEL (xlsx)
  // =========================================================================
  const handleExportExcel = () => {
    try {
      const currentBudgets = getFilteredBudgets();
      if (currentBudgets.length === 0) {
        alert('No hay presupuestos para exportar de este proyecto.');
        return;
      }

      // Hoja 1: Resumen Presupuestario UNDG
      const resumenData = currentBudgets.map((b) => {
        const projName = projects.find((p) => p.id === b.proyecto_id)?.nombre || 'N/A';
        const partida = partidas.find((p) => p.id === b.partida_id);
        const catName = categories.find((c) => c.id === partida?.categoria_id)?.nombre || 'N/A';

        return {
          Proyecto: projName,
          Período: b.periodo,
          Categoría: catName,
          'Código Partida': partida?.codigo || '',
          'Partida Contable': partida?.nombre || 'N/A',
          'Monto Asignado (USD)': b.monto_asignado,
          'Monto Comprometido (USD)': b.monto_comprometido || 0,
          'Monto Ejecutado (USD)': b.monto_ejecutado,
          'Disponible (USD)': b.monto_asignado - b.monto_ejecutado - (b.monto_comprometido || 0),
          '% Ejecución':
            b.monto_asignado > 0
              ? `${((b.monto_ejecutado / b.monto_asignado) * 100).toFixed(1)}%`
              : '0%',
        };
      });

      // Hoja 2: Egresos Aprobados
      const egresostData = expenses
        .filter((e) => e.proyecto_id === filterProjectId && e.estado === 'aprobado')
        .map((e) => {
          const partida = partidas.find((p) => p.id === e.partida_id);
          return {
            Fecha: e.fecha_gasto,
            'Partida Código': partida?.codigo || '',
            'Partida Nombre': partida?.nombre || 'N/A',
            'Descripción del Gasto': e.descripcion,
            'Monto (USD)': e.monto,
            'Solicitado Por': e.solicitante_nombre || 'Coordinador',
            'Estado Conciliación': e.transaccion_id
              ? 'Conciliado con Banco'
              : 'Pendiente Conciliar',
          };
        });

      const wb = XLSX.utils.book_new();

      const wsResumen = XLSX.utils.json_to_sheet(resumenData);
      const wsEgresos = XLSX.utils.json_to_sheet(egresostData);

      XLSX.utils.book_append_sheet(wb, wsResumen, 'Presupuesto UNDG');
      XLSX.utils.book_append_sheet(wb, wsEgresos, 'Gastos Ejecutados');

      XLSX.writeFile(
        wb,
        `Reporte_Presupuestario_UNDG_${selectedProject?.nombre.replace(/\s+/g, '_')}_2026.xlsx`,
      );
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
      if (!selectedProject) return;

      const doc = new jsPDF();
      const formatCurrency = (amount: number): string => {
        const isNegative = amount < 0;
        const absVal = Math.abs(amount);
        const fixed = absVal.toFixed(2);
        const parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${isNegative ? '-' : ''}$${parts.join(',')}`;
      };

      const ongName =
        (Array.isArray(selectedProject.ongs)
          ? selectedProject.ongs[0]?.nombre
          : selectedProject.ongs?.nombre) ||
        activeOng?.nombre ||
        'CONVENCIÓN NACIONAL BAUTISTA DE VENEZUELA';

      // Colores de la paleta
      doc.setTextColor(47, 90, 174); // Azul Batista
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(ongName.toUpperCase(), 105, 20, { align: 'center' });

      doc.setTextColor(7, 58, 17); // Verde
      doc.setFontSize(12);
      doc.text(`Reporte de Ejecución Presupuestaria UNDG - ${filterPeriodo}`, 105, 28, {
        align: 'center',
      });

      doc.setTextColor(39, 38, 38);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Proyecto: ${selectedProject.nombre}`, 15, 38);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 15, 43);
      doc.text(`Tasa de Gastos Indirectos (Overhead): ${overheadPct}%`, 15, 48);

      doc.setDrawColor(226, 232, 240);
      doc.line(15, 52, 195, 52);

      // Tabla de Resumen por Categoría
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RESUMEN GENERAL POR CATEGORÍA UNDG', 15, 60);

      doc.setFontSize(9);
      doc.text('Categoría de Gasto', 15, 68);
      doc.text('Asignado', 120, 68, { align: 'right' });
      doc.text('Comprometido', 145, 68, { align: 'right' });
      doc.text('Ejecutado', 170, 68, { align: 'right' });
      doc.text('Disponible', 195, 68, { align: 'right' });

      doc.line(15, 70, 195, 70);

      let yOffset = 76;
      categories.forEach((cat) => {
        const asignado = getCategoryTotal(cat.id, 'asignado');
        const comprometido = getCategoryTotal(cat.id, 'comprometido');
        const ejecutado = getCategoryTotal(cat.id, 'ejecutado');
        const disponible = getCategoryTotal(cat.id, 'disponible');

        doc.setFont('Helvetica', 'bold');
        doc.text(cat.nombre.substring(0, 48), 15, yOffset);
        doc.setFont('Helvetica', 'normal');
        doc.text(formatCurrency(asignado), 120, yOffset, { align: 'right' });
        doc.text(formatCurrency(comprometido), 145, yOffset, { align: 'right' });
        doc.text(formatCurrency(ejecutado), 170, yOffset, { align: 'right' });
        doc.text(formatCurrency(disponible), 195, yOffset, { align: 'right' });

        doc.line(15, yOffset + 2, 195, yOffset + 2);
        yOffset += 8;
      });

      // Sumatorias Totales
      doc.setFont('Helvetica', 'bold');
      doc.text('TOTAL PROYECTO', 15, yOffset);
      doc.text(formatCurrency(projectTotalAsignado), 120, yOffset, { align: 'right' });
      doc.text(formatCurrency(projectTotalComprometido), 145, yOffset, { align: 'right' });
      doc.text(formatCurrency(projectTotalEjecutado), 170, yOffset, { align: 'right' });
      doc.text(formatCurrency(projectTotalDisponible), 195, yOffset, { align: 'right' });

      yOffset += 15;
      doc.text('DETALLE DE EJECUCIÓN POR PARTIDAS', 15, yOffset);
      yOffset += 8;

      doc.setFontSize(8);
      doc.text('Partida', 15, yOffset);
      doc.text('Monto Asignado', 135, yOffset, { align: 'right' });
      doc.text('Monto Ejecutado', 165, yOffset, { align: 'right' });
      doc.text('Disponible', 195, yOffset, { align: 'right' });
      doc.line(15, yOffset + 2, 195, yOffset + 2);

      doc.setFont('Helvetica', 'normal');
      yOffset += 7;

      partidas.forEach((p) => {
        if (yOffset > 270) {
          doc.addPage();
          yOffset = 20;
          doc.setFont('Helvetica', 'bold');
          doc.text('Detalle por Partidas (Continuación)', 15, yOffset);
          yOffset += 8;
          doc.line(15, yOffset, 195, yOffset);
          yOffset += 6;
          doc.setFont('Helvetica', 'normal');
        }

        const info = getPartidaBudgetInfo(p.id);
        const finalAsignado = p.codigo === '4.3' ? calculatedOverhead : info.asignado;
        const finalDisponible =
          p.codigo === '4.3'
            ? calculatedOverhead - info.ejecutado - info.comprometido
            : info.disponible;

        doc.text(`[${p.codigo}] ${p.nombre.substring(0, 45)}`, 15, yOffset);
        doc.text(formatCurrency(finalAsignado), 135, yOffset, { align: 'right' });
        doc.text(formatCurrency(info.ejecutado), 165, yOffset, { align: 'right' });
        doc.text(formatCurrency(finalDisponible), 195, yOffset, { align: 'right' });

        doc.line(15, yOffset + 2, 195, yOffset + 2);
        yOffset += 7;
      });

      // Firmas Responsables
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
      doc.text('Director de Finanzas', 15, yOffset + 4);
      doc.text('Auditor / Supervisor del Proyecto', 115, yOffset + 4);

      doc.save(`Reporte_UNDG_Presupuesto_${selectedProject.nombre.replace(/\s+/g, '_')}_2026.pdf`);
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 700 }}>
            Presupuestos Modelo UNDG
          </h2>
          <p
            style={{
              color: 'var(--neutral-dark)',
              opacity: 0.8,
              fontSize: '0.9rem',
              marginTop: '0.25rem',
            }}
          >
            Monitoreo en cascada y distribución financiera de partidas estándar (Naciones Unidas)
            con indirectos automáticos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsCreateProjectOpen(true)}
            className="btn btn-outline"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} /> Crear Proyecto
            </span>
          </button>

          <button
            onClick={() => navigate('/app/budget-wizard')}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Briefcase size={16} /> Asistente Presupuesto UNDG
            </span>
          </button>

          <button
            onClick={handleExportExcel}
            className="btn btn-outline"
            style={{ fontSize: '0.85rem' }}
            disabled={!filterProjectId}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileSpreadsheet size={16} color="var(--success)" /> Excel (.xlsx)
            </span>
          </button>

          <button
            onClick={handleExportPDF}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
            disabled={!filterProjectId}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} color="var(--danger)" /> Reporte PDF (.pdf)
            </span>
          </button>
        </div>
      </div>

      {/* Selectores de visualización */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
            Proyecto:
          </label>
          <select
            className="form-input form-select"
            style={{ width: '280px', margin: 0 }}
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
            Período:
          </label>
          <select
            className="form-input form-select"
            style={{ width: '180px', margin: 0 }}
            value={filterPeriodo}
            onChange={(e) => setFilterPeriodo(e.target.value)}
          >
            {uniquePeriods.length === 0 ? (
              <option value="2026-ANUAL">2026-ANUAL</option>
            ) : (
              uniquePeriods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Contenido en dos columnas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Columna Izquierda: Tabla jerárquica por Categoría y Partida */}
        <div
          className="card"
          style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}
        >
          <h3 className="card-title">Matriz Presupuestaria de Partidas</h3>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              Cargando datos presupuestarios...
            </div>
          ) : getFilteredBudgets().length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', opacity: 0.6 }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={18} color="var(--warning)" /> Este proyecto no tiene un
                presupuesto asignado para el período seleccionado.
              </span>
              <br />
              <button
                onClick={() => navigate('/app/budget-wizard')}
                className="btn btn-outline"
                style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}
              >
                Configurar Presupuesto Ahora
              </button>
            </div>
          ) : (
            <div>
              {categories.map((cat) => {
                const catPartidas = partidas.filter((p) => p.categoria_id === cat.id);
                return (
                  <div key={cat.id} style={{ marginBottom: '1.75rem' }}>
                    <div
                      style={{
                        backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                        padding: '0.5rem 1rem',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: 'var(--primary)',
                        borderLeft: '3px solid var(--primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{cat.nombre}</span>
                      <span>Total: {formatCurrency(getCategoryTotal(cat.id, 'asignado'))}</span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}
                      >
                        <thead>
                          <tr
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              textAlign: 'left',
                              opacity: 0.7,
                            }}
                          >
                            <th style={{ padding: '0.5rem', width: '80px' }}>Código</th>
                            <th style={{ padding: '0.5rem' }}>Partida Contable</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Asignado</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Comprometido</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Ejecutado</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Disponible</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catPartidas.map((p) => {
                            const info = getPartidaBudgetInfo(p.id);
                            const finalAsignado =
                              p.codigo === '4.3' ? calculatedOverhead : info.asignado;
                            const finalDisponible =
                              p.codigo === '4.3'
                                ? calculatedOverhead - info.ejecutado - info.comprometido
                                : info.disponible;

                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <td
                                  style={{
                                    padding: '0.6rem 0.5rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                  }}
                                >
                                  {p.codigo}
                                </td>
                                <td style={{ padding: '0.6rem 0.5rem', fontWeight: 500 }}>
                                  {p.nombre}
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: '0.7rem',
                                      opacity: 0.5,
                                      fontWeight: 'normal',
                                    }}
                                  >
                                    {p.descripcion}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    padding: '0.6rem 0.5rem',
                                    textAlign: 'right',
                                    fontWeight: 600,
                                  }}
                                >
                                  {formatCurrency(finalAsignado)}
                                </td>
                                <td
                                  style={{
                                    padding: '0.6rem 0.5rem',
                                    textAlign: 'right',
                                    color: info.comprometido > 0 ? 'var(--secondary)' : 'inherit',
                                  }}
                                >
                                  {formatCurrency(info.comprometido)}
                                </td>
                                <td
                                  style={{
                                    padding: '0.6rem 0.5rem',
                                    textAlign: 'right',
                                    color: 'var(--success)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {formatCurrency(info.ejecutado)}
                                </td>
                                <td
                                  style={{
                                    padding: '0.6rem 0.5rem',
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    color:
                                      finalDisponible < 0 ? 'var(--danger)' : 'var(--neutral-dark)',
                                  }}
                                >
                                  {formatCurrency(finalDisponible)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Tarjeta Resumen Consolidado del Proyecto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.02)' }}>
            <h3
              className="card-title"
              style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}
            >
              Rendimiento Financiero
            </h3>

            {loading ? (
              <div>Cargando resumen...</div>
            ) : !selectedProject ? (
              <div>Ningún proyecto seleccionado</div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  marginTop: '0.5rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                    PRESUPUESTO ASIGNADO TOTAL
                  </span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatCurrency(projectTotalAsignado)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Costos Directos</span>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                      {formatCurrency(directCostsTotal)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      Overhead ({overheadPct}%)
                    </span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>
                      {formatCurrency(calculatedOverhead)}
                    </div>
                  </div>
                </div>

                <hr
                  style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Comprometido</span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      {formatCurrency(projectTotalComprometido)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Ejecutado</span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>
                      {formatCurrency(projectTotalEjecutado)}
                    </div>
                  </div>
                </div>

                <hr
                  style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }}
                />

                <div>
                  <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>DISPONIBLE REMANENTE</span>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: projectTotalDisponible < 0 ? 'var(--danger)' : 'var(--primary)',
                    }}
                  >
                    {formatCurrency(projectTotalDisponible)}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      marginBottom: '0.25rem',
                      opacity: 0.7,
                    }}
                  >
                    <span>Progreso de Ejecución</span>
                    <span>
                      {projectTotalAsignado > 0
                        ? `${(((projectTotalEjecutado + projectTotalComprometido) / projectTotalAsignado) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${projectTotalAsignado > 0 ? Math.min(100, ((projectTotalEjecutado + projectTotalComprometido) / projectTotalAsignado) * 100) : 0}%`,
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Asistente de Presupuesto - Ahora abre en nueva pestaña */}

      {/* Modal Crear Proyecto */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
};
