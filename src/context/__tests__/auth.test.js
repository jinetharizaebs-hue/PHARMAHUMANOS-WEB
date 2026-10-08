import { describe, expect, test } from '@jest/globals';
import { mapAuthUser } from '../auth';

describe('mapAuthUser', () => {
  test('obtiene el rol desde app_metadata, no desde los metadatos editables', () => {
    const user = mapAuthUser({
      id: 'auth-user-id',
      email: 'admin@example.com',
      app_metadata: { role: 'admin' },
      user_metadata: { role: 'superadmin', username: 'Administradora' }
    });

    expect(user).toEqual({
      id: 'auth-user-id',
      username: 'Administradora',
      email: 'admin@example.com',
      role: 'admin'
    });
  });

  test('no asigna rol si Supabase no informa app_metadata.role', () => {
    expect(mapAuthUser({
      id: 'auth-user-id',
      email: 'user@example.com',
      user_metadata: { role: 'admin' }
    }).role).toBeUndefined();
  });
});
