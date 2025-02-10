import axios from 'axios';
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_KEY = '0be79d019c20568890c2bb62478dd3b3';
const API_URL = 'https://api.elsevier.com/content/search/scopus';
const MAX_RESULTS = 8;
const MIN_YEAR = 1985;
const MAX_YEAR = 2024;

const SearcherPage = () => {
  const [resultados, setResultados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipoBusqueda, setTipoBusqueda] = useState("default");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false); 
  const [wordcloudUrl, setWordcloudUrl] = useState(null);
  const [selectedSources, setSelectedSources] = useState(["scopus", "crossref", "scholar"]);
   
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (fechaInicio && (isNaN(fechaInicio) || fechaInicio < MIN_YEAR || fechaInicio > MAX_YEAR)) {
      setError(`La fecha de inicio debe estar entre ${MIN_YEAR} y ${MAX_YEAR}.`);
      setShowErrorModal(true); 
      return;
    }
    if (fechaFin && (isNaN(fechaFin) || fechaFin < MIN_YEAR || fechaFin > MAX_YEAR)) {
      setError(`La fecha de fin debe estar entre ${MIN_YEAR} y ${MAX_YEAR}.`);
      setShowErrorModal(true); 
      return;
    }
    if (fechaInicio && fechaFin && parseInt(fechaInicio) > parseInt(fechaFin)) {
      setError("La fecha de inicio no puede ser posterior a la fecha de fin.");
      setShowErrorModal(true); 
      return;
    }

    setLoading(true);
    setError(null);
    setShowResults(false);

    try {
      let query;
      switch (tipoBusqueda) {
        case "title":
          query = `TITLE("${busqueda}")`;
          break;
        case "author":
          query = `AUTHLASTNAME("${busqueda}")`;
          break;
        case "keywords":
          query = `KEY("${busqueda}")`;
          break;
        case "first_author":
          query = `AUTHFIRST("${busqueda}")`;
          break;
        default:
          query = busqueda;
      }

      if (fechaInicio) {
        query += ` AND PUBYEAR AFT ${fechaInicio}`;
      }
      if (fechaFin) {
        query += ` AND PUBYEAR BEF ${fechaFin}`;
      }

      const response = await axios.get(API_URL, {
        params: {
          query: query,
          apiKey: API_KEY,
          start: 0,
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
        setShowResults(true);
        generateWordcloud(formattedResults);
      } else {
        setError("No se encontraron resultados para la búsqueda.");
        setResultados([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error(error);
      setError("Ocurrió un error al realizar la búsqueda.");
      setResultados([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const processAndSaveData = async (articles) => {
    const formattedResults = await Promise.all(articles.map(article => processArticleData(article)));
    return formattedResults;
  };

  const processArticleData = async (article) => {
    const { refcount, keywords, issn, abstract, authors_list } = await getRefCount(article['dc:identifier'].replace('SCOPUS_ID:', ''));
    const hIndex = await getAuthorHIndex(article['dc:creator']);
    const { snip, sjr } = await getJournalMetrics(issn);

    return {
      title: article['dc:title'] || 'N/A',
      pub_date: article['prism:coverDate'] || 'N/A',
      authors: authors_list,
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
      const abstract = data?.item?.bibrecord?.head?.abstracts || 'N/A';
      const keywords = data?.authkeywords?.['author-keyword']?.map(keyword => keyword['$']).join(', ') || 'N/A';
      const issn = data?.coredata?.['prism:issn'] || 'N/A';
      const authors_list = data?.authors?.['author']?.map(authorKey => authorKey['ce:indexed-name']).join(', ') || 'N/A';
      return { refcount, keywords, issn, abstract,authors_list };
    } catch (error) {
      console.error(`Error al obtener refcount para el artículo ${scopus_id}:`, error);
      throw new Error(`Error al obtener refcount para el artículo ${scopus_id}: ${error.message}`);
    }
  };

  const getAuthorHIndex = async (authorName) => {
    try {
      const response = await axios.get('http://localhost:5000/get_h_index', {
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

  const generateWordcloud = async (results) => {
    const text = results.map(r => r.title + ' ' + r.keywords).join(' ');
    try {
      const response = await axios.post(`http://localhost:5000/wordcloud`, { texto: text }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));
      setWordcloudUrl(url);
    } catch (err) {
      console.error('Error al generar la nube de palabras', err);
      setError('Error al generar la nube de palabras');
      setShowErrorModal(true);
    }
  };

  const handleChange = (e) => {
    setBusqueda(e.target.value);
  };

  const handleTipoBusquedaChange = (e) => {
    setTipoBusqueda(e.target.value);
  };

  const handleFechaInicioChange = (e) => {
    setFechaInicio(e.target.value);
  };

  const handleFechaFinChange = (e) => {
    setFechaFin(e.target.value);
  };

  const handleDownload = () => {
    const escapeCsvValue = (value) => {
      if (value == null) {
        return '';
      }
      value = value.toString().replace(/"/g, '""');
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

  const generateNodesCSV = (resultados) => {
    const nodes = new Set();
    resultados.forEach((resultado) => {
        const authors = resultado.authors.split(',').map(author => author.trim()).filter(author => author !== '');
        authors.forEach(author => nodes.add(author));
    });
    return "Id,Label\n" + Array.from(nodes).map(node => `"${node}","${node}"`).join("\n");
};

const generateEdgesCSV = (resultados) => {
    const edges = [];
    
    resultados.forEach((resultado) => {
        const authors = resultado.authors.split(',').map(author => author.trim()).filter(author => author !== '');
        
        if (authors.length > 1) {
            for (let i = 0; i < authors.length; i++) {
                for (let j = i + 1; j < authors.length; j++) {
                    edges.push([authors[i], authors[j]]);
                }
            }
        }
    });

    console.log("Edges:", edges); // Verifica los datos de aristas

    const edgesCSV = "Source,Target\n" + edges.map(edge => `"${edge[0]}","${edge[1]}"`).join("\n");
    return edgesCSV;
};

const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const handleExportGephiCSV = () => {
    const nodesCSV = generateNodesCSV(resultados);
    const edgesCSV = generateEdgesCSV(resultados);
    downloadCSV(nodesCSV, "gephi_nodes.csv");
    downloadCSV(edgesCSV, "gephi_edges.csv");
};



  const handleNavigate = () => {
    navigate('/stadistics', { state: { resultados } });
  };

  const handleCloseErrorModal = () => setShowErrorModal(false);


  const styles = {
    appContainer: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    },
    header: {
      position: 'sticky',
      top: 0,
      backgroundColor: '#f8f9fa',
      padding: '10px',
      borderBottom: '1px solid #dee2e6',
      display: 'flex',
      gap: '10px',
      zIndex: 200, // Asegúrate de que este valor sea mayor al del sidebar
    }, 
    buttonsContainer: {
      display: 'flex',
      gap: '10px',
    },
    searchContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
    },
    dFlex: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      height: '100vh', 
    },
    loadingText: {
      textAlign: 'center',
      marginBottom: '10px',
    },
    spinner: {
      marginLeft: '-10px', 
    },
    textDanger: {
      color: '#dc3545',
    },
    inputGroup: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
    },
    formControl: {
      flex: 1,
    },
    disabledButton: {
      cursor: 'not-allowed',
      opacity: 0.65,
    },
    modalHeader: {
      backgroundColor: '#007bff',
      color: '#fff',
    },
    modalBody: {
      fontSize: '16px',
      textAlign: 'center', 
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'center',
    },
    resultsContainer: {
      display: showResults ? 'block' : 'none',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      margin: '20px 0',
    },
    wordcloudContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '20px 0',
    },
    wordcloudImage: {
      maxWidth: '90%', 
      height: 'auto',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    },
    heading: {
      fontSize: '1.5rem',
      marginBottom: '15px',
      color: '#343a40',
      textAlign: 'center', 
    },
    button: {
      marginTop: '15px',
      zIndex: 200
    },
  };

  const isResultsAvailable = resultados.length > 0;

  return (
    <div style={styles.appContainer}>
      <div style={styles.header}>
        <div style={styles.buttonsContainer}>
          <button
            className={`btn btn-primary ${!isResultsAvailable ? 'disabled' : ''}`}
            onClick={handleDownload}
            disabled={!isResultsAvailable}
          >
            Descargar CSV
          </button>
          <button
            className={`btn btn-secondary ${!isResultsAvailable ? 'disabled' : ''}`}
            onClick={handleExportGephiCSV}
            disabled={!isResultsAvailable}
          >
            Exportar CSV para Gephi
          </button>
        </div>
      </div>
  
      <div style={styles.searchContainer}>
        {/* Primer buscador */}
        <div className="buscador" style={styles.buscador}>
          <div className="input-group mb-3" style={styles.inputGroup}>
            <select className="form-select" value={tipoBusqueda} onChange={handleTipoBusquedaChange}>
              <option value="default">Sin Filtro</option>
              <option value="title">Título</option>
              <option value="author">Autores</option>
              <option value="first_author">Primer Autor</option>
              <option value="keywords">Palabras Clave</option>
            </select>
            <input
              type="text"
              className="form-control"
              value={busqueda}
              placeholder="Búsqueda de información"
              onChange={handleChange}
              style={styles.formControl}
            />
            <input
              type="number"
              className="form-control"
              value={fechaInicio}
              placeholder="Fecha de Inicio (YYYY)"
              onChange={handleFechaInicioChange}
              min={MIN_YEAR}
              max={MAX_YEAR}
              style={styles.formControl}
            />
            <input
              type="number"
              className="form-control"
              value={fechaFin}
              placeholder="Fecha de Fin (YYYY)"
              onChange={handleFechaFinChange}
              min={MIN_YEAR}
              max={MAX_YEAR}
              style={styles.formControl}
            />
            <button className="btn btn-success" onClick={handleSearch} disabled={loading}>
              Buscar
            </button>
          </div>
        </div>
  
        {/* Segundo buscador reemplazado con Ranking */}
        <div className="buscador-avanzado" style={styles.buscadorAvanzado}>
          <div className="card shadow-sm p-4 mb-4">
            <h3 className="mb-4 text-center">Búsqueda Avanzada</h3>
            <form className="row g-3">
              <div className="col-md-3">
                <label htmlFor="tipoBusqueda" className="form-label">Tipo de Búsqueda</label>
                <select
                  id="tipoBusqueda"
                  className="form-select"
                  value={tipoBusqueda}
                  onChange={handleTipoBusquedaChange}
                >
                  <option value="title">Título</option>
                  <option value="keywords">Clave</option>
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="busqueda" className="form-label">Término de Búsqueda</label>
                <input
                  id="busqueda"
                  type="text"
                  className="form-control"
                  value={busqueda}
                  placeholder="Ej. Ciencia de Datos"
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-2">
                <label htmlFor="fechaInicio" className="form-label">Año Inicio</label>
                <input
                  id="fechaInicio"
                  type="number"
                  className="form-control"
                  value={fechaInicio}
                  placeholder="1985"
                  onChange={handleFechaInicioChange}
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                />
              </div>
              <div className="col-md-2">
                <label htmlFor="fechaFin" className="form-label">Año Fin</label>
                <input
                  id="fechaFin"
                  type="number"
                  className="form-control"
                  value={fechaFin}
                  placeholder="2024"
                  onChange={handleFechaFinChange}
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button
                  type="button"
                  className="btn btn-primary w-100"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? "Cargando..." : "Buscar"}
                </button>
              </div>
            </form>
            {/* Source Selection */}
            <div className="mt-3">
              <label className="form-label">Fuentes de Búsqueda:</label>
              <div className="d-flex gap-2">
                {["scopus", "crossref", "scholar"].map((source) => (
                  <button
                    key={source}
                    type="button"
                    className={`btn btn-outline-${source === "scopus" ? "success" : source === "crossref" ? "warning" : "info"} ${
                      selectedSources.includes(source) ? "active" : ""
                    }`}
                    onClick={() => toggleSource(source)}
                  >
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
};

export default SearcherPage;

