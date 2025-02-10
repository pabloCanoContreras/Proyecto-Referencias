import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import CircularProgressWithLabel from "../components/CircularProgress";
import ResultsTable from "../components/ResultsTable";
import SearchForm from "../components/SearchForm";
import SourceSelector from "../components/SourceSelector";
import AuthorReportForm from "./AuthorReportForm";

const SearcherPage = () => {
  const [params, setParams] = useState({
    searchType: "title",
    query: "",
    startYear: "",
    endYear: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // Estado para el progreso
  const [results, setResults] = useState({});
  const [selectedSources, setSelectedSources] = useState([
    "scopus",
    "crossref",
  ]);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setProgress((prev) => {
          // El progreso sube, pero no supera el 90% hasta que la API responda
          const nextValue = prev + 10;
          return nextValue < 90 ? nextValue : 90;
        });
      }, 500);
    } else {
      // Si loading es false, el progreso vuelve a 0
      setProgress(0);
    }
    return () => clearInterval(interval); // Limpia el intervalo al desmontar o cuando loading cambia
  }, [loading]);

  const handleSearch = async () => {
    setLoading(true);
    setProgress(0); // Reinicia el progreso
    try {
      const response = await fetch("http://localhost:5000/search_and_rank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          busqueda: params.query,
          tipoBusqueda: params.searchType,
          fechaInicio: params.startYear ? parseInt(params.startYear, 10) : null,
          fechaFin: params.endYear ? parseInt(params.endYear, 10) : null,
          sources: selectedSources,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(`Error: ${data.error}`);
        setResults({});
      } else {
        const validResults = selectedSources.reduce((acc, source) => {
          acc[source] = Array.isArray(data[source]) ? data[source] : [];
          return acc;
        }, {});
        console.log("Datos recibidos del backend:", data);

        setResults(validResults);
      }
    } catch (error) {
      console.error("Error en la búsqueda avanzada:", error);
    } finally {
      setProgress(100); // Completa el progreso al finalizar
      setTimeout(() => setLoading(false), 500); // Da un pequeño margen para mostrar 100%
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-sm p-4">
        <h3 className="mb-4 text-center">Ranking</h3>

        {/* Usar SearchForm para manejar el formulario */}
        <SearchForm
          params={params}
          setParams={setParams}
          onSearch={handleSearch}
          loading={loading}
        />

        {/* Usar SourceSelector para manejar las fuentes */}
        <SourceSelector
          selectedSources={selectedSources}
          setSelectedSources={setSelectedSources}
        />
      </div>

      {/* Mostrar progreso de carga o los resultados */}
      <div className="mt-4 text-center">
        {loading ? (
          <CircularProgressWithLabel value={progress} />
        ) : (
          <ResultsTable results={results} />
        )}
      </div>
      {/* Nuevo buscador para generar el informe de impacto de autores */}
      <div className="mt-5">
        <AuthorReportForm />
      </div>
    </div>
  );
};

export default SearcherPage;
