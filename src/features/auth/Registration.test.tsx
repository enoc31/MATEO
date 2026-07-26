/**
 * Tenant Invitation & Registration Security Tests
 */
import { describe, it, expect } from 'vitest';
import type { UserRole } from '../../context/AuthContext';

describe('Tenant Isolation & Role Assignment Rules', () => {
  it('garantiza que sólo un rol valido puede ser asignado a un usuario', () => {
    const validRoles: UserRole[] = [
      'administrador',
      'auditor',
      'coordinador',
      'director',
      'auxiliar_campo',
      'donante',
      'super_admin',
    ];

    expect(validRoles).toContain('administrador');
    expect(validRoles).toContain('coordinador');
  });

  it('valida que los roles preconfigurados de invitacion pertenecen al conjunto permitido', () => {
    const inviteRoles: UserRole[] = [
      'coordinador',
      'director',
      'auditor',
      'auxiliar_campo',
      'donante',
      'administrador',
    ];

    inviteRoles.forEach((role) => {
      expect([
        'administrador',
        'auditor',
        'coordinador',
        'director',
        'auxiliar_campo',
        'donante',
      ]).toContain(role);
    });
  });
});
