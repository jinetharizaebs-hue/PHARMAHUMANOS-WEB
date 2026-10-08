// components/Login.js
import React, { useState } from 'react';
import { useAuth } from '../context/auth';
import { Link } from 'react-router-dom';
import './Login.css'; // Asegúrate de importar el CSS

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (loginError) {
      console.error('Error iniciando sesión:', loginError);
      setError(loginError.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : loginError.message || 'No fue posible iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img
            src="/logo-maranatha.png"
            alt="Logo Distribuciones Pharmahumanos"
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
                <label htmlFor="login-email">Correo electrónico:</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Ingresa tu correo"
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Contraseña:</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="login-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Verificando...' : 'Ingresar al sistema'}
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