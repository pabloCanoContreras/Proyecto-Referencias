import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from 'react';


const SearchResults = ({ resultados }) => {
  
  const [expandedFirst, setExpandedFirst] = useState(false);
  const [expandedSecond, setExpandedSecond] = useState(false);
  const [expandedThird, setExpandedThird] = useState(false);

 
  const toggleVisibilityFirst = () => {
    setExpandedFirst(!expandedFirst);
  };

  const toggleVisibilitySecond = () => {
    setExpandedSecond(!expandedSecond);
  };

  const toggleVisibilityThird = () => {
    setExpandedThird(!expandedThird);
  };

  return (
    <div className="table-responsive">
      <table className="table table-bordered table-striped table-alternating">
        <thead className="thead-dark">
          <tr onClick={toggleVisibilityFirst} style={{ cursor: 'pointer' }}>
            <th>Title</th>
            <th>Publication Date</th>
            <th>Authors</th>
            <th>Volume</th>
            <th>Issue</th>
            <th>Pages</th>
          </tr>
        </thead>
        <tbody>
          {expandedFirst && resultados.map((resultado, index) => (
            <tr key={index} className={index % 2 === 0 ? 'row-white' : 'row-yellow'}>
              <td>{resultado.title}</td>
              <td>{resultado.pub_date}</td>
              <td>{resultado.authors}</td>
              <td>{resultado.volume}</td>
              <td>{resultado.issue}</td>
              <td>{resultado.pages}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="table table-bordered table-striped table-alternating">
        <thead className="thead-dark">
          <tr onClick={toggleVisibilitySecond} style={{ cursor: 'pointer' }}>
            <th>Citations</th>
            <th>DOI</th>
            <th>Keywords</th>
            <th>Journal</th>
            <th>ISSN</th>
            <th>eISSN</th>
            <th>H-Index</th>
            <th>SNIP</th>
            <th>SJR</th>
          </tr>
        </thead>
        <tbody>
          {expandedSecond && resultados.map((resultado, index) => (
            <tr key={index} className={index % 2 === 0 ? 'row-white' : 'row-yellow'}>
              <td>{resultado.citations}</td>
              <td>{resultado.doi}</td>
              <td>{resultado.keywords}</td>
              <td>{resultado.journal}</td>
              <td>{resultado.issn}</td>
              <td>{resultado.eissn}</td>
              <td>{resultado.hIndex}</td>
              <td>{resultado.snip}</td>
              <td>{resultado.sjr}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="table table-bordered table-striped table-alternating">
        <thead className="thead-dark">
          <tr onClick={toggleVisibilityThird} style={{ cursor: 'pointer' }}>
            <th>Abstract</th>
          </tr>
        </thead>
        <tbody>
          {expandedThird && resultados.map((resultado, index) => (
            <tr key={index} className={index % 2 === 0 ? 'row-white' : 'row-yellow'}>
              <td className=".abstract-content">{resultado.abstract}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SearchResults;
