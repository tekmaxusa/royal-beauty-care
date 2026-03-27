import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Star, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SERVICES, TESTIMONIALS, GALLERY_IMAGES, CONTACT_INFO, SERVICE_CATEGORIES } from '@/src/constants';

export const Hero = () => {
  const slides = useMemo(
    () => [
      {
        id: 'signature',
        image:
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1920',
        eyebrow: 'Royal Beauty Care',
        title: 'Indulge in pure\nLuxury',
        subtitle: 'Premium treatments, curated rituals, and a serene escape designed around you.',
      },
      {
        id: 'precision',
        image:
          'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1920',
        eyebrow: 'Personalized care',
        title: 'Feel radiant.\nLook effortless.',
        subtitle: 'From advanced skincare to signature services—book your next visit in minutes.',
      },
      {
        id: 'hours',
        image:
          'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=1920',
        eyebrow: 'Open 6 days a week',
        title: 'Business\nHours',
        subtitle: 'Mon–Sat: 10:00 AM – 7:00 PM · Sun: Closed',
      },
    ],
    [],
  );

  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setActive((i) => (i + 1) % slides.length), 6500);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const s = slides[active]!;

  return (
    <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={s.id}
            src={s.image}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/55" />
      </div>

      <div className="relative z-10 text-center text-white px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-white/70 mb-5">
              {s.eyebrow}
            </div>
            <h1 className="text-5xl md:text-8xl font-serif mb-6 leading-tight whitespace-pre-line">
              {s.title.split('\n')[0]}{' '}
              <span className="text-luxury-gold italic">{s.title.split('\n')[1]}</span>
            </h1>
            <p className="text-lg md:text-2xl font-light mb-10 max-w-2xl mx-auto italic text-gray-200 leading-relaxed">
              {s.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/booking"
                className="inline-block bg-luxury-gold text-white px-12 py-5 text-xs uppercase tracking-widest hover:bg-white hover:text-luxury-black transition-all duration-300 font-bold shadow-lg"
              >
                Book Appointment
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/80 hover:text-white transition-colors"
                onClick={() => setActive((i) => (i + 1) % slides.length)}
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-center gap-2">
          {slides.map((x, i) => (
            <button
              key={x.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={i === active ? 'h-1.5 w-8 bg-luxury-gold' : 'h-1.5 w-8 bg-white/25 hover:bg-white/40'}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export const ServicesPreview = () => {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6 text-center">
        <div className="max-w-3xl mx-auto mb-20">
          <span className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-4 block font-semibold">Our Expertise</span>
          <h2 className="text-4xl md:text-6xl font-serif mb-8">Our Popular Services</h2>
          <p className="text-gray-500 font-light italic text-lg">
            Explore our curated selection of premium aesthetic treatments designed for your total well-being.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {SERVICE_CATEGORIES.slice(0, 8).map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative h-[400px] overflow-hidden rounded-sm shadow-lg"
            >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-left">
                <h3 className="text-2xl font-serif text-white mb-4 group-hover:text-luxury-gold transition-colors">{category.name}</h3>
                <Link 
                  to={category.path} 
                  className="text-[10px] uppercase tracking-widest text-white/70 hover:text-luxury-gold transition-colors flex items-center group/link"
                >
                  View Details <ArrowRight size={12} className="ml-2 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-20">
          <Link to="/services" className="inline-block bg-luxury-black text-white px-12 py-5 text-xs uppercase tracking-widest hover:bg-luxury-gold transition-all duration-300">
            View All Categories
          </Link>
        </div>
      </div>
    </section>
  );
};

export const AboutPreview = () => {
  return (
    <section className="py-32 bg-luxury-beige relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 pointer-events-none">
        <img src="https://www.transparenttextures.com/patterns/leaf.png" alt="" className="w-full h-full object-repeat" />
      </div>
      
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-24">
          <div className="w-full lg:w-1/2 relative">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdO8K396WudLVIcq6SXrWZCpLNaX56mmSs1chvHeZKzISNfU43hQ6_5g_u3GH201VrLstRAq2qBcfsXinwZWi24zXotbYlaipAyumLAnMmFEhXLQi1W8NCYh3kpnyQMmRi9PvYFLBap2iozzSiEoa-D4Gz_2SuPihX4q-VXm6ZjeqEtrxBlOnkA5bUbEf5boYwOupB_pZ9f_Ge74s8eD7K3mTx-k5J6HM62c8_FGil0MvX6LX80_BNj4yDYVedzdlrsKabI2zkZ1I"
                alt="Salon Interior"
                className="w-full aspect-[4/5] object-cover shadow-2xl rounded-sm border-[12px] border-white"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-luxury-gold/10 rounded-full blur-3xl -z-0" />
            <div className="absolute -bottom-12 -right-12 w-64 h-64 border border-luxury-gold/20 -z-0" />
          </div>

          <div className="w-full lg:w-1/2">
            <span className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-6 block font-semibold">Your Trusted Retreat</span>
            <h2 className="text-4xl md:text-6xl font-serif mb-10 leading-tight">
              Premium Spa <br />
              <span className="italic text-luxury-gold">Care</span>
            </h2>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed font-light">
              Since 1986, we have been providing exceptional care to clients in the Denver area. We take great pride in our top-tier facilities, featuring calming lighting and gentle music.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
              {['Expert Therapists', 'Medical-Grade Products', 'Serene Environment', 'Personalized Care'].map((item) => (
                <div key={item} className="flex items-center space-x-3">
                  <CheckCircle2 className="text-luxury-gold" size={18} />
                  <span className="text-xs uppercase tracking-widest text-gray-700 font-medium">{item}</span>
                </div>
              ))}
            </div>
            <Link
              to="/about"
              className="inline-block bg-luxury-black text-white px-12 py-5 text-xs uppercase tracking-widest hover:bg-luxury-gold transition-all duration-300 shadow-lg"
            >
              Our Full Story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export const TestimonialsSlider = () => {
  return (
    <section className="py-32 bg-luxury-blush relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <span className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-4 block font-semibold">Kind Words</span>
          <h2 className="text-4xl md:text-6xl font-serif">Client Experiences</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {TESTIMONIALS.map((t, index) => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-12 shadow-xl rounded-sm flex flex-col items-center text-center relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-luxury-gold rounded-full flex items-center justify-center text-white shadow-lg">
                <Star size={20} fill="currentColor" />
              </div>
              <div className="flex mb-8 mt-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={14} className="text-luxury-gold fill-luxury-gold mx-0.5" />
                ))}
              </div>
              <p className="text-gray-600 italic mb-10 leading-relaxed text-lg font-light">"{t.content}"</p>
              <h4 className="font-serif text-xl mb-1 text-luxury-black">{t.name}</h4>
              <span className="text-[10px] uppercase tracking-[0.2em] text-luxury-gold font-bold">{t.role}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};


