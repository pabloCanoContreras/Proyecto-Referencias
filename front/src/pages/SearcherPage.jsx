import axios from 'axios';
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from 'react';
import SearchResults from './SearchResults';

const API_KEY = '0be79d019c20568890c2bb62478dd3b3';
const API_URL = 'https://api.elsevier.com/content/search/scopus';
const MAX_RESULTS = 9;

const SearcherPage = () => {
  const [resultados, setResultados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(API_URL, {
        params: {
          query: busqueda,
          apiKey: API_KEY,
          count: MAX_RESULTS,
        },
        headers: {
          'Accept': 'application/json',
        },
      });

      const searchResults = response.data['search-results'].entry;
      if (searchResults && searchResults.length > 0) {
        const formattedResults = await processAndSaveData(searchResults);
        setResultados(formattedResults);
      } else {
        setError("No se encontraron resultados para la búsqueda.");
        setResultados([]);
      }
    } catch (error) {
      console.error(error);
      setError("Ocurrió un error al realizar la búsqueda.");
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const processAndSaveData = async (articles) => {
    const formattedResults = await Promise.all(articles.map(article => processArticleData(article)));
    return formattedResults;
  };

  const processArticleData = async (article) => {
    const { refcount, keywords, issn, abstract } = await getRefCount(article['dc:identifier'].replace('SCOPUS_ID:', ''));
    const hIndex = await getAuthorHIndex(article['dc:creator']);
    const { snip, sjr } = await getJournalMetrics(issn);

    return {
      title: article['dc:title'] || 'N/A',
      pub_date: article['prism:coverDate'] || 'N/A',
      authors: article['dc:creator'] || 'N/A',
      citations: article['citedby-count'] || 'N/A',
      doi: article['prism:doi'] || 'N/A',
      abstract: abstract,
      keywords,
      journal: article['prism:publicationName'] || 'N/A',
      issn: issn || 'N/A',
      eissn: article['prism:eIssn'] || 'N/A',
      volume: article['prism:volume'] || 'N/A',
      issue: article['prism:issueIdentifier'] || 'N/A',
      pages: article['prism:pageRange'] || 'N/A',
      refcount,
      hIndex,
      snip,
      sjr,
    };
  };

  const getRefCount = async (scopus_id) => {
    const url = `https://api.elsevier.com/content/abstract/scopus_id/${scopus_id}`;
    const headers = {
      'Accept': 'application/json',
      'X-ELS-APIKey': API_KEY,
    };

    try {
      const response = await axios.get(url, { headers });
      const data = response.data['abstracts-retrieval-response'];
      const refcount = data?.tail?.bibliography?.['@refcount'] || 'N/A';
      const abstract = data?.coredata?.['dc:description'] || 'N/A';
      const keywords = data?.authkeywords?.['author-keyword']?.map(keyword => keyword['$']).join(', ') || 'N/A';
      const issn = data?.coredata?.['prism:issn'] || 'N/A';

      return { refcount, keywords, issn, abstract };
    } catch (error) {
      console.error(`Error al obtener refcount para el artículo ${scopus_id}:`, error);
      throw new Error(`Error al obtener refcount para el artículo ${scopus_id}: ${error.message}`);
    }
  };

  const getAuthorHIndex = async (authorName) => {
    try {
      const response = await axios.get(`http://localhost:5000/get_h_index`, {
        params: { author_name: authorName },
      });
      return response.data.h_index;
    } catch (error) {
      console.error(`Error al obtener el H-index del autor ${authorName}:`, error);
      return 'N/A';
    }
  };

  const getJournalMetrics = async (issn) => {
    try {
      const response = await axios.get('http://localhost:5000/get_journal_metrics', {
        params: { issns: issn }  
      });

      const journalMetrics = response.data[0]; 
      return {
        snip: journalMetrics["SNIP (2023)"] || 'N/A',
        sjr: journalMetrics["SJR (2023)"] || 'N/A'
      };
    } catch (error) {
      console.error(`Error al obtener métricas del journal con ISSN ${issn}:`, error);
      return { snip: 'N/A', sjr: 'N/A' };
    }
  };

  const handleChange = (e) => {
    setBusqueda(e.target.value);
  };

  const handleDownload = () => {
    const escapeCsvValue = (value) => {
      if (value == null) {
        return '';
      }
      // Escapar comillas dobles dentro del valor
      value = value.toString().replace(/"/g, '""');
      // Si el valor contiene comas, comillas dobles o saltos de línea, encerrarlo en comillas dobles
      if (/[",\n]/.test(value)) {
        value = `"${value}"`;
      }
      return value;
    };

    const csvContent = [
      ["Title", "Publication Date", "Authors", "Citations", "DOI", "Abstract", "Keywords", "Journal", "ISSN", "eISSN", "Volume", "Issue", "Pages", "H-Index", "SNIP", "SJR"],
      ...resultados.map(row => [
        escapeCsvValue(row.title),
        escapeCsvValue(row.pub_date),
        escapeCsvValue(row.authors),
        escapeCsvValue(row.citations),
        escapeCsvValue(row.doi),
        escapeCsvValue(row.abstract),
        escapeCsvValue(row.keywords),
        escapeCsvValue(row.journal),
        escapeCsvValue(row.issn),
        escapeCsvValue(row.eissn),
        escapeCsvValue(row.volume),
        escapeCsvValue(row.issue),
        escapeCsvValue(row.pages),
        escapeCsvValue(row.hIndex),
        escapeCsvValue(row.snip),
        escapeCsvValue(row.sjr)
      ])
    ]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "search_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      <div className="search-container">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            value={busqueda}
            placeholder="Búsqueda de información"
            onChange={handleChange}
          />
          <button className="btn btn-success" onClick={handleSearch} disabled={loading}>
            Buscar
          </button>
        </div>
        {error && <p className="text-danger">{error}</p>}
        {loading && <p>Cargando resultados...</p>}
        {resultados.length > 0 && (
          <>
            <button className="btn btn-primary mt-3 mb-3" onClick={handleDownload}>Descargar CSV</button>
            <SearchResults resultados={resultados} />
          </>
        )}
      </div>
    </div>
  );
};

export default SearcherPage;
