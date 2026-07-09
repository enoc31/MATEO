import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Hourglass, Megaphone, RefreshCw, ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './components/NotificationProvider';
import { Login } from './features/auth/Login';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { UpdatePassword } from './features/auth/UpdatePassword';
import { Layout } from './components/Layout';
import { Suspense, lazy } from 'react';
import { LandingPage } from './features/landing/LandingPage';

// Lazy loaded features
const Dashboard = lazy(() =>
  import('./features/dashboard/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const Reconciliation = lazy(() =>
  import('./features/reconciliation/Reconciliation').then((module) => ({
    default: module.Reconciliation,
  })),
);
const Audit = lazy(() =>
  import('./features/audit/Audit').then((module) => ({ default: module.Audit })),
);
const AuditDetail = lazy(() =>
  import('./features/audit/AuditDetail').then((module) => ({ default: module.AuditDetail })),
);
const BudgetsAndReports = lazy(() =>
  import('./features/budgets/BudgetsAndReports').then((module) => ({
    default: module.BudgetsAndReports,
  })),
);
const BudgetWizard = lazy(() =>
  import('./features/budgets/BudgetWizard').then((module) => ({ default: module.BudgetWizard })),
);
const MobileEntry = lazy(() =>
  import('./features/mobile-entry/MobileEntry').then((module) => ({ default: module.MobileEntry })),
);
const UserManagement = lazy(() =>
  import('./features/users/UserManagement').then((module) => ({ default: module.UserManagement })),
);
const RequisitionsManager = lazy(() =>
  import('./features/requisitions/RequisitionsManager').then((module) => ({
    default: module.RequisitionsManager,
  })),
);
const IncomesManager = lazy(() =>
  import('./features/incomes/IncomesManager').then((module) => ({
    default: module.IncomesManager,
  })),
);
const IncomeRegistrationForm = lazy(() =>
  import('./features/incomes/IncomeRegistrationForm').then((module) => ({
    default: module.IncomeRegistrationForm,
  })),
);
const ImportBankStatement = lazy(() =>
  import('./features/incomes/ImportBankStatement').then((module) => ({
    default: module.ImportBankStatement,
  })),
);
const TasasManager = lazy(() =>
  import('./features/tasas/TasasManager').then((module) => ({ default: module.TasasManager })),
);
const BeneficiaryRegistry = lazy(() =>
  import('./features/beneficiaries/BeneficiaryRegistry').then((module) => ({
    default: module.BeneficiaryRegistry,
  })),
);
const JornadasManager = lazy(() =>
  import('./features/beneficiaries/JornadasManager').then((module) => ({
    default: module.JornadasManager,
  })),
);

const MainAppContent: React.FC = () => {
  const { profile, loading, logout, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f4f5f7',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src="/mateo_logo.png"
            alt="Logo MATEO"
            style={{
              height: '60px',
              width: '60px',
              objectFit: 'contain',
              marginBottom: '1rem',
              borderRadius: '12px',
            }}
          />
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--primary)',
              marginTop: '1rem',
            }}
          >
            Verificando Credenciales...
          </div>
        </div>
      </div>
    );
  }

  // Si no hay sesión válida, se manejará con PrivateRoute en lugar de redirigir aquí.

  if (!profile) return null; // Satisfy TypeScript since PrivateRoute already guards this

  // Si está logueado pero no ha sido aprobado por un administrador
  if (profile.aprobado === false) {
    return <PendingApproval logout={logout} refreshProfile={refreshProfile} />;
  }

  // Función de ayuda para proteger rutas basadas en roles
  const ProtectedRoute = ({ element, allowedRoles }: { element: React.ReactNode, allowedRoles: string[] }) => {
    if (allowedRoles.includes(profile.rol)) {
      return <>{element}</>;
    }
    return <AccessDenied />;
  };

  const renderContentWithSuspense = () => (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            minHeight: '400px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              color: 'var(--neutral-dark)',
            }}
          >
            <Hourglass size={40} style={{ animation: 'spin 2s linear infinite', opacity: 0.5 }} />
            <p>Cargando módulo...</p>
          </div>
        </div>
      }
    >
      <Routes>
        {/* Default route based on role */}
        <Route 
          path="/" 
          element={<Navigate to={['coordinador', 'auxiliar_campo'].includes(profile.rol) ? 'field-entry' : 'dashboard'} replace />} 
        />
        
        {/* Main features */}
        <Route path="dashboard" element={<ProtectedRoute allowedRoles={['administrador', 'auditor', 'director', 'donante']} element={<Dashboard />} />} />
        <Route path="reconciliation" element={<ProtectedRoute allowedRoles={['administrador', 'auditor']} element={<Reconciliation />} />} />
        <Route path="audit" element={<ProtectedRoute allowedRoles={['administrador', 'auditor']} element={<Audit />} />} />
        <Route path="budgets" element={<ProtectedRoute allowedRoles={['administrador', 'auditor', 'director']} element={<BudgetsAndReports />} />} />
        <Route path="field-entry" element={<ProtectedRoute allowedRoles={['administrador', 'coordinador', 'director', 'auxiliar_campo']} element={<MobileEntry />} />} />
        <Route path="beneficiaries" element={<ProtectedRoute allowedRoles={['administrador', 'director', 'auxiliar_campo']} element={<BeneficiaryRegistry />} />} />
        <Route path="jornadas" element={<ProtectedRoute allowedRoles={['administrador', 'director']} element={<JornadasManager />} />} />
        <Route path="requisitions" element={<ProtectedRoute allowedRoles={['administrador', 'coordinador', 'director', 'auxiliar_campo']} element={<RequisitionsManager />} />} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['administrador']} element={<UserManagement />} />} />
        <Route path="incomes" element={<ProtectedRoute allowedRoles={['administrador', 'director', 'auditor']} element={<IncomesManager />} />} />
        <Route path="tasas" element={<ProtectedRoute allowedRoles={['administrador', 'director']} element={<TasasManager />} />} />

        {/* Sub-screens that hide the layout or show over it */}
        <Route path="nuevo-ingreso" element={<IncomeRegistrationForm />} />
        <Route path="importar-extracto" element={<ImportBankStatement />} />
        <Route path="audit-detail" element={<AuditDetail />} />
        <Route path="budget-wizard" element={
          <BudgetWizard
            isOpen={true}
            onClose={() => window.history.back()}
            onSuccess={() => {
              alert('Presupuesto guardado exitosamente.');
              window.history.back();
            }}
          />
        } />
        
        <Route path="*" element={<div>Página no encontrada</div>} />
      </Routes>
    </Suspense>
  );

  return (
    <Layout>
      {renderContentWithSuspense()}
    </Layout>
  );
};

// Componente para Pantalla Intermedia: Pendiente de Aprobación
interface PendingApprovalProps {
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PendingApproval: React.FC<PendingApprovalProps> = ({ logout, refreshProfile }) => {
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      // Simular una pequeña espera para dar feedback visual al usuario
      await new Promise((resolve) => setTimeout(resolve, 800));
      await refreshProfile();
      setFeedback('Tu cuenta aún está pendiente de aprobación por el Administrador.');
    } catch (err) {
      setFeedback('Error al verificar el estado del usuario.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f4f5f7 0%, #e2e8f0 100%)',
        padding: '1rem',
      }}
    >
      <div
        className="card animate-fade-in-up"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '3rem',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            marginBottom: '1rem',
            color: 'var(--primary)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Hourglass size={72} strokeWidth={1.2} />
        </div>
        <h2
          style={{
            color: 'var(--primary)',
            fontFamily: 'var(--font-headings)',
            fontSize: '1.6rem',
            fontWeight: 700,
          }}
        >
          Registro Pendiente
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--neutral-dark)',
            opacity: 0.9,
            marginTop: '1rem',
            lineHeight: '1.6',
          }}
        >
          Tu cuenta ha sido creada exitosamente. Para poder ingresar, un **Administrador** de la
          CNBV debe validar tu identidad, aprobar tu registro y asignarte un rol dentro de la
          plataforma.
        </p>

        <div
          style={{
            marginTop: '2rem',
            backgroundColor: 'rgba(0, 143, 166, 0.06)',
            border: '1px solid rgba(0, 143, 166, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.2rem',
            fontSize: '0.82rem',
            textAlign: 'left',
            color: 'var(--neutral-dark)',
          }}
        >
          <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '0.4rem' }}>
            ¿Qué debes hacer ahora?
          </strong>
          <ul
            style={{
              paddingLeft: '1.2rem',
              margin: 0,
              opacity: 0.9,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
            }}
          >
            <li>Contacta al Administrador de Finanzas o Director Nacional de la CNBV.</li>
            <li>Solicita la aprobación de tu correo institucional.</li>
            <li>
              Una vez aprobado, pulsa el botón **Verificar Estado de Acceso** o recarga esta página.
            </li>
          </ul>
        </div>

        {feedback && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(255, 204, 0, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: '#b47b00',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem',
            }}
          >
            <Megaphone size={18} /> {feedback}
          </div>
        )}

        <button
          onClick={handleCheckStatus}
          className="btn btn-primary"
          disabled={checking}
          style={{
            width: '100%',
            marginTop: '2rem',
            padding: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {checking ? (
            <>
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }}
              ></span>
              <span>Verificando...</span>
            </>
          ) : (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <RefreshCw size={18} /> Verificar Estado de Acceso
            </span>
          )}
        </button>

        <button
          onClick={logout}
          className="btn btn-outline"
          style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', fontWeight: 600 }}
        >
          Cerrar Sesión / Volver
        </button>
      </div>
    </div>
  );
};

// Componente para Control de Acceso / Rutas Protegidas
const AccessDenied: React.FC = () => {
  return (
    <div
      className="card text-center"
      style={{ textAlign: 'center', padding: '3rem', marginTop: '2rem' }}
    >
      <ShieldAlert size={48} color="var(--danger)" strokeWidth={1.5} />
      <h3 style={{ color: 'var(--danger)', marginTop: '1rem', fontWeight: 700 }}>
        Acceso Denegado
      </h3>
      <p style={{ opacity: 0.8, fontSize: '0.9rem', marginTop: '0.5rem' }}>
        Su rol actual no cuenta con los permisos necesarios para visualizar esta sección.
      </p>
    </div>
  );
};

// Wrappers para control de acceso
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading, user, authError, logout } = useAuth();

  if (loading) return <div>Verificando...</div>;
  if (!profile) {
    if (user) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'sans-serif' }}>
          <ShieldAlert size={64} color="red" />
          <h2 style={{ marginTop: '1rem', color: '#333' }}>Error de Perfil de Usuario</h2>
          <p style={{ color: '#666', maxWidth: '400px', margin: '1rem auto' }}>
            Tu cuenta se ha autenticado, pero tu perfil en la base de datos no pudo ser cargado o
            creado.
          </p>
          {authError && (
            <div
              style={{
                background: '#ffeeee',
                padding: '1rem',
                borderRadius: '8px',
                color: '#cc0000',
                margin: '1rem auto',
                maxWidth: '500px',
                fontSize: '0.85rem',
                wordBreak: 'break-all',
              }}
            >
              <strong>Detalle Técnico:</strong> {authError}
            </div>
          )}
          <button
            onClick={() => {
              logout();
              window.location.reload();
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Volver al Inicio y Cerrar Sesión
          </button>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  if (profile) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

// Envolver la App en el AuthProvider y NotificationProvider
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route
              path="/registro"
              element={
                <div style={{ backgroundColor: '#f4f5f7', minHeight: '100vh', padding: '1rem' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <img
                      src="/mateo_logo.png"
                      alt="Logo MATEO"
                      style={{
                        height: '50px',
                        width: '50px',
                        objectFit: 'contain',
                        borderRadius: '10px',
                      }}
                    />
                  </div>
                  <Suspense
                    fallback={
                      <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando Módulo...</div>
                    }
                  >
                    <BeneficiaryRegistry />
                  </Suspense>
                </div>
              }
            />
            {/* Rutas Privadas */}
            <Route
              path="/app/*"
              element={
                <PrivateRoute>
                  <MainAppContent />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
