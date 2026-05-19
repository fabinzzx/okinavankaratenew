import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Users, Heart, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { storage, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { DOJO_LIST } from '../data/dojos';

const Register = () => {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    address: '',
    dob: '',
    gender: '',
    parentName: '',
    emergencyContact: '',
    dojoId: '',
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pre-fill profile fields if a Google authenticated user is logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.displayName || '',
        email: prev.email || user.email || '',
      }));
    } else {
      // Students should only register after logging in via Google
      navigate('/login');
    }
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Profile image must be less than 2MB.");
        return;
      }
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let photoUrl = '';
      
      const additionalProfileData = {
        fullName: formData.fullName,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        address: formData.address,
        dob: formData.dob,
        gender: formData.gender,
        parentName: formData.parentName,
        emergencyContact: formData.emergencyContact,
        dojoId: formData.dojoId,
        role: 'student', // default registration role is student
        profilePhotoUrl: user?.photoURL || '',
        feesStatus: 'unpaid', // default fees status
        beltGrade: 'White Belt (10th Kyu)', // starting belt
        attendanceCount: 0,
        isOnboarded: true, // fully registered!
      };

      if (user) {
        const userRef = doc(db, 'users', user.uid);

        // Upload photo if selected
        if (profilePhoto) {
          try {
            const photoRef = ref(storage, `profilePhotos/${user.uid}`);
            const snapshot = await uploadBytes(photoRef, profilePhoto);
            photoUrl = await getDownloadURL(snapshot.ref);
            additionalProfileData.profilePhotoUrl = photoUrl;
          } catch (storageErr) {
            console.warn("Storage upload failed, falling back to Google photo:", storageErr);
          }
        }

        await setDoc(userRef, additionalProfileData, { merge: true });
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError("Google authentication session not found. Please log in first.");
      }

    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center transition-colors duration-300 dark:bg-brand-dark bg-brand-light">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl w-full dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-brand-dark dark:text-white"
      >
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />

        {/* Head */}
        <div className="text-center mb-10">
          <img src="/images/LOGO.png" alt="Dojo Logo" className="h-16 w-16 mx-auto object-contain mb-3" />
          <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-wide">
            Student <span className="text-brand-red">Profile Onboarding</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Complete your student details to activate your profile in the academy roster
          </p>
        </div>

        {error && (
          <div className="bg-brand-red/10 border border-brand-red/20 text-brand-red px-4 py-3.5 rounded-xl text-sm flex items-start space-x-2 mb-8">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-red/10 border border-brand-red/20 rounded-xl p-8 text-center"
          >
            <CheckCircle className="text-[#25D366] h-12 w-12 mx-auto mb-4" />
            <h4 className="font-extrabold text-xl uppercase tracking-wide mb-2">Profile Completed!</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Welcome to Okinavan Shito Ryu Karate Academy. Redirecting to your dashboard...
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section 1: Account Profile */}
            <div className="space-y-6">
              <h3 className="font-extrabold uppercase text-xs sm:text-sm tracking-wider border-b border-brand-dark/15 dark:border-white/10 pb-2">
                1. Account Profile
              </h3>
              
              {/* Profile Pic Upload */}
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="relative w-24 h-24 bg-brand-dark border border-white/20 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={36} className="text-gray-500" />
                  )}
                  <label htmlFor="photo-upload" className="absolute bottom-1 right-1 bg-brand-red hover:bg-red-700 p-1.5 rounded-full cursor-pointer shadow-md border border-white/20 transition-all">
                    <Camera size={14} className="text-white" />
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm font-bold uppercase tracking-wider">Profile Photo Upload</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG or JPEG. Max size 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      required
                      disabled
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-500 disabled:opacity-50"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      required
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-500"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Personal Profile */}
            <div className="space-y-6">
              <h3 className="font-extrabold uppercase text-xs sm:text-sm tracking-wider border-b border-brand-dark/15 dark:border-white/10 pb-2">
                2. Student Profile Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest block">DOB</label>
                    <input
                      type="date"
                      required
                      name="dob"
                      value={formData.dob}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest block">Gender</label>
                    <select
                      required
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300"
                    >
                      <option value="" disabled>Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
                    <input
                      type="tel"
                      required
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Dojo Selection</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
                    <select
                      required
                      name="dojoId"
                      value={formData.dojoId}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300"
                    >
                      <option value="" disabled>Select your dojo</option>
                      {DOJO_LIST.map((dojo) => (
                        <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      required
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-500"
                      placeholder="Enter full physical address"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Guardians & Emergencies */}
            <div className="space-y-6">
              <h3 className="font-extrabold uppercase text-xs sm:text-sm tracking-wider border-b border-brand-dark/15 dark:border-white/10 pb-2">
                3. Guardian & Emergency Contacts
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Parent / Guardian Name</label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      name="parentName"
                      value={formData.parentName}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-500"
                      placeholder="Optional for adult students"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Emergency Contact Number</label>
                  <div className="relative">
                    <Heart className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500" />
                    <input
                      type="tel"
                      required
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-500"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-red hover:bg-red-700 text-white font-extrabold text-sm tracking-widest uppercase rounded-xl transition-all shadow-xl hover:shadow-brand-red/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <span>Complete Profile Activation</span>
              )}
            </button>

          </form>
        )}

      </motion.div>
    </div>
  );
};

export default Register;
