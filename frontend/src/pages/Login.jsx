import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { login } from '../services/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await login({ username, password });
      localStorage.setItem('token', response.access_token);
      
      Swal.fire({
        icon: 'success',
        title: 'Inicio de Sesión Exitoso',
        text: '¡Bienvenido de nuevo!',
      }).then(() => navigate('/dashboard'));
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Inicio de Sesión Fallido',
        text: 'Usuario o contraseña incorrectos',
      });
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 shadow" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4">Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label">Usuario</label>
            <input
              type="text"
              className="form-control"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">Iniciar Sesión</button>
        </form>
        <p className="text-center mt-3">
          ¿No tienes una cuenta? <a href="/register">Regístrate</a>
        </p>
        <p className="text-center mt-2">
          <a href="/forgot-password">Cambiar contraseña</a>
        </p>
      </div>
    </div>
  );
}

export default Login;