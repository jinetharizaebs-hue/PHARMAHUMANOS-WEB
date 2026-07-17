// components/Login.js
import React, { useState } from 'react';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import './Login.css'; // Asegúrate de importar el CSS

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  // Datos de usuarios con roles y permisos específicos
  const users = [
    {
      id: 101,
      username: 'e11',
      password: 'emc',
      role: 'admin',
      descripcion: 'Admin - Acceso total, creacion y gestion completa del sistema.'
    },
    {
      id: 102,
      username: 'inv',
      password: '1v3n',
      role: 'inventario',
      descripcion: 'Inventario - Gestion de catalogo, control de stock y pedidos.'
    },
    {
      id: 103,
      username: 'jineth',
      password: 'hteij123',
      role: 'admin',
      descripcion: 'Admin - Acceso total para supervision y gestion.'
    },
    {
      id: 104,
      username: 'contabi',
      password: 'contabi123',
      role: 'contabilidad',
      descripcion: 'Contabilidad - Reportes, control financiero y cuentas por pagar.'
    },
    {
      id: 1,
      username: 'vendedort1',
      password: 'ven123',
      role: 'vendedor',
      descripcion: 'Vendedor - Gestion comercial y seguimiento de pedidos.'
    },
    {
      id: 2,
      username: 'vendedor2',
      password: 'ven1234',
      role: 'vendedor',
      descripcion: 'Vendedor - Gestion comercial y seguimiento de pedidos.'
    },
    {
      id: 3,
      username: 'vendedor 3',
      password: 'vendedor123',
      role: 'vendedor',
      descripcion: 'Vendedor - Gestion comercial y seguimiento de pedidos.'
    },
    {
      id: 4,
      username: 'Administrador',
      password: 'admin123',
      role: 'admin',
      descripcion: 'Admin - Acceso total al sistema.'
    },
    {
      id: 5,
      username: 'contabilidad',
      password: 'contabilidad123',
      role: 'contabilidad',
      descripcion: 'Contabilidad - Reportes y control financiero.'
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const normalizedInputUser = username.trim().replace(/\s+/g, ' ').toLowerCase();
    const user = users.find((u) => {
      const normalizedUser = u.username.trim().replace(/\s+/g, ' ').toLowerCase();
      return normalizedUser === normalizedInputUser && u.password === password;
    });
    
    if (user) {
      login(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img
            src="/logo-maranatha.png"
            alt="Logo Maranatha"
            className="login-header-logo"
          />
          <p>Sistema de pedidos y catálogo digital</p>
        </div>
        
        <div className="login-content">
          <div className="login-form-section">
            <h3>Acceso para el equipo</h3>
            <p>Ingresa tus credenciales para acceder al sistema</p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Usuario:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Ingresa tu usuario"
                />
              </div>
              <div className="form-group">
                <label>Contraseña:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Ingresa tu contraseña"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="login-btn">
                Ingresar al sistema
              </button>
            </form>

            {/* Se oculta el bloque de roles para no exponer usuarios ni permisos en la vista publica */}
          </div>
          
          <div className="catalog-section">
            <div className="catalog-icon">
              <i className="fas fa-store">📦</i>
            </div>
            <h2>Explora nuestro catálogo</h2>
            <p>Descubre todos nuestros productos disponibles y realiza tus pedidos directamente por WhatsApp sin necesidad de crear una cuenta.</p>
            <Link to="/catalogo-clientes" className="catalog-btn">
              Ver Catálogo Completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;