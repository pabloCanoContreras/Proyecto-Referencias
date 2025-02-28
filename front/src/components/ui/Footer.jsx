import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-5 text-center text-muted small">
      &copy; {new Date().getFullYear()} Universidad de Alcalá. Todos los derechos reservados.
    </footer>
  );
};

export default Footer;
