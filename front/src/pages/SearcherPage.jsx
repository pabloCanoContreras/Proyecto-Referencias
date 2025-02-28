import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { searchAndRank } from "../api/api";
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
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({});
  const [selectedSources, setSelectedSources] = useState(["scopus", "crossref", "scholar"]);

  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 10 : 90));
      }, 500);
    } else {
      clearInterval(interval);
      setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await searchAndRank({
        query: params.query,
        searchType: params.searchType,
        startYear: params.startYear,
        endYear: params.endYear,
        sources: selectedSources,
      });

      if (data.error) {
        console.error(`Error en la búsqueda: ${data.error}`);
        setResults({});
      } else {
        const validResults = selectedSources.reduce((acc, source) => {
          acc[source] = Array.isArray(data[source]) ? data[source] : [];
          return acc;
        }, {});
        setResults(validResults);
      }
    } finally {
      setProgress(100);
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-sm p-4">
        <h3 className="mb-4 text-center">Búsqueda</h3>
        <SearchForm params={params} setParams={setParams} onSearch={handleSearch} loading={loading} />
        <SourceSelector selectedSources={selectedSources} setSelectedSources={setSelectedSources} />
      </div>

      <div className="mt-4 text-center">
        {loading ? <CircularProgressWithLabel value={progress} /> : <ResultsTable results={results} />}
      </div>

      <div className="mt-5">
        <AuthorReportForm />
      </div>
    </div>
  );
};

export default SearcherPage;
