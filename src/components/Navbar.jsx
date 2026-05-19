import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle dark mode toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Dojos', path: '/dojos' },
    { name: 'Blackbelts', path: '/blackbelt' },
    { name: 'Achievements', path: '/achievements' },
    { name: 'Downloads', path: '/downloads' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="sticky top-0 lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 z-50 transition-colors duration-300 dark:bg-brand-dark bg-white border-b lg:border-b-0 lg:border-r border-brand-dark/10 dark:border-white/10 text-brand-dark dark:text-white">
      {/* Mobile Header Bar */}
      <div className="flex lg:hidden items-center justify-between h-16 sm:h-20 px-4 sm:px-6 w-full backdrop-blur-md dark:bg-brand-dark/95 bg-white/95">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 shrink-0">
          <img 
            src="/images/LOGO.png" 
            alt="Okinavan Dojo Logo" 
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain animate-pulse" 
          />
          <div className="flex flex-col">
            <span className="font-bold text-[10px] sm:text-xs tracking-wider bg-gradient-to-r from-brand-red via-brand-gold to-brand-red dark:to-white bg-clip-text text-transparent uppercase font-sans leading-tight">
              Okinavan Shito Ryu
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-0.5">
              Karate Academy
            </span>
          </div>
        </Link>

        {/* Mobile Control Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-full hover:bg-brand-dark/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
          </button>
          <button
            onClick={toggleMenu}
            className="p-1.5 rounded-md hover:bg-brand-dark/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar Layout */}
      <div className="hidden lg:flex flex-col justify-between h-full p-6 w-full overflow-y-auto">
        {/* Top: Logo & Brand */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Link to="/" className="flex flex-col items-center space-y-3">
            <img 
              src="/images/LOGO.png" 
              alt="Okinavan Dojo Logo" 
              className="h-20 w-20 object-contain hover:scale-105 transition-transform" 
            />
            <div className="flex flex-col items-center text-center">
              <span className="font-bold text-sm tracking-wider bg-gradient-to-r from-brand-red via-brand-gold to-brand-red dark:to-white bg-clip-text text-transparent uppercase font-sans leading-tight">
                Okinavan Shito Ryu
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-1">
                Karate Academy
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Navigation Links */}
        <div className="flex-grow flex flex-col justify-center space-y-2.5 my-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`relative px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 uppercase tracking-wider flex items-center ${
                location.pathname === link.path 
                  ? 'text-brand-red bg-brand-dark/5 dark:bg-white/5' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-brand-red dark:hover:text-brand-red hover:bg-brand-dark/5 dark:hover:bg-white/5'
              }`}
            >
              {location.pathname === link.path && (
                <motion.div 
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-brand-red"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span>{link.name}</span>
            </Link>
          ))}
        </div>

        {/* Bottom: Settings & Auth */}
        <div className="space-y-4 pt-4 border-t border-brand-dark/10 dark:border-white/10">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Theme</span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl hover:bg-brand-dark/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 hover:text-brand-dark dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
          </div>

          {/* Auth Controls */}
          {user ? (
            <div className="flex flex-col space-y-2">
              <Link
                to={role === 'super_admin' || role === 'dojo_admin' ? '/admin' : '/dashboard'}
                className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-gradient-to-r from-brand-red to-red-700 text-sm font-bold tracking-wider hover:from-brand-gold hover:to-amber-700 transition-all shadow-lg hover:shadow-brand-red/20 text-white uppercase"
              >
                <User size={16} />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center space-x-2 w-full py-3 border border-brand-dark/20 dark:border-white/20 hover:border-brand-red hover:bg-brand-red/10 rounded-xl text-sm font-semibold tracking-wider transition-all text-gray-600 dark:text-gray-300 hover:text-brand-red cursor-pointer uppercase"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <Link
                to="/login"
                className="flex items-center justify-center space-x-2 w-full py-3 bg-brand-red dark:bg-white text-white dark:text-brand-dark hover:bg-red-700 dark:hover:bg-brand-red dark:hover:text-white rounded-xl text-sm font-bold tracking-wider transition-all uppercase shadow-lg text-center"
              >
                <LogIn size={16} />
                <span>Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden border-t border-brand-dark/10 dark:border-white/10 dark:bg-brand-dark/95 bg-white/95 backdrop-blur-lg overflow-hidden text-brand-dark dark:text-white"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-base font-semibold tracking-wide uppercase transition-colors ${
                    location.pathname === link.path 
                      ? 'bg-brand-red text-white' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-brand-dark/5 dark:hover:bg-white/5 hover:text-brand-dark dark:hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              <hr className="border-brand-dark/10 dark:border-white/10 my-3" />

              {/* Mobile Auth Links */}
              {user ? (
                <div className="space-y-2 px-4">
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Logged in as {user.email}</div>
                  <Link
                    to={role === 'super_admin' || role === 'dojo_admin' ? '/admin' : '/dashboard'}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center space-x-2 w-full py-3 bg-gradient-to-r from-brand-red to-red-700 rounded-xl text-center text-sm font-bold uppercase tracking-wider transition-all shadow-md text-white"
                  >
                    <User size={18} />
                    <span>Dashboard</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center justify-center space-x-2 w-full py-3 border border-brand-dark/20 dark:border-white/20 hover:bg-brand-red/10 rounded-xl text-center text-sm font-bold uppercase tracking-wider transition-all text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="px-4 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center space-x-1.5 py-3 bg-brand-red dark:bg-white text-white dark:text-brand-dark hover:bg-red-700 dark:hover:bg-brand-red dark:hover:text-white rounded-xl text-center text-sm font-bold uppercase tracking-wider transition-all shadow-md"
                  >
                    <LogIn size={16} />
                    <span>Login</span>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
