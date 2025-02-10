import React from "react";

const SearchForm = ({ params, setParams, onSearch, loading }) => {
  const MIN_YEAR = 1985;
  const MAX_YEAR = new Date().getFullYear();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form className="row g-3">
      <div className="col-md-3">
        <label htmlFor="searchType" className="form-label">Tipo de Búsqueda</label>
        <select
          id="searchType"
          className="form-select"
          name="searchType"
          value={params.searchType}
          onChange={handleChange}
        >
          <option value="title">Título</option>
          <option value="keywords">Palabras Clave</option>
        </select>
      </div>
      <div className="col-md-3">
        <label htmlFor="query" className="form-label">Término de Búsqueda</label>
        <input
          id="query"
          type="text"
          className="form-control"
          name="query"
          value={params.query}
          onChange={handleChange}
        />
      </div>
      <div className="col-md-2">
        <label htmlFor="startYear" className="form-label">Año Inicio</label>
        <input
          id="startYear"
          type="number"
          className="form-control"
          name="startYear"
          value={params.startYear}
          onChange={handleChange}
          min={MIN_YEAR}
          max={MAX_YEAR}
        />
      </div>
      <div className="col-md-2">
        <label htmlFor="endYear" className="form-label">Año Fin</label>
        <input
          id="endYear"
          type="number"
          className="form-control"
          name="endYear"
          value={params.endYear}
          onChange={handleChange}
          min={MIN_YEAR}
          max={MAX_YEAR}
        />
      </div>
      <div className="col-md-2 d-flex align-items-end">
        <button
          type="button"
          className="btn btn-primary w-100"
          onClick={onSearch}
          disabled={loading}
        >
          {loading ? "Cargando..." : "Buscar"}
        </button>
      </div>
    </form>
  );
};

export default SearchForm;
