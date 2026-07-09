import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import * as AuthContextModule from './context/AuthContext';

// Mockeamos react-router-dom para evitar errores de window.location en jsdom
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: any) => (
      <actual.MemoryRouter initialEntries={[window.location?.pathname || '/']}>
        {children}
      </actual.MemoryRouter>
    ),
  };
});

// Mockeamos el contexto de Auth
vi.mock('./context/AuthContext', () => {
  return {
    AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>,
    useAuth: vi.fn(),
  };
});

describe('Security & Access Control (App.tsx)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('debería bloquear el acceso al Dashboard a un auxiliar_campo', async () => {
    // Simulamos un usuario logueado con rol auxiliar_campo
    (AuthContextModule.useAuth as any).mockReturnValue({
      user: { id: '123' },
      profile: { rol: 'auxiliar_campo', aprobado: true },
      loading: false,
    });

    // Simulamos que la URL intenta ir al dashboard inicializando MemoryRouter
    // Como mockeamos BrowserRouter con MemoryRouter, usará la ruta por defecto ('/')
    // pero `App` lee params. Para forzarlo en el test, podemos mockear `window.location`
    // solo con los props mínimos que `App` lee:
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        pathname: '/app/dashboard',
        href: 'http://localhost/app/dashboard',
        origin: 'http://localhost',
      },
      writable: true,
    });

    render(<App />);

    // El sistema debería haber evaluado el rol y renderizado AccessDenied
    const accessDeniedMsg = await screen.findByText(/Acceso Denegado/i);
    expect(accessDeniedMsg).toBeInTheDocument();
  });
});
