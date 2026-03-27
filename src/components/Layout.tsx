import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Instagram, Facebook, Phone, Mail, MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { CONTACT_INFO, SERVICE_CATEGORIES } from '@/src/constants';
import { apiLogout, useAuth } from '@/src/app/context/AuthContext';
import logoUrl from '@/src/assets/royal-logo.png';

const navLinks = [
  { name: 'About Us', path: '/about' },
  { name: 'Services', path: '/services' },
  { name: 'Gift Packages', path: '/gift-packages' },
  { name: 'Special Offers', path: '/special-offers' },
  { name: 'Contact Us', path: '/contact' },
];

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();
  const { user, loading, refreshMe, setUser } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHomePage = location.pathname === '/';
  const hasHero = ['/', '/gift-packages', '/special-offers', '/services'].includes(location.pathname) || location.pathname.startsWith('/services/');
  const isScrolled = scrolled || !hasHero;

  const onLogout = async () => {
    setIsOpen(false);
    setUser(null);
    await apiLogout();
    try {
      await refreshMe();
    } catch {
      setUser(null);
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 w-full z-50',
        isScrolled ? 'bg-white/95 backdrop-blur-md py-2 shadow-md' : 'bg-transparent py-4'
      )}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-4 group">
          <img
            src={logoUrl}
            alt="Royal Beauty Care"
            className={cn('h-24 w-24 md:h-28 md:w-28 object-contain', isScrolled ? 'opacity-100' : 'opacity-95')}
            loading="eager"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-10">
          {navLinks.map((link) => {
            if (link.name === 'Services') {
              return (
                <div 
                  key={link.name}
                  className="relative group"
                  onMouseEnter={() => setIsServicesOpen(true)}
                  onMouseLeave={() => setIsServicesOpen(false)}
                >
                  <button
                    type="button"
                    className={cn(
                      'text-sm uppercase tracking-widest luxury-underline flex items-center gap-1 py-4',
                      location.pathname === link.path
                        ? 'text-luxury-gold font-semibold' 
                        : (isScrolled ? 'text-luxury-black hover:text-luxury-gold' : 'text-white hover:text-luxury-gold')
                    )}
                    onClick={() => setIsServicesOpen((v) => !v)}
                  >
                    {link.name}
                    <ChevronDown size={12} className={cn(isServicesOpen && 'rotate-180')} />
                  </button>
                  
                  {isServicesOpen && (
                    <div className="absolute top-full left-0 w-64 bg-luxury-black shadow-2xl py-4 z-50">
                      {SERVICE_CATEGORIES.map((cat) => (
                        <Link
                          key={cat.name}
                          to={cat.path}
                          className="block px-6 py-3 text-xs uppercase tracking-widest text-white hover:text-luxury-gold hover:bg-white/5"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  'text-sm uppercase tracking-widest luxury-underline',
                  location.pathname === link.path 
                    ? 'text-luxury-gold font-semibold' 
                    : (isScrolled ? 'text-luxury-black hover:text-luxury-gold' : 'text-white hover:text-luxury-gold')
                )}
              >
                {link.name}
              </Link>
            );
          })}

          {!loading && !user && (
            <Link
              to="/login"
              className={cn(
                'text-sm uppercase tracking-widest luxury-underline',
                location.pathname.startsWith('/login')
                  ? 'text-luxury-gold font-semibold'
                  : (isScrolled ? 'text-luxury-black hover:text-luxury-gold' : 'text-white hover:text-luxury-gold')
              )}
            >
              Login
            </Link>
          )}

          {!loading && user && (
            <div className="flex items-center gap-7">
              {user.role === 'client' && (
                <Link
                  to="/dashboard"
                  className={cn(
                    'text-sm uppercase tracking-widest luxury-underline',
                    location.pathname.startsWith('/dashboard')
                      ? 'text-luxury-gold font-semibold'
                      : (isScrolled ? 'text-luxury-black hover:text-luxury-gold' : 'text-white hover:text-luxury-gold'),
                  )}
                >
                  Client Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={() => void onLogout()}
                className={cn(
                  'text-sm uppercase tracking-widest luxury-underline',
                  isScrolled ? 'text-luxury-black hover:text-luxury-gold' : 'text-white hover:text-luxury-gold'
                )}
              >
                Logout
              </button>
            </div>
          )}

          <Link
            to="/booking"
            className={cn(
              'px-7 py-2.5 text-sm uppercase tracking-widest',
              isScrolled 
                ? "bg-luxury-black text-white hover:bg-luxury-gold" 
                : "bg-white/20 text-white backdrop-blur-sm border border-white/30 hover:bg-white hover:text-luxury-black"
            )}
          >
            Book Appointment
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button
          className={cn(
            'lg:hidden',
            isScrolled ? "text-luxury-black" : "text-white"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-xl lg:hidden overflow-hidden">
            <nav className="flex flex-col p-8 space-y-6">
              {!loading && user?.role === 'client' && (
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'text-sm uppercase tracking-widest pb-2 border-b border-luxury-beige block',
                    location.pathname.startsWith('/dashboard') ? 'text-luxury-gold' : 'text-luxury-black'
                  )}
                >
                  Client dashboard
                </Link>
              )}

              {navLinks.map((link) => (
                <div key={link.name}>
                  {link.name === 'Services' ? (
                    <div className="space-y-4">
                      <button 
                        onClick={() => setIsServicesOpen(!isServicesOpen)}
                        className={cn(
                          'text-sm uppercase tracking-widest pb-2 border-b border-luxury-beige w-full text-left flex justify-between items-center',
                          location.pathname === link.path ? 'text-luxury-gold' : 'text-luxury-black'
                        )}
                      >
                        {link.name}
                        <ChevronDown size={14} className={cn(isServicesOpen && 'rotate-180')} />
                      </button>
                      {isServicesOpen && (
                          <div className="pl-4 flex flex-col space-y-3 overflow-hidden">
                            {SERVICE_CATEGORIES.map((cat) => (
                              <Link
                                key={cat.name}
                                to={cat.path}
                                onClick={() => setIsOpen(false)}
                                className="text-sm uppercase tracking-widest text-gray-500 hover:text-luxury-gold"
                              >
                                {cat.name}
                              </Link>
                            ))}
                          </div>
                        )}
                    </div>
                  ) : (
                    <Link
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'text-sm uppercase tracking-widest pb-2 border-b border-luxury-beige block',
                        location.pathname === link.path ? 'text-luxury-gold' : 'text-luxury-black'
                      )}
                    >
                      {link.name}
                    </Link>
                  )}
                </div>
              ))}

              {!loading && !user && (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'text-sm uppercase tracking-widest pb-2 border-b border-luxury-beige block',
                    location.pathname.startsWith('/login') ? 'text-luxury-gold' : 'text-luxury-black'
                  )}
                >
                  Login
                </Link>
              )}

              {!loading && user && (
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="text-sm uppercase tracking-widest pb-2 border-b border-luxury-beige w-full text-left text-luxury-black hover:text-luxury-gold"
                >
                  Logout
                </button>
              )}

              <Link
                to="/booking"
                onClick={() => setIsOpen(false)}
                className="text-sm uppercase tracking-widest pb-2 border-b border-luxury-beige block text-luxury-black hover:text-luxury-gold"
              >
                Book Appointment
              </Link>
            </nav>
          </div>
        )}
    </header>
  );
};

export const Footer = () => {
  return (
    <footer className="bg-luxury-black text-white pt-24 pb-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          <div className="space-y-8">
            <Link to="/" className="flex flex-col">
              <span className="text-3xl font-serif tracking-[0.2em] uppercase text-white">Royal</span>
              <span className="text-xs tracking-[0.4em] uppercase text-luxury-gold -mt-1">Beauty Care</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Since 1986, providing exceptional care to clients in the Denver area. Your trusted sanctuary for premium spa experiences.
            </p>
            <div className="flex space-x-5">
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-luxury-gold hover:border-luxury-gold">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-luxury-gold hover:border-luxury-gold">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-luxury-gold hover:border-luxury-gold">
                <Phone size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-xl mb-8 text-luxury-gold">Quick Links</h4>
            <ul className="space-y-4">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm text-gray-400 hover:text-white flex items-center group">
                    <span className="w-0 group-hover:w-4 h-[1px] bg-luxury-gold mr-0 group-hover:mr-2" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-xl mb-8 text-luxury-gold">Services</h4>
            <ul className="space-y-4">
              {SERVICE_CATEGORIES.map((s) => (
                <li key={s.name}>
                  <Link to={s.path} className="text-sm text-gray-400 hover:text-white">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-xl mb-8 text-luxury-gold">Contact</h4>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <MapPin size={20} className="text-luxury-gold shrink-0" />
                <span className="text-sm text-gray-400 leading-relaxed">{CONTACT_INFO.address}</span>
              </li>
              <li className="flex items-center space-x-4">
                <Phone size={20} className="text-luxury-gold shrink-0" />
                <span className="text-sm text-gray-400">{CONTACT_INFO.phone}</span>
              </li>
              <li className="flex items-center space-x-4">
                <Mail size={20} className="text-luxury-gold shrink-0" />
                <span className="text-sm text-gray-400 break-all">{CONTACT_INFO.email}</span>
              </li>
              <li className="pt-2">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">Business hours</div>
                <div className="text-sm text-gray-400 leading-relaxed">
                  <div className="flex items-center justify-between gap-6">
                    <span>Monday</span>
                    <span className="text-white/80">10:00 AM – 7:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 mt-2">
                    <span>Tuesday</span>
                    <span className="text-white/80">10:00 AM – 7:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 mt-2">
                    <span>Wednesday</span>
                    <span className="text-white/80">10:00 AM – 7:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 mt-2">
                    <span>Thursday</span>
                    <span className="text-white/80">10:00 AM – 7:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 mt-2">
                    <span>Friday</span>
                    <span className="text-white/80">10:00 AM – 7:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 mt-2">
                    <span>Saturday</span>
                    <span className="text-white/80">10:00 AM – 7:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between gap-6 mt-2">
                    <span>Sunday</span>
                    <span className="text-red-400">Closed</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">
              &copy; {new Date().getFullYear()} Royal Beauty Care. All rights reserved.
            </p>
            <p className="text-[9px] text-luxury-gold/60 tracking-[0.1em] uppercase italic">
              {CONTACT_INFO.paymentNote}
            </p>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            {['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'].map((x) => (
              <span
                key={x}
                className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-[0.22em] uppercase border border-white/10 bg-white/5"
              >
                {x}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
