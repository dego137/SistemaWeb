import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { register } from '../services/api';

function Register() {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dni, setDni] = useState('');
  const [status, setStatus] = useState('active');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('driver');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await register({ 
        username, 
        first_name: firstName, 
        last_name: lastName, 
        email, 
        phone_number: phoneNumber, 
        dni, 
        status, 
        password, 
        role 
      });
      localStorage.setItem('token', response.access_token);
      Swal.fire({
        icon: 'success',
        title: 'Registro Exitoso',
        text: '¡Te has registrado correctamente!',
      }).then(() => navigate('/dashboard'));
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Registro Fallido',
        text: 'Correo, usuario o DNI ya registrado, o datos inválidos',
      });
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 shadow" style={{ maxWidth: '800px', width: '100%' }}>
        <h2 className="text-center mb-4">Registrarse</h2>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
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
                <label htmlFor="firstName" className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ingresa tu nombre"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="lastName" className="form-label">Apellido</label>
                <input
                  type="text"
                  className="form-control"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ingresa tu apellido"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu correo"
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="phoneNumber" className="form-label">Número de Teléfono</label>
                <input
                  type="text"
                  className="form-control"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ingresa tu número de teléfono"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="dni" className="form-label">DNI</label>
                <input
                  type="text"
                  className="form-control"
                  id="dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ingresa tu DNI"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="status" className="form-label">Estado</label>
                <select
                  className="form-control"
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crea una contraseña"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="role" className="form-label">Rol</label>
                <select
                  className="form-control"
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="driver">Conductor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-100 mt-3">Registrarse</button>
        </form>
        <p className="text-center mt-3">
          ¿Ya tienes una cuenta? <a href="/">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}

export default Register;