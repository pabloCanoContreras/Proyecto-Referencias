import { makeStyles } from '@material-ui/core/styles';
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";
import React, { useState } from "react";
import { FaDownload } from "react-icons/fa";

function escapeRegExp(value) {
  return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

const ResultsTable = ({ results }) => {
  const [paginationState, setPaginationState] = useState({
    scopus: { page: 0, rowsPerPage: 10 },
    crossref: { page: 0, rowsPerPage: 10 },
  });


  const [searchText, setSearchText] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("");

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };


  const sortRows = (rows) => {
    if (!orderBy) return rows;
    return [...rows].sort((a, b) => {
      if (a[orderBy] < b[orderBy]) return order === "asc" ? -1 : 1;
      if (a[orderBy] > b[orderBy]) return order === "asc" ? 1 : -1;
      return 0;
    });
  };

  const useStyles = makeStyles({
    container: {
      maxHeight: 440, // Altura máxima con scroll automático
    },
  });


  function ScrollableTable({ children }) {
    const classes = useStyles();
  
    return (
      <Paper>
        <TableContainer className={classes.container}>
          <Table stickyHeader>{children}</Table>
        </TableContainer>
      </Paper>
    );
  }

  const requestSearch = (searchValue) => {
    setSearchText(searchValue);
  };

  const removeDuplicates = (rows) => {
    const seen = new Set();
    return rows.filter((article) => {
      const uniqueKey = `${article.title}|${article.publication_year}|${article.citation_count}`;
      if (seen.has(uniqueKey)) {
        return false; // Filtra los duplicados
      } else {
        seen.add(uniqueKey);
        return true;
      }
    });
  };


  

  const generateCSV = (data, source) => {
    const headers = ["Título", "Año", "Citas", "Autores", "H-Index", "Keywords"];
    if (source === "scopus") {
      headers.push("CiteScore", "SNIP", "DOI", "Scimago Rank"); 
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
      ...rows.map((row) => row.map((cell) => `${cell}`).join(",")), // Filas
 // Filas
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

  const [citationGraph, setCitationGraph] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: "50%", left: "50%" });

  const fetchCitationGraph = async (title, source) => {
    try {
      const response = await fetch("http://localhost:5000/generate_citation_graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: title, source }), // <-- Enviar la fuente también
      });
  
      const data = await response.json();
  
      if (data.status === "success") {
        const blob = new Blob([atob(data.graph_html)], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        alert(`Error generando el grafo para ${source}: ` + data.message);
      }
    } catch (error) {
      console.error(`Error al obtener el gráfico de citas para ${source}:`, error);
      alert("No se pudo generar el grafo.");
    }
  };

  const filteredRows = (rows) => {
    if (!searchText) return rows;
    const searchRegex = new RegExp(escapeRegExp(searchText), "i");
    return rows.filter((row) =>
      Object.values(row).some((value) =>
        value !== null && value !== undefined && searchRegex.test(String(value))
      )
    );    
  };
  

  if (!Object.keys(results).length) {
    return <p className="text-muted mt-4">No hay resultados para mostrar.</p>;
  }

  return (
    <div className="mt-5">
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <TextField
          variant="outlined"
          placeholder="Filtrar por titulo, citas, keywords etc...."
          value={searchText}
          onChange={(e) => requestSearch(e.target.value)}
          fullWidth
          sx={{
            backgroundColor: "#fff", // Fondo blanco
            borderRadius: "8px", // Bordes redondeados
            boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", // Sombra sutil
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "#ccc", // Color del borde
              },
              "&:hover fieldset": {
                borderColor: "#007bff", // Color al pasar el mouse
              },
              "&.Mui-focused fieldset": {
                borderColor: "#007bff", // Color al hacer clic
              },
            },
          }}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" />,
            endAdornment: (
              <IconButton
                size="small"
                onClick={() => requestSearch("")}
                style={{ visibility: searchText ? "visible" : "hidden" }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ),
          }}
        />
      </div>
      {Object.keys(results).map((source) => {
        const rows = results[source];
        const { page, rowsPerPage } = paginationState[source] || { page: 0, rowsPerPage: 10 };
        const sortedRows = sortRows(filteredRows(rows));
        const uniqueRows = removeDuplicates(sortedRows);

        return (
          <div key={source} className="mb-5" style={{ position: "relative" }}>
            <Typography variant="h5" className={`text-uppercase text-white p-3 bg-${source === "scopus" ? "success" : source === "crossref" ? "warning" : "info"}`}>
              {source.toUpperCase()}
            </Typography>
            <Paper elevation={3}>
              <ScrollableTable>
              <TableContainer>
                <Table stickyHeader aria-label={`${source} table`}>
                  <TableHead>
                    <TableRow>
                      {[
                        { id: "title", label: "Título" },
                        { id: "publication_year", label: "Año" },
                        { id: "citation_count", label: "Citas" },
                        { id: "authors", label: "Autores Index" },
                        { id: "keywords", label: "Keywords" },
                      ].map((column) => (
                        <TableCell key={column.id} sx={{ textAlign: "center", fontWeight: "bold" }}>
                          <TableSortLabel
                            active={orderBy === column.id}
                            direction={orderBy === column.id ? order : "asc"}
                            onClick={() => handleRequestSort(column.id)}
                          >
                            {column.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                      {source === "scopus" && (
                        <>
                          <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>CiteScore</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>SNIP</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>DOI</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>Scimago Rank</TableCell>
                        </>
                      )}
                       {source === "crossref" && (
                        <>
                          <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>DOI</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uniqueRows
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((article, index) => (
                        <TableRow hover key={index}>
                          <TableCell
                            onClick={() => fetchCitationGraph(article.title, source)} // <-- Pasar 'source'
                            style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}>
                            {article.title}
                          </TableCell>
                          <TableCell>{article.publication_year}</TableCell>
                          <TableCell>{article.citation_count}</TableCell>
                          <TableCell>
                          <TableCell>
                          <TableCell>
                                {article.authors && typeof article.authors === "object" ? (
                                  <>
                                    {Object.entries(article.authors).map(([authorId, authorData], idx) => (
                                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                        <span>{authorData.name}</span>
                                        {authorId ? (
                                          <a
                                            href={`https://www.scopus.com/authid/detail.uri?authorId=${authorId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: "none", color: "blue" }}
                                          >
                                            {authorData.h_index}
                                          </a>
                                        ) : (
                                          <span style={{ fontSize: "0.9rem", color: "gray" }}>{authorData.h_index}</span>
                                        )}
                                      </div>
                                    ))}
                                  </>
                                ) : source === "scholar" && typeof article.h_index === "object" ? (
                                  <>
                                    {article.authors.split(",").map((author, idx, arr) => {
                                      const trimmedAuthor = author.trim();
                                      const isLastAuthor = idx === arr.length - 1;
                                      const authorId = article.author_id;
                                      const hIndex = article.h_index[trimmedAuthor] || "No disponible";

                                      return (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                          <span>{trimmedAuthor}</span>
                                          {authorId && (arr.length === 1 || isLastAuthor) ? (
                                            <a
                                              href={`https://scholar.google.com/citations?user=${authorId}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{ textDecoration: "none", color: "blue" }}
                                            >
                                              {hIndex}
                                            </a>
                                          ) : (
                                            <span style={{ fontSize: "0.9rem", color: "gray" }}>{hIndex}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </>
                                   ) : source === "crossref" ? (
                                    <>
                                      {article.authors.split(",").map((author, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                          <span>{author.trim()}</span>
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    "Sin autores"
                                  )}
                              </TableCell>



                          </TableCell>
                          </TableCell>
                          <TableCell>{article.keywords || "No disponibles"}</TableCell>
                          {source === "scopus" && (
                            <>
                              <TableCell>
                                {Array.isArray(article.journal_h_index) && article.journal_h_index.length > 0
                                  ? article.journal_h_index.map((entry, idx) => (
                                      <div key={idx}>
                                        Año {entry.year}: {entry.citescore}
                                      </div>
                                    ))
                                  : "No disponible"}
                              </TableCell>
                              <TableCell>{article.snip || "No disponible"}</TableCell>
                              <TableCell>
                                {article.doi ? (
                                  <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "blue" }}>
                                    {article.doi}
                                  </a>
                                ) : (
                                  "No disponible"
                                )}
                              </TableCell>
                              <TableCell>{article.scimago_rank || "No disponible"}</TableCell>
                            </>
                          )}
                          {source === "crossref" && (
                            <TableCell>
                                {article.doi ? (
                                <a
                                    href={`https://doi.org/${article.doi}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: "none", color: "blue" }}
                                >
                                    {article.doi}
                                </a>
                                ) : (
                                "No disponible"
                                )}
                            </TableCell>
                            )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </ScrollableTable>
              <TablePagination
                rowsPerPageOptions={[10, 25, 100]}
                component="div"
                count={uniqueRows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(event, newPage) => setPaginationState((prev) => ({ ...prev, [source]: { ...prev[source], page: newPage } }))}
                onRowsPerPageChange={(event) =>
                  setPaginationState((prev) => ({
                    ...prev,
                    [source]: { ...prev[source], rowsPerPage: parseInt(event.target.value, 10), page: 0 },
                  }))
                }
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
              <div style={{ position: "fixed", top: tooltipPosition.top, left: tooltipPosition.left, backgroundColor: "white", border: "1px solid gray", padding: "10px", boxShadow: "2px 2px 10px rgba(0,0,0,0.2)", zIndex: 1000 }}>
                <img src={citationGraph} alt="Grafo de citas" style={{ maxWidth: "80vw", maxHeight: "80vh" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

ResultsTable.propTypes = { results: PropTypes.object.isRequired };
export default ResultsTable;
