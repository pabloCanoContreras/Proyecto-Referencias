import React, { useState } from 'react';

const CitationGraph = () => {
    const [query, setQuery] = useState('');
    const [year, setYear] = useState(''); // Nuevo estado para el año
    const [graphImage, setGraphImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchGraph = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/generate_citation_graph', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query, year }), // Enviar el año en el cuerpo de la solicitud
            });

            const data = await response.json();

            if (data.status === 'success') {
                setGraphImage(data.graph_image); 
            } else {
                setError('No se pudo generar el gráfico. Inténtelo de nuevo.');
            }
        } catch (err) {
            setError('Ocurrió un error al comunicarse con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container my-5">
            <div className="text-center">
                <h1 className="mb-4">Generador de Grafo de Citas</h1>
            </div>

            <div className="row justify-content-center mb-4">
                <div className="col-md-8 col-lg-6">
                    <div className="input-group mb-3">
                        <input
                            type="text"
                            className="form-control"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ingrese la consulta"
                        />
                    </div>
                    <div className="input-group mb-3">
                        <input
                            type="text" // Campo para ingresar el año
                            className="form-control"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            placeholder="Ingrese el año de publicación (e.g., 2023)"
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={fetchGraph}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                            'Generar'
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger text-center" role="alert">
                    {error}
                </div>
            )}

            {loading && (
                <div className="text-center my-4">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-2">Generando el gráfico, por favor espere...</p>
                </div>
            )}

            {graphImage && (
                <div className="card mx-auto" style={{ maxWidth: '800px' }}>
                    <div className="card-body text-center">
                        <h3 className="card-title">Gráfico de Citas Generado</h3>
                        <img
                            src={`data:image/png;base64,${graphImage}`}
                            alt="Gráfico de citas"
                            className="img-fluid mt-3"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CitationGraph;
