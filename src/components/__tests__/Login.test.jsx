import React from 'react';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';

jest.mock('../../context/auth', () => ({
  useAuth: jest.fn()
}));

import { useAuth } from '../../context/auth';

const renderWithRouter = (component) => render(
  <BrowserRouter>{component}</BrowserRouter>
);

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('muestra el formulario de correo y contraseña sin exponer credenciales', () => {
    useAuth.mockReturnValue({ login: jest.fn() });
    renderWithRouter(<Login />);

    expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /ingresar al sistema/i })).toBeInTheDocument();
    expect(screen.queryByText('e11')).not.toBeInTheDocument();
    expect(screen.queryByText('inv')).not.toBeInTheDocument();
  });

  test('autentica por Supabase mediante el contexto con correo y contraseña', async () => {
    const loginMock = jest.fn().mockResolvedValue({ role: 'admin' });
    useAuth.mockReturnValue({ login: loginMock });
    renderWithRouter(<Login />);

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: 'admin@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'NuevaClaveSegura123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /ingresar al sistema/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin@example.com', 'NuevaClaveSegura123!');
    });
  });

  test('muestra un error cuando Supabase rechaza las credenciales', async () => {
    const loginMock = jest.fn().mockRejectedValue(new Error('Invalid login credentials'));
    useAuth.mockReturnValue({ login: loginMock });
    renderWithRouter(<Login />);

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: 'admin@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'incorrecta' }
    });
    fireEvent.click(screen.getByRole('button', { name: /ingresar al sistema/i }));

    expect(await screen.findByText(/correo o contraseña incorrectos/i)).toBeInTheDocument();
  });

  test('conserva el acceso al catálogo público', () => {
    useAuth.mockReturnValue({ login: jest.fn() });
    renderWithRouter(<Login />);

    expect(screen.getByRole('link', { name: /ver catálogo completo/i }))
      .toHaveAttribute('href', '/catalogo-clientes');
  });
});
