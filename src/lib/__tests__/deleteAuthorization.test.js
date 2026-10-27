// src/lib/__tests__/deleteAuthorization.test.js
// jest.config mapea './supabase' a este mock, así que es la misma instancia que usa el módulo
import { supabase } from '../../../__mocks__/lib/supabase'
import { reauthenticatePrivilegedUser } from '../deleteAuthorization'

supabase.auth.getUser = jest.fn()
supabase.auth.signInWithPassword = jest.fn()

// Sesión iniciada con el rol indicado; la contraseña correcta es "clave-buena"
const sesionCon = (role, email = 'admin@ejemplo.com') => {
  const usuario = { email, app_metadata: { role } }
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: usuario } }, error: null })
  supabase.auth.getUser.mockResolvedValue({ data: { user: usuario }, error: null })
  supabase.auth.signInWithPassword.mockImplementation(async ({ password }) => (
    password === 'clave-buena'
      ? { data: { user: usuario }, error: null }
      : { data: { user: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } }
  ))
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('reauthenticatePrivilegedUser', () => {
  test.each(['admin', 'superadmin'])('%s con su contraseña correcta queda autorizado', async (role) => {
    sesionCon(role)
    await expect(reauthenticatePrivilegedUser('clave-buena')).resolves.toBe(true)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@ejemplo.com',
      password: 'clave-buena'
    })
  })

  test('contraseña incorrecta no autoriza', async () => {
    sesionCon('admin')
    await expect(reauthenticatePrivilegedUser('otra')).resolves.toBe(false)
  })

  test.each(['vendedor', 'contabilidad', 'inventario', undefined])(
    'rol %s no puede eliminar aunque escriba su contraseña correcta',
    async (role) => {
      sesionCon(role)
      await expect(reauthenticatePrivilegedUser('clave-buena')).resolves.toBe(false)
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    }
  )

  test.each(['', '   ', null, undefined])('contraseña vacía (%p) no consulta a Supabase', async (password) => {
    sesionCon('admin')
    await expect(reauthenticatePrivilegedUser(password)).resolves.toBe(false)
    expect(supabase.auth.getSession).not.toHaveBeenCalled()
  })

  test('sin sesión iniciada no autoriza', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    await expect(reauthenticatePrivilegedUser('clave-buena')).resolves.toBe(false)
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  test('un fallo de red se informa como error, no como contraseña incorrecta', async () => {
    sesionCon('admin')
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: 'unexpected_failure', message: 'Failed to fetch' }
    })
    await expect(reauthenticatePrivilegedUser('clave-buena')).rejects.toMatchObject({ message: 'Failed to fetch' })
  })
})
