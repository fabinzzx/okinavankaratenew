import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, ChevronRight, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setLoading(true);
    try {
      const userCredential = await login(email, password);
      const u = userCredential.user;

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
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setResetSuccess('');
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
      } else if (err.message === 'ADMIN_NOT_ALLOWED') {
        setError("Admin accounts cannot sign in with Google. Please use the 'Dojo Administrator Sign In' section below with your email and password.");
      } else {
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    setError('');
    setResetSuccess('');
    try {
      await resetPassword(email);
      setResetSuccess("Password reset email sent! Check your inbox.");
    } catch (err) {
      console.error(err);
      setError("Failed to send password reset email.");
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
            Student <span className="text-brand-red">Portal</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Access your attendance, certifications, and fee logs</p>
        </div>

        {error && (
          <div className="bg-brand-red/10 border border-brand-red/20 text-brand-red px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2 mb-6">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2 mb-6">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{resetSuccess}</span>
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
            Students are authenticated strictly via Google accounts for secure credentials tracking.
          </p>
        </div>

        {/* Collapsible Admin Console Section */}
        <div className="mt-8 border-t border-brand-dark/15 dark:border-white/10 pt-6">
          <button
            onClick={() => setShowAdminLogin(!showAdminLogin)}
            className="w-full flex items-center justify-between text-xs font-extrabold uppercase text-gray-400 dark:text-gray-400 hover:text-brand-red dark:hover:text-brand-red tracking-wider transition-colors cursor-pointer"
          >
            <span className="flex items-center space-x-1.5">
              <ShieldAlert size={14} />
              <span>Dojo Administrator Sign In</span>
            </span>
            {showAdminLogin ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <AnimatePresence>
            {showAdminLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-4"
              >
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest block">Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-400"
                        placeholder="admin@okinavankarate.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Password</label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[10px] font-bold text-brand-gold hover:text-amber-500 hover:underline transition-colors cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-400"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-brand-dark text-white hover:bg-gray-900 border border-white/10 dark:border-white/5 font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <LogIn size={14} />
                        <span>Authenticate Admin</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;
