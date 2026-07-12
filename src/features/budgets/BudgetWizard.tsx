import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api, isSimulationMode } from '../../services/api';
import type { Project, ExpenseCategory, PartidaGasto, Budget } from '../../services/api';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

interface BudgetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BudgetWizard: React.FC<BudgetWizardProps> = ({ isOpen, onClose, onSuccess }) => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [partidas, setPartidas] = useState<PartidaGasto[]>([]);

  // Selection
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [periodo, setPeriodo] = useState(getTodayDateString());
  const [overheadPct, setOverheadPct] = useState<number>(7.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map of partida_id -> monto_asignado
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projList, catList, partList] = await Promise.all([
          api.getProjects(),
          api.getCategories(),
          api.getPartidas(),
        ]);
        setProjects(projList);
        setCategories(catList);
        setPartidas(partList);
      } catch (err) {
        console.error('Error fetching wizard data:', err);
      }
    };
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // When project changes, load its saved overhead percentage and pre-populate existing budgets if any
  useEffect(() => {
    if (!selectedProjectId) {
      setAmounts({});
      return;
    }

    const selectedProj = projects.find((p) => p.id === selectedProjectId);
    if (selectedProj) {
      setOverheadPct(
        selectedProj.overhead_porcentaje !== undefined ? selectedProj.overhead_porcentaje : 7.0,
      );
    }

    // Prepopulate existing budget figures
    const loadExistingBudgets = async () => {
      try {
        const allBudgets = await api.getBudgets();
        const filtered = allBudgets.filter(
          (b) => b.proyecto_id === selectedProjectId && b.periodo === periodo,
        );
        const mapped: Record<string, number> = {};
        filtered.forEach((b) => {
          mapped[b.partida_id] = b.monto_asignado;
        });
        setAmounts(mapped);
      } catch (err) {
        console.error('Error loading existing budgets:', err);
      }
    };
    loadExistingBudgets();
  }, [selectedProjectId, periodo, projects]);

  if (!isOpen) return null;

  // Handle amount change
  const handleAmountChange = (partidaId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setAmounts((prev) => ({
      ...prev,
      [partidaId]: num >= 0 ? num : 0,
    }));
  };

  // Helper to get all items under a category
  const getPartidasByCategory = (catId: string) => {
    return partidas.filter((p) => p.categoria_id === catId);
  };

  // Dynamically resolve Category 4's ID
  const cat4 = categories.find((c) => c.nombre.startsWith('4.'));
  const cat4Id = cat4 ? cat4.id : 'c4000000-0000-0000-0000-000000000004';

  // Autocalculate values
  // Costos Directos: Categories 1, 2, 3, 5
  // Note: Partida 'part-43' (4.3 Overhead) is in Category 4, and is NOT a direct cost.
  // Overhead is calculated by multiplying (Category 1 + Category 2 + Category 3 + Category 5) * (overheadPct / 100)
  const calculateDirectCostsSum = () => {
    let sum = 0;
    partidas.forEach((p) => {
      // Exclude Category 4 from the direct costs base calculation
      if (p.categoria_id !== cat4Id) {
        sum += amounts[p.id] || 0;
      }
    });
    return sum;
  };

  const directCostsTotal = calculateDirectCostsSum();
  const calculatedOverhead = parseFloat((directCostsTotal * (overheadPct / 100)).toFixed(2));

  // Get total for Category 4: 4.1 + 4.2 + (Overhead 4.3)
  const getCategory4Total = () => {
    let sum = 0;
    const cat4Partidas = getPartidasByCategory(cat4Id);

    cat4Partidas.forEach((p) => {
      if (p.codigo === '4.3') {
        sum += calculatedOverhead;
      } else {
        sum += amounts[p.id] || 0;
      }
    });
    return sum;
  };

  // Get total for any general category
  const getCategoryTotal = (catId: string) => {
    if (catId === cat4Id) {
      return getCategory4Total();
    }
    let sum = 0;
    getPartidasByCategory(catId).forEach((p) => {
      sum += amounts[p.id] || 0;
    });
    return sum;
  };

  const totalBudget = directCostsTotal + getCategory4Total();

  const handleSave = async () => {
    if (!selectedProjectId) {
      alert('Por favor seleccione un proyecto.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update project's overhead percentage if it changed
      const currentProj = projects.find((p) => p.id === selectedProjectId);
      if (currentProj && currentProj.overhead_porcentaje !== overheadPct) {
        if (!isSimulationMode) {
          const { error } = await supabase
            .from('proyectos')
            .update({ overhead_porcentaje: overheadPct })
            .eq('id', selectedProjectId);
          if (error) throw error;
        } else {
          const localProjects = JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
          const idx = localProjects.findIndex((p: any) => p.id === selectedProjectId);
          if (idx !== -1) {
            localProjects[idx].overhead_porcentaje = overheadPct;
            localStorage.setItem('cnbv_projects', JSON.stringify(localProjects));
          }
        }
      }

      // 2. Prepare budget rows for saving
      const budgetsToSave = partidas.map((p) => {
        const isOverhead = p.codigo === '4.3';
        const finalMonto = isOverhead ? calculatedOverhead : amounts[p.id] || 0;

        return {
          proyecto_id: selectedProjectId,
          partida_id: p.id,
          monto_asignado: finalMonto,
          periodo: periodo,
        };
      });

      // 3. Save to database or localStorage
      if (!isSimulationMode) {
        // Real database operation
        const partidasConMonto = budgetsToSave
          .filter((b) => b.monto_asignado > 0)
          .map((b) => b.partida_id);

        if (partidasConMonto.length > 0) {
          await api.setProjectPartidas(selectedProjectId, partidasConMonto, profile?.ong_id || '');
        }

        for (const b of budgetsToSave) {
          const { error } = await supabase.from('presupuestos').upsert(
            {
              proyecto_id: b.proyecto_id,
              partida_id: b.partida_id,
              monto_asignado: b.monto_asignado,
              periodo: b.periodo,
              ...(profile?.ong_id ? { ong_id: profile.ong_id } : {}),
            },
            {
              onConflict: 'proyecto_id,partida_id,periodo',
            },
          );
          if (error) throw error;
        }
      } else {
        // Simulated local storage
        const mockBudgets = JSON.parse(localStorage.getItem('cnbv_budgets') || '[]');

        budgetsToSave.forEach((bToSave) => {
          const idx = mockBudgets.findIndex(
            (mb: Budget) =>
              mb.proyecto_id === bToSave.proyecto_id &&
              mb.partida_id === bToSave.partida_id &&
              mb.periodo === bToSave.periodo,
          );

          if (idx !== -1) {
            mockBudgets[idx].monto_asignado = bToSave.monto_asignado;
          } else {
            mockBudgets.push({
              id: `b-${Math.random().toString(36).substr(2, 9)}`,
              proyecto_id: bToSave.proyecto_id,
              partida_id: bToSave.partida_id,
              monto_asignado: bToSave.monto_asignado,
              monto_ejecutado: 0,
              monto_comprometido: 0,
              periodo: bToSave.periodo,
            });
          }
        });

        localStorage.setItem('cnbv_budgets', JSON.stringify(mockBudgets));
      }

      alert('Presupuesto configurado con éxito bajo el modelo UNDG.');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving budgets:', err);
      alert('Ocurrió un error al guardar los presupuestos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        className="card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'var(--card-bg, #ffffff)',
          color: 'var(--neutral-dark, #1e293b)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1rem',
          }}
        >
          <div>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Asistente de Presupuesto UNDG
            </h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.25rem 0 0 0' }}>
              Inicializa y distribuye los fondos del proyecto a través de las categorías estándar de
              Naciones Unidas.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--neutral-dark)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            &times;
          </button>
        </div>

        {/* Project & Params Header Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            padding: '1rem',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-color)',
          }}
        >
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Seleccionar Proyecto
            </label>
            <select
              className="form-input form-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">-- Eliga Proyecto --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Fecha
            </label>
            <input
              type="date"
              className="form-input"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Tasa de Indirectos (Overhead %)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                step="0.1"
                min="0"
                max="25"
                className="form-input"
                value={overheadPct}
                onChange={(e) => setOverheadPct(Math.max(0, parseFloat(e.target.value) || 0))}
                disabled={isSubmitting || !selectedProjectId}
                style={{ width: '80px' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--neutral-dark)' }}>%</span>
            </div>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Aplicado a partidas directas.</span>
          </div>
        </div>

        {/* Wizard Table / Form */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
          {!selectedProjectId ? (
            <div
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                opacity: 0.6,
                fontSize: '0.95rem',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={18} color="var(--warning)" /> Seleccione un proyecto en el
                panel superior para desplegar la matriz presupuestaria UNDG.
              </span>
            </div>
          ) : (
            <div>
              {categories.map((cat) => {
                const catPartidas = getPartidasByCategory(cat.id);
                return (
                  <div key={cat.id} style={{ marginBottom: '2rem' }}>
                    <div
                      style={{
                        backgroundColor: 'rgba(var(--primary-rgb), 0.15)',
                        padding: '0.6rem 1rem',
                        borderRadius: '6px 6px 0 0',
                        borderLeft: '4px solid var(--primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}
                      >
                        {cat.nombre}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--primary-dark)',
                          fontSize: '0.95rem',
                        }}
                      >
                        Subtotal: {formatCurrency(getCategoryTotal(cat.id))}
                      </span>
                    </div>

                    <div
                      style={{
                        border: '1px solid var(--border-color)',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        overflow: 'hidden',
                      }}
                    >
                      {catPartidas.map((partida, pIdx) => {
                        const isOverhead = partida.codigo === '4.3';
                        const displayVal = isOverhead
                          ? calculatedOverhead
                          : amounts[partida.id] !== undefined
                            ? amounts[partida.id]
                            : '';

                        return (
                          <div
                            key={partida.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '80px 1fr 180px',
                              alignItems: 'center',
                              padding: '0.75rem 1rem',
                              borderBottom:
                                pIdx === catPartidas.length - 1
                                  ? 'none'
                                  : '1px solid var(--border-color)',
                              backgroundColor: isOverhead
                                ? 'rgba(var(--success-rgb), 0.05)'
                                : 'transparent',
                              gap: '1rem',
                            }}
                          >
                            {/* Code */}
                            <span
                              style={{
                                fontWeight: 700,
                                color: 'var(--primary)',
                                fontSize: '0.85rem',
                              }}
                            >
                              Cód. {partida.codigo}
                            </span>

                            {/* Name & Desc */}
                            <div>
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  color: 'var(--neutral-dark)',
                                }}
                              >
                                {partida.nombre}
                              </span>
                              <p
                                style={{
                                  margin: '0.15rem 0 0 0',
                                  fontSize: '0.75rem',
                                  opacity: 0.6,
                                  lineHeight: '1.2',
                                }}
                              >
                                {partida.descripcion}
                              </p>
                            </div>

                            {/* Input */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '0.5rem',
                              }}
                            >
                              <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>$</span>
                              {isOverhead ? (
                                <input
                                  type="text"
                                  className="form-input"
                                  readOnly
                                  style={{
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(0,0,0,0.05)',
                                    color: 'var(--success)',
                                    maxWidth: '120px',
                                  }}
                                  value={calculatedOverhead}
                                />
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="form-input"
                                  placeholder="0.00"
                                  style={{ textAlign: 'right', maxWidth: '120px' }}
                                  value={displayVal}
                                  onChange={(e) => handleAmountChange(partida.id, e.target.value)}
                                  disabled={isSubmitting}
                                />
                              )}
                              <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>USD</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary & Action Panel */}
        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              Costos Directos Subtotal:{' '}
              <strong style={{ color: 'var(--neutral-dark)' }}>
                {formatCurrency(directCostsTotal)}
              </strong>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              Costos Indirectos (Overhead {overheadPct}%):{' '}
              <strong style={{ color: 'var(--success)' }}>
                {formatCurrency(calculatedOverhead)}
              </strong>
            </div>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--primary)',
                marginTop: '0.25rem',
              }}
            >
              Presupuesto Total: {formatCurrency(totalBudget)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={isSubmitting || !selectedProjectId}
              style={{ padding: '0.75rem 2rem' }}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Presupuesto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
