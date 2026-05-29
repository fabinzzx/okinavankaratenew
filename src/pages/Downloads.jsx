import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, ShieldAlert, Lock, Eye, EyeOff } from 'lucide-react';

const Downloads = () => {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(
    sessionStorage.getItem('dojo_downloads_unlocked') === 'true'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'okinavankarate') {
      setIsUnlocked(true);
      sessionStorage.setItem('dojo_downloads_unlocked', 'true');
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const forms = [
    {
      title: "Admission Form",
      img: "/images/admissionform.png",
      pdf: "/downloads/admissionform.pdf",
      description: "Standard dojo registration/admission sheet for new karate students."
    },
    {
      title: "Black Belt Test Form",
      img: "/images/blackbeltform.png",
      pdf: "/downloads/blackbeltform.pdf",
      description: "Official registration form for Shodan/Nidan/Sandan black belt exams."
    },
    {
      title: "Colour Belt Test Form",
      img: "/images/colourbeltform.png",
      pdf: "/downloads/colourbeltform.pdf",
      description: "Grading test registration sheet for Kyu belt level examinations."
    },
    {
      title: "Black Belt Assignment",
      img: "/images/assignment.png",
      pdf: "/downloads/assignmentblack.pdf",
      description: "Theory assignment workbook mandatory for high-rank black belt assessments."
    },
    {
      title: "Colour Belt Test Questions",
      img: "/images/testquestions.png",
      pdf: "/downloads/testquestions.pdf",
      description: "Karate theory study guide and oral question prep guidelines for Kyu gradings."
    }
  ];

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4 transition-colors duration-300 dark:bg-brand-dark bg-brand-light text-brand-dark dark:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 p-8 rounded-3xl shadow-2xl space-y-6 text-center"
        >
          <div className="mx-auto w-16 h-16 bg-brand-red/10 border border-brand-red/20 rounded-2xl flex items-center justify-center text-brand-red">
            <Lock size={32} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-wide">
              Secure Downloads
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please enter the Dojo password to access official forms and study materials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl border border-brand-dark/10 dark:border-white/10 dark:bg-black/20 bg-brand-light/50 focus:outline-none focus:border-brand-red/50 transition-all font-bold text-sm tracking-widest placeholder:tracking-normal placeholder:font-medium text-center"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-red transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-brand-red font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
                <ShieldAlert size={12} />
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-md hover:shadow-brand-red/25 cursor-pointer"
            >
              Verify Password
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 transition-colors duration-300 dark:bg-brand-dark bg-brand-light text-brand-dark dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-brand-red font-bold tracking-widest text-xs uppercase bg-brand-red/10 px-4 py-1.5 rounded-full border border-brand-red/20 inline-block mb-3">
              Official Material
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark">
              Dojo <span className="text-brand-red">Downloads</span>
            </h1>
            <div className="h-1 w-24 bg-brand-red mx-auto mt-4" />
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mt-6 leading-relaxed">
              Download and print standard dojo files, question bank sheets, and belt testing files directly.
            </p>
          </motion.div>
        </div>

        {/* Download Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {forms.map((form, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -6 }}
              className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-brand-red/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-64 bg-brand-dark/5 dark:bg-brand-dark/65 relative overflow-hidden flex items-center justify-center border-b border-brand-dark/10 dark:border-white/10 p-2">
                  <img 
                    src={form.img} 
                    alt={form.title} 
                    className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 hover:scale-103"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/LOGO.png"; // Fallback
                    }}
                  />
                </div>
                
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText size={18} className="text-brand-red shrink-0" />
                    <h3 className="dark:text-white text-brand-dark font-extrabold text-lg uppercase tracking-wide">
                      {form.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {form.description}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <a
                  href={form.pdf}
                  download
                  className="flex items-center justify-center space-x-2 w-full py-3.5 bg-brand-red hover:bg-red-700 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-md hover:shadow-brand-red/25 cursor-pointer"
                >
                  <Download size={16} />
                  <span>Download PDF</span>
                </a>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Downloads;
