import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Bell, X } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface NotificationContextType {
  addNotification: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

const NotificationContext = createContext<NotificationContextType>({
  addNotification: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    if (!profile) return;

    // Supabase Realtime Subscription for Requisitions
    const reqChannel = supabase
      .channel('requisitions-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'solicitudes_gasto',
          filter: `solicitante_id=eq.${profile.id}`,
        },
        (payload: any) => {
          const newData = payload.new;
          const oldData = payload.old;

          // Check if it got fully approved
          if (newData.estado === 'aprobada_ejecucion' && oldData.estado !== 'aprobada_ejecucion') {
            addNotification(
              `¡Tu requisición ${newData.codigo || ''} ha sido aprobada por los Directores!`,
              'success',
            );
          }
          // Check if it got rejected
          else if (newData.estado === 'rechazada' && oldData.estado !== 'rechazada') {
            addNotification(`Tu requisición ${newData.codigo || ''} ha sido rechazada.`, 'warning');
          }
          // Check first approval
          else if (
            newData.estado === 'pendiente_aprobacion_2' &&
            oldData.estado === 'pendiente_aprobacion_1'
          ) {
            addNotification(
              `Tu requisición ${newData.codigo || ''} ha recibido su primera firma.`,
              'info',
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reqChannel);
    };
  }, [profile]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="animate-fade-in"
            style={{
              background: 'white',
              borderLeft: `4px solid ${notif.type === 'success' ? '#10b981' : notif.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
              borderRadius: '4px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: '300px',
              maxWidth: '400px',
            }}
          >
            <Bell
              size={18}
              color={
                notif.type === 'success'
                  ? '#10b981'
                  : notif.type === 'warning'
                    ? '#f59e0b'
                    : '#3b82f6'
              }
            />
            <div style={{ flex: 1, fontSize: '0.9rem', color: '#374151', fontWeight: 500 }}>
              {notif.message}
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: '#9ca3af',
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
