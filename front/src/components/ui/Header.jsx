import { faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

const Header = () => {
  return (
    <header className="bg-white p-5 rounded-3 shadow-lg text-center w-100" style={{ maxWidth: '600px' }}>
      <div className="mb-4">
        <FontAwesomeIcon icon={faGraduationCap} className="text-primary" style={{ fontSize: '3rem' }} />
      </div>
      <h1 className="display-5 text-primary fw-bold">Universidad de Alcalá</h1>
      <h2 className="h4 text-secondary fw-semibold mt-2">Trabajo de Fin de Grado</h2>
      <p className="text-muted mt-3">Investigación de Referencias Bibliográficas</p>
      <p className="text-secondary mt-2 small">Bienvenido al portal web de tu TFG</p>
    </header>
  );
};

export default Header;
