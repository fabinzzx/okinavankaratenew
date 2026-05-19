import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, ShieldAlert } from 'lucide-react';

const Downloads = () => {
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
