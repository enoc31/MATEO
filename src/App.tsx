import React, { useState, useEffect } from 'react';
import { Hourglass, Megaphone, RefreshCw, ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './features/auth/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { Reconciliation } from './features/reconciliation/Reconciliation';
import { Audit } from './features/audit/Audit';
import { BudgetsAndReports } from './features/budgets/BudgetsAndReports';
import { MobileEntry } from './features/mobile-entry/MobileEntry';
import { UserManagement } from './features/users/UserManagement';
import { RequisitionsManager } from './features/requisitions/RequisitionsManager';
import { IncomesManager } from './features/incomes/IncomesManager';
import { IncomeRegistrationForm } from './features/incomes/IncomeRegistrationForm';
import { ImportBankStatement } from './features/incomes/ImportBankStatement';
import { TasasManager } from './features/tasas/TasasManager';

const MainAppContent: React.FC = () => {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('');

  // Configurar la pestaña por defecto basada en el rol del usuario
  useEffect(() => {
    if (profile) {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page');
      if (page) {
        setActiveTab(page);
      } else if (['coordinador', 'auxiliar_campo'].includes(profile.rol)) {
        setActiveTab('field-entry');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f4f5f7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="https://cnbv.org/wp-content/uploads/2020/09/logo-cnbv.jpg" 
            alt="Logo CNBV" 
            style={{ height: '60px', objectFit: 'contain', marginBottom: '1rem' }}
          />
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            color: 'var(--primary)',
            marginTop: '1rem'
          }}>
            Verificando Credenciales...
          </div>
        </div>
      </div>
    );
  }

  // Si no está logueado, mostrar pantalla de Login
  if (!profile) {
    if (user) {
      // Autenticado pero sin perfil (posible error de DB)
      return (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'sans-serif' }}>
          <ShieldAlert size={64} color="red" />
          <h2 style={{ marginTop: '1rem', color: '#333' }}>Error de Perfil de Usuario</h2>
          <p style={{ color: '#666', maxWidth: '400px', margin: '1rem auto' }}>
            Tu cuenta se ha autenticado, pero tu perfil en la base de datos no pudo ser cargado o creado. 
            Asegúrate de haber ejecutado el parche SQL en Supabase o contacta al administrador.
          </p>
          <button 
            onClick={() => { logout(); window.location.reload(); }} 
            style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Volver al Inicio y Cerrar Sesión
          </button>
        </div>
      );
    }
    return <Login />;
  }

  // Si está logueado pero no ha sido aprobado por un administrador
  if (profile.aprobado === false) {
    return <PendingApproval logout={logout} refreshProfile={refreshProfile} />;
  }

  // Renderizar componentes según la pestaña activa y validación de roles
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return ['administrador', 'auditor', 'director', 'donante'].includes(profile.rol) ? <Dashboard /> : <AccessDenied />;
      case 'reconciliation':
        return ['administrador', 'auditor'].includes(profile.rol) ? <Reconciliation /> : <AccessDenied />;
      case 'audit':
        return ['administrador', 'auditor'].includes(profile.rol) ? <Audit /> : <AccessDenied />;
      case 'budgets':
        return ['administrador', 'auditor', 'director'].includes(profile.rol) ? <BudgetsAndReports /> : <AccessDenied />;
      case 'field-entry':
        return ['administrador', 'coordinador', 'director', 'auxiliar_campo'].includes(profile.rol) ? <MobileEntry /> : <AccessDenied />;
      case 'requisitions':
        return ['administrador', 'coordinador', 'director', 'auxiliar_campo'].includes(profile.rol) ? <RequisitionsManager /> : <AccessDenied />;
      case 'users':
        return profile.rol === 'administrador' ? <UserManagement /> : <AccessDenied />;
      case 'incomes':
        return ['administrador', 'director', 'auditor'].includes(profile.rol) ? <IncomesManager /> : <AccessDenied />;
      case 'tasas':
        return ['administrador', 'director'].includes(profile.rol) ? <TasasManager /> : <AccessDenied />;
      default:
        return <div>Página no encontrada</div>;
    }
  };

  if (activeTab === 'nuevo-ingreso') {
    return <IncomeRegistrationForm />;
  }

  if (activeTab === 'importar-extracto') {
    return <ImportBankStatement />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f4f5f7 0%, #e2e8f0 100%)',
      padding: '1rem'
    }}>
      <div className="card animate-fade-in-up" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '3rem',
        textAlign: 'center',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
      }}>
        <div style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}>
          <Hourglass size={72} strokeWidth={1.2} />
        </div>
        <h2 style={{ color: 'var(--primary)', fontFamily: 'var(--font-headings)', fontSize: '1.6rem', fontWeight: 700 }}>
          Registro Pendiente
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--neutral-dark)', opacity: 0.9, marginTop: '1rem', lineHeight: '1.6' }}>
          Tu cuenta ha sido creada exitosamente. Para poder ingresar, un **Administrador** de la CNBV debe validar tu identidad, aprobar tu registro y asignarte un rol dentro de la plataforma.
        </p>
        
        <div style={{ 
          marginTop: '2rem',
          backgroundColor: 'rgba(0, 143, 166, 0.06)',
          border: '1px solid rgba(0, 143, 166, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.2rem',
          fontSize: '0.82rem',
          textAlign: 'left',
          color: 'var(--neutral-dark)'
        }}>
          <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '0.4rem' }}>
            ¿Qué debes hacer ahora?
          </strong>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, opacity: 0.9, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Contacta al Administrador de Finanzas o Director Nacional de la CNBV.</li>
            <li>Solicita la aprobación de tu correo institucional.</li>
            <li>Una vez aprobado, pulsa el botón **Verificar Estado de Acceso** o recarga esta página.</li>
          </ul>
        </div>

        {feedback && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 204, 0, 0.2)', borderRadius: 'var(--radius-md)', color: '#b47b00', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
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
            gap: '0.5rem'
          }}
        >
          {checking ? (
            <>
              <span style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite'
              }}></span>
              <span>Verificando...</span>
            </>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><RefreshCw size={18} /> Verificar Estado de Acceso</span>
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
    <div className="card text-center" style={{ textAlign: 'center', padding: '3rem', marginTop: '2rem' }}>
      <ShieldAlert size={48} color="var(--danger)" strokeWidth={1.5} />
      <h3 style={{ color: 'var(--danger)', marginTop: '1rem', fontWeight: 700 }}>Acceso Denegado</h3>
      <p style={{ opacity: 0.8, fontSize: '0.9rem', marginTop: '0.5rem' }}>
        Su rol actual no cuenta con los permisos necesarios para visualizar esta sección.
      </p>
    </div>
  );
};

// Envolver la App en el AuthProvider
function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
