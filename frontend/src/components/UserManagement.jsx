// UserManagement.jsx
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ 
    username: '', 
    first_name: '', 
    last_name: '', 
    email: '', 
    phone_number: '', 
    dni: '', 
    status: 'active', 
    role: 'driver', 
    password: ''
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response);
      setFilteredUsers(response);
    } catch (error) {
      let errorMessage = 'No se pudieron obtener los usuarios';
      if (error.response) {
        if (error.response.status === 403) {
          errorMessage = 'No tienes permisos para ver los usuarios. Inicia sesión como administrador.';
        } else if (error.response.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        }
      }
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.first_name || !form.last_name || !form.email || !form.phone_number || !form.dni || !form.status || !form.role || (!editingUserId && !form.password)) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Todos los campos obligatorios deben estar completos.',
      });
      return;
    }

    try {
      if (editingUserId) {
        await updateUser(editingUserId, form);
        Swal.fire({
          icon: 'success',
          title: 'Usuario Actualizado',
          text: '¡El usuario ha sido actualizado exitosamente!',
        });
      } else {
        await createUser(form);
        Swal.fire({
          icon: 'success',
          title: 'Usuario Creado',
          text: '¡El usuario ha sido creado exitosamente!',
        });
      }
      fetchUsers();
      setForm({ username: '', first_name: '', last_name: '', email: '', phone_number: '', dni: '', status: 'active', role: 'driver', password: '' });
      setEditingUserId(null);
      setShowModal(false);
    } catch (error) {
      let errorMessage = 'No se pudo guardar el usuario';
      if (error.response) {
        if (error.response.status === 403) {
          errorMessage = 'No tienes permisos para realizar esta acción.';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.detail || 'Error en los datos proporcionados.';
        }
      }
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
      });
    }
  };

  const handleEdit = (user) => {
    setForm({ 
      username: user.username, 
      first_name: user.first_name, 
      last_name: user.last_name, 
      email: user.email, 
      phone_number: user.phone_number, 
      dni: user.dni, 
      status: user.status, 
      role: user.role, 
      password: ''
    });
    setEditingUserId(user.id);
    setShowModal(true);
  };

  const handleAddUser = () => {
    setForm({ username: '', first_name: '', last_name: '', email: '', phone_number: '', dni: '', status: 'active', role: 'driver', password: '' });
    setEditingUserId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ username: '', first_name: '', last_name: '', email: '', phone_number: '', dni: '', status: 'active', role: 'driver', password: '' });
    setEditingUserId(null);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Estás seguro?',
      text: '¡Esta acción no se puede deshacer!',
      showCancelButton: true,
      confirmButtonText: '¡Sí, eliminar!',
      cancelButtonText: 'Cancelar',
    });
    if (result.isConfirmed) {
      try {
        await deleteUser(id);
        Swal.fire({
          icon: 'success',
          title: 'Usuario Eliminado',
          text: '¡El usuario ha sido eliminado exitosamente!',
        });
        fetchUsers();
      } catch (error) {
        let errorMessage = 'No se pudo eliminar el usuario';
        if (error.response) {
          if (error.response.status === 403) {
            errorMessage = 'No tienes permisos para eliminar usuarios.';
          }
        }
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
        });
      }
    }
  };

  return (
    <div className="card p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Gestión de Usuarios</h3>
        <div className="d-flex align-items-center">
          <div className="input-group me-3" style={{ maxWidth: '300px' }}>
            <span className="input-group-text">
              <i className="fa fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary text-nowrap" onClick={handleAddUser}>
            <i className="fa fa-user-plus me-2 "></i>Agregar Usuario
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal fade show"
          style={{
            display: 'block',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1050,
          }}
          tabIndex="-1"
          role="dialog"
          aria-labelledby="userModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="userModalLabel">
                  {editingUserId ? 'Editar Usuario' : 'Agregar Usuario'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body d-flex flex-column">
                <form onSubmit={handleSubmit} className="flex-grow-1">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Usuario"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nombre"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Apellido"
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Correo Electrónico"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Número de Teléfono"
                        value={form.phone_number}
                        onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="DNI"
                        value={form.dni}
                        onChange={(e) => setForm({ ...form, dni: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <select
                        className="form-control"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        required
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <select
                        className="form-control"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        required
                      >
                        <option value="driver">Conductor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Contraseña"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required={!editingUserId}
                      />
                    </div>
                  </div>
                </form>
                <div className="mt-3 d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-secondary me-2"
                    onClick={handleCloseModal}
                  >
                    <i className="fa fa-times me-2"></i>Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                  >
                    <i className="fa fa-save me-2"></i>
                    {editingUserId ? 'Actualizar' : 'Agregar'} Usuario
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="table-responsive text-nowrap">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>DNI</th>
              <th>Estado</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.first_name}</td>
                <td>{user.last_name}</td>
                <td>{user.email}</td>
                <td>{user.phone_number}</td>
                <td>{user.dni}</td>
                <td className={user.status === 'active' ? 'bg-success bg-opacity-25' : 'bg-danger bg-opacity-25'}>
                  {user.status === 'active' ? 'Activo' : 'Inactivo'}
                </td>
                <td>{user.role === 'driver' ? 'Conductor' : 'Administrador'}</td>
                <td>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => handleEdit(user)}
                  >
                    <i className="fa fa-edit me-2"></i>Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(user.id)}
                  >
                    <i className="fa fa-trash-alt me-2"></i>Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserManagement;