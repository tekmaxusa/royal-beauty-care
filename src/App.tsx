import React, { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Header, Footer } from '@/src/components/Layout';
import { Home, About, Services, Gallery, Contact, GiftPackages, SpecialOffers, ServiceCategoryDetail } from '@/src/pages/Pages';
import { BackToTop } from '@/src/components/BackToTop';
import { AuthProvider } from '@/src/app/context/AuthContext';
import MerchantBookingNotifier from '@/src/app/components/MerchantBookingNotifier';
import BookingPage from '@/src/app/pages/BookingPage';
import LoginPage from '@/src/app/pages/LoginPage';
import SignupPage from '@/src/app/pages/SignupPage';
import ForgotPasswordPage from '@/src/app/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/src/app/pages/ResetPasswordPage';
import ClientDashboardPage from '@/src/app/pages/ClientDashboardPage';
import AdminLoginPage from '@/src/app/pages/AdminLoginPage';
import AdminBookingsPage from '@/src/app/pages/AdminBookingsPage';
import AdminUsersPage from '@/src/app/pages/AdminUsersPage';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function AdminIndex() {
  return <Navigate to="/admin/login" replace />;
}

function AppShell() {
  const { pathname } = useLocation();
  const isMerchantRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <div className="min-h-screen flex flex-col">
      {!isMerchantRoute && <Header />}
      <div className="flex-grow">
        <Routes>
          {/* Royal marketing routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:categoryId" element={<ServiceCategoryDetail />} />
          <Route path="/gift-packages" element={<GiftPackages />} />
          <Route path="/special-offers" element={<SpecialOffers />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />

          {/* Booking/auth/admin app routes (ported) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<ClientDashboardPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/admin" element={<AdminIndex />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isMerchantRoute && <Footer />}
    </div>
  );
}

const routerBasename =
  import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <Router basename={routerBasename}>
      <ScrollToTop />
      <BackToTop />
      <AuthProvider>
        <MerchantBookingNotifier />
        <AppShell />
      </AuthProvider>
    </Router>
  );
}
