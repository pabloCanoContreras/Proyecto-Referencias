import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";
import React, { useState } from "react";
import { FaDownload } from "react-icons/fa";

const ResultsTable = ({ results }) => {
  // Estado para manejar la paginación por fuente (sin Scholar)
  const [paginationState, setPaginationState] = useState({
    scopus: { page: 0, rowsPerPage: 10 },
    crossref: { page: 0, rowsPerPage: 10 },
  });

  const [citationGraph, setCitationGraph] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const fetchCitationGraph = async (title, event) => {
    setTooltipPosition({ top: event.clientY + 10, left: event.clientX + 10 });

    try {
      const response = await fetch("http://localhost:5000/generate_citation_graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: title, limit: 5 }), // Limitamos los resultados
      });

      const data = await response.json();
      if (data.status === "success") {
        setCitationGraph(`data:image/png;base64,${data.image}`);
      } else {
        setCitationGraph(null);
      }
    } catch (error) {
      console.error("Error al obtener el gráfico de citas:", error);
      setCitationGraph(null);
    }
  };

  const clearCitationGraph = () => {
    setCitationGraph(null);
  };

  // Cambiar de página
  const handleChangePage = (source, newPage) => {
    setPaginationState((prevState) => ({
      ...prevState,
      [source]: { ...prevState[source], page: newPage },
    }));
  };

  // Cambiar el número de filas por página
  const handleChangeRowsPerPage = (source, event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setPaginationState((prevState) => ({
      ...prevState,
      [source]: { ...prevState[source], rowsPerPage: newRowsPerPage, page: 0 },
    }));
  };

  const generateCSV = (data, source) => {
    const headers = ["Título", "Año", "Citas", "Autores", "H-Index", "Keywords"];
    if (source === "scopus") {
      headers.push("CiteScore", "SNIP", "DOI", "Scimago Rank"); // Agregar columnas adicionales
    }
  
    const rows = data.map((article) => {
      const hIndexFormatted =
        typeof article.h_index === "object" && Object.keys(article.h_index).length > 0
          ? Object.entries(article.h_index)
              .map(([authorId, hIndex]) => `${authorId}: ${hIndex}`)
              .join(", ")
          : "N/A";
  
      const row = [
        article.title,
        article.publication_year,
        article.citation_count,
        article.authors || "Sin autores",
        hIndexFormatted,
        article.keywords || "No disponibles",
      ];
  
      if (source === "scopus") {
        row.push(
          Array.isArray(article.journal_h_index) && article.journal_h_index.length > 0
            ? article.journal_h_index.map((entry) => `Año ${entry.year}: ${entry.citescore}`).join(" | ")
            : "No disponible",
          article.snip || "No disponible",
          article.doi ? `https://doi.org/${article.doi}` : "No disponible",
          article.scimago_rank || "No disponible"
        );
      }
  
      return row;
    });
  
    const csvContent = [
      headers.join(","), // Encabezados
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")), // Filas
    ].join("\n");
  
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${source}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!Object.keys(results).length) {
    return <p className="text-muted mt-4">No hay resultados para mostrar.</p>;
  }

  return (
    <div className="mt-5">
      {Object.keys(results).map((source) => {
        const rows = results[source];
        const { page, rowsPerPage } = paginationState[source] || { page: 0, rowsPerPage: 10 };

        return (
          <div key={source} className="mb-5" style={{ position: "relative" }}>
            <Typography
              variant="h5"
              className={`text-uppercase text-white p-3 bg-${source === "scopus" ? "success" : "warning"}`}
            >
              {source.toUpperCase()}
            </Typography>
            <Paper elevation={3}>
              <TableContainer>
                <Table stickyHeader aria-label={`${source} table`}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Título</TableCell>
                      <TableCell>Año</TableCell>
                      <TableCell>Citas</TableCell>
                      <TableCell>Autores</TableCell>
                      <TableCell>H-Index</TableCell>
                      <TableCell>Keywords</TableCell>
                      {source === "scopus" && <TableCell>Factor de Impacto (CiteScore)</TableCell>} {/* Nueva columna */}
                      {source === "scopus" && <TableCell>SNIP</TableCell>}
                      {source === "scopus" && <TableCell>DOI</TableCell>}
                      {source === "scopus" && <TableCell>Scimago Rank</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((article, index) => (
                        <TableRow hover key={index}>
                          <TableCell
                          onMouseEnter={(event) => fetchCitationGraph(article.title, event)}
                          onMouseLeave={clearCitationGraph}
                          style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}
                        >
                          {article.title}
                        </TableCell>
                          <TableCell>{article.publication_year}</TableCell>
                          <TableCell>{article.citation_count}</TableCell>
                          <TableCell>{article.authors || "Sin autores"}</TableCell>
                          <TableCell>
                          <TableCell>
                            {typeof article.h_index === "object" && Object.keys(article.h_index).length > 0
                              ? Object.entries(article.h_index).map(([authorId, hIndex]) => (
                                  <div key={authorId}>
                                    <a
                                      href={`https://www.scopus.com/authid/detail.uri?authorId=${authorId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ textDecoration: "none", color: "blue" }}
                                    >
                                      {`${hIndex}`}
                                    </a>
                                  </div>
                                ))
                              : "N/A"}
                          </TableCell>

                          </TableCell>

                          <TableCell>{article.keywords || "No disponibles"}</TableCell>
                          {source === "scopus" && (
                            <TableCell>
                            {Array.isArray(article.journal_h_index) && article.journal_h_index.length > 0 ? (
                              article.journal_h_index.map((entry, idx) => (
                                <div key={idx}>
                                  Año {entry.year}: {entry.citescore}
                                </div>
                              ))
                            ) : (
                              "No disponible"
                            )}
                          </TableCell>)} {/* Mostrar CiteScore solo para Scopus */}
                          <TableCell>{article.snip || "No disponible"}</TableCell>
                          <TableCell>
                            {article.doi ? (
                              <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer">
                                {article.doi}
                              </a>
                            ) : "No disponible"}
                          </TableCell>
                          <TableCell>{article.scimago_rank || "No disponible"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 100]}
                component="div"
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(event, newPage) => handleChangePage(source, newPage)}
                onRowsPerPageChange={(event) => handleChangeRowsPerPage(source, event)}
              />
            </Paper>
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                zIndex: 10,
              }}
            >
              <button
                className="btn btn-link text-primary"
                onClick={() => generateCSV(rows, source)}
              >
                <FaDownload size={20} />
              </button>
            </div>
            {citationGraph && (
              <div
              style={{
                position: "absolute",
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                backgroundColor: "white",
                border: "1px solid gray",
                padding: "10px",
                boxShadow: "2px 2px 10px rgba(0,0,0,0.2)",
                zIndex: 1000,
              }}
            >
              <img src={citationGraph} alt="Grafo de citas" style={{ width: "300px" }}/>
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
};

ResultsTable.propTypes = {
  results: PropTypes.object.isRequired,
};

export default ResultsTable;
