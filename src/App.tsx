import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Header, Footer } from '@/src/components/Layout';
import { Home, About, Services, Gallery, Contact, GiftPackages, SpecialOffers, ServiceCategoryDetail } from '@/src/pages/Pages';
import { BackToTop } from '@/src/components/BackToTop';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <BackToTop />
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:categoryId" element={<ServiceCategoryDetail />} />
            <Route path="/gift-packages" element={<GiftPackages />} />
            <Route path="/special-offers" element={<SpecialOffers />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}
