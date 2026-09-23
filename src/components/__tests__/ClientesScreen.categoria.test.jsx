import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientesScreen from '../ClientesScreen';

jest.mock('../supabaseClient.js', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => Promise.resolve({ data: [] }))
    }))
  }));

  return {
    supabase: {
      from: mockFrom
    }
  };
});

describe('ClientesScreen - categoría del cliente', () => {
  test('permite definir y seleccionar una categoría para cada cliente', async () => {
    render(
      <ClientesScreen
        onSeleccionarCliente={jest.fn()}
        onVolver={jest.fn()}
        onHacerPedido={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/agregar nuevo cliente/i)).toBeInTheDocument();
    });

    const categoryField = screen.getByLabelText(/categoría del cliente/i);
    expect(categoryField).toBeInTheDocument();

    fireEvent.change(categoryField, { target: { value: 'Droguerías' } });
    expect(categoryField.value).toBe('Droguerías');
  });
});
