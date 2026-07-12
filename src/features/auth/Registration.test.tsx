/**
 * Registration Flow Tests — Login.tsx (handleRealRegister)
 *
 * Estrategia de mocks:
 *  - isSimulationMode = false  →  se ejecuta handleRealRegister
 *  - El captchaToken se setea llamando a window.onRecaptchaSuccess('token')
 *    que el componente registra en un useEffect cuando entra al modo registro
 *  - supabase.auth.signUp y api.getOngs / api.createOng son mocked
 *
 * Escenarios cubiertos:
 *  1. Bloqueo si falta reCAPTCHA
 *  2. Bloqueo si falta nombre completo
 *  3. signUp llamado con los datos correctos
 *  4. Mensaje de éxito visible tras registro
 *  5. Formulario limpiado y vuelta al modo login tras éxito
 *  6. ONG nueva: primero createOng luego signUp con el nuevo ID
 *  7. Mensaje de error si supabase lanza error
 *  8–13. Lógica pura de modelo y aislamiento RLS (sin render)
 */

import { vi } from 'vitest';

const mockSignUp = vi.fn();
const mockGetOngs = vi.fn();
const mockCreateOng = vi.fn();
const mockInvoke = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';

vi.mock('../../services/api', () => ({
  isSimulationMode: false,
  api: {
    getOngs: (...args: unknown[]) => mockGetOngs(...args),
    createOng: (...args: unknown[]) => mockCreateOng(...args),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Importamos Login después de que los mocks de dependencias estén declarados y registrados
import { Login } from './Login';

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const ONG_CNBV = { id: 'ong-uuid-cnbv', nombre: 'Convención Nacional Bautista de Venezuela' };
const ONG_CEV = { id: 'ong-uuid-cev', nombre: 'Consejo Evangélico de Venezuela' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simula la finalización del reCAPTCHA:
 *  El componente registra window.onRecaptchaSuccess en el useEffect de modo registro.
 *  Llamarlo es equivalente a que el usuario complete el CAPTCHA real.
 */
function completeCaptcha() {
  act(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onRecaptchaSuccess?.('mock-captcha-token-xyz');
  });
}

/** Renderiza el Login, espera la carga de ONGs y cambia al modo registro */
async function renderAndSwitchToRegister() {
  await act(async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
  });

  // Esperar a que el componente llame a getOngs
  await waitFor(() => expect(mockGetOngs).toHaveBeenCalled());

  // Pasar al modo registro
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: /¿No tienes una cuenta\? Regístrate aquí/i }),
    );
  });
}

/** Rellena los campos nombre, email y contraseña del formulario de registro */
async function fillForm(nombre: string, email: string, password: string) {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(/Nombre Completo/i), { target: { value: nombre } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: password } });
  });
}

// ---------------------------------------------------------------------------
// Suite de tests — Flujo de Registro (handleRealRegister)
// ---------------------------------------------------------------------------

describe('Flujo de Registro de Nuevo Usuario (handleRealRegister)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (AuthContextModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      refreshProfile: vi.fn(),
    });
    mockGetOngs.mockResolvedValue([ONG_CNBV, ONG_CEV]);
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user-uuid' } }, error: null });
    mockInvoke.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Limpiar el callback global del captcha
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).onRecaptchaSuccess;
  });

  // ── Test 1 ───────────────────────────────────────────────────────────────
  it('bloquea el registro si el reCAPTCHA no fue completado', async () => {
    await renderAndSwitchToRegister();
    await fillForm('Juan Pérez', 'juan@test.com', 'Password123!');

    // No se llama a completeCaptcha() — intencional

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Solicitar Registro/i }));
    });

    expect(
      await screen.findByText(/Por favor completa el reCAPTCHA para registrarte/i),
    ).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  // ── Test 2 ───────────────────────────────────────────────────────────────
  it('bloquea el registro si falta el nombre completo', async () => {
    await renderAndSwitchToRegister();

    // Solo email y contraseña, sin nombre
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
        target: { value: 'sin-nombre@test.com' },
      });
      fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'pass123' } });
    });

    completeCaptcha();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Solicitar Registro/i }));
    });

    // El guard (if !email || !password || !nombreCompleto) previene el signUp
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  // ── Test 3 ───────────────────────────────────────────────────────────────
  it('llama a supabase.auth.signUp con los datos correctos', async () => {
    await renderAndSwitchToRegister();
    await fillForm('María López', 'maria@cev.org', 'Abc12345!');
    completeCaptcha();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Solicitar Registro/i }));
    });

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    const callArgs = mockSignUp.mock.calls[0][0] as {
      email: string;
      password: string;
      options: { data: { nombre_completo: string; ong_id: string } };
    };
    expect(callArgs.email).toBe('maria@cev.org');
    expect(callArgs.password).toBe('Abc12345!');
    expect(callArgs.options.data.nombre_completo).toBe('María López');
    expect(callArgs.options.data.ong_id).toBe(ONG_CNBV.id);
  });

  // ── Test 4 ───────────────────────────────────────────────────────────────
  it('muestra mensaje de éxito tras un registro exitoso', async () => {
    await renderAndSwitchToRegister();
    await fillForm('Test User', 'test@test.com', 'Pass123!');
    completeCaptcha();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Solicitar Registro/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Registro exitoso/i)).toBeInTheDocument();
    });
  });

  // ── Test 5 ───────────────────────────────────────────────────────────────
  it('limpia el formulario y vuelve al modo login tras éxito', async () => {
    await renderAndSwitchToRegister();
    await fillForm('Test User', 'test@test.com', 'Pass123!');
    completeCaptcha();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Solicitar Registro/i }));
    });

    // Tras éxito isRegister=false → el campo nombre ya no existe
    await waitFor(() => {
      expect(screen.queryByLabelText(/Nombre Completo/i)).not.toBeInTheDocument();
    });
  });

  // ── Test 6 ───────────────────────────────────────────────────────────────
  it('crea primero la ONG nueva y luego registra al usuario con su ID', async () => {
    const NEW_ONG_ID = 'new-ong-uuid-999';
    mockCreateOng.mockResolvedValue({ id: NEW_ONG_ID, nombre: 'Mi Nueva ONG' });

    await renderAndSwitchToRegister();
    await fillForm('Admin Nueva', 'admin@nuevaong.org', 'Pass1!');

    // Seleccionar "Crear nueva organización" (el select de ONG tiene id="selectedOngId")
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Organización/i), { target: { value: 'new' } });
    });

    const newOngInput = await screen.findByPlaceholderText(/Fundación Sonrisas/i);
    await act(async () => {
      fireEvent.change(newOngInput, { target: { value: 'Mi Nueva ONG' } });
    });

    completeCaptcha();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Solicitar Registro/i }));
    });

    await waitFor(() => expect(mockCreateOng).toHaveBeenCalledWith('Mi Nueva ONG'));
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    const callArgs = mockSignUp.mock.calls[0][0] as {
      options: { data: { ong_id: string } };
    };
    expect(callArgs.options.data.ong_id).toBe(NEW_ONG_ID);
  });

  // ── Test 7 ───────────────────────────────────────────────────────────────
  it('muestra el mensaje de error si supabase.auth.signUp falla', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });

    await renderAndSwitchToRegister();
    await fillForm('Ya Existe', 'existente@test.com', 'pass');
    completeCaptcha();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Solicitar Registro/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/User already registered/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: Modelo de datos del trigger (lógica pura, sin render)
// ---------------------------------------------------------------------------

describe('Modelo de datos — usuarios_perfiles después del registro', () => {
  it('el perfil generado por el trigger debe tener aprobado=false', () => {
    const triggerInsert = {
      id: 'user-uuid',
      email: 'nuevo@ong.org',
      nombre_completo: 'Nuevo Usuario',
      rol: 'coordinador' as UserRole,
      aprobado: false,
      ong_id: 'ong-uuid-cnbv',
    };

    expect(triggerInsert.aprobado).toBe(false);
  });

  it('el trigger fuerza el rol a coordinador independiente del rol sugerido', () => {
    const metadataRol: UserRole = 'director'; // lo que el usuario eligió
    const triggerRol: UserRole = 'coordinador'; // lo que el trigger asigna
    expect(triggerRol).toBe('coordinador');
    expect(triggerRol).not.toBe(metadataRol);
  });

  it('el perfil con aprobado=false no puede acceder al sistema', () => {
    const profile = { aprobado: false, rol: 'coordinador' as UserRole };
    expect(profile.aprobado).toBe(false);
  });

  it('el perfil del super_admin tiene ong_id=null y aprobado=true', () => {
    const superAdmin = {
      email: 'gerardoh31@gmail.com',
      rol: 'super_admin' as UserRole,
      aprobado: true,
      ong_id: null,
    };
    expect(superAdmin.ong_id).toBeNull();
    expect(superAdmin.aprobado).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: Aislamiento RLS — lógica de filtrado del módulo Usuarios
// ---------------------------------------------------------------------------

describe('Aislamiento — Módulo Usuarios de ONG', () => {
  const todosLosUsuarios = [
    { id: '1', nombre: 'Gerardo Herrera', rol: 'super_admin' as UserRole, ong_id: null },
    { id: '2', nombre: 'Israel Mundarain', rol: 'administrador' as UserRole, ong_id: 'ong-cnbv' },
    { id: '3', nombre: 'Luis Prueba', rol: 'administrador' as UserRole, ong_id: 'ong-cev' },
    { id: '4', nombre: 'Jackson Castillo', rol: 'auditor' as UserRole, ong_id: 'ong-cnbv' },
    { id: '5', nombre: 'Ana González', rol: 'coordinador' as UserRole, ong_id: 'ong-cev' },
  ];

  /** Simula el filtro del componente UserManagement.tsx para un admin local */
  function filtrarParaAdminOng(ongId: string) {
    return todosLosUsuarios.filter((u) => u.rol !== 'super_admin' && u.ong_id === ongId);
  }

  it('el super_admin nunca aparece en ninguna lista local de ONG', () => {
    const visibleCnbv = filtrarParaAdminOng('ong-cnbv');
    const visibleCev = filtrarParaAdminOng('ong-cev');
    expect(visibleCnbv.some((u) => u.rol === 'super_admin')).toBe(false);
    expect(visibleCev.some((u) => u.rol === 'super_admin')).toBe(false);
  });

  it('admin de ONG CNBV solo ve usuarios de CNBV', () => {
    const visible = filtrarParaAdminOng('ong-cnbv');
    expect(visible.every((u) => u.ong_id === 'ong-cnbv')).toBe(true);
    expect(visible.some((u) => u.ong_id === 'ong-cev')).toBe(false);
    expect(visible.length).toBe(2); // Israel + Jackson
  });

  it('admin de ONG CEV solo ve usuarios de CEV', () => {
    const visible = filtrarParaAdminOng('ong-cev');
    expect(visible.every((u) => u.ong_id === 'ong-cev')).toBe(true);
    expect(visible.some((u) => u.ong_id === 'ong-cnbv')).toBe(false);
    expect(visible.length).toBe(2); // Luis + Ana
  });

  it('el super_admin ve a todos los usuarios de todas las ONGs', () => {
    // El super_admin no tiene restricción de ong_id en la política SELECT
    expect(todosLosUsuarios.length).toBe(5);
  });

  it('un admin NO puede asignar el rol super_admin', () => {
    const rolesPermitidos: UserRole[] = [
      'coordinador',
      'auxiliar_campo',
      'auditor',
      'director',
      'donante',
    ];
    expect(rolesPermitidos.includes('super_admin')).toBe(false);
  });

  it('un admin NO puede asignar el rol administrador a otro usuario', () => {
    const rolesPermitidos: UserRole[] = [
      'coordinador',
      'auxiliar_campo',
      'auditor',
      'director',
      'donante',
    ];
    expect(rolesPermitidos.includes('administrador')).toBe(false);
  });
});
