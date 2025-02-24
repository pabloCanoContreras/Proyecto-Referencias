import React from "react";

const SourceSelector = ({ selectedSources, setSelectedSources }) => {
  const toggleSource = (source) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const sources = ["scopus", "crossref", "scholar"];

  return (
    <div className="mt-3">
      <label className="form-label">Fuentes de Búsqueda:</label>
      <div className="d-flex gap-2">
        {sources.map((source) => (
          <button
            key={source}
            type="button"
            className={`btn btn-outline-${
              source === "scopus" ? "success" : source === "crossref" ? "warning" : "info"
            } ${selectedSources.includes(source) ? "active" : ""}`}
            onClick={() => toggleSource(source)}
          >
            {source.charAt(0).toUpperCase() + source.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SourceSelector;
