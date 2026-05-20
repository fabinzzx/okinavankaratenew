import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Trophy, Award, MapPin, ChevronRight, Phone, HelpCircle, ChevronDown } from 'lucide-react';
import { INSTRUCTOR_LIST } from '../data/instructors';
import { DOJO_LIST } from '../data/dojos';

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);

  const faqData = [
    {
      question: "Does any karate academy in Kerala have a student login portal or QR code certificate verification?",
      answer: "Yes. Okinavan Shito Ryu Karate Do India is one of the few karate academies in Kerala with a complete digital student management system. Our platform includes a secure student login portal, digital attendance tracking, instructor verification, and QR code certificate verification.",
      icon: <Sparkles className="text-brand-red" size={20} />
    },
    {
      question: "How does the QR code certificate verification system work?",
      answer: "Every official black belt and Kyu grading certificate issued by our academy features a unique printed QR code. Scanning the QR code links directly to our official digital verification registry page (e.g. okinavanshitoryukarate.in/blackbelt.html?reg=REG_NUMBER), displaying the student's authentic ranking details instantly.",
      icon: <Award className="text-brand-gold" size={20} />
    },
    {
      question: "What features are included in the Student Login Portal?",
      answer: "Authorized students receive unique credentials to log in. Their student dashboard enables them to view their session attendance logs, check belt grade progression history, track pending fees, and get broadcast notifications about grading tests or seminars directly from Dojo Admins.",
      icon: <Shield className="text-emerald-500" size={20} />
    },
    {
      question: "How does the academy maintain digital student records?",
      answer: "We store secure cloud records of every student profile, belt rank, fee transaction, and attendance log. Branch instructors (Dojo Admins) update records in real-time, which are securely verified and audited by Kyoshi Thomas Kathanatt (Super Admin).",
      icon: <MapPin className="text-blue-500" size={20} />
    }
  ];

  const heroSlides = [
    {
      img: "/images/img0011.jpg",
      title: "Discover Strength, Discipline & Respect",
      subtitle: "Okinavan Shito Ryu Karate Academy"
    },
    {
      img: "/images/img0022.jpg",
      title: "Build Character and Confidence",
      subtitle: "Okinavan Shito Ryu Karate Academy"
    },
    {
      img: "/images/img0055.jpg",
      title: "Train with the Best Karate Team",
      subtitle: "Okinavan Shito Ryu Karate Academy"
    }
  ];

  const galleryImages = [
    "/images/image0001.jpg", "/images/img0002.jpg", "/images/img0003.jpg",
    "/images/img0004.jpg", "/images/img0005.jpg", "/images/img0006.jpg",
    "/images/img0007.jpg", "/images/img0008.jpg", "/images/img0009.jpg",
    "/images/img00010.jpg", "/images/img00011.jpg", "/images/img00012.jpg"
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-brand-dark bg-brand-light text-brand-dark dark:text-white">
      
      {/* Hero Section */}
      <section className="relative h-[85vh] sm:h-screen w-full overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-0"
          >
            <div className="absolute inset-0 bg-gradient-to-t dark:from-brand-dark dark:via-brand-dark/40 dark:to-brand-dark/70 from-gray-900/90 via-gray-900/40 to-gray-900/70 z-10" />
            <img 
              src={heroSlides[currentSlide].img} 
              alt="Karate training" 
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Hero Content */}
        <div className="relative z-20 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <span className="text-white font-bold tracking-widest text-xs sm:text-sm uppercase bg-brand-red/80 px-4 py-1.5 rounded-full border border-brand-red/20 inline-block mb-4">
              {heroSlides[currentSlide].subtitle}
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight uppercase leading-none mb-6">
              {heroSlides[currentSlide].title.split(" ").map((word, i) => (
                <span key={i} className={i % 2 === 0 ? "text-white mr-3 inline-block" : "text-brand-red mr-3 inline-block bg-gradient-to-r from-brand-red to-red-500 bg-clip-text text-transparent"}>
                  {word}
                </span>
              ))}
            </h1>
            <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base mb-8 leading-relaxed">
              We empower kids, teens, and adults to achieve fitness, discipline, and outstanding mental focus through authentic martial arts training.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/dojos" 
                className="w-full sm:w-auto px-8 py-4 bg-brand-red hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-widest rounded-full transition-all shadow-xl hover:shadow-brand-red/35 flex items-center justify-center space-x-2"
              >
                <span>Find a Dojo Near You</span>
                <ChevronRight size={16} />
              </Link>
              <Link 
                to="/contact" 
                className="w-full sm:w-auto px-8 py-4 border border-white/20 hover:border-brand-red hover:bg-white/5 text-white font-bold text-sm uppercase tracking-widest rounded-full transition-all flex items-center justify-center"
              >
                Contact Academy
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-10 z-20 flex space-x-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'w-8 bg-brand-red' : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Instructors Section */}
      <section className="py-20 transition-colors duration-300 dark:bg-brand-dark bg-brand-light relative z-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark mb-4">
              Our <span className="text-brand-red">Instructors</span>
            </h2>
            <div className="h-1 w-20 bg-brand-red mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Learn from traditional and championship-level martial arts masters dedicated to building character and champion status.
            </p>
          </div>

          {/* Horizontally Scrollable Row */}
          <div className="flex overflow-x-auto gap-6 pb-8 snap-x scrollbar-thin scrollbar-thumb-brand-red scrollbar-track-brand-dark">
            {INSTRUCTOR_LIST.map((instructor, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -8 }}
                className="flex-shrink-0 w-56 sm:w-64 bg-white dark:bg-white/5 border border-brand-dark/10 dark:border-white/10 rounded-2xl overflow-hidden snap-start relative group shadow-md"
              >
                <div className="h-56 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t dark:from-brand-dark dark:via-brand-dark/20 from-white/70 via-white/10 to-transparent z-10 opacity-70 group-hover:opacity-40 transition-opacity" />
                  <img 
                    src={instructor.image} 
                    alt={instructor.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/LOGO.png"; // Fallback to logo
                    }}
                  />
                </div>
                <div className="p-6 relative z-20 dark:bg-brand-dark/90 bg-white">
                  <span className="text-brand-gold text-xs uppercase tracking-widest font-extrabold block mb-1">
                    {instructor.role}
                  </span>
                  <h3 className="dark:text-white text-brand-dark font-bold text-lg mb-3">
                    {instructor.name}
                  </h3>
                  <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    {instructor.skills.map((skill, sIdx) => (
                      <li key={sIdx} className="flex items-center space-x-1.5">
                        <Award size={14} className="text-brand-red flex-shrink-0" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Dojos Section */}
      <section className="py-20 dark:bg-white/5 bg-brand-dark/5 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark mb-4">
              Our <span className="text-brand-red">Dojo Locations</span>
            </h2>
            <div className="h-1 w-20 bg-brand-red mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Find a branch convenient for you and experience professional, high-standard karate classes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {DOJO_LIST.map((dojo, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="dark:bg-brand-dark bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-brand-red/30 transition-all flex flex-col h-full"
              >
                <div className="p-6 flex-grow">
                  <span className="text-xs text-brand-gold uppercase tracking-widest font-extrabold block mb-1">
                    Sensei Branch
                  </span>
                  <h3 className="dark:text-white text-brand-dark font-extrabold text-xl mb-4">{dojo.name}</h3>
                  <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400 mb-6 font-semibold">
                    <p className="leading-relaxed">
                      <strong className="dark:text-white text-brand-dark mr-1.5">Instructor:</strong>
                      <span className="text-gray-600 dark:text-gray-300">{dojo.instructor}</span>
                    </p>
                    <p className="leading-relaxed">
                      <strong className="dark:text-white text-brand-dark mr-1.5">Phone:</strong>
                      <a href={`tel:${dojo.phone}`} className="hover:text-brand-red transition-colors text-gray-600 dark:text-gray-300 inline-flex items-center gap-1 align-middle">
                        <Phone size={12} className="text-brand-red shrink-0" />
                        <span>{dojo.phone}</span>
                      </a>
                    </p>
                    <p className="leading-relaxed">
                      <strong className="dark:text-white text-brand-dark mr-1.5">Address:</strong>
                      <span className="text-gray-600 dark:text-gray-300">{dojo.address}</span>
                    </p>
                  </div>
                </div>

                {/* Map iframe */}
                <div className="h-48 w-full bg-white/5 border-t border-brand-dark/10 dark:border-white/10 relative overflow-hidden">
                  <iframe 
                    src={dojo.mapUrl} 
                    title={`${dojo.name} map`}
                    className="w-full h-full border-0 dark:grayscale dark:invert opacity-70 dark:opacity-70 hover:opacity-100 hover:grayscale-0 hover:invert-0 transition-all"
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* FAQ / Digital Dojo Highlights Section */}
      <section className="py-20 dark:bg-white/5 bg-brand-dark/5 relative z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <span className="text-brand-red font-bold tracking-widest text-xs uppercase bg-brand-red/10 px-4 py-1.5 rounded-full border border-brand-red/20 inline-block mb-3">
              Kerala's First Digital Karate Dojo
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark mb-4">
              Digital Dojo & <span className="text-brand-red">Verification FAQ</span>
            </h2>
            <div className="h-1 w-20 bg-brand-red mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Learn about our pioneering digital student records, online login portals, and official QR verification systems.
            </p>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx}
                  className="bg-white dark:bg-white/5 border border-brand-dark/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left transition-colors dark:hover:bg-white/5 hover:bg-brand-dark/5 cursor-pointer border-0 bg-transparent focus:outline-none"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 dark:bg-white/5 bg-brand-dark/5 rounded-lg shrink-0">
                        {faq.icon}
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-brand-dark dark:text-white uppercase tracking-wide leading-snug">
                        {faq.question}
                      </h3>
                    </div>
                    <ChevronDown 
                      size={18} 
                      className={`text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-red' : ''}`} 
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-t border-brand-dark/5 dark:border-white/5 leading-relaxed font-semibold">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Photo Gallery Section */}
      <section className="py-20 transition-colors duration-300 dark:bg-brand-dark bg-brand-light relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark mb-4">
              Our Dojo <span className="text-brand-red">in Action</span>
            </h2>
            <div className="h-1 w-20 bg-brand-red mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Take a look at our training sessions, grading tests, and tournaments where our fighters achieve victory.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {galleryImages.map((src, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.03 }}
                onClick={() => setSelectedImage(src)}
                className="h-44 sm:h-56 bg-brand-dark/5 dark:bg-white/5 rounded-xl overflow-hidden cursor-pointer relative group border border-brand-dark/10 dark:border-white/10 shadow-sm"
              >
                <img 
                  src={src} 
                  alt={`Gallery Image ${idx + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/LOGO.png"; // Fallback
                  }}
                />
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Fullscreen Zoom Overlay */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 bg-brand-dark/95 z-[9999] flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl"
            >
              <img 
                src={selectedImage} 
                alt="Zoomed training session" 
                className="w-full h-full max-h-[80vh] object-contain rounded-2xl" 
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-brand-dark border border-white/20 p-2 text-white hover:bg-brand-red hover:border-transparent rounded-full transition-all"
              >
                <ChevronRight className="rotate-180" size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Home;
