import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Phone, User, ExternalLink } from 'lucide-react';
import { DOJO_LIST } from '../data/dojos';

const Dojos = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDojos = DOJO_LIST.filter(dojo => 
    dojo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dojo.instructor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen py-16 transition-colors duration-300 dark:bg-brand-dark bg-brand-light text-brand-dark dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-brand-red font-bold tracking-widest text-xs uppercase bg-brand-red/10 px-4 py-1.5 rounded-full border border-brand-red/20 inline-block mb-3">
              Find a Dojo
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark">
              Dojo <span className="text-brand-red">Branches</span>
            </h1>
            <div className="h-1 w-24 bg-brand-red mx-auto mt-4" />
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mt-6 leading-relaxed">
              Search and view our official dojo locations across the region. Connect directly with instructors or load driving directions.
            </p>
          </motion.div>
        </div>

        {/* Filter Input */}
        <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-5 mb-12 shadow-xl max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Branch Name or Instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Dojo Directory */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDojos.map((dojo, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-brand-red/30 transition-all flex flex-col justify-between"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="bg-brand-red/10 p-3 rounded-xl border border-brand-red/20 mb-4 inline-block">
                    <MapPin className="text-brand-red h-6 w-6" />
                  </div>
                </div>
                
                <h3 className="dark:text-white text-brand-dark font-extrabold text-xl mb-4">{dojo.name}</h3>
                
                <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400 mb-6">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-brand-red shrink-0" />
                    <span><strong className="dark:text-white text-brand-dark">Instructor:</strong> {dojo.instructor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone size={16} className="text-brand-red shrink-0" />
                    <span>
                      <strong className="dark:text-white text-brand-dark">Phone:</strong>{' '}
                      <a href={`tel:${dojo.phone}`} className="hover:text-brand-red transition-colors font-semibold">
                        {dojo.phone}
                      </a>
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin size={16} className="text-brand-red shrink-0 mt-0.5" />
                    <span><strong className="dark:text-white text-brand-dark">Address:</strong> {dojo.address}</span>
                  </div>
                </div>
              </div>

              {/* Map embed with absolute grayscale styling */}
              <div className="h-56 w-full relative border-t border-brand-dark/10 dark:border-white/10 overflow-hidden">
                <iframe 
                  src={dojo.mapUrl} 
                  title={`${dojo.name} map location`}
                  className="w-full h-full border-0 dark:grayscale dark:invert opacity-75 dark:opacity-75 hover:opacity-100 hover:grayscale-0 hover:invert-0 transition-all"
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </motion.div>
          ))}

          {filteredDojos.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg">No dojo branches found matching "{searchTerm}".</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dojos;
