import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';
import { emitLog, recordException, recordMetric, getCurrentTraceId } from '../services/telemetry';

export interface TelemetryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  name?: string;
  onCatch?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface TelemetryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  incidentId: string;
}

export class TelemetryErrorBoundary extends Component<
  TelemetryErrorBoundaryProps,
  TelemetryErrorBoundaryState
> {
  constructor(props: TelemetryErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      incidentId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<TelemetryErrorBoundaryState> {
    const traceId = getCurrentTraceId();
    const fallbackId = `err-${Math.random().toString(36).substring(2, 10)}`;
    return {
      hasError: true,
      error,
      incidentId: traceId || fallbackId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const componentName = this.props.name || 'root';

    recordMetric('mateo_error_boundary_catches_total', 1, {
      component: componentName,
      error_name: error.name,
    });

    recordException(error, {
      component: componentName,
      component_stack: errorInfo.componentStack || '',
      incident_id: this.state.incidentId,
    });

    emitLog('ERROR', `[ErrorBoundary] Render crash in ${componentName}: ${error.message}`, {
      component: componentName,
      stack: error.stack || '',
      componentStack: errorInfo.componentStack || '',
      incidentId: this.state.incidentId,
    });

    if (this.props.onCatch) {
      this.props.onCatch(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      incidentId: '',
    });
  };

  handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.handleReset);
        }
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid #fee2e2',
              backgroundColor: '#fff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <ShieldAlert size={32} />
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '0.5rem',
              }}
            >
              Ha ocurrido un error inesperado
            </h2>

            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '1.25rem',
                lineHeight: 1.5,
              }}
            >
              La aplicación detectó una incidencia no recuperable en este módulo. Nuestro equipo SRE
              ha recibido el reporte y la traza de diagnóstico.
            </p>

            {this.state.incidentId && (
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#f3f4f6',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: '#4b5563',
                  marginBottom: '1.5rem',
                  wordBreak: 'break-all',
                }}
              >
                ID de Diagnóstico: <strong>{this.state.incidentId}</strong>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} />
                Reintentar
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                <Home size={16} />
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
