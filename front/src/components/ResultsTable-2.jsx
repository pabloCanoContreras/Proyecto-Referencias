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
  // Estado para manejar la paginación por fuente
  const [paginationState, setPaginationState] = useState({
    scopus: { page: 0, rowsPerPage: 10 },
    crossref: { page: 0, rowsPerPage: 10 },
    scholar: { page: 0, rowsPerPage: 10 },
  });

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

  // Generar CSV con CiteScore en Scopus
  const generateCSV = (data, source) => {
    const headers = ["Título", "Año", "Citas", "Autores", "H-Index", "Keywords"];
    if (source === "scopus") headers.push("CiteScore"); // Agregar CiteScore solo para Scopus

    const rows = data.map((article) => {
      const row = [
        article.title,
        article.publication_year,
        article.citation_count,
        article.authors || "Sin autores",
        Array.isArray(article.h_index) && article.h_index.length > 0
          ? article.h_index.map((h) => h || "N/A").join(", ")
          : "N/A",
        article.keywords,
      ];
      if (source === "scopus") row.push(article.citescore || "No disponible");
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
              className={`text-uppercase text-white p-3 bg-${
                source === "scopus" ? "success" : source === "crossref" ? "warning" : "info"
              }`}
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((article, index) => (
                        <TableRow hover key={index}>
                          <TableCell>{article.title}</TableCell>
                          <TableCell>{article.publication_year}</TableCell>
                          <TableCell>{article.citation_count}</TableCell>
                          <TableCell>{article.authors || "Sin autores"}</TableCell>
                          <TableCell>
                            {Array.isArray(article.h_index) && article.h_index.length > 0
                              ? article.h_index.map((h) => h || "N/A").join(", ")
                              : "N/A"}
                          </TableCell>
                          <TableCell>{article.keywords || "No disponibles"}</TableCell>
                          {source === "scopus" && (
                            <TableCell>{article.citescore || "No disponible"}</TableCell>
                          )} {/* Mostrar CiteScore solo para Scopus */}
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
