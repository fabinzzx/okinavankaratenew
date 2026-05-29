import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { user: u, isNewUser } = await loginWithGoogle();
      if (isNewUser) {
        navigate('/joinus');
      } else {
        // Query database for user's role to prevent dashboard race conditions
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.role === 'super_admin' || data.role === 'dojo_admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          if (u.email === 'francisfabin860@gmail.com') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (err) {
      console.error(err);
      if (err.message === 'ACCESS_DENIED') {
        setError("Access denied. Your Google account is not registered with any dojo. Please contact your dojo admin to be added first.");
      } else {
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 dark:bg-brand-dark bg-brand-light">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

        {/* Head */}
        <div className="text-center mb-8">
          <img src="/images/LOGO.png" alt="Dojo Logo" className="h-16 w-16 mx-auto object-contain mb-3" />
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-brand-dark dark:text-white tracking-wide">
            Admin/Student <span className="text-brand-red">Portal</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Access your attendance, certifications, and fee logs</p>
        </div>

        {error && (
          <div className="bg-brand-red/10 border border-brand-red/20 text-brand-red px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2 mb-6">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic content showing Primary Student Google Sign-in */}
        <div className="space-y-6">
          <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider text-center">
            Sign In with Google
          </p>

          <button
            onClick={handleGoogleLogin}
            type="button"
            disabled={loading}
            className="w-full py-4 bg-brand-red hover:bg-red-700 text-white font-extrabold text-sm tracking-widest uppercase rounded-xl transition-all shadow-xl hover:shadow-brand-red/20 flex items-center justify-center space-x-3 cursor-pointer"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="h-5 w-5 shrink-0 bg-white p-0.5 rounded-full" />
            <span>Login with Google</span>
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
            Students and registered administrators are authenticated strictly via Google accounts for secure credentials tracking.
          </p>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;
