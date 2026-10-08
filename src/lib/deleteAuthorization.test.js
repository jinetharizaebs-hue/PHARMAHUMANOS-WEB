import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signInWithPassword: jest.fn()
    }
  }
}));

import { supabase } from './supabase';
import { reauthenticatePrivilegedUser } from './deleteAuthorization';

describe('deleteAuthorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requiere una sesión Supabase', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    await expect(reauthenticatePrivilegedUser('secret')).resolves.toBe(false);
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  test('solo permite reautenticación de admin o superadmin', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null
    });
    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          email: 'staff@example.com',
          app_metadata: { role: 'vendedor' }
        }
      },
      error: null
    });

    await expect(reauthenticatePrivilegedUser('secret')).resolves.toBe(false);
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test('valida la contraseña actual mediante Supabase Auth', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null
    });
    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          email: 'staff@example.com',
          app_metadata: { role: 'admin' }
        }
      },
      error: null
    });
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: 'admin' } } },
      error: null
    });

    await expect(reauthenticatePrivilegedUser(' secret ')).resolves.toBe(true);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'staff@example.com',
      password: 'secret'
    });
  });

  test('rechaza una contraseña incorrecta', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null
    });
    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          email: 'staff@example.com',
          app_metadata: { role: 'admin' }
        }
      },
      error: null
    });
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' }
    });

    await expect(reauthenticatePrivilegedUser('wrong')).resolves.toBe(false);
  });
});
