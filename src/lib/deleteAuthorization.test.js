import { getConfiguredPasswords, isAuthorizedDeletePassword } from './deleteAuthorization';

describe('deleteAuthorization', () => {
  test('normaliza varias contraseñas separadas por comas o saltos de línea', () => {
    expect(getConfiguredPasswords('prod1, prod2 ,\nprod3')).toEqual(['prod1', 'prod2', 'prod3']);
  });

  test('acepta una contraseña autorizada y rechaza la incorrecta', () => {
    expect(isAuthorizedDeletePassword('prod2', 'prod1, prod2 ,\nprod3')).toBe(true);
    expect(isAuthorizedDeletePassword('wrong', 'prod1, prod2 ,\nprod3')).toBe(false);
  });
});
