import { faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

function HomePage() {
  return (
    <section className="bg-gray-100 min-h-screen flex flex-col justify-center items-center p-6">
      <header className="bg-white p-6 md:p-10 rounded-lg shadow-lg text-center max-w-4xl w-full">
        <FontAwesomeIcon icon={faGraduationCap} className="text-blue-900 text-4xl md:text-5xl mb-4 -mt-6"/>
        <h1 className="text-3xl md:text-4xl font-bold text-blue-900">Universidad de Alcalá</h1>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-700 mt-2">Trabajo de Fin de Grado</h2>
        <p className="text-md md:text-lg text-gray-600 mt-4">
          Investigación de Referencias Bibliográficas
        </p>
        <p className="text-sm md:text-md text-gray-500 mt-2">
          Bienvenido al portal web de tu TFG
        </p>
      </header>
      <footer className="mt-10 text-center text-gray-600">
        <p className="text-xs md:text-sm">&copy; 2024 Universidad de Alcalá. Todos los derechos reservados.</p>
      </footer>
    </section>
  );
}

export default HomePage;


