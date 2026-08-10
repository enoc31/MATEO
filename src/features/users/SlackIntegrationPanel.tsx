import React, { useState, useCallback } from 'react';
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Send,
  Loader,
  ExternalLink,
  Info,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useNotifications } from '../../components/NotificationProvider';

// ── Tipos ─────────────────────────────────────────────────────
interface TestResult {
  success: boolean;
  summary?: {
    requisicionesPendientes: number;
    gastosSinComprobante: number;
    ingresosSinConciliar: number;
    usuariosPorAprobar: number;
    proyectosSinIngreso: number;
    presupuestosVencidos: number;
  };
  message?: string;
  error?: string;
  timestamp?: string;
}

// ── Componente ────────────────────────────────────────────────
export const SlackIntegrationPanel: React.FC = () => {
  const { addNotification } = useNotifications();

  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  // ── Disparar el digest manualmente ───────────────────────────
  const handleSendDigest = useCallback(async () => {
    setIsSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('slack-daily-digest');

      if (error) {
        throw new Error(error.message ?? 'Error al invocar la función');
      }

      const result = data as TestResult;
      setLastResult({ ...result, success: true });
      addNotification('✅ Resumen enviado a Slack exitosamente', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setLastResult({ success: false, error: message });
      addNotification(`❌ Error al enviar a Slack: ${message}`, 'warning');
    } finally {
      setIsSending(false);
    }
  }, [addNotification]);

  // ── Renderizado ───────────────────────────────────────────────
  return (
    <div
      className="card"
      style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#4A154B', // Slack purple
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <MessageSquare size={22} color="#fff" />
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--neutral-dark)',
              fontFamily: 'var(--font-headings)',
            }}
          >
            Integración con Slack
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Publica el resumen de pendientes en tu canal de Slack
          </p>
        </div>
      </div>

      {/* ── Información de configuración ──────────────────── */}
      <div
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.06)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.6 }}>
          <strong>Configuración requerida:</strong> Para que funcione, el administrador debe
          configurar los siguientes secretos en{' '}
          <strong>Supabase → Settings → Edge Functions → Secrets</strong>:
          <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
            <li>
              <code
                style={{
                  fontSize: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  padding: '0 4px',
                  borderRadius: 3,
                }}
              >
                SLACK_BOT_TOKEN
              </code>{' '}
              → Tu Bot Token de Slack (<code>xoxb-...</code>)
            </li>
            <li>
              <code
                style={{
                  fontSize: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  padding: '0 4px',
                  borderRadius: 3,
                }}
              >
                SLACK_CHANNEL_ID
              </code>{' '}
              → ID del canal destino (ej: <code>C0XXXXXXX</code>)
            </li>
          </ul>
        </div>
      </div>

      {/* ── Qué se reporta ─────────────────────────────────── */}
      <div>
        <p
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--primary)',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          El resumen incluye:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.5rem',
          }}
        >
          {[
            { emoji: '⏳', label: 'Requisiciones pendientes' },
            { emoji: '📎', label: 'Gastos sin comprobante' },
            { emoji: '🏦', label: 'Ingresos sin conciliar' },
            { emoji: '👤', label: 'Usuarios por aprobar' },
            { emoji: '📂', label: 'Proyectos sin donante' },
            { emoji: '📅', label: 'Presupuestos por vencer' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#334155',
                backgroundColor: '#f8fafc',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Resultado de la última ejecución ───────────────── */}
      {lastResult && (
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            backgroundColor: lastResult.success
              ? 'rgba(16, 185, 129, 0.06)'
              : 'rgba(239, 68, 68, 0.06)',
            border: `1px solid ${lastResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: lastResult.summary ? '0.75rem' : 0,
            }}
          >
            {lastResult.success ? (
              <CheckCircle size={16} color="#10b981" />
            ) : (
              <XCircle size={16} color="#ef4444" />
            )}
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: lastResult.success ? '#059669' : '#dc2626',
              }}
            >
              {lastResult.success
                ? 'Resumen enviado a Slack correctamente'
                : `Error: ${lastResult.error}`}
            </span>
          </div>

          {lastResult.summary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                fontSize: '0.75rem',
              }}
            >
              {[
                { label: 'Requisiciones', value: lastResult.summary.requisicionesPendientes },
                { label: 'Sin comprobante', value: lastResult.summary.gastosSinComprobante },
                { label: 'Sin conciliar', value: lastResult.summary.ingresosSinConciliar },
                { label: 'Por aprobar', value: lastResult.summary.usuariosPorAprobar },
                { label: 'Sin donante', value: lastResult.summary.proyectosSinIngreso },
                { label: 'Por vencer', value: lastResult.summary.presupuestosVencidos },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    textAlign: 'center',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
                    {item.value}
                  </div>
                  <div style={{ color: '#64748b' }}>{item.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Acciones ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          id="btn-send-slack-digest"
          className="btn btn-primary"
          onClick={handleSendDigest}
          disabled={isSending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.5rem',
          }}
        >
          {isSending ? (
            <>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Enviando a Slack...
            </>
          ) : (
            <>
              <Send size={16} />
              Enviar resumen ahora
            </>
          )}
        </button>

        <a
          href="https://api.slack.com/apps"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#4A154B',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={13} />
          Configurar Slack App
        </a>
      </div>

      {/* ── Nota sobre el cron ─────────────────────────────── */}
      <p
        style={{
          fontSize: '0.75rem',
          color: '#94a3b8',
          margin: 0,
          borderTop: '1px solid var(--border-color)',
          paddingTop: '0.75rem',
        }}
      >
        🕐 El resumen se envía automáticamente cada día hábil a las{' '}
        <strong>8:00 AM hora Caracas</strong>. Usa el botón "Enviar ahora" para hacer un envío
        manual de prueba.
      </p>
    </div>
  );
};
