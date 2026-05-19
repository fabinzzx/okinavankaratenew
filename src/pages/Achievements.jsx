import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trophy, Medal, Star, AlertTriangle } from 'lucide-react';

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [filteredAchievements, setFilteredAchievements] = useState([]);
  const [error, setError] = useState(false);

  // Extract year from tournament name to sort newest first
  const extractYear = (text) => {
    const match = text?.match(/\b(20\d{2})\b/);
    return match ? parseInt(match[1], 10) : 0;
  };

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const projectId = '6o6o2622';
        const dataset = 'production';
        const groq = encodeURIComponent(`
          *[_type=="achievement"]{
            studentName,
            tournamentName,
            event,
            position,
            "imageUrl": image.asset->url
          }
        `);
        const url = `https://${projectId}.api.sanity.io/v2023-01-01/data/query/${dataset}?query=${groq}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.result && data.result.length > 0) {
          const sorted = data.result.sort((a, b) => extractYear(b.tournamentName) - extractYear(a.tournamentName));
          setAchievements(sorted);
          setFilteredAchievements(sorted);
        } else {
          setAchievements([]);
          setFilteredAchievements([]);
        }
      } catch (error) {
        console.error("Failed to fetch achievements from Sanity:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  const handleSearch = () => {
    const filtered = achievements.filter(a => {
      const matchesSearch = !searchTerm || 
        a.tournamentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.studentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = !positionFilter || String(a.position) === positionFilter;
      return matchesSearch && matchesPosition;
    });
    setFilteredAchievements(filtered);
  };

  // Group achievements by student + tournament to avoid duplication
  const getGroupedAchievements = (data) => {
    const grouped = {};
    data.forEach(a => {
      const key = `${a.studentName}-${a.tournamentName}`;
      if (!grouped[key]) {
        grouped[key] = {
          studentName: a.studentName,
          tournamentName: a.tournamentName,
          imageUrl: a.imageUrl,
          events: []
        };
      }
      grouped[key].events.push({ event: a.event, position: a.position });
    });
    return Object.values(grouped);
  };

  const grouped = getGroupedAchievements(filteredAchievements);

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
              Championship Highlights
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark">
              Our <span className="text-brand-red">Achievements</span>
            </h1>
            <div className="h-1 w-24 bg-brand-red mx-auto mt-4" />
          </motion.div>
        </div>

        {/* Filters */}
        <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-6 mb-12 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-grow max-w-2xl">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Tournament or Student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 dark:text-white text-brand-dark placeholder-gray-400"
              />
            </div>
            
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 dark:text-gray-300 text-brand-dark"
            >
              <option value="">All Positions</option>
              <option value="1">1st Place</option>
              <option value="2">2nd Place</option>
              <option value="3">3rd Place</option>
            </select>
          </div>

          <button
            onClick={handleSearch}
            className="w-full md:w-auto px-8 py-3 bg-brand-red hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md uppercase tracking-wider text-sm flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Trophy size={16} />
            <span>Search</span>
          </button>
        </div>

        {/* Dynamic Content */}
        {loading ? (
          // Skeleton Loader
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="dark:bg-white/5 bg-white border border-brand-dark/15 dark:border-white/10 rounded-2xl h-80 animate-pulse flex flex-col overflow-hidden">
                <div className="bg-brand-dark/10 dark:bg-white/10 h-40 w-full" />
                <div className="p-5 flex-grow space-y-3">
                  <div className="h-4 bg-brand-dark/10 dark:bg-white/10 rounded w-2/3" />
                  <div className="h-4 bg-brand-dark/10 dark:bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <AlertTriangle className="h-12 w-12 text-brand-red mx-auto mb-4" />
            <h3 className="text-lg font-bold uppercase tracking-wider mb-2">Network Connection Failed</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Unable to reach the live database. Check your internet connection or try again later.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {grouped.map((a, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={index}
                  className="border dark:border-white/10 border-brand-dark/10 dark:bg-white/5 bg-white rounded-2xl overflow-hidden shadow-lg hover:border-brand-red/30 transition-all flex flex-col"
                >
                  <div className="h-44 bg-brand-dark/5 dark:bg-white/10 relative overflow-hidden flex items-center justify-center p-4">
                    <img 
                      src={a.imageUrl || '/images/LOGO.png'} 
                      alt={a.studentName} 
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/LOGO.png';
                      }}
                    />
                  </div>
                  <div className="p-5 flex-grow flex flex-col justify-between text-center">
                    <div>
                      <h3 className="dark:text-white text-brand-dark font-extrabold text-lg mb-1">{a.studentName}</h3>
                      <p className="text-brand-gold text-xs font-bold uppercase tracking-wider mb-4 leading-tight">
                        {a.tournamentName}
                      </p>
                    </div>
                    <div className="bg-brand-dark/5 dark:bg-brand-dark/40 border border-brand-dark/5 dark:border-white/5 rounded-xl p-3 space-y-1.5 text-xs dark:text-gray-300 text-brand-dark">
                      {a.events.map((e, eIdx) => (
                        <div key={eIdx} className="flex justify-between items-center">
                          <span className="font-semibold text-left mr-2">{e.event}</span>
                          <span className="flex items-center space-x-1 font-bold text-brand-red shrink-0">
                            {e.position === "1" ? (
                              <Trophy size={12} className="text-yellow-400" />
                            ) : (
                              <Medal size={12} className="text-gray-400" />
                            )}
                            <span>Pos: {e.position}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}

              {grouped.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-500 dark:text-gray-400">
                  <Trophy className="h-10 w-10 text-brand-red mx-auto mb-3" />
                  <p className="text-lg">No achievements recorded in the academy database.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </div>
  );
};

export default Achievements;
