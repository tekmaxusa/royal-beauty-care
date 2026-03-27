import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Star, Clock, Info, CheckCircle2, MapPin, Phone, Mail, ArrowRight, ChevronRight } from 'lucide-react';
import { Hero, ServicesPreview, AboutPreview, TestimonialsSlider } from '@/src/components/HomeSections';
import { GIFT_PACKAGES, SPECIAL_OFFERS, CONTACT_INFO, SERVICES, SERVICE_CATEGORIES, GALLERY_IMAGES, Service, ServiceCategory } from '@/src/constants';

export const Home = () => {
  return (
    <main>
      <Hero />
      <AboutPreview />
      <ServicesPreview />
      <TestimonialsSlider />
    </main>
  );
};

export const About = () => {
  return (
    <main className="pt-32">
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-20">
            <span className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-4 block">Our Philosophy</span>
            <h1 className="text-5xl md:text-7xl font-serif mb-8">Elegance in Every Detail</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Since 1986, we have been providing exceptional care to clients in the Denver area. We take great pride in our top-tier facilities, featuring calming lighting and gentle music.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdO8K396WudLVIcq6SXrWZCpLNaX56mmSs1chvHeZKzISNfU43hQ6_5g_u3GH201VrLstRAq2qBcfsXinwZWi24zXotbYlaipAyumLAnMmFEhXLQi1W8NCYh3kpnyQMmRi9PvYFLBap2iozzSiEoa-D4Gz_2SuPihX4q-VXm6ZjeqEtrxBlOnkA5bUbEf5boYwOupB_pZ9f_Ge74s8eD7K3mTx-k5J6HM62c8_FGil0MvX6LX80_BNj4yDYVedzdlrsKabI2zkZ1I"
              alt="Salon Interior"
              className="w-full aspect-square object-cover shadow-xl"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-3xl font-serif mb-6">Uncompromising Quality</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                At Royal Beauty Care, we believe that self-care is not a luxury, but a necessity. Our mission is to provide a sanctuary where you can escape the noise of the world and reconnect with your inner and outer beauty.
              </p>
              <ul className="space-y-4">
                {['Expert Therapists', 'Medical-Grade Products', 'Personalized Approach', 'Serene Environment'].map((item) => (
                  <li key={item} className="flex items-center text-sm uppercase tracking-widest text-gray-700">
                    <CheckCircle2 className="text-luxury-gold mr-4" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export const GiftPackages = () => {
  return (
    <main className="pt-0">
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&q=80&w=1920" 
          alt="Gift Packages" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white px-6">
          <h1 className="text-5xl md:text-7xl font-serif mb-4">Signature Gift Collections</h1>
          <p className="text-xl md:text-2xl font-light italic text-luxury-gold">Explore our curated selection of luxury experiences</p>
        </div>
      </section>

      <section className="py-20 bg-luxury-beige">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <p className="text-lg text-gray-600 leading-relaxed mb-12">
              Royal Beauty Care collections offer a comprehensive experience of our finest skin, nail, and massage therapies. Residents of Lone Tree and beyond find true sanctuary here.
            </p>
            <div className="bg-white p-8 border-l-4 border-red-400 shadow-sm text-left">
              <div className="flex items-center text-red-500 font-bold uppercase text-xs tracking-widest mb-3">
                <Info size={16} className="mr-2" />
                Important Policy
              </div>
              <p className="text-sm text-gray-500 italic">
                Kindly note: Gift Cards from Visa, Mastercard, AmEx, Discover, or Spa Finder are not accepted. Our cards are non-refundable but transferable. Balances apply to any Royal Beauty Care service, excluding medical or permanent makeup treatments.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12">
            {GIFT_PACKAGES.map((pkg, index) => (
              <motion.div 
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} bg-white shadow-xl overflow-hidden group`}
              >
                <div className="lg:w-1/3 h-80 lg:h-auto overflow-hidden">
                  <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
                <div className="lg:w-2/3 p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-3xl font-serif">{pkg.title}</h3>
                      <span className="text-2xl font-serif text-luxury-gold">{pkg.price}</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-6">{pkg.description}</p>
                    
                    {pkg.extended && (
                      <div className="bg-luxury-beige p-6 border-l-2 border-luxury-gold mb-6">
                        <h4 className="font-bold text-sm mb-2">{pkg.extended.title}</h4>
                        <p className="text-xs text-gray-500 mb-3">{pkg.extended.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs uppercase tracking-widest text-gray-400 flex items-center">
                            <Clock size={12} className="mr-1" /> {pkg.extended.duration}
                          </span>
                          <span className="font-serif text-luxury-gold">{pkg.extended.price}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {pkg.duration && (
                    <div className="flex items-center text-xs uppercase tracking-[0.2em] text-gray-400 border-t border-gray-100 pt-6">
                      <Clock size={14} className="mr-2" /> {pkg.duration}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export const SpecialOffers = () => {
  return (
    <main className="pt-0">
      {/* Holiday Hero */}
      <section className="relative py-32 bg-[#1a3a2a] overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&q=80&w=2000" 
            alt="Holiday Background" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-luxury-gold uppercase tracking-[0.4em] text-xs mb-4 block">
              {SPECIAL_OFFERS.holidaySpecials.subtitle}
            </span>
            <h1 className="text-white text-6xl md:text-8xl font-serif mb-6 italic">
              Holiday
            </h1>
            <h2 className="text-luxury-gold text-4xl md:text-6xl font-serif mb-8">
              Exclusive Specials
            </h2>
            <div className="flex justify-center space-x-8 text-white/60 mb-8">
              <motion.div whileHover={{ scale: 1.2, color: '#D4AF37' }} className="cursor-default">
                <Star size={24} />
              </motion.div>
              <motion.div whileHover={{ scale: 1.2, color: '#D4AF37' }} className="cursor-default">
                <Star size={24} />
              </motion.div>
              <motion.div whileHover={{ scale: 1.2, color: '#D4AF37' }} className="cursor-default">
                <Star size={24} />
              </motion.div>
            </div>
            <p className="text-white/80 max-w-2xl mx-auto text-lg font-light tracking-wide">
              {SPECIAL_OFFERS.holidaySpecials.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* 12 Days of Treats */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-7xl font-serif mb-4">12 Days of Holiday Treats</h2>
            <div className="w-24 h-[1px] bg-luxury-gold mx-auto" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {SPECIAL_OFFERS.holidaySpecials.treats.map((treat, index) => (
              <motion.div
                key={treat}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-12 h-12 rounded-full bg-[#1a3a2a] text-luxury-gold flex items-center justify-center mb-4 font-serif text-lg group-hover:bg-luxury-gold group-hover:text-white transition-colors duration-300">
                  {index + 1}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 leading-tight">
                  {treat}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <button className="bg-[#1a3a2a] text-white px-12 py-4 text-xs uppercase tracking-[0.2em] hover:bg-luxury-gold transition-all duration-300">
              Explore Our 12 Days of Deals
            </button>
          </div>
        </div>
      </section>

      {/* Moisturizer Offer */}
      <section className="py-32 bg-[#1a3a2a] relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-white text-4xl md:text-6xl font-serif mb-4">
              {SPECIAL_OFFERS.moisturizerOffer.title}
            </h2>
            <p className="text-luxury-gold text-3xl md:text-5xl font-serif italic mb-12">
              {SPECIAL_OFFERS.moisturizerOffer.discount}
            </p>
            
            <div className="flex flex-wrap justify-center gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-48 h-64 bg-white p-2 shadow-2xl rotate-[-3deg] even:rotate-[3deg] hover:rotate-0 transition-transform duration-500">
                  <img 
                    src={`https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=400&sig=${i}`} 
                    alt="Product" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Sessions */}
      <section className="py-24 bg-luxury-beige">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif uppercase tracking-widest">
              Reserve Your Session <span className="text-luxury-gold">Today</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SPECIAL_OFFERS.featuredSessions.map((session) => (
              <div key={session.id} className="bg-white group overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500">
                <div className="h-64 overflow-hidden">
                  <img 
                    src={session.image} 
                    alt={session.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="p-8 text-center">
                  <h3 className="text-xl font-serif mb-4">{session.title}</h3>
                  <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                    {session.description}
                  </p>
                  <button className="text-[10px] uppercase tracking-[0.2em] border-b border-luxury-gold pb-1 hover:text-luxury-gold transition-colors">
                    Book Appointment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export const Services = () => {
  return (
    <main className="pt-0">
      {/* Hero Section */}
      <section className="text-center py-24 bg-[#F9F6F2] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="container mx-auto px-6 relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-5xl md:text-7xl text-luxury-black mb-6 tracking-tight font-bold"
          >
            Discover Your <span className="text-luxury-gold italic">Beauty Ritual</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 italic max-w-2xl mx-auto text-xl font-light leading-relaxed"
          >
            From clinical treatments to luxury spa experiences, explore our full range of aesthetic services.
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {SERVICE_CATEGORIES.slice(0, 8).map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative h-[450px] overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 flex flex-col justify-end"
            >
              <div className="absolute inset-0 z-0">
                <img 
                  src={category.image} 
                  alt={category.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-[0.85] group-hover:brightness-[0.7]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 opacity-90 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-20 p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <h2 className="font-serif text-2xl text-white font-bold mb-3">{category.name}</h2>
                <p className="text-gray-300 text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 mb-6 line-clamp-3">
                  {category.description}
                </p>
                <div className="flex items-center text-luxury-gold font-bold text-[10px] tracking-widest uppercase group-hover:translate-x-2 transition-transform duration-300">
                  Explore Now <ArrowRight size={14} className="ml-2" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Detailed Menu Section */}
      <section className="py-24 bg-white border-t border-luxury-beige">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-4 block font-bold">Our Full Menu</span>
            <h2 className="text-4xl md:text-6xl font-serif mb-8">Service Details</h2>
          </div>

          <div className="space-y-24">
            {SERVICE_CATEGORIES.map((category, catIndex) => {
              const categoryServices = SERVICES.filter(s => s.category === category.name);
              if (categoryServices.length === 0) return null;

              return (
                <motion.div 
                  key={category.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: catIndex * 0.1 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="flex items-center gap-6 mb-12">
                    <h3 className="text-3xl font-serif text-luxury-black shrink-0">{category.name}</h3>
                    <div className="h-[1px] bg-luxury-gold/30 w-full"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                    {categoryServices.map((service) => (
                      <div key={service.id} className="group">
                        <div className="flex justify-between items-baseline mb-3">
                          <h4 className="font-serif text-xl group-hover:text-luxury-gold transition-colors">{service.title}</h4>
                          <span className="text-luxury-gold font-bold ml-4">{service.price}</span>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed italic">
                          {service.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Consultation Section */}
      <section className="py-24 bg-luxury-black text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto border border-white/10 p-16 rounded-2xl backdrop-blur-sm"
          >
            <h2 className="text-4xl md:text-5xl font-serif mb-8 text-luxury-gold">Ready for Your Transformation?</h2>
            <p className="text-gray-400 mb-12 text-lg leading-relaxed italic">
              Book a consultation with our experts to create a personalized beauty ritual tailored to your unique needs.
            </p>
            <Link 
              to="/contact" 
              className="inline-block bg-luxury-gold text-white px-12 py-4 rounded-full text-sm uppercase tracking-widest font-bold hover:bg-white hover:text-luxury-black transition-all duration-300 shadow-xl"
            >
              Book Your Consultation
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export const Gallery = () => {
  return (
    <main className="pt-32">
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-4 block">Portfolio</span>
            <h1 className="text-5xl md:text-7xl font-serif mb-8">Our Retreat</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {GALLERY_IMAGES.slice(0, 9).map((src, idx) => (
              <div key={src} className="overflow-hidden aspect-[4/5] group">
                <img
                  src={src}
                  alt={`Gallery ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export const ServiceCategoryDetail = () => {
  const { categoryId } = useParams();
  const category = SERVICE_CATEGORIES.find(c => c.path === `/services/${categoryId}`);
  
  if (!category) {
    return (
      <main className="pt-0 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-serif mb-4">Category Not Found</h1>
          <Link to="/services" className="text-luxury-gold hover:underline">Back to Services</Link>
        </div>
      </main>
    );
  }

  const categoryServices = SERVICES.filter(s => s.category === category.name);

  return (
    <main className="pt-0">
      {/* Category Hero */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <img 
          src={category.image} 
          alt={category.name} 
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-xs uppercase tracking-[0.4em] text-luxury-gold mb-4 block font-bold">Premium Treatment</span>
            <h1 className="text-5xl md:text-8xl font-serif mb-6">{category.name}</h1>
            <p className="text-xl font-light italic text-gray-200 leading-relaxed">
              {category.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-16 text-xs uppercase tracking-widest text-gray-400">
              <Link to="/" className="hover:text-luxury-gold transition-colors">Home</Link>
              <ChevronRight size={12} />
              <Link to="/services" className="hover:text-luxury-gold transition-colors">Services</Link>
              <ChevronRight size={12} />
              <span className="text-luxury-black font-bold">{category.name}</span>
            </div>

            {category.intro && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-24"
              >
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-4xl md:text-6xl font-serif mb-8 text-luxury-black">{category.intro.title}</h2>
                  <p className="text-xl text-gray-600 leading-relaxed font-light italic">
                    {category.intro.content}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {category.intro.benefits && (
                    <div className="p-10 bg-luxury-beige/10 border border-luxury-beige/20 rounded-sm">
                      <h3 className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-4 font-bold">Benefits</h3>
                      <p className="text-lg text-gray-700 leading-relaxed font-light">
                        {category.intro.benefits}
                      </p>
                    </div>
                  )}
                  {category.intro.recovery && (
                    <div className="p-10 bg-luxury-beige/10 border border-luxury-beige/20 rounded-sm">
                      <h3 className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-4 font-bold">Recovery</h3>
                      <p className="text-lg text-gray-700 leading-relaxed font-light">
                        {category.intro.recovery}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className="space-y-16">
              {categoryServices.length > 0 ? (
                categoryServices.map((service, index) => (
                  <motion.div 
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col md:flex-row gap-12 items-start group"
                  >
                    <div className="w-full md:w-1/3 aspect-[4/3] overflow-hidden rounded-sm shadow-lg">
                      <img 
                        src={service.image} 
                        alt={service.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="w-full md:w-2/3 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-3xl font-serif group-hover:text-luxury-gold transition-colors">{service.title}</h3>
                          <span className="text-2xl font-serif text-luxury-gold">{service.price}</span>
                        </div>
                        {service.duration && (
                          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 mb-4">
                            <Clock size={14} className="text-luxury-gold" />
                            <span>{service.duration}</span>
                          </div>
                        )}
                        <p className="text-gray-600 text-lg leading-relaxed font-light italic mb-8">
                          {service.description}
                        </p>
                      </div>
                      <Link 
                        to="/contact" 
                        className="inline-block bg-luxury-black text-white px-10 py-4 text-[10px] uppercase tracking-widest hover:bg-luxury-gold transition-all duration-300 w-fit"
                      >
                        Book Appointment
                      </Link>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 bg-luxury-beige/30 rounded-sm">
                  <p className="text-gray-500 italic">Detailed service list coming soon. Please contact us for pricing and availability.</p>
                </div>
              )}
            </div>

            {category.instructions && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-24 p-12 bg-luxury-beige/20 border border-luxury-beige/30 rounded-sm"
              >
                <h3 className="text-3xl font-serif mb-12 text-luxury-black text-center">Therapy Instructions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                  {category.instructions.pre && (
                    <div>
                      <h4 className="text-xl font-serif mb-6 text-luxury-gold uppercase tracking-widest">Pre-Appointments</h4>
                      <ul className="space-y-4">
                        {category.instructions.pre.map((instruction, idx) => (
                          <li key={idx} className="flex items-start gap-4 text-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold mt-2.5 flex-shrink-0" />
                            <p className="text-base font-light leading-relaxed">{instruction}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {category.instructions.post && (
                    <div>
                      <h4 className="text-xl font-serif mb-6 text-luxury-gold uppercase tracking-widest">Post-Cares</h4>
                      <ul className="space-y-4">
                        {category.instructions.post.map((instruction, idx) => (
                          <li key={idx} className="flex items-start gap-4 text-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold mt-2.5 flex-shrink-0" />
                            <p className="text-base font-light leading-relaxed">{instruction}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {category.instructions.disclaimer && (
                  <div className="mt-12 pt-8 border-t border-luxury-beige/30">
                    <p className="text-sm text-gray-500 italic text-center leading-relaxed">
                      {category.instructions.disclaimer}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export const Contact = () => {
  return (
    <main className="pt-32">
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20">
            <div className="w-full lg:w-1/2">
              <span className="text-xs uppercase tracking-[0.3em] text-luxury-gold mb-4 block">Get In Touch</span>
              <h1 className="text-5xl md:text-7xl font-serif mb-8">Appointments</h1>
              <p className="text-gray-600 mb-12 leading-relaxed text-lg">
                Have a question or want to book a consultation? Fill out the form below and our team will get back to you within 24 hours.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="flex items-start space-x-4">
                    <MapPin className="text-luxury-gold shrink-0" size={24} />
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-2">Location</h4>
                      <p className="text-lg font-serif">{CONTACT_INFO.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Phone className="text-luxury-gold shrink-0" size={24} />
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-2">Phone</h4>
                      <p className="text-lg font-serif">{CONTACT_INFO.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="flex items-start space-x-4">
                    <Clock className="text-luxury-gold shrink-0" size={24} />
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-2">Hours</h4>
                      <p className="text-sm text-gray-600">{CONTACT_INFO.hours}</p>
                      <p className="text-xs text-luxury-gold/80 mt-2 italic">{CONTACT_INFO.paymentNote}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Mail className="text-luxury-gold shrink-0" size={24} />
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-2">Email</h4>
                      <p className="text-sm text-gray-600 break-all">{CONTACT_INFO.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 bg-luxury-beige p-10 md:p-16 rounded-3xl">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase tracking-widest mb-2 block font-medium">First Name</label>
                    <input type="text" className="w-full bg-white border-none p-4 text-sm focus:ring-1 focus:ring-luxury-gold outline-none rounded-lg" placeholder="Jane" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest mb-2 block font-medium">Last Name</label>
                    <input type="text" className="w-full bg-white border-none p-4 text-sm focus:ring-1 focus:ring-luxury-gold outline-none rounded-lg" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-2 block font-medium">Email Address</label>
                  <input type="email" className="w-full bg-white border-none p-4 text-sm focus:ring-1 focus:ring-luxury-gold outline-none rounded-lg" placeholder="jane@example.com" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-2 block font-medium">Message</label>
                  <textarea rows={6} className="w-full bg-white border-none p-4 text-sm focus:ring-1 focus:ring-luxury-gold outline-none resize-none rounded-lg" placeholder="How can we help you?" />
                </div>
                <button className="w-full bg-luxury-black text-white py-5 text-xs uppercase tracking-widest hover:bg-luxury-gold transition-all duration-300 rounded-lg shadow-lg">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
