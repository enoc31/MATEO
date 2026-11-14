# Guía de Integración: OpenTelemetry y Grafana Cloud en MATEO

Esta guía detalla la configuración y puesta en marcha de observabilidad completa (**Métricas, Logs y Trazas**) en la plataforma MATEO enviando datos a **Grafana Cloud** mediante el estándar **OpenTelemetry (OTLP)**.

---

## 1. Arquitectura de Observabilidad

```
┌─────────────────────────────────┐
│   MATEO Frontend (React 19/Vite)│
│  - Trazas: Fetch / DocumentLoad │
│  - Métricas: Web Vitals / Apps  │
│  - Logs: Structured Events      │
└───────────────┬─────────────────┘
                │ OTLP/HTTP (JSON)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Opción B: OpenTelemetry Collector (Docker Compose) [Rec.]   │
│  - Puerto 4318 (HTTP) con CORS habilitado                   │
│  - Batching, compresión y basicauth seguro                  │
└───────────────┬─────────────────────────────────────────────┘
                │ OTLP / HTTPS (Basic Auth)
                ▼
┌─────────────────────────────────────────────────────────────┐
│                       GRAFANA CLOUD                         │
│  ├── Tempo  (Distributed Tracing)                           │
│  ├── Mimir  (Prometheus Metrics)                            │
│  └── Loki   (Log Streams)                                   │
└─────────────────────────────────────────────────────────────┘
```

También se incluye soporte para la **Opción A (Envío Directo)** desde el navegador o funciones Serverless (`api/*`) directamente al gateway OTLP de Grafana Cloud.

---

## 2. Requisitos de Grafana Cloud

Para enviar datos a Grafana Cloud necesitas:

1. **OTLP Gateway Endpoint**: Por ejemplo, `https://otlp-gateway-prod-us-east-0.grafana.net/otlp` (disponible en el panel de Grafana Cloud -> _OpenTelemetry_).
2. **Instance ID (Username)**: Número identificador de la instancia de OpenTelemetry.
3. **API Token**: Token de Grafana Cloud con permisos:
   - `traces:write`
   - `metrics:write`
   - `logs:write`

### Generación del Header de Autenticación Basic

Si usas envío directo, el header de autorización se compone codificando en Base64 el par `INSTANCE_ID:API_KEY`:

```bash
echo -n "<INSTANCE_ID>:<API_KEY>" | base64
# Resultado de ejemplo: MTIzNDU2OmdsY19leUp...
```

El valor para el header es:

```
Authorization=Basic MTIzNDU2OmdsY19leUp...
```

---

## 3. Configuración del Entorno (`.env`)

Crea o edita tu archivo `.env` en la raíz del proyecto basándote en `.env.example`:

### Opción B: Con OpenTelemetry Collector Local (Recomendado)

```env
# Telemetría del Frontend hacia el colector local
VITE_OTEL_ENABLED=true
VITE_OTEL_SERVICE_NAME=mateo-humanitaria
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Credenciales para el Colector hacia Grafana Cloud
GRAFANA_CLOUD_OTLP_ENDPOINT=https://otlp-gateway-<ZONE>.grafana.net/otlp
GRAFANA_CLOUD_INSTANCE_ID=<TU_INSTANCE_ID>
GRAFANA_CLOUD_API_KEY=<TU_API_TOKEN>
```

Inicia el colector con Docker Compose:

```bash
docker compose -f docker-compose.otel.yml up -d
```

### Opción A: Envío Directo a Grafana Cloud

```env
VITE_OTEL_ENABLED=true
VITE_OTEL_SERVICE_NAME=mateo-humanitaria
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-<ZONE>.grafana.net/otlp
VITE_OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <BASE64_TOKEN>"
```

---

## 4. Uso en el Código de la Aplicación

### 4.1. Inicialización Automática

OpenTelemetry se inicializa automáticamente al arrancar la aplicación en `src/main.tsx` llamando a `initTelemetry()`. Si `VITE_OTEL_ENABLED=false` o no hay endpoint configurado, entra en modo no-op sin afectar el funcionamiento del frontend.

### 4.2. Registro de Métricas Personalizadas

```typescript
import { recordMetric } from './services/telemetry';

// Registrar un contador de evento financiero
recordMetric('mateo.donations.created', 1, {
  moneda: 'USD',
  tipo_pago: 'transferencia',
});
```

### 4.3. Emisión de Logs Estructurados hacia Loki

```typescript
import { emitLog } from './services/telemetry';

emitLog('INFO', 'Usuario inició sesión exitosamente', {
  usuario_id: user.id,
  rol: user.role,
});

emitLog('ERROR', 'Fallo al procesar reconciliación bancaria', {
  error_code: 'BANK_DISCREPANCY',
});
```

### 4.4. Trazado Manual de Operaciones Críticas

```typescript
import { traceOperation } from './services/telemetry';

const data = await traceOperation(
  'audit.generate_reconciliation_report',
  async () => {
    return await api.getReconciliationSummary();
  },
  { proyectoId: 'proj-123' },
);
```

### 4.5. Funciones Serverless (`api/*`)

Para funciones backend en Vercel, utiliza el helper `api/_telemetry.js`:

```javascript
import { traceServerless, sendServerlessLog } from './_telemetry.js';

export default async function handler(req, res) {
  return await traceServerless('api/registro', req, async ({ traceId }) => {
    await sendServerlessLog('INFO', 'Procesando entrega de donación', { traceId });
    // ... lógica del handler ...
  });
}
```

---

## 5. Verificación y Diagnóstico

Para comprobar la conectividad de los tres canales (Trazas, Métricas y Logs) sin necesidad de levantar el frontend:

```bash
node scripts/verify-otel-grafana.mjs
```

O agregándolo a `package.json`:

```bash
npm run verify:otel
```

La salida mostrará el estado HTTP de cada señal:

- **Trazas (`/v1/traces`)**: `Status 200 OK ✓`
- **Métricas (`/v1/metrics`)**: `Status 200 OK ✓`
- **Logs (`/v1/logs`)**: `Status 200 OK ✓`

---

## 6. Visualización en Grafana Cloud

1. **Grafana Tempo (Trazas)**:
   - Dirígete a **Explore** -> selecciona la fuente de datos **Tempo**.
   - Filtra por `Service Name = mateo-humanitaria`.
   - Podrás ver las llamadas `fetch`, duración de renderizado y spans personalizados.

2. **Grafana Mimir / Prometheus (Métricas)**:
   - Dirígete a **Explore** -> selecciona la fuente de datos **Metrics / Prometheus**.
   - Consulta `mateo_donations_created_total` o las métricas de rendimiento recolectadas.

3. **Grafana Loki (Logs)**:
   - Dirígete a **Explore** -> selecciona la fuente de datos **Loki**.
   - Consulta: `{service_name="mateo-humanitaria"}`.
