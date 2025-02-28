import React, { useReducer } from 'react';
import { fetchAuthorIds, generateReport } from '../api/api.js';

const initialState = {
  authorName: '',
  maxResults: 1,
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AUTHOR_NAME':
      return { ...state, authorName: action.payload };
    case 'SET_MAX_RESULTS':
      return { ...state, maxResults: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

function AuthorReportForm() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleGenerateReport = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Paso 1: Obtener los IDs del autor
      const authorIds = await fetchAuthorIds(state.authorName, state.maxResults);
      if (authorIds.length === 0) throw new Error('No se encontraron IDs para el autor.');

      // Paso 2: Generar y descargar el reporte
      const reportResponse = await generateReport(state.authorName, authorIds, state.maxResults);
      const sanitizedAuthorName = state.authorName.replace(/[^a-zA-Z0-9]/g, '_');
      const url = window.URL.createObjectURL(new Blob([reportResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sanitizedAuthorName}_impact_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al generar el reporte. Inténtalo de nuevo.' });
      console.error('Error:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
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
                value={state.authorName}
                onChange={(e) => dispatch({ type: 'SET_AUTHOR_NAME', payload: e.target.value })}
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
                value={state.maxResults}
                onChange={(e) => dispatch({ type: 'SET_MAX_RESULTS', payload: parseInt(e.target.value, 10) })}
                placeholder="Máx resultados"
                min="1"
                required
              />
            </div>
          </div>

          <div className="text-center mt-4">
            <button
              type="submit"
              className={`btn btn-primary w-50 ${state.loading ? 'disabled' : ''}`}
              disabled={state.loading}
            >
              {state.loading ? (
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

        {state.error && (
          <div className="alert alert-danger mt-4 text-center" role="alert">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthorReportForm;
