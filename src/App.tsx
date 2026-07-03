import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './features/auth/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { Reconciliation } from './features/reconciliation/Reconciliation';
import { Audit } from './features/audit/Audit';
import { BudgetsAndReports } from './features/budgets/BudgetsAndReports';
import { MobileEntry } from './features/mobile-entry/MobileEntry';

const MainAppContent: React.FC = () => {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('');

  // Configurar la pestaña por defecto basada en el rol del usuario
  useEffect(() => {
    if (profile) {
      if (profile.rol === 'coordinador') {
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
    return <Login />;
  }

  // Renderizar componentes según la pestaña activa y validación de roles
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return ['administrador', 'auditor'].includes(profile.rol) ? <Dashboard /> : <AccessDenied />;
      case 'reconciliation':
        return ['administrador', 'auditor'].includes(profile.rol) ? <Reconciliation /> : <AccessDenied />;
      case 'audit':
        return ['administrador', 'auditor'].includes(profile.rol) ? <Audit /> : <AccessDenied />;
      case 'budgets':
        return ['administrador', 'auditor'].includes(profile.rol) ? <BudgetsAndReports /> : <AccessDenied />;
      case 'field-entry':
        return ['administrador', 'coordinador'].includes(profile.rol) ? <MobileEntry /> : <AccessDenied />;
      default:
        return <div>Página no encontrada</div>;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

// Componente para Control de Acceso / Rutas Protegidas
const AccessDenied: React.FC = () => {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem', marginTop: '2rem' }}>
      <span style={{ fontSize: '3rem' }}>🚫</span>
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
