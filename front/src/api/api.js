import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export const fetchAuthorIds = async (authorName, maxResults) => {
  const response = await axios.get(`${API_BASE_URL}/author_eid`, {
    params: { author_name: authorName, max_results: maxResults },
  });
  return response.data.author_ids || [];
};

export const generateReport = async (authorName, authorIds, maxResults) => {
  return await axios.post(
    `${API_BASE_URL}/generate_report`,
    { author_name: authorName, author_ids: authorIds, max_results: maxResults },
    { responseType: 'blob' }
  );
};


export const searchAndRank = async ({ query, searchType, startYear, endYear, sources }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/search_and_rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busqueda: query,
          tipoBusqueda: searchType,
          fechaInicio: startYear ? parseInt(startYear, 10) : null,
          fechaFin: endYear ? parseInt(endYear, 10) : null,
          sources,
        }),
      });
  
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error en la búsqueda avanzada:", error);
      return { error: "No se pudo completar la búsqueda" };
    }
};
