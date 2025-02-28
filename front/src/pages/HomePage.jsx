import React from 'react';
import Footer from '../components/ui/Footer';
import Header from '../components/ui/Header';

function HomePage() {
  return (
    <section className="bg-light min-vh-100 d-flex flex-column justify-content-center align-items-center p-4">
      <Header />
      <Footer />
    </section>
  );
}

export default HomePage;
