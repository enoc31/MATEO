import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DollarSign,
  Landmark,
  Search,
  Send,
  Smartphone,
  Upload,
  UserCheck,
  UserX,
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
} from '../../utils/rolePermissions';
import { getCaracasDateParts } from '../../utils/formatters';

export const PublicContributionForm: React.FC = () => {
  const { ongId = '' } = useParams<{ ongId: string }>();

  const [ongInfo, setOngInfo] = useState<PublicOngInfo | null>(null);
  const [cuentas, setCuentas] = useState<CuentaReceptora[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Identificación del aportante
  const [esAnonimo, setEsAnonimo] = useState(false);
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [buscandoCedula, setBuscandoCedula] = useState(false);
  const [lookupResult, setLookupResult] = useState<MemberLookupResult | null>(null);
  const [nombreAportante, setNombreAportante] = useState('');
  const [telefonoAportante, setTelefonoAportante] = useState('');

  // Datos del aporte
  const [categoria, setCategoria] = useState<CategoriaAporte>('diezmo');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('VES');
  const [montoOriginal, setMontoOriginal] = useState('');
  const [medioPago, setMedioPago] = useState<MedioPagoAporte>('pago_movil');
  const [cuentaReceptoraId, setCuentaReceptoraId] = useState<string>('');
  const [fechaPago, setFechaPago] = useState(() => getCaracasDateParts().dateString);
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);

  // Detalles de método de pago
  const [bancoEmisor, setBancoEmisor] = useState('');
  const [referencia, setReferencia] = useState('');
  const [sinReferenciaMismoBanco, setSinReferenciaMismoBanco] = useState(false);
  const [telefonoEmisor, setTelefonoEmisor] = useState('');
  const [actividadOResponsable, setActividadOResponsable] = useState('');
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
        const [info, cuentasList] = await Promise.all([
          financeApi.getPublicOngInfo(ongId),
          financeApi.getPublicCuentasReceptoras(ongId),
        ]);
        if (!info) {
          setLoadError('No se encontró la iglesia asociada a este enlace.');
        } else {
          setOngInfo(info);
        }
        setCuentas(cuentasList);
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
    const clean = cedulaBusqueda.replace(/[^0-9A-Za-z]/g, '');
    if (clean.length < 4) {
      setFormError('Ingresa al menos 4 dígitos de tu cédula para buscar.');
      return;
    }
    setBuscandoCedula(true);
    try {
      const res = await financeApi.buscarMiembroParaAporte(ongId, clean);
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

  const matchingAccounts = cuentas.filter((c) => medioPago !== 'efectivo' && c.tipo === medioPago);

  const handleResetForNew = () => {
    setSubmittedReport(null);
    setMontoOriginal('');
    setReferencia('');
    setSinReferenciaMismoBanco(false);
    setActividadOResponsable('');
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

    if (medioPago === 'efectivo' && !actividadOResponsable.trim()) {
      setFormError(
        'Indica el culto, servicio, actividad o nombre del tesorero/responsable que recibió el efectivo.',
      );
      return;
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
        cedula_aportante: esAnonimo ? null : cedulaBusqueda.trim() || null,
        categoria_aporte: categoria,
        moneda,
        monto_original: parsedMonto,
        tasa_bcv: tasaBcv,
        monto_usd: equivalentUsd > 0 ? equivalentUsd : parsedMonto,
        monto_ves: equivalentVes,
        medio_pago: medioPago,
        referencia: medioPago === 'efectivo' ? null : referencia.trim() || null,
        sin_referencia_mismo_banco: medioPago === 'transferencia' ? sinReferenciaMismoBanco : false,
        banco_emisor: medioPago === 'efectivo' ? null : bancoEmisor || null,
        telefono_emisor: medioPago === 'pago_movil' ? telefonoEmisor.trim() || null : null,
        fecha_pago: fechaPago,
        actividad_o_responsable:
          medioPago === 'efectivo' ? actividadOResponsable.trim() || null : null,
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
              <strong>Categoría:</strong> {formatCategoriaAporte(submittedReport.categoria_aporte)}
            </div>
            <div>
              <strong>Monto:</strong> {submittedReport.monto_original.toFixed(2)}{' '}
              {submittedReport.moneda}{' '}
              {submittedReport.moneda === 'VES' &&
                `(Equiv. $${submittedReport.monto_usd.toFixed(2)} USD)`}
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
    <div
      style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '1.25rem 0.75rem 3rem' }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        {/* Header de la Iglesia */}
        <header
          className="card"
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
          }}
        >
          <img
            src={ongInfo?.logo_url || '/mateo_logo.png'}
            alt={ongInfo?.nombre || 'Iglesia'}
            style={{
              height: '58px',
              width: '58px',
              objectFit: 'contain',
              borderRadius: '12px',
              margin: '0 auto 0.75rem',
              display: 'block',
            }}
          />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
            {ongInfo?.nombre}
          </h1>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Portal de Reporte de Diezmos y Ofrendas
          </p>
        </header>

        {/* Cuentas receptoras activas (HU-5) */}
        {cuentas.length > 0 && (
          <section
            className="card"
            aria-label="Datos bancarios receptores"
            style={{ padding: '1.25rem', borderRadius: '16px' }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#1e293b',
                margin: '0 0 0.75rem 0',
              }}
            >
              Datos Bancarios y Pago Móvil de la Iglesia
            </h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {cuentas.map((cta) => {
                const accountVal = cta.tipo === 'pago_movil' ? cta.telefono : cta.numero_cuenta;
                return (
                  <div
                    key={cta.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.9rem',
                      backgroundColor: '#f8fafc',
                      display: 'grid',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <strong style={{ color: 'var(--primary)' }}>
                        {cta.tipo === 'pago_movil' ? 'Pago Móvil' : 'Transferencia'} · {cta.banco}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                        }}
                      >
                        {cta.tipo_fondo}
                      </span>
                    </div>

                    <div>
                      <strong>Titular:</strong> {cta.titular}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>
                        <strong>RIF/Cédula:</strong> {cta.rif_cedula}
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => void handleCopy(`rif-${cta.id}`, cta.rif_cedula)}
                        style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                      >
                        {copiedKey === `rif-${cta.id}` ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Check size={12} /> Copiado
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Copy size={12} /> Copiar RIF
                          </span>
                        )}
                      </button>
                    </div>

                    {accountVal && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span>
                          <strong>
                            {cta.tipo === 'pago_movil' ? 'Teléfono:' : 'Nro. Cuenta:'}
                          </strong>{' '}
                          {accountVal}
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => void handleCopy(`acc-${cta.id}`, accountVal)}
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          {copiedKey === `acc-${cta.id}` ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Check size={12} /> Copiado
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Copy size={12} /> Copiar
                            </span>
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

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{ padding: '1.5rem', borderRadius: '16px', display: 'grid', gap: '1.25rem' }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Reportar mi Aporte
          </h2>

          {formError && (
            <div
              role="alert"
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '10px',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                fontWeight: 600,
                fontSize: '0.88rem',
              }}
            >
              {formError}
            </div>
          )}

          {/* Identificación del aportante (HU-6, HU-7, HU-8) */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem',
              display: 'grid',
              gap: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>
                1. Identificación del Aportante
              </strong>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={esAnonimo}
                  onChange={(e) => {
                    setEsAnonimo(e.target.checked);
                    setFormError(null);
                  }}
                />
                <UserX size={15} /> Aporte Anónimo / Visitante
              </label>
            </div>

            {!esAnonimo && (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="aportante-cedula"
                      className="form-field-label"
                      style={{ display: 'block', marginBottom: '0.25rem' }}
                    >
                      Buscar por Cédula (opcional si eres miembro)
                    </label>
                    <input
                      id="aportante-cedula"
                      type="text"
                      className="form-input"
                      placeholder="Ej: 12345678"
                      value={cedulaBusqueda}
                      onChange={(e) => {
                        setCedulaBusqueda(e.target.value);
                        setLookupResult(null);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => void handleSearchCedula()}
                    disabled={buscandoCedula}
                    style={{ height: '42px', whiteSpace: 'nowrap' }}
                  >
                    <Search size={15} /> {buscandoCedula ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>

                {lookupResult?.encontrado && (
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontSize: '0.85rem',
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
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      fontSize: '0.82rem',
                    }}
                  >
                    No encontramos tu cédula registrada. Ingresa tu nombre y teléfono abajo para
                    registrar tu aporte sin bloqueos.
                  </div>
                )}

                {(!lookupResult || !lookupResult.encontrado) && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <label htmlFor="aportante-nombre" className="form-field-label">
                        Nombre completo *
                      </label>
                      <input
                        id="aportante-nombre"
                        type="text"
                        className="form-input"
                        placeholder="Tu nombre y apellido"
                        value={nombreAportante}
                        onChange={(e) => setNombreAportante(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="aportante-telefono" className="form-field-label">
                        Teléfono de contacto
                      </label>
                      <input
                        id="aportante-telefono"
                        type="tel"
                        className="form-input"
                        placeholder="0414-0000000"
                        value={telefonoAportante}
                        onChange={(e) => setTelefonoAportante(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Categoría, Moneda y Monto (HU-9, HU-10) */}
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>
              2. Detalles del Aporte
            </strong>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div>
                <label htmlFor="aporte-categoria" className="form-field-label">
                  Categoría *
                </label>
                <select
                  id="aporte-categoria"
                  className="form-input"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaAporte)}
                >
                  {CATEGORIAS_APORTE.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-field-label">Moneda *</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {(['VES', 'USD'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMoneda(m)}
                      className={`btn ${moneda === m ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, padding: '0.55rem' }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div>
                <label htmlFor="aporte-monto" className="form-field-label">
                  Monto ({moneda}) *
                </label>
                <input
                  id="aporte-monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={montoOriginal}
                  onChange={(e) => setMontoOriginal(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="aporte-fecha" className="form-field-label">
                  Fecha del pago *
                </label>
                <input
                  id="aporte-fecha"
                  type="date"
                  className="form-input"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  required
                />
              </div>
            </div>

            {moneda === 'VES' && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span>
                  Tasa BCV vigente:{' '}
                  <strong>{tasaBcv ? `${tasaBcv.toFixed(4)} Bs/$` : 'N/D'}</strong>
                </span>
                <span>
                  Equivalente en USD: <strong>${equivalentUsd.toFixed(2)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Método de Pago (HU-11, HU-12, HU-13) */}
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>3. Método de Pago</strong>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {(
                [
                  { id: 'pago_movil', label: 'Pago Móvil', icon: <Smartphone size={15} /> },
                  { id: 'transferencia', label: 'Transferencia', icon: <Landmark size={15} /> },
                  { id: 'efectivo', label: 'Efectivo', icon: <DollarSign size={15} /> },
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
                  className={`btn ${medioPago === mp.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '0.6rem 0.4rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {mp.icon}
                  {mp.label}
                </button>
              ))}
            </div>

            {medioPago !== 'efectivo' && matchingAccounts.length > 0 && (
              <div>
                <label htmlFor="aporte-cuenta-receptora" className="form-field-label">
                  Cuenta de la iglesia a la que transferiste (opcional)
                </label>
                <select
                  id="aporte-cuenta-receptora"
                  className="form-input"
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

            {medioPago !== 'efectivo' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <label htmlFor="aporte-banco-emisor" className="form-field-label">
                    Banco Emisor *
                  </label>
                  <select
                    id="aporte-banco-emisor"
                    className="form-input"
                    value={bancoEmisor}
                    onChange={(e) => setBancoEmisor(e.target.value)}
                  >
                    <option value="">Selecciona tu banco...</option>
                    {BANCOS_VENEZUELA.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {medioPago === 'pago_movil' && (
                  <div>
                    <label htmlFor="aporte-tel-emisor" className="form-field-label">
                      Teléfono Emisor *
                    </label>
                    <input
                      id="aporte-tel-emisor"
                      type="tel"
                      className="form-input"
                      placeholder="0412-0000000"
                      value={telefonoEmisor}
                      onChange={(e) => setTelefonoEmisor(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="aporte-referencia" className="form-field-label">
                    Número de Referencia{' '}
                    {medioPago === 'transferencia' && sinReferenciaMismoBanco ? '(Opcional)' : '*'}
                  </label>
                  <input
                    id="aporte-referencia"
                    type="text"
                    className="form-input"
                    placeholder="Ej: 12345678"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </div>
              </div>
            )}

            {medioPago === 'transferencia' && (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={sinReferenciaMismoBanco}
                  onChange={(e) => setSinReferenciaMismoBanco(e.target.checked)}
                />
                <CreditCard size={14} /> Transferencia del mismo banco (sin número de referencia, p.
                ej. Provincial)
              </label>
            )}

            {medioPago === 'efectivo' && (
              <div>
                <label htmlFor="aporte-actividad" className="form-field-label">
                  Culto, Servicio, Actividad o Responsable / Tesorero que recibió *
                </label>
                <input
                  id="aporte-actividad"
                  type="text"
                  className="form-input"
                  placeholder="Ej: Culto Dominical 10:00 AM / Entregado al Tesorero"
                  value={actividadOResponsable}
                  onChange={(e) => setActividadOResponsable(e.target.value)}
                />
              </div>
            )}

            {medioPago !== 'efectivo' && (
              <div>
                <label htmlFor="aporte-comprobante" className="form-field-label">
                  Comprobante / Captura de pantalla (Imagen o PDF, opcional)
                </label>
                <label
                  htmlFor="aporte-comprobante"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px dashed #94a3b8',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#334155',
                  }}
                >
                  <Upload size={16} />
                  <span>
                    {comprobanteFile
                      ? `Archivo seleccionado: ${comprobanteFile.name}`
                      : 'Adjuntar captura o PDF del comprobante'}
                  </span>
                </label>
                <input
                  id="aporte-comprobante"
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '0.9rem',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Send size={18} />
            {submitting ? 'Enviando reporte...' : 'Enviar Reporte de Aporte'}
          </button>
        </form>
      </div>
    </div>
  );
};
