import { useState } from 'react';

function Navbar({ handleLogout, username }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const displayName = username || 'Usuario';

  return (
    <nav className="navbar navbar-expand-lg" style={{ backgroundColor: '#851eac' }}>
      <div className="container">
        <a className="navbar-brand text-white" href="/dashboard">
          Sistema de Somnolencia
        </a>
        <div className="ms-auto">
          <div className="dropdown">
            <button
              className="btn btn-outline-light d-flex align-items-center"
              type="button"
              onClick={toggleDropdown}
              aria-expanded={isDropdownOpen}
            >
              <i className="fas fa-user me-2"></i>
              <span>{displayName}</span>
              <i className="fas fa-chevron-down ms-2"></i>
            </button>
            <ul
              className={`dropdown-menu dropdown-menu-end ${isDropdownOpen ? 'show' : ''}`}
            >
              <li>
                <button
                  className="dropdown-item btn btn-outline-light w-100 text-start"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;