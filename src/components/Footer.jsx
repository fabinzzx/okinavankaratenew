import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Mail } from 'lucide-react';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="transition-colors duration-300 dark:bg-brand-dark bg-gray-50 border-t border-brand-dark/10 dark:border-white/10 text-gray-500 dark:text-gray-400">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center space-x-3">
              <img src="/images/LOGO.png" alt="Okinavan Dojo Logo" className="h-12 w-12 object-contain" />
              <span className="font-bold text-lg tracking-wider text-brand-dark dark:text-white uppercase">
                Okinavan Shito Ryu Karate Academy
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              Founded by Kyoshi Thomas Kathanatt, we are committed to teaching authentic Okinawan Shito Ryu Karate. We focus on developing discipline, self-defense, character, and fitness for all age groups.
            </p>
            {/* Social Icons */}
            <div className="flex space-x-4 pt-2">
              <a
                href="https://www.instagram.com/okinavankarateindia"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-brand-dark/5 dark:bg-white/5 hover:bg-brand-red dark:hover:bg-brand-red text-brand-dark dark:text-gray-300 hover:text-white dark:hover:text-white rounded-full transition-all duration-300"
              >
                <FaInstagram size={20} />
              </a>
              <a
                href="https://www.whatsapp.com/channel/0029VapbgIP5Ejy74H3qkl2E"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-brand-dark/5 dark:bg-white/5 hover:bg-brand-red dark:hover:bg-brand-red text-brand-dark dark:text-gray-300 hover:text-white dark:hover:text-white rounded-full transition-all duration-300"
              >
                <FaWhatsapp size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-brand-dark dark:text-white font-semibold text-sm tracking-wider uppercase mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-brand-red text-sm transition-colors uppercase tracking-wider">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-brand-red text-sm transition-colors uppercase tracking-wider">About Us</Link>
              </li>
              <li>
                <Link to="/dojos" className="hover:text-brand-red text-sm transition-colors uppercase tracking-wider">Our Dojos</Link>
              </li>
              <li>
                <Link to="/blackbelt" className="hover:text-brand-red text-sm transition-colors uppercase tracking-wider">Blackbelts</Link>
              </li>
              <li>
                <Link to="/achievements" className="hover:text-brand-red text-sm transition-colors uppercase tracking-wider">Achievements</Link>
              </li>
              <li>
                <Link to="/downloads" className="hover:text-brand-red text-sm transition-colors uppercase tracking-wider">Downloads</Link>
              </li>
            </ul>
          </div>

          {/* Dojo Contact Info */}
          <div className="space-y-3">
            <h3 className="text-brand-dark dark:text-white font-semibold text-sm tracking-wider uppercase mb-4">Contact Info</h3>
            <div className="flex items-start space-x-3 text-sm">
              <Phone size={18} className="text-brand-red flex-shrink-0 mt-0.5" />
              <span>+91 9947001779</span>
            </div>
            <div className="flex items-start space-x-3 text-sm">
              <Mail size={18} className="text-brand-red flex-shrink-0 mt-0.5" />
              <span>info@okinavankarateindia.com</span>
            </div>
            <div className="flex items-start space-x-3 text-sm">
              <MapPin size={18} className="text-brand-red flex-shrink-0 mt-0.5" />
              <span>Sunil Hall, Puthenvelikkara, Kerala, India</span>
            </div>
          </div>

        </div>

        {/* Legal & Copyright */}
        <div className="mt-12 pt-8 border-t border-brand-dark/10 dark:border-white/5 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} Okinavan Shito Ryu Karate Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
