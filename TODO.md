# TODO List - ONG Donation Audit

Este archivo contiene la lista unificada de tareas pendientes, mejoras del sistema y tareas completadas para el proyecto **MATEO**.

---

## 🚀 Mejoras y Nuevas Características

### 📱 [Pendiente] US-008: Registro de Beneficios mediante Escaneo QR y Código de Barras (Móvil)

- **Descripción:** Implementar el lector QR para carnet de beneficiarios y lector de códigos de barra para productos en el formulario de entregas de beneficios móvil (admite escaneo o selección manual). Requiere conectividad a internet en tiempo real con Supabase.
- **Componente afectado:** `src/features/beneficiaries/RegistrationForm.tsx` y base de datos (Supabase).
- **Prioridad:** Alta.

### 📴 [Pendiente] Capacidad Offline y Asíncrona (Entrega de Beneficios)

- **Descripción:** Permitir que el coordinador o auxiliar registre beneficiarios y capture firmas autógrafas en campo sin conexión a internet.
- **Subtareas:**
  - [ ] **Configuración de PWA:** Integrar `vite-plugin-pwa` para almacenar en caché los recursos estáticos y permitir la carga de la aplicación offline.
  - [ ] **Base de Datos Local (IndexedDB):** Usar `Dexie.js` o `localForage` para persistir localmente los datos de beneficiarios y las firmas en formato Base64.
  - [ ] **Formulario Adaptativo:** Modificar `RegistrationForm.tsx` para detectar desconexión y guardar en el almacenamiento local como fallback.
  - [ ] **Cola de Sincronización (Sync Queue):** Diseñar e implementar un panel/interfaz para que el usuario pueda ver los registros pendientes y sincronizarlos secuencialmente a Supabase y GCS cuando recupere la señal.

### ⚙️ [Pendiente] Validación y Pruebas de Integración para `ong_id` en Partidas del Proyecto

- **Descripción:** Verificar el comportamiento del omitido de `ong_id` cuando viene vacío desde el cliente. Asegurar que las políticas RLS y los triggers de Supabase (`trg_set_ong_id`) asignen correctamente el `ong_id` correspondiente en la base de datos de producción/staging sin fallas de casting de tipo UUID.
- **Componente afectado:** `src/services/api.ts` (`setProjectPartidas` / `getProjectPartidas`).
- **Prioridad:** Media-Alta.

---

## 🛠️ Refactorizaciones y Deuda Técnica

- [ ] **Reducción de Tipos `any`:** Continuar reemplazando los tipos `any` restantes en componentes del dashboard, conciliación y componentes compartidos por interfaces TypeScript explícitas.
- [ ] **Optimización de Cobertura de Pruebas:** Expandir la suite de pruebas unitarias y de integración para cubrir flujos de error en la API e interacciones offline simuladas.

---

## ✅ Tareas Completadas

- [x] Crear el agente experto de diseño y estructura de correos (`email-notification-designer`)
- [x] Crear plantillas responsivas en HTML con estilos inline corporativos (Azul Bautista, Verde Iglesia)
- [x] Redactar la guía técnica de integración con el SDK y API de Resend
- [x] Corregir la persistencia local de partidas de proyecto en el modo simulación
