import { describe, it, expect } from 'vitest';
import { getMenuItems } from './menuConfig';

const labels = (tipo?: 'ong' | 'ekklesia') => getMenuItems(tipo).map((item) => item.label);
const ids = (tipo?: 'ong' | 'ekklesia') => getMenuItems(tipo).map((item) => item.id);

describe('menuConfig — menú de Mateo Ekklesia', () => {
  it('incluye los 6 módulos del MVP definidos por Maurice', () => {
    const menu = labels('ekklesia');
    expect(menu).toContain('Perfil de la Iglesia'); // Registro de la iglesia
    expect(menu).toContain('Miembros y Comunidad');
    expect(menu).toContain('Estructura y Ministerios');
    expect(menu).toContain('Inventario');
    expect(menu).toContain('Presupuesto');
    expect(menu).toContain('Calendario');
  });

  it('incluye los módulos agrupadores Ingresos y Gastos y Contabilidad', () => {
    const menu = labels('ekklesia');
    expect(menu).toContain('Ingresos y Gastos');
    expect(menu).toContain('Contabilidad');
  });

  it('no muestra como módulos sueltos los que se integraron en otros', () => {
    const menu = ids('ekklesia');
    for (const merged of [
      'incomes',
      'requisitions',
      'field-entry',
      'reconciliation',
      'audit',
      'catalog',
    ]) {
      expect(menu).not.toContain(merged);
    }
  });

  it('marca como deshabilitados los módulos planteados pero incompletos', () => {
    const items = getMenuItems('ekklesia');
    for (const id of ['inventory', 'calendar', 'jornadas', 'budgets']) {
      expect(items.find((item) => item.id === id)?.disabled).toBe(true);
    }
  });

  it('deja habilitados los módulos que ya funcionan', () => {
    const items = getMenuItems('ekklesia');
    for (const id of ['dashboard', 'organization', 'miembros', 'finance', 'accounting']) {
      expect(items.find((item) => item.id === id)?.disabled).toBeFalsy();
    }
  });

  it('no repite ids de módulos', () => {
    const menu = ids('ekklesia');
    expect(new Set(menu).size).toBe(menu.length);
  });

  it('todos los módulos tienen al menos un rol con acceso', () => {
    for (const item of getMenuItems('ekklesia')) {
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });
});

describe('menuConfig — el menú de la ONG no cambia', () => {
  it('mantiene los módulos heredados para organizaciones tipo ong', () => {
    const menu = ids('ong');
    for (const id of [
      'incomes',
      'requisitions',
      'field-entry',
      'reconciliation',
      'audit',
      'catalog',
    ]) {
      expect(menu).toContain(id);
    }
    expect(menu).not.toContain('inventory');
    expect(menu).not.toContain('calendar');
  });

  it('usa el menú de la ONG cuando no se indica el tipo de organización', () => {
    expect(ids(undefined)).toEqual(ids('ong'));
  });
});
