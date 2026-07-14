# TODO / Lista de Tareas Pendientes

Este archivo contiene la lista de mejoras, refactorizaciones y características pendientes para el proyecto **MATEO (ong-donation-audit)**.

---

## 🚀 Mejoras y Nuevas Características

### 📴 Capacidad Offline y Asíncrona (Entrega de Beneficios)

Permitir que el coordinador o auxiliar registre beneficiarios y capture firmas autógrafas en campo sin conexión a internet.

- [ ] **Configuración de PWA:** Integrar `vite-plugin-pwa` para almacenar en caché los recursos estáticos y permitir la carga de la aplicación offline.
- [ ] **Base de Datos Local (IndexedDB):** Usar `Dexie.js` o `localForage` para persistir localmente los datos de beneficiarios y las firmas en formato Base64.
- [ ] **Formulario Adaptativo:** Modificar `RegistrationForm.tsx` para detectar desconexión y guardar en el almacenamiento local como fallback.
- [ ] **Cola de Sincronización (Sync Queue):** Diseñar e implementar un panel/interfaz para que el usuario pueda ver los registros pendientes y sincronizarlos secuencialmente a Supabase y GCS cuando recupere la señal.

---

## 🛠️ Refactorizaciones y Deuda Técnica

- [ ] **Reducción de Tipos `any`:** Continuar reemplazando los tipos `any` restantes en componentes del dashboard, conciliación y componentes compartidos por interfaces TypeScript explícitas.
- [ ] **Optimización de Cobertura de Pruebas:** Expandir la suite de pruebas unitarias y de integración para cubrir flujos de error en la API e interacciones offline simuladas.
