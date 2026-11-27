import { describe, it, expect } from 'vitest';
import {
  formatCategoriaAporte,
  generateConfirmationCode,
  getRoleLabel,
  maskPersonName,
  slugifyCategoriaAporte,
} from './rolePermissions';

describe('rolePermissions helpers', () => {
  it('masks member first and last name without exposing full directory', () => {
    expect(maskPersonName('María', 'González')).toBe('M**** G*****');
    expect(maskPersonName('Ana', 'Li')).toBe('A** L**');
  });

  it('generates confirmation code with APO- prefix', () => {
    const code = generateConfirmationCode();
    expect(code).toMatch(/^APO-[A-Z0-9]{6}$/);
  });

  it('returns dedicated Ekklesia labels when tipoOrganizacion is ekklesia', () => {
    expect(getRoleLabel('tesorero', 'ekklesia')).toBe('Tesorero');
    expect(getRoleLabel('admin_iglesia', 'ekklesia')).toBe('Administrador de Iglesia');
    expect(getRoleLabel('lider_ministerio', 'ekklesia')).toBe('Líder de Ministerio');
    expect(getRoleLabel('coordinador', 'ong')).toBe('Coordinador');
  });

  it('formats contribution categories cleanly including custom categories', () => {
    expect(formatCategoriaAporte('diezmo')).toBe('Diezmo');
    expect(formatCategoriaAporte('pro_templo')).toBe('Pro-Templo');
    expect(
      formatCategoriaAporte('fondo_juvenil', [{ value: 'fondo_juvenil', label: 'Fondo Juvenil' }]),
    ).toBe('Fondo Juvenil');
    expect(formatCategoriaAporte('retiro_anual')).toBe('Retiro Anual');
    expect(slugifyCategoriaAporte('Construcción Templo 2026')).toBe('construccion_templo_2026');
  });
});
