import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatAmount, formatUsd } from '../../utils/formatters';
import {
  Check,
  CheckCircle2,
  CreditCard,
  Landmark,
  Search,
  Send,
  Smartphone,
  Upload,
  UserCheck,
} from 'lucide-react';
import {
  financeApi,
  type CuentaReceptora,
  type MedioPagoAporte,
  type MemberLookupResult,
  type PublicOngInfo,
  type ReporteAporte,
} from '../../services/financeApi';
import {
  BANCOS_VENEZUELA,
  CATEGORIAS_APORTE,
  formatCategoriaAporte,
  type CategoriaAporte,
  type IncomeCategoryOption,
} from '../../utils/rolePermissions';
import { getCaracasDateParts } from '../../utils/formatters';
import './PublicContributionForm.css';

export const PublicContributionForm: React.FC = () => {
  const { ongId = '' } = useParams<{ ongId: string }>();
  return <PublicContributionFormForOng ongId={ongId} />;
};

export const PublicContributionFormForOng: React.FC<{ ongId: string }> = ({ ongId }) => {
  const [ongInfo, setOngInfo] = useState<PublicOngInfo | null>(null);
  const [cuentas, setCuentas] = useState<CuentaReceptora[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<IncomeCategoryOption[]>(CATEGORIAS_APORTE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Identificación del aportante
  const [esAnonimo, setEsAnonimo] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<'V' | 'E' | 'J'>('V');
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [buscandoCedula, setBuscandoCedula] = useState(false);
  const [lookupResult, setLookupResult] = useState<MemberLookupResult | null>(null);
  const [nombreAportante, setNombreAportante] = useState('');
  const [telefonoAportante, setTelefonoAportante] = useState('');

  // Datos del aporte
  const [categoria, setCategoria] = useState<CategoriaAporte>('diezmo');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('VES');
  const [montoOriginal, setMontoOriginal] = useState('');
  const [medioPago, setMedioPago] = useState<Exclude<MedioPagoAporte, 'efectivo'>>('pago_movil');
  const [cuentaReceptoraId, setCuentaReceptoraId] = useState<string>('');
  const [fechaPago, setFechaPago] = useState(() => getCaracasDateParts().dateString);
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);

  // Detalles de método de pago
  const [bancoEmisor, setBancoEmisor] = useState('');
  const [referencia, setReferencia] = useState('');
  const [sinReferenciaMismoBanco, setSinReferenciaMismoBanco] = useState(false);
  const [telefonoEmisor, setTelefonoEmisor] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

  // Envío y confirmación
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<ReporteAporte | null>(null);

  useEffect(() => {
    const loadInitial = async () => {
      if (!ongId) {
        setLoadError('Enlace inválido: falta el identificador de la iglesia.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [info, cuentasList, catOptions] = await Promise.all([
          financeApi.getPublicOngInfo(ongId),
          financeApi.getPublicCuentasReceptoras(ongId),
          typeof financeApi.getPublicCategoriasIngreso === 'function'
            ? financeApi.getPublicCategoriasIngreso(ongId)
            : Promise.resolve(CATEGORIAS_APORTE),
        ]);
        if (!info) {
          setLoadError('No se encontró la iglesia asociada a este enlace.');
        } else {
          setOngInfo(info);
        }
        setCuentas(cuentasList);
        if (catOptions && catOptions.length > 0) {
          setCategoryOptions(catOptions);
          setCategoria((prev) =>
            catOptions.some((c) => c.value === prev) ? prev : catOptions[0].value,
          );
        }
      } catch (err) {
        console.error('Error cargando formulario público:', err);
        setLoadError('No pudimos cargar los datos de la iglesia. Intenta recargar la página.');
      } finally {
        setLoading(false);
      }
    };
    void loadInitial();
  }, [ongId]);

  // Obtener tasa BCV de la fecha seleccionada
  useEffect(() => {
    const loadRate = async () => {
      if (!fechaPago) return;
      try {
        const tasa = await financeApi.getPublicTasaBcv(ongId, fechaPago);
        setTasaBcv(tasa);
      } catch (err) {
        console.error('Error consultando tasa BCV:', err);
      }
    };
    void loadRate();
  }, [ongId, fechaPago]);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      setFormError('No se pudo copiar al portapapeles. Puedes seleccionarlo manualmente.');
    }
  };

  const handleSearchCedula = async () => {
    setFormError(null);
    const digits = cedulaBusqueda.replace(/\D/g, '');
    if (digits.length < 4) {
      setFormError('Ingresa al menos 4 dígitos de tu cédula para buscar.');
      return;
    }
    setBuscandoCedula(true);
    try {
      const res = await financeApi.buscarMiembroParaAporte(ongId, `${tipoDocumento}-${digits}`);
      setLookupResult(res);
    } catch (err) {
      console.error('Error buscando miembro por cédula:', err);
      setFormError('No se pudo consultar la cédula en este momento. Puedes ingresar tus datos.');
      setLookupResult({ encontrado: false });
    } finally {
      setBuscandoCedula(false);
    }
  };

  const parsedMonto = parseFloat(montoOriginal) || 0;
  const equivalentUsd =
    moneda === 'USD'
      ? parsedMonto
      : tasaBcv && tasaBcv > 0
        ? parseFloat((parsedMonto / tasaBcv).toFixed(2))
        : 0;
  const equivalentVes =
    moneda === 'VES'
      ? parsedMonto
      : tasaBcv && tasaBcv > 0
        ? parseFloat((parsedMonto * tasaBcv).toFixed(2))
        : null;

  const matchingAccounts = cuentas.filter((c) => c.tipo === medioPago);

  const handleResetForNew = () => {
    setSubmittedReport(null);
    setMontoOriginal('');
    setReferencia('');
    setSinReferenciaMismoBanco(false);
    setComprobanteFile(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (parsedMonto <= 0) {
      setFormError('El monto del aporte debe ser mayor a 0.');
      return;
    }

    if (moneda === 'VES' && (!tasaBcv || tasaBcv <= 0)) {
      setFormError('No hay una tasa BCV disponible para calcular el equivalente en USD.');
      return;
    }

    if (!esAnonimo) {
      const hasLinkedMember = Boolean(lookupResult?.encontrado && lookupResult.miembro_id);
      if (!hasLinkedMember && !nombreAportante.trim()) {
        setFormError(
          'Ingresa tu nombre completo, búscate por cédula o marca "Aporte Anónimo / Visitante".',
        );
        return;
      }
    }

    if (medioPago === 'transferencia') {
      if (!bancoEmisor) {
        setFormError('Selecciona el banco emisor de la transferencia.');
        return;
      }
      if (!sinReferenciaMismoBanco && !referencia.trim()) {
        setFormError(
          'Ingresa el número de referencia o marca "Transferencia mismo banco (sin número de referencia)".',
        );
        return;
      }
    }

    if (medioPago === 'pago_movil') {
      if (!bancoEmisor) {
        setFormError('Selecciona el banco emisor del Pago Móvil.');
        return;
      }
      if (!referencia.trim()) {
        setFormError('El número de referencia es obligatorio para Pago Móvil.');
        return;
      }
      if (!telefonoEmisor.trim()) {
        setFormError('El número de teléfono emisor es obligatorio para Pago Móvil.');
        return;
      }
    }

    setSubmitting(true);
    try {
      let comprobanteUrl: string | null = null;
      if (comprobanteFile) {
        comprobanteUrl = await financeApi.uploadComprobanteAporte(comprobanteFile);
      }

      const saved = await financeApi.submitReporteAporte({
        ong_id: ongId,
        cuenta_receptora_id: cuentaReceptoraId || null,
        miembro_id: !esAnonimo && lookupResult?.encontrado ? lookupResult.miembro_id || null : null,
        es_anonimo: esAnonimo,
        nombre_aportante: esAnonimo ? null : nombreAportante.trim() || null,
        telefono_aportante: esAnonimo ? null : telefonoAportante.trim() || null,
        cedula_aportante: esAnonimo
          ? null
          : cedulaBusqueda.replace(/\D/g, '')
            ? `${tipoDocumento}-${cedulaBusqueda.replace(/\D/g, '')}`
            : null,
        categoria_aporte: categoria,
        moneda,
        monto_original: parsedMonto,
        tasa_bcv: tasaBcv,
        monto_usd: equivalentUsd > 0 ? equivalentUsd : parsedMonto,
        monto_ves: equivalentVes,
        medio_pago: medioPago,
        referencia: referencia.trim() || null,
        sin_referencia_mismo_banco: medioPago === 'transferencia' ? sinReferenciaMismoBanco : false,
        banco_emisor: bancoEmisor || null,
        telefono_emisor: medioPago === 'pago_movil' ? telefonoEmisor.trim() || null : null,
        fecha_pago: fechaPago,
        actividad_o_responsable: null,
        comprobante_url: comprobanteUrl,
      });

      setSubmittedReport(saved);
    } catch (err) {
      console.error('Error enviando reporte de aporte:', err);
      const message = err instanceof Error ? err.message : 'Ocurrió un error al enviar tu reporte.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f1f5f9',
          padding: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '420px' }}>
          <strong style={{ color: 'var(--primary)' }}>Cargando portal de aportes...</strong>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f1f5f9',
          padding: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '460px' }}>
          <h2 style={{ color: 'var(--danger)', marginTop: 0 }}>Enlace no disponible</h2>
          <p style={{ color: '#475569' }}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (submittedReport) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '1.5rem 1rem' }}>
        <div
          className="card"
          style={{
            maxWidth: '540px',
            margin: '1.5rem auto',
            padding: '2rem',
            textAlign: 'center',
            borderRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <CheckCircle2 size={64} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>
            ¡Reporte Recibido por Tesorería!
          </h1>
          <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
            Tu reporte ha quedado registrado en <strong>{ongInfo?.nombre}</strong> con el siguiente
            código de confirmación:
          </p>

          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700 }}>
              CÓDIGO DE CONFIRMACIÓN
            </div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                letterSpacing: '2px',
                color: '#1e3a8a',
                marginTop: '0.25rem',
              }}
            >
              {submittedReport.codigo_confirmacion}
            </div>
          </div>

          <div
            style={{
              textAlign: 'left',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              fontSize: '0.88rem',
              display: 'grid',
              gap: '0.4rem',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <strong>Categoría:</strong>{' '}
              {formatCategoriaAporte(submittedReport.categoria_aporte, categoryOptions)}
            </div>
            <div>
              <strong>Monto:</strong> {formatAmount(submittedReport.monto_original)}{' '}
              {submittedReport.moneda}{' '}
              {submittedReport.moneda === 'VES' &&
                `(Equiv. ${formatUsd(submittedReport.monto_usd)} USD)`}
            </div>
            <div>
              <strong>Método:</strong>{' '}
              {submittedReport.medio_pago === 'pago_movil'
                ? 'Pago Móvil'
                : submittedReport.medio_pago === 'transferencia'
                  ? 'Transferencia Bancaria'
                  : 'Efectivo'}
            </div>
            {submittedReport.referencia && (
              <div>
                <strong>Referencia:</strong> {submittedReport.referencia}
              </div>
            )}
            <div>
              <strong>Fecha:</strong> {submittedReport.fecha_pago}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleResetForNew}
            style={{ width: '100%', padding: '0.85rem', fontWeight: 700 }}
          >
            Reportar otro aporte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pcf-page">
      <div className="pcf-top-accent" aria-hidden="true" />

      <div className="pcf-container">
        {/* Identidad de la organización (Figma node 239:7) */}
        <header className="pcf-org-card">
          <img
            src={ongInfo?.logo_url || '/mateo_logo.png'}
            alt={ongInfo?.nombre || 'Iglesia'}
            className="pcf-org-logo"
          />
          <div className="pcf-org-info">
            <h1 className="pcf-org-title">{ongInfo?.nombre}</h1>
            <p className="pcf-org-subtitle">Reporte de aportes a la organización</p>
          </div>
        </header>

        {/* Datos bancarios y pago móvil (Figma node 239:8) */}
        {cuentas.length > 0 && (
          <section
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            aria-label="Datos bancarios receptores"
          >
            <div className="pcf-section-head">
              <h2 className="pcf-bank-heading">Datos bancarios y pago móvil</h2>
              <p className="pcf-bank-subheading">
                Consulta los datos de la iglesia antes de realizar tu aporte.
              </p>
            </div>

            <div className="pcf-accounts-grid">
              {cuentas.map((cta, idx) => {
                const isPagoMovil = cta.tipo === 'pago_movil';
                const transferNum = cuentas
                  .slice(0, idx + 1)
                  .filter((c) => c.tipo !== 'pago_movil').length;
                const cardHeading = isPagoMovil
                  ? 'Pago móvil'
                  : `Transferencia · ${String(transferNum).padStart(2, '0')}`;
                const accountVal = isPagoMovil ? cta.telefono : cta.numero_cuenta;

                return (
                  <div key={cta.id} className="pcf-bank-card">
                    <div className="pcf-bank-card-header">
                      <h3 className="pcf-bank-card-title">{cardHeading}</h3>
                      {cta.tipo_fondo && (
                        <span className="pcf-bank-fund-pill">{cta.tipo_fondo}</span>
                      )}
                    </div>

                    <p className="pcf-bank-receptor">Banco receptor: {cta.banco}</p>

                    <div className="pcf-bank-field">
                      <span className="pcf-bank-label">TITULAR</span>
                      <span className="pcf-bank-value">{cta.titular}</span>
                    </div>

                    <div className="pcf-bank-row">
                      <div className="pcf-bank-field">
                        <span className="pcf-bank-label">RIF / Cédula</span>
                        <span className="pcf-bank-value">{cta.rif_cedula}</span>
                      </div>
                      <button
                        type="button"
                        className="pcf-copy-btn"
                        onClick={() => void handleCopy(`rif-${cta.id}`, cta.rif_cedula)}
                      >
                        {copiedKey === `rif-${cta.id}` ? (
                          <>
                            <Check size={12} /> Copiado
                          </>
                        ) : (
                          'Copiar'
                        )}
                      </button>
                    </div>

                    {accountVal && (
                      <div className="pcf-bank-row">
                        <div className="pcf-bank-field">
                          <span className="pcf-bank-label">
                            {isPagoMovil ? 'Teléfono receptor' : 'Número de cuenta'}
                          </span>
                          <span className="pcf-bank-value">{accountVal}</span>
                        </div>
                        <button
                          type="button"
                          className="pcf-copy-btn"
                          onClick={() => void handleCopy(`acc-${cta.id}`, accountVal)}
                        >
                          {copiedKey === `acc-${cta.id}` ? (
                            <>
                              <Check size={12} /> Copiado
                            </>
                          ) : (
                            'Copiar'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Introducción al reporte (Figma node 239:9) */}
        <div className="pcf-section-head">
          <h2 className="pcf-report-title">Reportar un aporte</h2>
          <p className="pcf-report-subtitle">Completa tus datos y registra el pago realizado.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {formError && (
            <div
              role="alert"
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontWeight: 600,
                fontSize: '0.88rem',
              }}
            >
              {formError}
            </div>
          )}

          {/* 1. Identificación del aportante (Figma node 239:10) */}
          <section className="pcf-card">
            <div className="pcf-card-header">
              <h3 className="pcf-card-title">1. Identificación del aportante</h3>
              <label className="pcf-anon-label">
                <input
                  type="checkbox"
                  className="pcf-anon-checkbox"
                  checked={esAnonimo}
                  onChange={(e) => {
                    setEsAnonimo(e.target.checked);
                    setFormError(null);
                  }}
                />
                Aporte anónimo / visitante
              </label>
            </div>

            {!esAnonimo && (
              <>
                <div className="pcf-field">
                  <label htmlFor="aportante-cedula" className="pcf-label">
                    Ingresa solo los dígitos de tu cédula para buscar tu registro
                  </label>
                  <div className="pcf-search-row">
                    <div className="pcf-doc-group">
                      <select
                        id="aportante-tipo-doc"
                        aria-label="Tipo de documento"
                        className="pcf-doc-select"
                        value={tipoDocumento}
                        onChange={(e) => {
                          setTipoDocumento(e.target.value as 'V' | 'E' | 'J');
                          setLookupResult(null);
                        }}
                      >
                        <option value="V">V</option>
                        <option value="E">E</option>
                        <option value="J">J</option>
                      </select>
                      <input
                        id="aportante-cedula"
                        aria-label="Buscar por Cédula"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="pcf-input"
                        placeholder="Ej. 12345678"
                        value={cedulaBusqueda}
                        onChange={(e) => {
                          setCedulaBusqueda(e.target.value.replace(/\D/g, ''));
                          setLookupResult(null);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="pcf-search-btn"
                      onClick={() => void handleSearchCedula()}
                      disabled={buscandoCedula}
                    >
                      <Search size={18} />
                      {buscandoCedula ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  <span className="pcf-field-hint">
                    Selecciona V, E o J e ingresa únicamente los dígitos de la cédula (sin letras,
                    puntos ni guiones). Ejemplo: <strong>12345678</strong>
                  </span>
                </div>

                {lookupResult?.encontrado && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <UserCheck size={16} />
                    <span>
                      Miembro identificado: <strong>{lookupResult.nombre_enmascarado}</strong>
                    </span>
                  </div>
                )}

                {lookupResult && !lookupResult.encontrado && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      fontSize: '0.85rem',
                    }}
                  >
                    No encontramos tu cédula registrada. Ingresa tu nombre y teléfono abajo para
                    registrar tu aporte sin bloqueos.
                  </div>
                )}

                {(!lookupResult || !lookupResult.encontrado) && (
                  <div className="pcf-two-col">
                    <div className="pcf-field">
                      <label htmlFor="aportante-nombre" className="pcf-label">
                        Nombre completo *
                      </label>
                      <input
                        id="aportante-nombre"
                        type="text"
                        className="pcf-input"
                        placeholder="Tu nombre y apellido"
                        value={nombreAportante}
                        onChange={(e) => setNombreAportante(e.target.value)}
                      />
                    </div>
                    <div className="pcf-field">
                      <label htmlFor="aportante-telefono" className="pcf-label">
                        Teléfono de contacto
                      </label>
                      <input
                        id="aportante-telefono"
                        type="tel"
                        className="pcf-input"
                        placeholder="Tu número de teléfono"
                        value={telefonoAportante}
                        onChange={(e) => setTelefonoAportante(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* 2. Detalles del aporte (Figma node 239:11) */}
          <section className="pcf-card">
            <h3 className="pcf-card-title">2. Detalles del aporte</h3>

            <div className="pcf-two-col">
              <div className="pcf-field">
                <label htmlFor="aporte-categoria" className="pcf-label">
                  Categoría *
                </label>
                <select
                  id="aporte-categoria"
                  className="pcf-input"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaAporte)}
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pcf-field">
                <span className="pcf-label">Moneda *</span>
                <div className="pcf-segmented-row">
                  {(['VES', 'USD'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMoneda(m)}
                      className={`pcf-seg-btn ${moneda === m ? 'pcf-seg-btn--active' : ''}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pcf-two-col">
              <div className="pcf-field">
                <label htmlFor="aporte-monto" className="pcf-label">
                  Monto ({moneda}) *
                </label>
                <input
                  id="aporte-monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pcf-input"
                  placeholder="0,00"
                  value={montoOriginal}
                  onChange={(e) => setMontoOriginal(e.target.value)}
                  required
                />
              </div>

              <div className="pcf-field">
                <label htmlFor="aporte-fecha" className="pcf-label">
                  Fecha del pago *
                </label>
                <input
                  id="aporte-fecha"
                  type="date"
                  className="pcf-input"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  required
                />
              </div>
            </div>

            {moneda === 'VES' && (
              <div className="pcf-rate-box">
                <div className="pcf-rate-item">
                  <span className="pcf-rate-label">Tasa BCV vigente</span>
                  <span className="pcf-rate-value">
                    {tasaBcv ? `${tasaBcv.toFixed(4)} Bs/$` : 'N/D'}
                  </span>
                </div>
                <div className="pcf-rate-item">
                  <span className="pcf-rate-label">Equivalente en USD</span>
                  <span className="pcf-rate-value">{formatUsd(equivalentUsd)}</span>
                </div>
              </div>
            )}
          </section>

          {/* 3. Método de pago (Figma node 239:12) */}
          <section className="pcf-card">
            <h3 className="pcf-card-title">3. Método de pago</h3>

            <div className="pcf-methods-row">
              {(
                [
                  { id: 'pago_movil', label: 'Pago móvil', icon: <Smartphone size={18} /> },
                  { id: 'transferencia', label: 'Transferencia', icon: <Landmark size={18} /> },
                ] as const
              ).map((mp) => (
                <button
                  key={mp.id}
                  type="button"
                  onClick={() => {
                    setMedioPago(mp.id);
                    setCuentaReceptoraId('');
                    setFormError(null);
                  }}
                  className={`pcf-seg-btn ${medioPago === mp.id ? 'pcf-seg-btn--active' : ''}`}
                >
                  {mp.icon}
                  {mp.label}
                </button>
              ))}
            </div>

            {matchingAccounts.length > 0 && (
              <div className="pcf-field">
                <label htmlFor="aporte-cuenta-receptora" className="pcf-label">
                  Cuenta de la iglesia donde realizaste el aporte
                </label>
                <select
                  id="aporte-cuenta-receptora"
                  className="pcf-input"
                  value={cuentaReceptoraId}
                  onChange={(e) => setCuentaReceptoraId(e.target.value)}
                >
                  <option value="">Selecciona una cuenta...</option>
                  {matchingAccounts.map((cta) => (
                    <option key={cta.id} value={cta.id}>
                      {cta.banco} — {cta.tipo_fondo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pcf-two-col">
              <div className="pcf-field">
                <label htmlFor="aporte-banco-emisor" className="pcf-label">
                  Banco emisor *
                </label>
                <select
                  id="aporte-banco-emisor"
                  className="pcf-input"
                  value={bancoEmisor}
                  onChange={(e) => setBancoEmisor(e.target.value)}
                >
                  <option value="">Selecciona un banco</option>
                  {BANCOS_VENEZUELA.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {medioPago === 'pago_movil' ? (
                <div className="pcf-field">
                  <label htmlFor="aporte-tel-emisor" className="pcf-label">
                    Teléfono emisor *
                  </label>
                  <input
                    id="aporte-tel-emisor"
                    type="tel"
                    className="pcf-input"
                    placeholder="Tu número de teléfono"
                    value={telefonoEmisor}
                    onChange={(e) => setTelefonoEmisor(e.target.value)}
                  />
                </div>
              ) : (
                <div className="pcf-field">
                  <label htmlFor="aporte-referencia" className="pcf-label">
                    Número de referencia {sinReferenciaMismoBanco ? '(Opcional)' : '*'}
                  </label>
                  <input
                    id="aporte-referencia"
                    type="text"
                    className="pcf-input"
                    placeholder="Escribe la referencia del pago"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </div>
              )}
            </div>

            {medioPago === 'pago_movil' && (
              <div className="pcf-field">
                <label htmlFor="aporte-referencia" className="pcf-label">
                  Número de referencia *
                </label>
                <input
                  id="aporte-referencia"
                  type="text"
                  className="pcf-input"
                  placeholder="Escribe la referencia del pago"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
            )}

            {medioPago === 'transferencia' && (
              <label className="pcf-anon-label">
                <input
                  type="checkbox"
                  className="pcf-anon-checkbox"
                  checked={sinReferenciaMismoBanco}
                  onChange={(e) => setSinReferenciaMismoBanco(e.target.checked)}
                />
                <CreditCard size={14} /> Transferencia del mismo banco (sin número de referencia, p.
                ej. Provincial)
              </label>
            )}

            <div className="pcf-field">
              <span className="pcf-label">Comprobante (opcional)</span>
              <label htmlFor="aporte-comprobante" className="pcf-dropzone">
                <Upload size={22} color="var(--primary, #1b5cb6)" />
                <div className="pcf-dropzone-text">
                  <span className="pcf-dropzone-title">
                    {comprobanteFile
                      ? `Archivo seleccionado: ${comprobanteFile.name}`
                      : 'Adjuntar comprobante'}
                  </span>
                  <span className="pcf-dropzone-sub">
                    Selecciona o arrastra una imagen del pago.
                  </span>
                </div>
              </label>
              <input
                id="aporte-comprobante"
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
              />
            </div>
          </section>

          <p className="pcf-required-note">* Campos obligatorios</p>

          <button type="submit" className="pcf-submit-btn" disabled={submitting}>
            <Send size={18} />
            {submitting ? 'Enviando reporte...' : 'Enviar reporte de aporte'}
          </button>

          <p className="pcf-footer-note">Revisa la información antes de enviar.</p>
        </form>
      </div>
    </div>
  );
};
