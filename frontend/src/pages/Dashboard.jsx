import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import UserManagement from '../components/UserManagement';
import MonitoringDrivers from '../components/MonitoringDrivers';
import Reports from '../components/Reports';
import Footer from '../components/Footer';
import { getCurrentUser } from '../services/api';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setUsername(user.username);
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/login');
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
      <Navbar handleLogout={handleLogout} username={username} />
      <div className="container mt-4" style={{
        flex: '1'
      }}>
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Gestión de Usuarios
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'monitoring' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitoring')}
            >
              Monitoreo de Conductores
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Reportes
            </button>
          </li>
        </ul>
        <div className="tab-content mt-3">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'monitoring' && <MonitoringDrivers />}
          {activeTab === 'reports' && <Reports />}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Dashboard;