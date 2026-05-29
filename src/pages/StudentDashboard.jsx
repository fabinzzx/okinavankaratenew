import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Calendar, Trophy, Award, Bell, CreditCard, ChevronRight, 
  Download, Edit2, LogOut, CheckCircle, ShieldAlert, Award as MedalIcon, Info, Home as HomeIcon,
  FolderOpen, Upload, Trash2, FileText, Image as ImageIcon, Loader2, RefreshCw, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const StudentDashboard = () => {
  const { user, profile, availableProfiles, selectProfile, switchProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    mobileNumber: profile?.mobileNumber || '',
    address: profile?.address || ''
  });
  
  // Strict admin-assigned database tables
  const [attendance, setAttendance] = useState([]);
  const [exams, setExams] = useState([]);
  const [fees, setFees] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [notifications, setNotifications] = useState([]);

  // Cloudinary Wallet Documents State
  const [walletDocs, setWalletDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [replacingDoc, setReplacingDoc] = useState(null);
  const uploadControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (uploadControllerRef.current) {
        uploadControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (profile) {
      setEditForm({
        mobileNumber: profile.mobileNumber || '',
        address: profile.address || ''
      });
    }
  }, [profile]);

  // Load active student records strictly from firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !profile) return;
      const profileId = profile.id || profile.uid;
      try {
        // Attendance
        const attSnap = await getDocs(query(collection(db, 'attendance'), where('uid', '==', profileId)));
        setAttendance(attSnap.docs.map(doc => doc.data()));

        // Exams
        const examSnap = await getDocs(query(collection(db, 'exams'), where('uid', '==', profileId)));
        setExams(examSnap.docs.map(doc => doc.data()));

        // Fees
        const feeSnap = await getDocs(query(collection(db, 'fees'), where('uid', '==', profileId)));
        setFees(feeSnap.docs.map(doc => doc.data()));

        // Tournaments
        const tourSnap = await getDocs(query(collection(db, 'tournaments'), where('uid', '==', profileId)));
        setTournaments(tourSnap.docs.map(doc => doc.data()));

        // Announcements
        if (profile.dojoId) {
          const notifSnap = await getDocs(query(collection(db, 'notifications'), where('dojoId', '==', profile.dojoId)));
          setNotifications(notifSnap.docs.map(doc => doc.data()));
        }

        // Fetch Wallet Documents metadata
        const docsQuery = query(collection(db, 'documents'), where('parentUid', '==', user.uid));
        const docsSnap = await getDocs(docsQuery);
        const allDocs = docsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setWalletDocs(allDocs.filter(d => d.ownerId === profileId));

      } catch (error) {
        console.error("Error fetching student records from firestore:", error);
      }
    };
    fetchUserData();
  }, [user, profile]);

  const uploadFileToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dkijeoc9f';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'okinavankarate';

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary cloud name or upload preset is not configured.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `documents/students/${profile.id || profile.uid}`);

    const controller = new AbortController();
    uploadControllerRef.current = controller;

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || "Failed to upload file to Cloudinary.");
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
      name: file.name,
      type: file.name.split('.').pop().toLowerCase(),
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    };
  };

  const handleDocUpload = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit.");
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Unsupported file type. Please upload PDF, JPEG, JPG, or PNG.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const uploadedData = await uploadFileToCloudinary(file);
      
      const docId = doc(collection(db, 'documents')).id;
      const metadata = {
        ownerId: profile.id || profile.uid,
        ownerEmail: user.email,
        parentUid: user.uid,
        name: uploadedData.name,
        url: uploadedData.url,
        publicId: uploadedData.publicId,
        type: uploadedData.type,
        size: uploadedData.size,
        uploadedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'documents', docId), metadata);
      setWalletDocs(prev => [...prev, { id: docId, ...metadata }]);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Upload cancelled");
      } else {
        setUploadError(err.message || "Failed to upload document.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDocReplace = async (file, oldDoc) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit.");
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Unsupported file type. Please upload PDF, JPEG, JPG, or PNG.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const uploadedData = await uploadFileToCloudinary(file);
      
      const docRef = doc(db, 'documents', oldDoc.id);
      const updateData = {
        name: uploadedData.name,
        url: uploadedData.url,
        publicId: uploadedData.publicId,
        type: uploadedData.type,
        size: uploadedData.size,
        uploadedAt: new Date().toISOString()
      };

      await updateDoc(docRef, updateData);
      setWalletDocs(prev => prev.map(d => d.id === oldDoc.id ? { ...d, ...updateData } : d));
      setReplacingDoc(null);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Upload cancelled");
      } else {
        setUploadError(err.message || "Failed to replace document.");
      }
    } finally {
      setUploading(false);
      setReplacingDoc(null);
    }
  };

  const handleDocDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDoc(doc(db, 'documents', docId));
      setWalletDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error("Failed to delete document metadata:", err);
      alert("Failed to delete document. Please try again.");
    }
  };

  const handleCancelUpload = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort();
    }
    setUploading(false);
    setReplacingDoc(null);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const profileId = profile.id || profile.uid;
      const userRef = doc(db, 'users', profileId);
      await updateDoc(userRef, {
        mobileNumber: editForm.mobileNumber,
        address: editForm.address
      });
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  // Belt Progress Percentage based on Kyu/Dan grade
  const beltProgressMap = {
    'White Belt (10th Kyu)': 10,
    'White Belt': 10,
    'Yellow Belt (9th Kyu)': 20,
    'Yellow Belt': 20,
    'Orange Belt (8th Kyu)': 30,
    'Orange Belt': 30,
    'Green Belt (7th Kyu)': 40,
    'Green Belt': 40,
    'Blue Belt (6th Kyu)': 50,
    'Blue Belt': 50,
    'Purple Belt': 60,
    'Brown Junior': 70,
    'Brown Senior': 80,
    'Brown Super Senior': 90,
    'Brown Belt (3rd Kyu)': 85,
    'Black Belt (1st Dan)': 100,
    'Black Belt': 100,
  };

  if (!profile && availableProfiles && availableProfiles.length > 1) {
    return (
      <div className="min-h-screen text-brand-dark dark:text-white py-16 px-4 flex flex-col justify-center items-center dark:bg-brand-dark bg-brand-light transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full bg-white dark:bg-white/5 border border-brand-dark/10 dark:border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl text-center space-y-8"
        >
          <div>
            <img src="/images/LOGO.png" alt="Academy Logo" className="h-16 w-16 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-brand-dark dark:text-white tracking-wide">
              Select <span className="text-brand-red">Student Profile</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-widest font-bold">
              Multiple sibling profiles found for {user?.email}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {availableProfiles.map((student) => (
              <button
                key={student.id}
                onClick={() => selectProfile(student.id)}
                className="flex items-center space-x-4 p-4 rounded-2xl border border-brand-dark/15 dark:border-white/10 dark:bg-white/5 bg-brand-dark/5 hover:border-brand-red/50 hover:bg-brand-red/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-brand-dark shrink-0">
                  <img
                    src={student.profilePhotoUrl || '/images/LOGO.png'}
                    alt={student.fullName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/LOGO.png';
                    }}
                  />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-extrabold text-sm text-brand-dark dark:text-white truncate">
                    {student.fullName}
                  </h3>
                  <p className="text-[10px] text-brand-gold uppercase tracking-wider font-extrabold truncate mt-0.5">
                    {student.beltGrade || 'White Belt'}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold truncate mt-0.5">
                    Dojo: {student.dojoId || 'Pattam'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-brand-dark/10 dark:border-white/5 flex justify-center">
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-brand-red transition-all uppercase tracking-widest"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPercentage = beltProgressMap[profile?.beltGrade] || 10;
  const totalPresentCount = attendance.filter(a => a.status?.toLowerCase() === 'present').length;

  return (
    <div className="min-h-screen text-brand-dark dark:text-white py-12 transition-colors duration-300 dark:bg-brand-dark bg-brand-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header Card */}
        <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-12 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            <div className="w-24 h-24 bg-brand-dark border border-white/20 rounded-full overflow-hidden shrink-0">
              <img 
                src={profile?.profilePhotoUrl || '/images/LOGO.png'} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/images/LOGO.png";
                }}
              />
            </div>
            <div>
              <span className="px-3 py-1 bg-brand-red/10 border border-brand-red/20 rounded-full text-brand-red font-bold text-xs uppercase tracking-widest inline-block mb-1">
                Student Profile
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-dark dark:text-white uppercase tracking-wide">
                {profile?.fullName || user?.email}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Rank: <strong className="text-brand-gold">{profile?.beltGrade || 'White Belt (10th Kyu)'}</strong>
              </p>
            </div>
          </div>
          
          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-center">
            <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 px-6 py-3.5 rounded-2xl w-32">
              <p className="text-2xl font-black text-brand-red">{totalPresentCount}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1 font-bold">Attendance</p>
            </div>
            <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 px-6 py-3.5 rounded-2xl w-32 flex flex-col justify-center items-center">
              <p className={`text-xs font-black uppercase leading-none px-2.5 py-1 rounded-full ${
                Number(profile?.pendingFees || 0) > 0
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : profile?.feesStatus?.toLowerCase() === 'paid'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
              }`}>
                {Number(profile?.pendingFees || 0) > 0 ? `₹${profile.pendingFees} DUE` : (profile?.feesStatus?.toUpperCase() || 'UNPAID')}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-2 font-bold">Fee Status</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-4 h-fit space-y-2">
            <Link
              to="/"
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-bold tracking-wide uppercase transition-all text-gray-500 dark:text-gray-400 hover:bg-brand-dark/5 dark:hover:bg-white/5 hover:text-brand-dark dark:hover:text-white"
            >
              <HomeIcon size={18} className="text-brand-red" />
              <span>Home Page</span>
            </Link>

            <div className="h-[1px] bg-brand-dark/10 dark:bg-white/5 my-2" />

            {[
              { id: 'overview', label: 'Overview', icon: <Award size={18} /> },
              { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
              { id: 'attendance', label: 'Attendance', icon: <Calendar size={18} /> },
              { id: 'exams', label: 'Belt Exams', icon: <MedalIcon size={18} /> },
              { id: 'tournaments', label: 'Tournaments', icon: <Trophy size={18} /> },
              { id: 'fees', label: 'Dues & Fees', icon: <CreditCard size={18} /> },
              { id: 'wallet', label: 'My Wallet', icon: <FolderOpen size={18} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-bold tracking-wide uppercase transition-all ${
                  activeTab === tab.id 
                    ? 'bg-brand-red text-white shadow-lg' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-brand-dark/5 dark:hover:bg-white/5 hover:text-brand-dark dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}

            {availableProfiles && availableProfiles.length > 1 && (
              <button
                onClick={switchProfile}
                className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-bold tracking-wide uppercase transition-all text-brand-gold hover:bg-brand-gold/10 hover:text-brand-gold mt-4 border-t border-brand-dark/10 dark:border-white/5 pt-4"
              >
                <User size={18} />
                <span>Switch Student</span>
              </button>
            )}

            {/* Theme Switcher */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-brand-dark/10 dark:border-white/5 mt-4 pt-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400">Theme</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl hover:bg-brand-dark/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 hover:text-brand-dark dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Toggle Theme"
              >
                {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
              </button>
            </div>

            <button
              onClick={logout}
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-bold tracking-wide uppercase transition-all text-brand-red hover:bg-brand-red/10 hover:text-brand-red"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Core Content Body */}
          <div className="lg:col-span-3 dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 min-h-[500px]">
            
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-brand-dark dark:text-white tracking-wide mb-2">Dojo Progress</h2>
                  <div className="h-1 w-12 bg-brand-red mb-6" />
                  
                  {/* Progress Bar */}
                  <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 p-6 rounded-2xl">
                    <div className="flex justify-between items-center text-sm font-semibold mb-2 text-brand-dark dark:text-gray-300">
                      <span>Belt Completion Status</span>
                      <span className="text-brand-gold">{progressPercentage}% Complete</span>
                    </div>
                    <div className="w-full bg-brand-dark/10 dark:bg-brand-dark h-4 rounded-full overflow-hidden border border-brand-dark/10 dark:border-white/10 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.8 }}
                        className="bg-gradient-to-r from-brand-red to-brand-gold h-full rounded-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                      Your current rank is <strong className="text-brand-dark dark:text-white">{profile?.beltGrade || 'White Belt (10th Kyu)'}</strong>. Keep training consistently to qualify for the upcoming Kyu Belt promotional grading exam.
                    </p>
                  </div>
                </div>

                {/* Notifications & Announcements */}
                <div>
                  <h3 className="text-lg font-bold uppercase text-brand-dark dark:text-white mb-4 flex items-center space-x-2">
                    <Bell size={18} className="text-brand-red" />
                    <span>Dojo Announcements</span>
                  </h3>
                  <div className="space-y-4">
                    {notifications.length > 0 ? (
                      notifications.map((notif, nIdx) => (
                        <div key={nIdx} className="p-5 bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 rounded-2xl space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-brand-dark dark:text-white font-extrabold text-sm uppercase tracking-wide">{notif.title}</h4>
                            <span className="text-[10px] text-gray-500 font-semibold">{notif.date}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-2xl text-gray-500 dark:text-gray-400 text-xs">
                        <Info size={20} className="mx-auto mb-2 opacity-50" />
                        No active announcements from your Dojo at this time.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-brand-dark dark:text-white tracking-wide mb-2">My Information</h2>
                    <div className="h-1 w-12 bg-brand-red" />
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center space-x-1.5 px-4 py-2 border border-brand-dark/20 dark:border-white/20 hover:border-brand-red dark:hover:border-brand-red hover:bg-brand-red hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-brand-dark dark:text-white cursor-pointer"
                  >
                    <Edit2 size={12} />
                    <span>{isEditing ? 'Cancel' : 'Edit Contacts'}</span>
                  </button>
                </div>

                {isEditing ? (
                  <form onSubmit={handleProfileUpdate} className="space-y-6 bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 p-6 rounded-2xl">
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Mobile Number</label>
                      <input
                        type="tel"
                        value={editForm.mobileNumber}
                        onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                        className="w-full bg-white dark:bg-brand-dark border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Address</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full bg-white dark:bg-brand-dark border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-brand-red hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Save Profile Updates
                    </button>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 p-6 rounded-2xl text-sm">
                    <div className="space-y-1"><p className="text-gray-500 uppercase font-bold text-[10px] tracking-wider">Full Name</p><p className="text-brand-dark dark:text-white font-bold">{profile?.fullName || 'Karate Student'}</p></div>
                    <div className="space-y-1"><p className="text-gray-500 uppercase font-bold text-[10px] tracking-wider">Email Address</p><p className="text-brand-dark dark:text-white font-bold">{profile?.email || user?.email}</p></div>
                    <div className="space-y-1"><p className="text-gray-500 uppercase font-bold text-[10px] tracking-wider">Mobile Number</p><p className="text-brand-dark dark:text-white font-bold">{profile?.mobileNumber || 'Not Provided'}</p></div>
                    <div className="space-y-1"><p className="text-gray-500 uppercase font-bold text-[10px] tracking-wider">Dojo Selection</p><p className="text-brand-dark dark:text-white font-bold uppercase">{profile?.dojoId || 'Not Selected'}</p></div>
                    <div className="space-y-1"><p className="text-gray-500 uppercase font-bold text-[10px] tracking-wider">Emergency Contact</p><p className="text-brand-dark dark:text-white font-bold">{profile?.emergencyContact || 'Not Provided'}</p></div>
                    <div className="space-y-1"><p className="text-gray-500 uppercase font-bold text-[10px] tracking-wider">Address</p><p className="text-brand-dark dark:text-white font-bold">{profile?.address || 'Not Provided'}</p></div>
                  </div>
                )}

                {/* QR ID Card Generation */}
                <div>
                  <h3 className="text-lg font-bold uppercase text-brand-dark dark:text-white mb-4">Student ID Card</h3>
                  <div className="bg-gradient-to-r from-brand-red/5 to-brand-gold/5 dark:from-brand-red/10 dark:to-brand-gold/10 border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-3 max-w-sm text-center sm:text-left">
                      <p className="font-extrabold uppercase text-brand-dark dark:text-white">QR Based Digital ID Card</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        This digital ID contains your official student credentials and dojo verification key. Present it for scanning during attendance checking.
                      </p>
                    </div>
                    
                    {/* Mock QR ID Card */}
                    <div className="bg-white p-3 rounded-2xl shrink-0 flex flex-col items-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${user?.uid || 'karate-student'}`} 
                        alt="Student ID QR" 
                        className="h-28 w-28 object-contain"
                      />
                      <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest mt-2">
                        SCAN TO CHECK IN
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ATTENDANCE TAB */}
            {activeTab === 'attendance' && (() => {
              // Filter and sort logs in selected date range
              const rangeLogs = attendance
                .filter(log => log.date >= reportStartDate && log.date <= reportEndDate)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

              const totalSessions = rangeLogs.length;
              const presentDays = rangeLogs.filter(l => l.status?.toLowerCase() === 'present').length;
              const absentDays = rangeLogs.filter(l => l.status?.toLowerCase() === 'absent').length;
              const attendanceRate = totalSessions > 0 
                ? ((presentDays / totalSessions) * 100).toFixed(1)
                : '100.0';

              return (
                <div className="space-y-6">
                  <style>{`
                    @media print {
                      body * {
                        visibility: hidden;
                      }
                      #printable-student-attendance, #printable-student-attendance * {
                        visibility: visible;
                      }
                      #printable-student-attendance {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        color: black !important;
                        background: white !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                    }
                  `}</style>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black uppercase text-brand-dark dark:text-white tracking-wide mb-2">My Attendance Logs</h2>
                      <div className="h-1 w-12 bg-brand-red mb-4" />
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="px-5 py-2.5 bg-brand-gold text-brand-dark font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 self-start sm:self-center"
                    >
                      <Download size={14} />
                      <span>Download Report</span>
                    </button>
                  </div>

                  {/* Date Range Selector (no-print) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-4 no-print">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Start Date</label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full dark:bg-brand-dark bg-white border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-2 text-xs dark:text-white text-brand-dark focus:outline-none focus:border-brand-red/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">End Date</label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full dark:bg-brand-dark bg-white border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-2 text-xs dark:text-white text-brand-dark focus:outline-none focus:border-brand-red/50"
                      />
                    </div>
                  </div>

                  {/* Stats Cards (no-print) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                    <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-xl font-extrabold dark:text-white text-brand-dark">{totalSessions}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">Total Sessions</p>
                    </div>
                    <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{presentDays}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">Days Present</p>
                    </div>
                    <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-xl font-extrabold text-brand-red">{absentDays}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">Days Absent</p>
                    </div>
                    <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-xl font-extrabold text-brand-gold">{attendanceRate}%</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">Attendance Rate</p>
                    </div>
                  </div>

                  {/* Printable & UI Log area */}
                  <div id="printable-student-attendance" className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl p-4 sm:p-6 print:border-0 print:bg-white print:text-black">
                    {/* Header strictly for printing */}
                    <div className="hidden print:block text-center space-y-2 pb-6 border-b border-gray-200 mb-6">
                      <h2 className="text-2xl font-black uppercase text-black">Okinavan Shito Ryu Karate Academy</h2>
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Student Attendance Report</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Student Name: <span className="font-bold text-black">{profile.fullName}</span> | Email: {profile.email}</p>
                        <p>Period: {reportStartDate} to {reportEndDate} | Generated: {new Date().toLocaleDateString()}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100 text-center font-bold">
                        <div>
                          <p className="text-sm text-black">{totalSessions}</p>
                          <p className="text-[8px] text-gray-500 uppercase">Sessions</p>
                        </div>
                        <div>
                          <p className="text-sm text-emerald-600">{presentDays}</p>
                          <p className="text-[8px] text-gray-500 uppercase">Present</p>
                        </div>
                        <div>
                          <p className="text-sm text-red-600">{absentDays}</p>
                          <p className="text-[8px] text-gray-500 uppercase">Absent</p>
                        </div>
                        <div>
                          <p className="text-sm text-amber-800">{attendanceRate}%</p>
                          <p className="text-[8px] text-gray-500 uppercase">Rate</p>
                        </div>
                      </div>
                    </div>

                    {rangeLogs.length > 0 ? (
                      <div className="dark:bg-brand-dark/50 bg-brand-light/50 border border-brand-dark/10 dark:border-white/5 rounded-2xl overflow-hidden print:border-gray-200">
                        <table className="w-full text-left text-sm print:text-black">
                          <thead className="bg-brand-dark/10 dark:bg-brand-dark print:bg-gray-100 border-b border-brand-dark/10 dark:border-white/10 print:border-gray-200 text-gray-500 dark:text-gray-400 print:text-gray-700 text-xs uppercase tracking-wider font-bold">
                            <tr>
                              <th className="p-4">Date</th>
                              <th className="p-4">Dojo Session</th>
                              <th className="p-4 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-dark/10 dark:divide-white/5 print:divide-gray-200 font-semibold text-xs sm:text-sm text-brand-dark dark:text-gray-300 print:text-black">
                            {rangeLogs.map((att, idx) => (
                              <tr key={idx} className="hover:bg-brand-dark/5 dark:hover:bg-white/5 print:hover:bg-transparent">
                                <td className="p-4 text-gray-500 dark:text-gray-400 print:text-gray-600">{att.date}</td>
                                <td className="p-4 text-brand-dark dark:text-white print:text-black">{att.session}</td>
                                <td className="p-4 text-right">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    att.status?.toLowerCase() === 'present' 
                                      ? 'bg-green-500/10 text-green-500 border border-green-500/20 print:bg-transparent print:text-green-600 print:border-green-600' 
                                      : 'bg-brand-red/10 text-brand-red border border-brand-red/20 print:bg-transparent print:text-red-600 print:border-red-600'
                                  }`}>
                                    {att.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-3xl text-gray-500 dark:text-gray-400 text-sm print:border-gray-300">
                        <Calendar size={36} className="mx-auto mb-3 opacity-40 text-brand-red" />
                        <p className="font-bold uppercase tracking-wider mb-1">No Attendance Logged</p>
                        <p className="text-xs">No records found for the selected date range.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 4. BELT EXAMS TAB */}
            {activeTab === 'exams' && (() => {
              const combinedExams = [];
              
              // Add from Firestore exams
              exams.forEach(ex => {
                combinedExams.push({
                  date: ex.date || 'Recent',
                  beltGrade: ex.beltGrade,
                  examiner: ex.examiner || 'Dojo Instructor',
                  score: ex.score || 'PASSED',
                  result: ex.result || 'PASSED'
                });
              });

              // Add from profile.beltHistory if not already present by beltGrade
              if (profile?.beltHistory) {
                profile.beltHistory.forEach(bh => {
                  const exists = combinedExams.some(ex => ex.beltGrade?.toLowerCase() === bh.belt?.toLowerCase());
                  if (!exists) {
                    combinedExams.push({
                      date: bh.date || 'Recent',
                      beltGrade: bh.belt,
                      examiner: bh.updatedBy || 'Dojo Instructor',
                      score: 'Promoted',
                      result: 'PASSED'
                    });
                  }
                });
              }

              // Sort descending by date
              combinedExams.sort((a, b) => {
                const dateA = new Date(a.date).getTime() || 0;
                const dateB = new Date(b.date).getTime() || 0;
                return dateB - dateA;
              });

              return (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-brand-dark dark:text-white tracking-wide mb-2">Exam & Belt Rankings</h2>
                    <div className="h-1 w-12 bg-brand-red mb-6" />
                  </div>

                  {/* Timeline for Belt Promotions */}
                  {profile?.beltHistory && profile.beltHistory.length > 0 && (
                    <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 p-6 rounded-3xl space-y-4">
                      <h3 className="text-sm font-extrabold uppercase text-gray-500 dark:text-gray-300 tracking-wider">Promotion History Timeline</h3>
                      <div className="relative pl-6 border-l border-brand-gold/30 space-y-6">
                        {profile.beltHistory.slice().reverse().map((bh, idx) => (
                          <div key={idx} className="relative">
                            <span className="absolute -left-[30px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-brand-gold bg-white dark:bg-brand-dark" />
                            <div>
                              <p className="text-sm font-black text-brand-dark dark:text-white uppercase tracking-wide">{bh.belt}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">Awarded on: <strong>{bh.date}</strong> by {bh.updatedBy || 'Dojo Instructor'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-extrabold uppercase text-gray-500 dark:text-gray-300 tracking-wider mb-3">Grading Records</h3>
                  </div>

                  {combinedExams.length > 0 ? (
                    <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-brand-dark/10 dark:bg-brand-dark border-b border-brand-dark/10 dark:border-white/10 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                          <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Target Belt Rank</th>
                            <th className="p-4">Examiner</th>
                            <th className="p-4">Score</th>
                            <th className="p-4 text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-dark/10 dark:divide-white/5 font-semibold text-xs sm:text-sm text-brand-dark dark:text-gray-300">
                          {combinedExams.map((exam, idx) => (
                            <tr key={idx} className="hover:bg-brand-dark/5 dark:hover:bg-white/5">
                              <td className="p-4">{exam.date}</td>
                              <td className="p-4 text-brand-dark dark:text-white font-extrabold">{exam.beltGrade}</td>
                              <td className="p-4">{exam.examiner}</td>
                              <td className="p-4 text-brand-gold">{exam.score}</td>
                              <td className="p-4 text-right text-emerald-500 font-bold">{exam.result}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-12 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-3xl text-gray-500 dark:text-gray-400 text-sm">
                      <MedalIcon size={36} className="mx-auto mb-3 opacity-40 text-brand-gold" />
                      <p className="font-bold uppercase tracking-wider mb-1">No Kyu Grading History</p>
                      <p className="text-xs">Grade promotional exams must be conducted and registered by an authorized Dojo Admin.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 5. TOURNAMENTS TAB */}
            {activeTab === 'tournaments' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-brand-dark dark:text-white tracking-wide mb-2">Tournament Participations</h2>
                  <div className="h-1 w-12 bg-brand-red mb-6" />
                </div>

                {tournaments.length > 0 ? (
                  <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-brand-dark/10 dark:bg-brand-dark border-b border-brand-dark/10 dark:border-white/10 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-4">Date</th>
                          <th className="p-4">Championship Name</th>
                          <th className="p-4">Category Event</th>
                          <th className="p-4 text-right">Placement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-dark/10 dark:divide-white/5 font-semibold text-xs sm:text-sm text-brand-dark dark:text-gray-300">
                        {tournaments.map((tour, idx) => (
                          <tr key={idx} className="hover:bg-brand-dark/5 dark:hover:bg-white/5">
                            <td className="p-4">{tour.date}</td>
                            <td className="p-4 text-brand-dark dark:text-white font-extrabold">{tour.name}</td>
                            <td className="p-4">{tour.event}</td>
                            <td className="p-4 text-right text-brand-gold font-bold uppercase">{tour.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-3xl text-gray-500 dark:text-gray-400 text-sm">
                    <Trophy size={36} className="mx-auto mb-3 opacity-40 text-brand-gold" />
                    <p className="font-bold uppercase tracking-wider mb-1">No Tournament Records</p>
                    <p className="text-xs">Championship wins and participation entries are verified and authorized by the Academy.</p>
                  </div>
                )}
              </div>
            )}

            {/* 6. FEES TAB */}
            {activeTab === 'fees' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-brand-dark dark:text-white tracking-wide mb-2">My Dues & Fees</h2>
                  <div className="h-1 w-12 bg-brand-red mb-6" />
                </div>

                {/* Balance Dues Notice Card */}
                <div className={`p-6 rounded-2xl border ${
                  Number(profile?.pendingFees || 0) > 0
                    ? 'bg-amber-500/10 border-amber-500/20 text-brand-dark dark:text-white'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-brand-dark dark:text-white'
                }`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-extrabold">Outstanding Balance</p>
                      <p className="text-3xl font-black mt-1">₹{profile?.pendingFees || '0'}</p>
                    </div>
                    {Number(profile?.pendingFees || 0) > 0 ? (
                      <div className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/35 px-4 py-2.5 rounded-xl text-xs font-semibold leading-relaxed">
                        ⚠️ Please clear your dues of <strong>₹{profile.pendingFees}</strong> with your Dojo Branch instructor.
                      </div>
                    ) : (
                      <div className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 px-4 py-2.5 rounded-xl text-xs font-semibold leading-relaxed">
                        ✓ All dues are fully settled! Thank you.
                      </div>
                    )}
                  </div>
                </div>

                {Number(profile?.pendingFees || 0) > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold uppercase text-amber-500 tracking-wider">Pending Dues</h3>
                    <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-amber-500/20 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider font-bold">
                           <tr>
                            <th className="p-4">Dues Description</th>
                            <th className="p-4">Amount Outstanding</th>
                            <th className="p-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-xs sm:text-sm text-brand-dark dark:text-gray-300">
                          <tr className="bg-amber-500/5">
                            <td className="p-4 text-brand-dark dark:text-white font-extrabold">Outstanding Academy Fee Dues</td>
                            <td className="p-4 text-amber-600 dark:text-amber-400 font-bold">₹{profile.pendingFees}</td>
                            <td className="p-4 text-right">
                              <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold uppercase">
                                PENDING
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-extrabold uppercase text-gray-500 dark:text-gray-300 tracking-wider mb-3">Settled Monthly Payments</h3>
                </div>

                {fees.length > 0 ? (
                  <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-brand-dark/10 dark:bg-brand-dark border-b border-brand-dark/10 dark:border-white/10 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-4">Month Period</th>
                          <th className="p-4">Amount Cleared</th>
                          <th className="p-4">Payment Date</th>
                          <th className="p-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-dark/10 dark:divide-white/5 font-semibold text-xs sm:text-sm text-brand-dark dark:text-gray-300">
                        {fees.map((fee, idx) => (
                          <tr key={idx} className="hover:bg-brand-dark/5 dark:hover:bg-white/5">
                            <td className="p-4 text-brand-dark dark:text-white font-extrabold">{fee.month}</td>
                            <td className="p-4">{fee.amount}</td>
                            <td className="p-4">{fee.date}</td>
                            <td className="p-4 text-right">
                              <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full text-xs font-bold">
                                {fee.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-3xl text-gray-500 dark:text-gray-400 text-sm">
                    <CreditCard size={36} className="mx-auto mb-3 opacity-40 text-brand-red" />
                    <p className="font-bold uppercase tracking-wider mb-1">No Fee Payments Recorded</p>
                    <p className="text-xs">Your monthly fee collections are updated strictly by Dojo Administrators.</p>
                  </div>
                )}
              </div>
            )}

            {/* 7. WALLET TAB */}
            {activeTab === 'wallet' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-brand-dark dark:text-white tracking-wide mb-2">My Documents Wallet</h2>
                  <div className="h-1 w-12 bg-brand-red mb-6" />
                </div>

                {/* Upload Section */}
                <div className="bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold uppercase text-brand-dark dark:text-white mb-3">Upload New Document</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                    Upload certificates, ID proofs, or medical records. Supported formats: <strong>PDF, JPEG, JPG, PNG</strong> (Max 5MB).
                  </p>
                  
                  {uploadError && (
                    <div className="mb-4 p-3 bg-brand-red/10 border border-brand-red/20 rounded-xl text-brand-red text-xs font-bold flex items-center space-x-2">
                      <ShieldAlert size={16} />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploading ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-3 bg-brand-dark/5 dark:bg-brand-dark/20 border border-brand-dark/10 dark:border-white/5 rounded-xl">
                      <Loader2 className="animate-spin text-brand-red" size={28} />
                      <p className="text-xs text-brand-dark dark:text-gray-300 font-bold uppercase tracking-wider">
                        {replacingDoc ? "Replacing File..." : "Uploading..."}
                      </p>
                      <button
                        onClick={handleCancelUpload}
                        className="px-4 py-1.5 bg-brand-red/10 border border-brand-red/25 hover:bg-brand-red/20 text-brand-red rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Cancel Upload
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-brand-dark/20 dark:border-white/10 rounded-2xl cursor-pointer hover:border-brand-red/50 dark:hover:border-brand-red/50 hover:bg-brand-red/5 transition-all text-center">
                      <Upload className="text-brand-red mb-2" size={28} />
                      <span className="text-xs text-brand-dark dark:text-gray-300 font-extrabold uppercase tracking-wide">
                        Click or Drag to Upload File
                      </span>
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/jpg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleDocUpload(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Document List Grid */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase text-brand-dark dark:text-white tracking-wider flex items-center space-x-2">
                    <FolderOpen size={16} className="text-brand-red" />
                    <span>My Stored Documents ({walletDocs.length})</span>
                  </h3>

                  {walletDocs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {walletDocs.map((docItem) => {
                        const isPDF = docItem.type === 'pdf';
                        return (
                          <div 
                            key={docItem.id} 
                            className="p-5 bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/5 rounded-2xl flex items-center justify-between gap-4 group hover:border-brand-red/30 transition-all"
                          >
                            <div className="flex items-center space-x-4 overflow-hidden">
                              <div className="p-3 bg-brand-dark/10 dark:bg-white/5 rounded-xl shrink-0">
                                {isPDF ? (
                                  <FileText className="text-brand-red" size={24} />
                                ) : (
                                  <ImageIcon className="text-brand-gold" size={24} />
                                )}
                              </div>
                              <div className="overflow-hidden">
                                <h4 className="text-brand-dark dark:text-white font-extrabold text-sm truncate uppercase" title={docItem.name}>
                                  {docItem.name}
                                </h4>
                                <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                                  <span>{docItem.size}</span>
                                  <span>•</span>
                                  <span>{docItem.uploadedAt ? new Date(docItem.uploadedAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {/* View / Download */}
                              <a
                                href={docItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-brand-dark/10 dark:hover:bg-white/5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-all"
                                title="View Document"
                              >
                                <Download size={16} />
                              </a>
                              
                              {/* Replace File Trigger */}
                              <label className="p-2 hover:bg-brand-dark/10 dark:hover:bg-white/5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white cursor-pointer transition-all" title="Replace Document">
                                <RefreshCw size={16} />
                                <input
                                  type="file"
                                  accept=".pdf,image/png,image/jpeg,image/jpg"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      setReplacingDoc(docItem);
                                      handleDocReplace(e.target.files[0], docItem);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>

                              {/* Delete */}
                              <button
                                onClick={() => handleDocDelete(docItem.id)}
                                className="p-2 hover:bg-brand-red/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-brand-red transition-all"
                                title="Delete Document"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-12 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-3xl text-gray-500 dark:text-gray-400 text-sm">
                      <FolderOpen size={36} className="mx-auto mb-3 opacity-40 text-brand-red" />
                      <p className="font-bold uppercase tracking-wider mb-1">No Documents Uploaded</p>
                      <p className="text-xs">Your personal wallet is empty. Upload your documentation above to keep them safe.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
