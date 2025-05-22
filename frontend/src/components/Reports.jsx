import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getReports, getCurrentUser } from '../services/api';
import Papa from 'papaparse';

function Reports() {
  const [reports, setReports] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [appliedDateRange, setAppliedDateRange] = useState({ start: '', end: '' });
  const [expandedReport, setExpandedReport] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasAccess, setHasAccess] = useState(null); // Changed to null initially

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await getCurrentUser();
      setCurrentUser(response);
      if (response.role === 'admin') {
        setHasAccess(true);
        fetchReports();
      } else {
        setHasAccess(false);
        Swal.fire({
          icon: 'error',
          title: 'Acceso Denegado',
          text: 'No tienes permisos para ver los reportes. Inicia sesión como administrador.',
        });
      }
    } catch (error) {
      setHasAccess(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo obtener la información del usuario actual.',
      });
    }
  };

  const fetchReports = async () => {
    try {
      const response = await getReports();
      setReports(response);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron obtener los reportes.',
      });
    }
  };

  const handleSelect = (id) => {
    if (selectedReports.includes(id)) {
      setSelectedReports(selectedReports.filter((reportId) => reportId !== id));
    } else {
      setSelectedReports([...selectedReports, id]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReports(filteredReports.map((report) => report.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleDownloadSelected = () => {
    if (selectedReports.length === 0) {
      Swal.fire('Atención', 'Por favor selecciona al menos un reporte para descargar.', 'warning');
      return;
    }

    const selectedData = reports.filter((report) => selectedReports.includes(report.id));

    const csvColumns = [
      { key: 'Nombre', header: 'Nombre' },
      { key: 'Apellido', header: 'Apellido' },
      { key: 'Correo', header: 'Correo Electrónico' },
      { key: 'Teléfono', header: 'Teléfono' },
      { key: 'DNI', header: 'DNI' },
      { key: 'Estado', header: 'Estado' },
      { key: 'Parpadeos Detectados', header: 'Parpadeos Detectados' },
      { key: 'Microsueños', header: 'Microsueños' },
      { key: 'Bostezos Detectados', header: 'Bostezos Detectados' },
      { key: 'Duración Bostezos (seg)', header: 'Duración Bostezos (seg)' },
      { key: 'Fecha', header: 'Fecha' },
    ];

    const csvData = selectedData.map((report) => {
      const row = {
        Nombre: report.first_name || '',
        Apellido: report.last_name || '',
        Correo: report.email || '',
        Teléfono: report.phone_number || '',
        DNI: report.dni || '',
        Estado: report.status === 'active' ? 'Activo' : 'Inactivo',
        'Parpadeos Detectados': report.blinks_detected ?? 0,
        Microsueños: report.microsleeps ?? 0,
        'Bostezos Detectados': report.yawns_detected ?? 0,
        'Duración Bostezos (seg)': report.yawns_duration ?? 0,
        Fecha: report.created_at
          ? new Date(report.created_at).toLocaleDateString('es-PE', {
              timeZone: 'America/Lima',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '',
      };

      Object.keys(row).forEach((key) => {
        if (typeof row[key] === 'string') {
          row[key] = row[key].replace(/"/g, '""');
          row[key] = row[key].replace(/,/g, ' ');
        }
      });

      return row;
    });

    const csv = Papa.unparse(
      {
        fields: csvColumns.map((col) => col.header),
        data: csvData,
      },
      {
        quotes: true,
        delimiter: ';',
        header: true,
        escapeChar: '"',
      }
    );

    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Reportes.csv';
    a.click();
    URL.revokeObjectURL(url);

    Swal.fire('Descargando', `${selectedReports.length} reporte(s) descargado(s)`, 'success');
  };

  const handleApplyDateFilter = () => {
    setAppliedDateRange({ ...dateRange });
  };

  const toggleExpand = (id) => {
    if (expandedReport === id) {
      setExpandedReport(null);
    } else {
      setExpandedReport(id);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesName =
      report.first_name.toLowerCase().includes(searchName.toLowerCase()) ||
      report.last_name.toLowerCase().includes(searchName.toLowerCase()) ||
      report.username.toLowerCase().includes(searchName.toLowerCase());

    const reportDate = new Date(report.created_at);
    reportDate.setHours(0, 0, 0, 0); // Normalize to start of day

    let matchesDate = true;
    if (appliedDateRange.start || appliedDateRange.end) {
      const startDate = appliedDateRange.start
        ? new Date(appliedDateRange.start + 'T00:00:00-05:00') // Peru time
        : new Date('1970-01-01');
      const endDate = appliedDateRange.end
        ? new Date(appliedDateRange.end + 'T23:59:59-05:00') // End of day
        : new Date();

      matchesDate = reportDate >= startDate && reportDate <= endDate;
    }

    return matchesName && matchesDate;
  });

  // Wait until hasAccess is determined
  if (hasAccess === null) {
    return null; // Or a loading spinner
  }

  if (!hasAccess) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          No tienes permisos para acceder a esta página. Por favor, inicia sesión como administrador.
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Gestión de Reportes</h2>

      <div className="row mb-4">
        <div className="col-md-3">
          <label className="form-label">Fecha inicio:</label>
          <input
            type="date"
            className="form-control shadow-sm"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Fecha fin:</label>
          <input
            type="date"
            className="form-control shadow-sm"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button
            className="btn btn-outline-secondary w-100 shadow-sm"
            onClick={handleApplyDateFilter}
          >
            <i className="bi bi-funnel-fill me-2"></i>Aplicar filtro
          </button>
        </div>

        <div className="col-md-4">
          <label className="form-label">Buscar por nombre:</label>
          <input
            type="text"
            className="form-control shadow-sm"
            placeholder="Buscar por nombre"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
      </div>

      <table className="table table-hover align-middle table-bordered rounded shadow-sm">
        <thead className="table-light">
          <tr>
            <th style={{ width: '50px', textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                onChange={handleSelectAll}
              />
            </th>
            <th>Nombre</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredReports.map((report) => (
            <>
              <tr key={report.id}>
                <td style={{ width: '50px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(report.id)}
                    onChange={() => handleSelect(report.id)}
                  />
                </td>
                <td>
                  {report.first_name} {report.last_name}
                </td>
                <td>
                  {new Date(report.created_at).toLocaleDateString('es-PE', {
                    timeZone: 'America/Lima',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </td>
                <td>
                  <button
                    className="btn btn-info btn-sm shadow-sm"
                    onClick={() => toggleExpand(report.id)}
                  >
                    <i
                      className={`bi ${expandedReport === report.id ? 'bi-eye-slash' : 'bi-eye'} me-2`}
                    ></i>
                    {expandedReport === report.id ? 'Ocultar' : 'Ver reporte'}
                  </button>
                </td>
              </tr>

              {expandedReport === report.id && (
                <tr>
                  <td colSpan="4">
                    <div className="card shadow-sm bg-white rounded-3 p-3">
                      <div className="row g-3">
                        <div className="col-md-4">
                          <strong>Username:</strong>{' '}
                          <div className="text-muted">{report.username}</div>
                        </div>
                        <div className="col-md-4">
                          <strong>Nombre:</strong>{' '}
                          <div className="text-muted">{report.first_name}</div>
                        </div>
                        <div className="col-md-4">
                          <strong>Apellido:</strong>{' '}
                          <div className="text-muted">{report.last_name}</div>
                        </div>
                        <div className="col-md-4">
                          <strong>Correo:</strong>{' '}
                          <div className="text-muted">{report.email}</div>
                        </div>
                        <div className="col-md-4">
                          <strong>Teléfono:</strong>{' '}
                          <div className="text-muted">{report.phone_number}</div>
                        </div>
                        <div className="col-md-4">
                          <strong>DNI:</strong> <div className="text-muted">{report.dni}</div>
                        </div>
                        <div className="col-md-4">
                          <strong>Estado:</strong>{' '}
                          <div className="text-muted">
                            {report.status === 'active' ? 'Activo' : 'Inactivo'}
                          </div>
                        </div>

                        <hr className="my-3" />

                        <div className="col-12">
                          <h6 className="mb-3">Indicadores de Monitoreo:</h6>
                        </div>
                        <div className="col-md-3">
                          <strong>Parpadeos:</strong>{' '}
                          <div className="text-muted">{report.blinks_detected}</div>
                        </div>
                        <div className="col-md-3">
                          <strong>Microsueños:</strong>{' '}
                          <div className="text-muted">{report.microsleeps}</div>
                        </div>
                        <div className="col-md-3">
                          <strong>Bostezos:</strong>{' '}
                          <div className="text-muted">{report.yawns_detected}</div>
                        </div>
                        <div className="col-md-3">
                          <strong>Duración Bostezos:</strong>{' '}
                          <div className="text-muted">{report.yawns_duration} seg</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      <div className="text-end">
        <button className="btn btn-primary mt-3 shadow-sm mb-4" onClick={handleDownloadSelected}>
          <i className="bi bi-download me-2"></i> Descargar reportes seleccionados
        </button>
      </div>
    </div>
  );
}

export default Reports;