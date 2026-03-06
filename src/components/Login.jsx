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
      id: 1,
      username: 'John Diaz',
      password: 'john123',
      role: 'vendedor',
      descripcion: 'Vendedor - Gestion comercial y seguimiento de pedidos.'
    },
    {
      id: 2,
      username: 'Alan Diaz',
      password: 'alan123',
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
      username: 'Andrea Gutierrez',
      password: 'andrea123',
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
          <h1>DISTRIBUIDORA FARMACEUTICA MARANATHA J.A.</h1>
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

            {/* Información de Roles - OCULTA */}
            {/* <div className="roles-info">
              <h4>Roles y Accesos:</h4>
              <div className="roles-list">
                {users.map((user) => (
                  <div key={user.id} className={`role-item role-${user.role}`}>
                    <div className="role-header">
                      <strong>{user.username}</strong>
                      <span className="role-badge">{user.role}</span>
                    </div>
                    <p>{user.descripcion}</p>
                  </div>
                ))}
              </div>
            </div> */}
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