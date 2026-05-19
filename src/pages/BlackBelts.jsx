import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldAlert, Award, Star, SearchCheck, AlertTriangle } from 'lucide-react';

const BlackBelts = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [error, setError] = useState(false);

  // Helper to extract integer from Dan level (e.g. "2nd Dan" -> 2)
  const getDanLevelNumber = (dan) => {
    const cleanStr = String(dan || "0").replace(/\D/g, "");
    return parseInt(cleanStr, 10) || 0;
  };

  useEffect(() => {
    const fetchBlackBelts = async () => {
      try {
        const projectId = '6o6o2622';
        const dataset = 'production';
        const groq = encodeURIComponent(`
          *[_type=="blackBeltStudent" && hideStudent != true]{
            name,
            registerNumber,
            danLevel,
            dateOfBirth,
            "photoUrl": photo.asset->url
          }
        `);
        const url = `https://${projectId}.api.sanity.io/v2023-01-01/data/query/${dataset}?query=${groq}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.result && data.result.length > 0) {
          // Sort Dan Level newest/highest first
          const sorted = data.result.sort((a, b) => getDanLevelNumber(b.danLevel) - getDanLevelNumber(a.danLevel));
          setStudents(sorted);
          setFilteredStudents(sorted);
        } else {
          setStudents([]);
          setFilteredStudents([]);
        }
      } catch (error) {
        console.error("Failed to fetch blackbelts from Sanity:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBlackBelts();
  }, []);

  const handleSearch = () => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = students.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) || 
      (s.danLevel && String(s.danLevel).toLowerCase().includes(q))
    );
    setFilteredStudents(filtered);
  };

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
              Certified Roster
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark">
              Our <span className="text-brand-red">Blackbelts</span>
            </h1>
            <div className="h-1 w-24 bg-brand-red mx-auto mt-4" />
          </motion.div>
        </div>

        {/* Search */}
        <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-6 mb-12 shadow-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name or register number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-brand-dark/5 text-brand-dark dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 dark:text-white text-brand-dark placeholder-gray-400"
            />
          </div>
          
          <button
            onClick={handleSearch}
            className="w-full sm:w-auto px-8 py-3 bg-brand-red hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md uppercase tracking-wider text-sm flex items-center justify-center space-x-2 cursor-pointer shrink-0"
          >
            <SearchCheck size={16} />
            <span>Search</span>
          </button>
        </div>

        {/* List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="dark:bg-white/5 bg-white border border-brand-dark/15 dark:border-white/10 rounded-2xl h-80 animate-pulse flex flex-col overflow-hidden">
                <div className="bg-brand-dark/10 dark:bg-white/10 h-48 w-full" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-brand-dark/10 dark:bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-brand-dark/10 dark:bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <AlertTriangle className="h-12 w-12 text-brand-red mx-auto mb-4" />
            <h3 className="text-lg font-bold uppercase tracking-wider mb-2">Database Unreachable</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              We are unable to query the certified blackbelts right now. Please verify your connection and try again.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              layout
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8 justify-center"
            >
              {filteredStudents.map((student, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  key={index}
                  className="border dark:border-white/10 border-brand-dark/10 dark:bg-white/5 bg-white rounded-2xl overflow-hidden shadow-xl hover:border-brand-red/30 transition-all flex flex-col h-full"
                >
                  <div className="h-40 sm:h-56 bg-brand-dark/5 dark:bg-white/10 relative overflow-hidden flex items-center justify-center">
                    <img 
                      src={student.photoUrl || '/images/LOGO.png'} 
                      alt={student.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/LOGO.png';
                      }}
                    />
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-brand-gold/90 text-brand-dark p-1 sm:p-1.5 rounded-full shadow-md">
                      <Award className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 flex-grow flex flex-col justify-between text-center dark:bg-brand-dark/40 bg-brand-dark/5">
                    <div>
                      <span className="text-[10px] sm:text-xs text-brand-gold font-extrabold uppercase tracking-widest block mb-1">
                        {student.danLevel}
                      </span>
                      <h3 className="dark:text-white text-brand-dark font-extrabold text-sm sm:text-lg mb-2 line-clamp-2">
                        {student.name}
                      </h3>
                    </div>
                    <div className="mt-2 pt-2 sm:mt-4 sm:pt-3 border-t border-brand-dark/10 dark:border-white/5">
                      <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Reg No: <span className="dark:text-gray-300 text-brand-dark font-mono text-xs sm:text-sm ml-1 block sm:inline">{student.registerNumber || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredStudents.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-500 dark:text-gray-400">
                  <ShieldAlert className="h-10 w-10 mx-auto text-brand-red mb-3" />
                  <p className="text-lg">No certified blackbelt students found in the academy roster.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </div>
  );
};

export default BlackBelts;
