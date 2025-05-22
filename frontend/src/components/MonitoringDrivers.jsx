import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { getUsers, getCurrentUser, connectToAnalysis } from '../services/api';

function MonitoringDrivers() {
  // Global intervals for alerts (in seconds or counts)
  const MICROSLEEP_ALERT_INTERVAL = 1; // Trigger alert every 10 additional microsleeps after initial threshold
  const YAWN_ALERT_INTERVAL = 2; // Trigger alert every 10 additional yawns after initial threshold
  const PERIODIC_CHECK_INTERVAL = 2500; // Periodic check every 10 seconds (in milliseconds)

  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRealTimeModal, setShowRealTimeModal] = useState(false);
  const [indicators, setIndicators] = useState({
    blinks: 0,
    microsleeps: 0,
    yawns: 0,
    yawn_duration: 0,
  });
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const alarmRef = useRef(new Audio('/alarm.mp3')); // Reference to alarm audio
  const microsleepAlertCountRef = useRef(0); // Track microsleep alert triggers
  const yawnAlertCountRef = useRef(0); // Track yawn alert triggers
  const alertIntervalRef = useRef(null); // Reference for periodic alert check

  // Function to play alarm and handle errors
  const playAlarm = () => {
    alarmRef.current.play().catch((error) => {
      console.error('Error playing alarm:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo reproducir la alarma. Verifica que el archivo alarma.mp3 esté disponible.',
      });
    });
  };

  // Function to check and trigger alerts
  const checkAlerts = (newIndicators) => {
    const { microsleeps, yawns } = newIndicators;

    // Microsleeps alert: trigger at > 10 and every MICROSLEEP_ALERT_INTERVAL additional
    if (microsleeps > MICROSLEEP_ALERT_INTERVAL) {
      const alertThreshold = Math.floor((microsleeps - MICROSLEEP_ALERT_INTERVAL) / MICROSLEEP_ALERT_INTERVAL) + 1;
      if (alertThreshold > microsleepAlertCountRef.current) {
        playAlarm();
        microsleepAlertCountRef.current = alertThreshold;
      }
    } else {
      microsleepAlertCountRef.current = 0;
    }

    // Yawns alert: trigger at > 3 and every YAWN_ALERT_INTERVAL additional
    if (yawns > YAWN_ALERT_INTERVAL) {
      const alertThreshold = Math.floor((yawns - YAWN_ALERT_INTERVAL) / YAWN_ALERT_INTERVAL) + 1;
      if (alertThreshold > yawnAlertCountRef.current) {
        playAlarm();
        yawnAlertCountRef.current = alertThreshold;
      }
    } else {
      yawnAlertCountRef.current = 0;
    }
  };

  // Set up periodic alert check
  const startAlertInterval = () => {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
    }
    alertIntervalRef.current = setInterval(() => {
      if (indicators.microsleeps > MICROSLEEP_ALERT_INTERVAL || indicators.yawns > YAWN_ALERT_INTERVAL) {
        playAlarm();
      }
    }, PERIODIC_CHECK_INTERVAL); // Use global variable for interval
  };

  // Clean up periodic alert check
  const stopAlertInterval = () => {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchCurrentUser();
    return () => {
      stopCamera();
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopAlertInterval();
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    };
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await getUsers();
      const driversList = response.filter(user => user.role === 'driver' && user.status === 'active');
      setDrivers(driversList);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No tienes permisos para ver los monitoreos. Inicia sesión como administrador.',
      });
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await getCurrentUser();
      setCurrentUser(response);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo obtener la información del usuario actual.',
      });
    }
  };

  const startCamera = async () => {
    try {
      if (!window.isSecureContext) {
        throw new Error('Se requiere HTTPS para acceder a la cámara. Usa localhost o un servidor HTTPS.');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      if (videoDevices.length === 0) {
        throw new Error('No se encontraron cámaras disponibles. Conecta una cámara o verifica los permisos.');
      }

      let stream = null;
      let lastError = null;

      for (const device of videoDevices) {
        try {
          const constraints = {
            video: {
              deviceId: device.deviceId ? { exact: device.deviceId } : undefined,
              facingMode: device.label.toLowerCase().includes('back') ? 'environment' : 'user',
              width: { ideal: 320 },
              height: { ideal: 180 },
            },
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log(`Camera accessed: ${device.label}`);
          break;
        } catch (error) {
          console.error(`Failed to access camera ${device.label}:`, error);
          lastError = error;
        }
      }

      if (!stream) {
        throw lastError || new Error('No se pudo acceder a ninguna cámara disponible.');
      }

      setIsCameraOn(true);
      setCameraError(null);
      setVideoError(null);

      wsRef.current = connectToAnalysis(currentUser.id, true);
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        if (data.error) {
          setVideoError(data.error);
          Swal.fire({
            icon: 'error',
            title: 'Error en el análisis',
            text: data.error,
          });
          stopCamera();
        } else if (data.status === 'completed') {
          wsRef.current.close();
          Swal.fire({
            icon: 'info',
            title: 'Análisis completado',
            text: 'El monitoreo en tiempo real ha finalizado.',
          });
        } else {
          setIndicators(prev => ({
            blinks: data.indicators.blinks,
            microsleeps: Math.max(prev.microsleeps, data.indicators.microsleeps), // Only increase microsleeps
            yawns: data.indicators.yawns,
            yawn_duration: data.indicators.yawn_duration,
          }));
          checkAlerts(data.indicators);
          if (data.frame && canvasRef.current) {
            const now = performance.now();
            if (now - lastFrameTimeRef.current >= 16) {
              const ctx = canvasRef.current.getContext('2d');
              const img = new Image();
              img.src = data.frame;
              img.onload = () => {
                ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
                console.log('Frame rendered on canvas');
                lastFrameTimeRef.current = now;
              };
              img.onerror = () => {
                console.error('Error loading frame image');
                setVideoError('No se pudo cargar la imagen de la cámara. Verifica la conexión con el servidor.');
              };
            }
          }
        }
      };
      wsRef.current.onerror = () => {
        const errorMsg = 'Error en la conexión con el servidor de análisis. Verifica la conexión al servidor.';
        setVideoError(errorMsg);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMsg,
        });
        stopCamera();
      };
      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        if (!videoError) {
          setVideoError('Conexión cerrada. El análisis puede haber finalizado o fallado.');
        }
      };

      stream.getTracks().forEach(track => track.stop());
      startAlertInterval();
    } catch (error) {
      let errorMessage = 'No se pudo acceder a la cámara. Asegúrate de otorgar permisos.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permiso para la cámara denegado. Habilita los permisos en la configuración del navegador.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en el dispositivo. Conecta una cámara.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'No se pudo iniciar la cámara. Asegúrate de que no esté en uso por otra aplicación.';
      } else {
        errorMessage = `Error al acceder a la cámara: ${error.message}`;
      }
      setCameraError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
      });
      stopCamera();
    }
  };

  const stopCamera = () => {
    setIsCameraOn(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setVideoError(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    stopAlertInterval();
    alarmRef.current.pause();
    alarmRef.current.currentTime = 0;
  };

  const handleViewDriver = (driver) => {
    if (!driver.url_video) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin camara',
        text: 'Este conductor no tiene una camara asignada.',
      });
      return;
    }
    setSelectedDriver(driver);
    setIndicators({
      blinks: 0,
      microsleeps: 0,
      yawns: 0,
      yawn_duration: 0,
    });
    setVideoError(null);
    setShowModal(true);
    microsleepAlertCountRef.current = 0;
    yawnAlertCountRef.current = 0;

    wsRef.current = connectToAnalysis(driver.id);
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      if (data.error) {
        setVideoError(data.error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.error,
        });
        handleCloseModal();
      } else if (data.status === 'completed') {
        wsRef.current.close();
      } else {
        setIndicators(prev => ({
          blinks: data.indicators.blinks,
          microsleeps: Math.max(prev.microsleeps, data.indicators.microsleeps), // Only increase microsleeps
          yawns: data.indicators.yawns,
          yawn_duration: data.indicators.yawn_duration,
        }));
        checkAlerts(data.indicators);
        if (data.frame && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          const img = new Image();
          img.src = data.frame;
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
            console.log('Frame rendered on canvas');
          };
          img.onerror = () => {
            console.error('Error loading frame image');
            setVideoError('No se pudo cargar la imagen del video.');
          };
        }
      }
    };
    wsRef.current.onerror = () => {
      const errorMsg = 'Error en la conexión con el servidor de análisis.';
      setVideoError(errorMsg);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
      });
      handleCloseModal();
    };
    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };
    startAlertInterval();
  };

  const handleRealTimeMonitoring = () => {
    if (!currentUser) {
      Swal.fire({
        icon: 'warning',
        title: 'Usuario no autenticado',
        text: 'Inicia sesión para usar el monitoreo en tiempo real.',
      });
      return;
    }
    setShowRealTimeModal(true);
    setIndicators({
      blinks: 0,
      microsleeps: 0,
      yawns: 0,
      yawn_duration: 0,
    });
    setCameraError(null);
    setVideoError(null);
    microsleepAlertCountRef.current = 0;
    yawnAlertCountRef.current = 0;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDriver(null);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setVideoError(null);
    stopAlertInterval();
    alarmRef.current.pause();
    alarmRef.current.currentTime = 0;
  };

  const handleCloseRealTimeModal = () => {
    setShowRealTimeModal(false);
    stopCamera();
    setIndicators({
      blinks: 0,
      microsleeps: 0,
      yawns: 0,
      yawn_duration: 0,
    });
    setCameraError(null);
    stopAlertInterval();
    alarmRef.current.pause();
    alarmRef.current.currentTime = 0;
  };

  const handleDownloadReport = () => {
    if (!selectedDriver) return;
  
    // Get current date and format as DD/MM/YYYY
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  
    // Define the data for the CSV with two columns: Field and Value, no header
    const reportData = [
      ['Fecha', formattedDate],
      ['Nombre', `${selectedDriver.first_name} ${selectedDriver.last_name}`],
      ['Username', selectedDriver.username],
      ['Email', selectedDriver.email],
      ['DNI', selectedDriver.dni],
      ['Parpadeos detectados', indicators.blinks],
      ['Microsueños acumulados', indicators.microsleeps],
      ['Bostezos detectados', indicators.yawns],
      ['Duración total de los bostezos', `${indicators.yawn_duration} segundos`],
    ];
  
    // Convert the data to CSV format without quotes
    const csvContent = reportData
      .map(row => row.join(',')) // Join values with commas, no quotes
      .join('\n');
  
    // Create a Blob with UTF-8 BOM to ensure special characters are handled
    const bom = '\uFEFF'; // UTF-8 BOM
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${selectedDriver.username}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleDownloadRealTimeReport = () => {
    if (!currentUser) return;
  
    // Get current date and format as DD/MM/YYYY
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  
    // Define the data for the CSV with two columns: Field and Value, no header
    const reportData = [
      ['Fecha', formattedDate],
      ['Nombre', `${currentUser.first_name} ${currentUser.last_name}`],
      ['Username', currentUser.username],
      ['Email', currentUser.email],
      ['DNI', currentUser.dni],
      ['Parpadeos detectados', indicators.blinks],
      ['Microsueños acumulados', indicators.microsleeps],
      ['Bostezos detectados', indicators.yawns],
      ['Duración total de los bostezos', `${indicators.yawn_duration} segundos`],
    ];
  
    // Convert the data to CSV format without quotes
    const csvContent = reportData
      .map(row => row.join(',')) // Join values with commas, no quotes
      .join('\n');
  
    // Create a Blob with UTF-8 BOM to ensure special characters are handled
    const bom = '\uFEFF'; // UTF-8 BOM
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_tiempo_real_${currentUser.username}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Dynamic card style for microsleeps and yawns
  const microsleepCardStyle = {
    boxShadow: indicators.microsleeps > MICROSLEEP_ALERT_INTERVAL ? '0 0 10px 2px rgba(255, 0, 0, 0.8)' : 'none',
  };
  const yawnCardStyle = {
    boxShadow: indicators.yawns > YAWN_ALERT_INTERVAL ? '0 0 10px 2px rgba(255, 0, 0, 0.8)' : 'none',
  };

  return (
    <div className="card p-4">
      <h3>Monitoreo de Conductores</h3>
      <div className="row">
        <div className="col-md-4 mb-3">
          <div className="card" style={{ backgroundColor: '#e6f3ff', border: '2px solid #007bff' }}>
            <div className="card-body">
              <h5 className="card-title">Monitoreo de Conductor en Tiempo Real</h5>
              <p className="card-text">Prueba el monitoreo en vivo con tu cámara.</p>
              <button
                className="btn btn-primary"
                onClick={handleRealTimeMonitoring}
                disabled={!currentUser}
              >
                <i className="fa fa-play me-2"></i>Probar
              </button>
            </div>
          </div>
        </div>
        {drivers.map(driver => (
          <div key={driver.id} className="col-md-4 mb-3">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{driver.first_name} {driver.last_name}</h5>
                <p className="card-text">Username: {driver.username}</p>
                <p className="card-text">DNI: {driver.dni}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => handleViewDriver(driver)}
                >
                  <i className="fa fa-eye me-2"></i>Ver
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedDriver && (
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
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detalles del Conductor</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Datos del Conductor</h6>
                    <p><strong>Username:</strong> {selectedDriver.username}</p>
                    <p><strong>Nombre:</strong> {selectedDriver.first_name}</p>
                    <p><strong>Apellido:</strong> {selectedDriver.last_name}</p>
                    <p><strong>Correo:</strong> {selectedDriver.email}</p>
                    <p><strong>Teléfono:</strong> {selectedDriver.phone_number}</p>
                    <p><strong>DNI:</strong> {selectedDriver.dni}</p>
                    <p><strong>Estado:</strong> {selectedDriver.status === 'active' ? 'Activo' : 'Inactivo'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Cámara de Monitoreo</h6>
                    {videoError ? (
                      <div className="alert alert-danger">{videoError}</div>
                    ) : (
                      <canvas
                        ref={canvasRef}
                        width="320"
                        height="180"
                        style={{ maxHeight: '300px', width: '100%', backgroundColor: '#000' }}
                      />
                    )}
                  </div>
                </div>
                <hr />
                <h6>Indicadores de Monitoreo</h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h6>Parpadeos detectados</h6>
                        <p>{indicators.blinks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="card" style={microsleepCardStyle}>
                      <div className="card-body">
                        <h6>Microsueños acumulados</h6>
                        <p>{indicators.microsleeps}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="card" style={yawnCardStyle}>
                      <div className="card-body">
                        <h6>Bostezos detectados</h6>
                        <p>{indicators.yawns}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h6>Duración total de los bostezos</h6>
                        <p>{indicators.yawn_duration} segundos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  <i className="fa fa-times me-2"></i>Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadReport}
                >
                  <i className="fa fa-download me-2"></i>Descargar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRealTimeModal && currentUser && (
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
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Monitoreo en Tiempo Real</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseRealTimeModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Datos del Conductor</h6>
                    <p><strong>Username:</strong> {currentUser.username}</p>
                    <p><strong>Nombre:</strong> {currentUser.first_name}</p>
                    <p><strong>Apellido:</strong> {currentUser.last_name}</p>
                    <p><strong>Correo:</strong> {currentUser.email}</p>
                    <p><strong>Teléfono:</strong> {currentUser.phone_number}</p>
                    <p><strong>DNI:</strong> {currentUser.dni}</p>
                    <p><strong>Estado:</strong> {currentUser.status === 'active' ? 'Activo' : 'Inactivo'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Cámara en Tiempo Real</h6>
                    {cameraError || videoError ? (
                      <div className="alert alert-danger">{cameraError || videoError}</div>
                    ) : (
                      <canvas
                        ref={canvasRef}
                        width="320"
                        height="180"
                        style={{ maxHeight: '300px', width: '100%', backgroundColor: '#000' }}
                      />
                    )}
                    <div className="mt-2">
                      <button
                        className="btn btn-success me-2"
                        onClick={startCamera}
                        disabled={isCameraOn}
                      >
                        <i className="fa fa-video me-2"></i>Encender Cámara
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={stopCamera}
                        disabled={!isCameraOn}
                      >
                        <i className="fa fa-stop me-2"></i>Apagar Cámara
                      </button>
                    </div>
                  </div>
                </div>
                <hr />
                <h6>Indicadores de Monitoreo</h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h6>Parpadeos detectados</h6>
                        <p>{indicators.blinks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="card" style={microsleepCardStyle}>
                      <div className="card-body">
                        <h6>Microsueños acumulados</h6>
                        <p>{indicators.microsleeps}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="card" style={yawnCardStyle}>
                      <div className="card-body">
                        <h6>Bostezos detectados</h6>
                        <p>{indicators.yawns}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h6>Duración total de los bostezos</h6>
                        <p>{indicators.yawn_duration} segundos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseRealTimeModal}
                >
                  <i className="fa fa-times me-2"></i>Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadRealTimeReport}
                >
                  <i className="fa fa-download me-2"></i>Descargar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonitoringDrivers;