/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_OTEL_ENABLED?: string;
  readonly VITE_OTEL_SERVICE_NAME?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_HEADERS?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT?: string;
  readonly VITE_GRAFANA_TOKEN?: string;
  readonly VITE_GRAFANA_INSTANCE_ID?: string;
  readonly VITE_APP_VERSION?: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
