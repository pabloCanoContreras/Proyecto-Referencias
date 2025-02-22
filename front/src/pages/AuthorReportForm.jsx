import axios from 'axios';
import React, { useState } from 'react';

function AuthorReportForm() {
  const [authorName, setAuthorName] = useState('');
  const [maxResults, setMaxResults] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      // Paso 1: Obtener los IDs del autor
      const eidResponse = await axios.get('http://localhost:5000/author_eid', {
        params: { author_name: authorName, max_results: maxResults },
      });

      const authorIds = eidResponse.data.author_ids || [];
      if (authorIds.length === 0) {
        throw new Error('No se encontraron IDs para el autor.');
      }

      // Paso 2: Generar el reporte
      const reportResponse = await axios.post(
        'http://localhost:5000/generate_report',
        { author_name: authorName, author_ids: authorIds, max_results: maxResults },
        { responseType: 'blob' }
      );

      // Descargar el archivo generado
      const sanitizedAuthorName = authorName.replace(/[^a-zA-Z0-9]/g, '_');
      const url = window.URL.createObjectURL(new Blob([reportResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sanitizedAuthorName}_impact_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError('Error al generar el reporte. Por favor, inténtalo de nuevo.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow-lg border-0 p-4">
        <h1 className="text-center mb-4 text-primary">Generador de Reporte de Impacto</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerateReport();
          }}
        >
          <div className="row g-3 mb-3">
            {/* Campo para el nombre del autor */}
            <div className="col-md-8">
              <label htmlFor="authorName" className="form-label fw-semibold">
                <i className="bi bi-person-circle me-2"></i>Nombre del Autor
              </label>
              <input
                type="text"
                id="authorName"
                className="form-control border-primary"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Introduce el nombre del autor"
                required
              />
            </div>

            {/* Campo para el número de resultados */}
            <div className="col-md-4">
              <label htmlFor="maxResults" className="form-label fw-semibold">
                <i className="bi bi-list-ol me-2"></i>Número de Resultados
              </label>
              <input
                type="number"
                id="maxResults"
                className="form-control border-primary"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
                placeholder="Máx resultados"
                min="1"
                required
              />
            </div>
          </div>

          <div className="text-center mt-4">
            <button
              type="submit"
              className={`btn btn-primary w-50 ${loading ? 'disabled' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Procesando...
                </>
              ) : (
                'Generar Reporte'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="alert alert-danger mt-4 text-center" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthorReportForm;