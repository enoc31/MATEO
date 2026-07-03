# Sistema de Auditoría y Conciliación de Donaciones - CNBV

Este proyecto es una plataforma web para la **Convención Nacional Bautista de Venezuela (CNBV)** destinada a auditar, conciliar y gestionar los fondos de ayuda humanitaria y donaciones recibidas para proyectos específicos en todo el país (ej: Zulia, Apure, Táchira).

## 🚀 Características Principales

- **Tableros Visuales (Dashboard)**: Gráficos de ingresos vs egresos, balance general y métricas clave de ejecución presupuestaria.
- **Conciliación Bancaria**: Módulo interactivo para asociar movimientos de estados de cuenta bancarios (importados mediante CSV) con donaciones y comprobantes de gasto.
- **Auditoría de Gastos**: Interfaz para verificar y aprobar/rechazar las facturas o recibos cargados por los coordinadores de campo.
- **Control de Presupuestos**: Límite de gastos asignados por proyecto y categoría (alimentación, medicina, transporte, logística) con generación de alertas y reportes.
- **Carga de Gastos de Campo**: Formulario adaptado a móviles para que los coordinadores reporten gastos subiendo fotos de los soportes/facturas en tiempo real.

---

## 👥 Control de Acceso por Roles

La aplicación implementa rutas protegidas y menús dinámicos para tres perfiles de usuario:

1. **Administrador (Director)**: Acceso total al sistema (Dashboard, Conciliación, Auditoría, Presupuestos y Carga de Gastos).
2. **Auditor (Finanzas)**: Acceso a control financiero, auditoría de soportes, conciliaciones bancarias y reportes.
3. **Coordinador**: Acceso exclusivo a la carga y reporte de gastos en campo.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19, TypeScript, Vite.
- **Gráficos**: Recharts.
- **Procesamiento de Archivos**: PapaParse (CSV), XLSX (Excel) y JsPDF / html2canvas (PDF).
- **Backend / Base de Datos**: PostgreSQL y Supabase (con RLS y Triggers automáticos).

---

## 💡 Modo Demostración (Simulación Local)

El sistema cuenta con un **Modo Simulación automático**. Si la aplicación no detecta las variables de entorno de Supabase, activará un banner superior de prueba. 
- Permite iniciar sesión con cualquiera de los tres roles predeterminados con un solo clic.
- Guarda todos los cambios de manera local y persistente en el `localStorage` del navegador.
- Cuenta con datos semilla realistas preconfigurados.

---

## 🔧 Configuración e Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd ONG-DONATION-AUDIT
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno (Opcional para modo Real)**:
   Crea un archivo `.env` en la raíz del proyecto basándote en [.env.example](file:///.env.example):
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima-de-supabase
   ```

4. **Correr en desarrollo**:
   ```bash
   npm run dev
   ```

5. **Compilar para producción**:
   ```bash
   npm run build
   ```

---

## 🗄️ Base de Datos (Supabase)

El script SQL para inicializar la base de datos completa (tablas, relaciones, triggers de actualización presupuestaria y políticas de seguridad RLS) se encuentra en [database/schema.sql](file:///database/schema.sql).
