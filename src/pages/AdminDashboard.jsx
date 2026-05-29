import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BarChart2, Calendar, Award, CreditCard, Bell, UserCog, Home,
  Settings, Search, Plus, Edit2, Trash2, Shield, Eye, Download, FileText, MessageSquare, Mail, LogOut,
  FolderOpen, Upload, Loader2, Image as ImageIcon, RefreshCw, Sun, Moon, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, auth, firebaseConfig } from '../firebase/config';
import { DOJO_LIST } from '../data/dojos';

const BELT_GRADES = [
  "White Belt",
  "Yellow Belt",
  "Orange Belt",
  "Green Belt",
  "Blue Belt",
  "Purple Belt",
  "Brown Junior",
  "Brown Senior",
  "Brown Super Senior",
  "Black Belt (1st Dan)",
  "Black Belt (2nd Dan)",
  "Black Belt (3rd Dan)",
  "Black Belt (4th Dan)",
  "Black Belt (5th Dan)",
  "Black Belt (6th Dan)",
  "Black Belt (7th Dan)",
  "Black Belt (8th Dan)",
  "Black Belt (9th Dan)",
  "Black Belt (10th Dan)"
];

const AdminDashboard = () => {
  const { user, profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'students' || view === 'roster' || view === 'directory') return 'roster';
    if (view === 'attendance') return 'attendance';
    if (view === 'grades') return 'grades';
    if (view === 'admins') return 'admins';
    return 'overview';
  });

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
  
  // States
  const [students, setStudents] = useState([]);
  const [selectedDojoFilter, setSelectedDojoFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Database troubleshooting states
  const [troubleEmail, setTroubleEmail] = useState('');
  const [troubleResults, setTroubleResults] = useState(null);
  const [troubleLoading, setTroubleLoading] = useState(false);

  // Attendance states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [dojoLogs, setDojoLogs] = useState([]);
  const [isReportMode, setIsReportMode] = useState(false);
  const [attendanceDojo, setAttendanceDojo] = useState(() => {
    if (role === 'super_admin') return 'pattam';
    if (profile?.dojoIds && profile.dojoIds.length > 0) return profile.dojoIds[0];
    return profile?.dojoId || 'pattam';
  });
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState(null);
  const [isStudentLogsModalOpen, setIsStudentLogsModalOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      if (role !== 'super_admin') {
        if (profile.dojoIds && profile.dojoIds.length > 0) {
          setAttendanceDojo(profile.dojoIds[0]);
        } else {
          setAttendanceDojo(profile.dojoId || 'pattam');
        }
      }
    }
  }, [profile, role]);

  // Form states for creating student / attendance / grades / fee / notifications
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    dojoId: 'pattam',
    beltGrade: 'White Belt',
    role: 'student',
    pendingFees: '0'
  });

  // Admin creation modal (super_admin only)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', dojoIds: [] });
  const [adminCreating, setAdminCreating] = useState(false);

  // Edit student modal
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Quick fee update modal states
  const [quickFeeStudent, setQuickFeeStudent] = useState(null);
  const [quickFeeAmount, setQuickFeeAmount] = useState('');
  const [isQuickFeeSaving, setIsQuickFeeSaving] = useState(false);

  // Edit admin modal states (super_admin only)
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editAdminForm, setEditAdminForm] = useState({ fullName: '', dojoIds: [] });
  const [adminSaving, setAdminSaving] = useState(false);

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    dojoId: ''
  });

  const [activityLogs, setActivityLogs] = useState([]);

  // Enquiries states
  const [enquiries, setEnquiries] = useState([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);

  // Dojo Broadcast states
  const [broadcasts, setBroadcasts] = useState([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [editingBroadcastId, setEditingBroadcastId] = useState(null);

  const fetchBroadcasts = async () => {
    setLoadingBroadcasts(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'notifications'));
      const list = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let formattedDate = data.date || '';
        if (data.createdAt?.seconds) {
          formattedDate = new Date(data.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
        }
        return {
          id: doc.id,
          ...data,
          formattedDate
        };
      });

      // Sort descending
      const sorted = list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || (a.date ? new Date(a.date).getTime() / 1000 : 0);
        const timeB = b.createdAt?.seconds || (b.date ? new Date(b.date).getTime() / 1000 : 0);
        return timeB - timeA;
      });

      if (role === 'super_admin') {
        setBroadcasts(sorted);
      } else {
        const currentDojoId = profile?.dojoId || 'pattam';
        const filtered = sorted.filter(b => b.dojoId === currentDojoId || b.dojoId === 'all');
        setBroadcasts(filtered);
      }
    } catch (error) {
      console.error("Error loading broadcasts", error);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  useEffect(() => {
    if (activeView === 'notifications') {
      fetchBroadcasts();
    }
  }, [activeView, role, profile]);

  // Cloudinary Admin Wallet State
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

  // Load Admin Wallet documents from Firestore
  useEffect(() => {
    if (activeView === 'wallet' && user) {
      const fetchWalletDocs = async () => {
        try {
          const docsQuery = query(collection(db, 'documents'), where('parentUid', '==', user.uid));
          const docsSnap = await getDocs(docsQuery);
          setWalletDocs(docsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error("Error fetching admin documents:", err);
        }
      };
      fetchWalletDocs();
    }
  }, [activeView, user]);

  const uploadFileToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dkijeoc9f';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'okinavankarate';

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary cloud name or upload preset is not configured.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `documents/admins/${user.uid}`);

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
        ownerId: user.uid,
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

  // Load enquiries
  useEffect(() => {
    if (activeView === 'enquiries') {
      const fetchEnquiries = async () => {
        setLoadingEnquiries(true);
        try {
          const querySnapshot = await getDocs(collection(db, 'enquiries'));
          const list = querySnapshot.docs.map(doc => {
            const data = doc.data();
            let formattedDate = 'Recent';
            if (data.createdAt?.seconds) {
              formattedDate = new Date(data.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
            return {
              id: doc.id,
              ...data,
              formattedDate
            };
          });

          // Sort descending
          const sorted = list.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });

          if (role === 'super_admin') {
            setEnquiries(sorted);
          } else {
            const dojosToFilter = profile?.dojoIds?.length > 0 ? profile.dojoIds : [profile?.dojoId || 'pattam'];
            const filtered = sorted.filter(enq => dojosToFilter.includes(enq.dojoId));
            setEnquiries(filtered);
          }
        } catch (error) {
          console.error("Error loading enquiries", error);
        } finally {
          setLoadingEnquiries(false);
        }
      };
      fetchEnquiries();
    }
  }, [activeView, role, profile]);

  // Load students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const list = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        
        // Find duplicates by email + normalized name and clean them up
        const duplicateMap = {};
        const duplicatesToDelete = [];
        
        list.forEach(item => {
          if (!item.email || !item.fullName) return;
          const email = item.email.trim().toLowerCase();
          const name = item.fullName.trim().toLowerCase();
          const key = `${email}|${name}`;
          if (!duplicateMap[key]) {
            duplicateMap[key] = [];
          }
          duplicateMap[key].push(item);
        });

        const cleanedList = [];
        // Keep documents that lack email or name
        list.forEach(item => {
          if (!item.email || !item.fullName) {
            cleanedList.push(item);
          }
        });

        for (const key in duplicateMap) {
          const docs = duplicateMap[key];
          if (docs.length > 1) {
            // Sort so the official logged-in document (which has standard 28-char UID) is first
            docs.sort((a, b) => b.id.length - a.id.length);
            
            const officialDoc = docs[0];
            const tempDocs = docs.slice(1);
            
            // Merge fields from temporary documents into the official document
            let needsUpdate = false;
            const mergedFields = {};
            
            tempDocs.forEach(tempDoc => {
              const fieldsToMerge = [
                'beltGrade', 'pendingFees', 'feesStatus', 'mobileNumber', 
                'address', 'emergencyContact', 'dojoId', 'fullName', 'beltHistory'
              ];
              
              fieldsToMerge.forEach(field => {
                const officialVal = officialDoc[field];
                const tempVal = tempDoc[field];
                
                if (tempVal !== undefined && tempVal !== null && tempVal !== '') {
                  if (field === 'beltHistory') {
                    const officialHistory = officialVal || [];
                    const tempHistory = tempVal || [];
                    let historyChanged = false;
                    const combinedHistory = [...officialHistory];
                    
                    tempHistory.forEach(th => {
                      const alreadyExists = combinedHistory.some(oh => oh.belt === th.belt && oh.date === th.date);
                      if (!alreadyExists) {
                        combinedHistory.push(th);
                        historyChanged = true;
                      }
                    });
                    if (historyChanged) {
                      mergedFields.beltHistory = combinedHistory;
                      officialDoc.beltHistory = combinedHistory;
                      needsUpdate = true;
                    }
                  } else if (officialVal !== tempVal) {
                    mergedFields[field] = tempVal;
                    officialDoc[field] = tempVal;
                    needsUpdate = true;
                  }
                }
              });
            });
            
            if (needsUpdate) {
              // Update official doc in Firestore
              (async () => {
                try {
                  await updateDoc(doc(db, 'users', officialDoc.id), mergedFields);
                  console.log(`[Autoclean] Merged fields into official doc ${officialDoc.id}:`, mergedFields);
                } catch (updateErr) {
                  console.warn(`[Autoclean] Failed to merge fields into official doc ${officialDoc.id}:`, updateErr);
                }
              })();
            }

            cleanedList.push(officialDoc);
            
            // Collect the temporary random documents for deletion
            tempDocs.forEach(td => {
              duplicatesToDelete.push(td.id);
            });
          } else {
            cleanedList.push(docs[0]);
          }
        }

        // Fire off background deletions for duplicates (admins have full write/delete permissions)
        duplicatesToDelete.forEach(async (tempId) => {
          try {
            await deleteDoc(doc(db, 'users', tempId));
            console.log(`[Autoclean] Deleted duplicate student document: ${tempId}`);
          } catch (err) {
            console.warn(`[Autoclean] Failed to delete duplicate student document ${tempId}:`, err);
          }
        });

        // Access control filter
        if (role === 'dojo_admin') {
          // Dojo Admin can only see students in their assigned dojos
          const dojosToFilter = profile?.dojoIds?.length > 0 ? profile.dojoIds : [profile?.dojoId || 'pattam'];
          const filtered = cleanedList.filter(student => dojosToFilter.includes(student.dojoId) || student.role === 'dojo_admin');
          setStudents(filtered);
        } else {
          // Super Admin can see everyone
          setStudents(cleanedList);
        }
      } catch (error) {
        console.error("Error loading students", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [role, profile]);

  // Handle direct quick-fee linking from URL parameter (?quickFee=studentId)
  useEffect(() => {
    if (students.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const studentId = params.get('quickFee') || params.get('feeUpdate');
      if (studentId) {
        const student = students.find(s => s.id === studentId || s.uid === studentId);
        if (student) {
          handleOpenQuickFee(student);
          // Clean only quick-fee parameters, preserving others (e.g. view)
          params.delete('quickFee');
          params.delete('feeUpdate');
          const cleanUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}${window.location.hash}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    }
  }, [students]);

  // Synchronize active view changes to URL search query parameter (?view=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentViewParam = params.get('view');
    const targetParamVal = activeView === 'roster' ? 'students' : activeView;
    if (currentViewParam !== targetParamVal) {
      params.set('view', targetParamVal);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [activeView]);

  // Handle automatic ₹500 monthly fee increment for students at the start of a new month
  useEffect(() => {
    if (students.length > 0 && role === 'super_admin') {
      const checkAndIncrementFees = async () => {
        try {
          const configRef = doc(db, 'system_config', 'fees');
          const configSnap = await getDoc(configRef);
          
          const now = new Date();
          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          
          let lastProcessedMonth = '';
          if (configSnap.exists()) {
            lastProcessedMonth = configSnap.data().lastProcessedMonth || '';
          } else {
            // First time setup: set lastProcessedMonth to the current month to prevent retroactive charging
            await setDoc(configRef, { 
              lastProcessedMonth: currentMonthStr,
              updatedAt: serverTimestamp()
            });
            console.log(`[Auto Fee Increment] Initial setup complete. Current month set to ${currentMonthStr}.`);
            return;
          }
          
          // If a new month has rolled over
          if (lastProcessedMonth !== currentMonthStr) {
            console.log(`[Auto Fee Increment] New month rollover detected (${currentMonthStr}). Processing fee updates...`);
            
            // 1. Lock the month immediately to prevent double processing
            await setDoc(configRef, { 
              lastProcessedMonth: currentMonthStr,
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            // 2. Filter students
            const studentProfiles = students.filter(s => s.role === 'student');
            
            // 3. Process increments in Firestore
            let updatedCount = 0;
            for (const student of studentProfiles) {
              const studentId = student.id || student.uid;
              if (studentId) {
                const currentPending = Number(student.pendingFees || 0);
                const nextPending = currentPending + 500;
                const studentRef = doc(db, 'users', studentId);
                await updateDoc(studentRef, {
                  pendingFees: String(nextPending),
                  feesStatus: 'pending'
                });
                updatedCount++;
              }
            }
            
            if (updatedCount > 0) {
              alert(`[System Notice] A new month (${currentMonthStr}) has started. Automatically added ₹500 monthly fee increment to all ${updatedCount} student profiles.`);
              
              // 4. Update the local state in-memory so values update immediately without reloading
              setStudents(prev => prev.map(s => {
                if (s.role === 'student') {
                  const currentPending = Number(s.pendingFees || 0);
                  return { ...s, pendingFees: String(currentPending + 500), feesStatus: 'pending' };
                }
                return s;
              }));
              
              // 5. Add to activity log
              setActivityLogs(prev => [
                { 
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                  action: `Auto-applied ₹500 monthly fee increment to ${updatedCount} students for new month (${currentMonthStr})`, 
                  user: 'System' 
                },
                ...prev
              ]);
            }
          }
        } catch (error) {
          console.error("Error processing auto monthly fee increment:", error);
        }
      };
      checkAndIncrementFees();
    }
  }, [students, role]);

  // Load attendance records for the selected date
  useEffect(() => {
    if (activeView === 'attendance') {
      const loadAttendance = async () => {
        try {
          const q = query(
            collection(db, 'attendance'),
            where('date', '==', attendanceDate)
          );
          const snap = await getDocs(q);
          const records = {};
          snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.dojoId === attendanceDojo) {
              records[data.uid] = data.status === 'Present';
            }
          });
          setAttendanceRecords(records);
        } catch (e) {
          console.error("Failed to load attendance records:", e);
        }
      };
      loadAttendance();
    }
  }, [activeView, attendanceDate, role, profile, attendanceDojo]);

  // Load all logs for percentage calculation
  useEffect(() => {
    if (activeView === 'attendance') {
      const loadAllLogs = async () => {
        try {
          const q = query(
            collection(db, 'attendance'),
            where('dojoId', '==', attendanceDojo)
          );
          const snap = await getDocs(q);
          setDojoLogs(snap.docs.map(d => d.data()));
        } catch (e) {
          console.error("Failed to load all dojo logs:", e);
        }
      };
      loadAllLogs();
    }
  }, [activeView, savingAttendance, role, profile, attendanceDojo]);

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const activeStudentsList = attendanceStudentsList;
      
      for (const student of activeStudentsList) {
        const docId = `${student.id || student.uid}_${attendanceDate}`;
        const isPresent = attendanceRecords[student.id || student.uid] || false;
        
        await setDoc(doc(db, 'attendance', docId), {
          uid: student.id || student.uid,
          studentName: student.fullName,
          date: attendanceDate,
          session: "Regular Training",
          status: isPresent ? 'Present' : 'Absent',
          dojoId: attendanceDojo,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      alert(`Attendance for ${attendanceDate} successfully updated!`);
      // Update dynamic calculation logs immediately
      const q = query(
        collection(db, 'attendance'),
        where('dojoId', '==', attendanceDojo)
      );
      const snap = await getDocs(q);
      setDojoLogs(snap.docs.map(d => d.data()));

      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Attendance updated for ${attendanceDate}`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
    } catch (e) {
      console.error(e);
      alert("Failed to save attendance records.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleResetAttendance = async () => {
    if (!window.confirm(`Are you sure you want to reset and delete all attendance logs for ${attendanceDate}? This action cannot be undone.`)) return;
    setSavingAttendance(true);
    try {
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', attendanceDate)
      );
      const snap = await getDocs(q);
      const docsToDelete = snap.docs.filter(d => d.data().dojoId === attendanceDojo);
      
      if (docsToDelete.length === 0) {
        alert("No attendance records found for this date and branch.");
        return;
      }

      const batchPromises = docsToDelete.map(docSnap => deleteDoc(doc(db, 'attendance', docSnap.id)));
      await Promise.all(batchPromises);

      setAttendanceRecords({});
      alert(`Successfully reset all attendance records for ${attendanceDate}!`);
      // Update dynamic calculation logs immediately
      const q2 = query(
        collection(db, 'attendance'),
        where('dojoId', '==', attendanceDojo)
      );
      const snap2 = await getDocs(q2);
      setDojoLogs(snap2.docs.map(d => d.data()));

      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Attendance reset for ${attendanceDate}`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
    } catch (error) {
      console.error("Failed to reset attendance:", error);
      alert("Failed to reset attendance records.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleToggleStudentAttendanceSingle = async (studentId, studentName, date, currentStatus) => {
    try {
      const docId = `${studentId}_${date}`;
      const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
      
      await setDoc(doc(db, 'attendance', docId), {
        uid: studentId,
        studentName: studentName,
        date: date,
        session: "Regular Training",
        status: newStatus,
        dojoId: attendanceDojo,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local dojoLogs state
      setDojoLogs(prev => {
        const exists = prev.some(log => log.uid === studentId && log.date === date);
        if (exists) {
          return prev.map(log => 
            (log.uid === studentId && log.date === date) 
              ? { ...log, status: newStatus } 
              : log
          );
        } else {
          return [...prev, {
            uid: studentId,
            studentName: studentName,
            date: date,
            session: "Regular Training",
            status: newStatus,
            dojoId: attendanceDojo
          }];
        }
      });

      // If the date is the current attendanceDate, sync attendanceRecords too
      if (date === attendanceDate) {
        setAttendanceRecords(prev => ({
          ...prev,
          [studentId]: newStatus === 'Present'
        }));
      }

      // Update selectedStudentLogs state to reflect in UI immediately
      setSelectedStudentLogs(prev => {
        if (!prev) return prev;
        const updatedDates = prev.dates.map(d => 
          d.date === date ? { ...d, status: newStatus } : d
        );
        return { ...prev, dates: updatedDates };
      });

    } catch (e) {
      console.error("Failed to update single attendance record:", e);
      alert("Failed to update attendance record.");
    }
  };

  const handleOpenStudentLogs = (student) => {
    const studentId = student.id || student.uid;
    
    // Find all training dates in the selected range
    const uniqueDates = Array.from(new Set(dojoLogs.map(log => log.date)))
      .filter(date => date >= reportStartDate && date <= reportEndDate)
      .sort((a, b) => new Date(b) - new Date(a));

    const studentLogsForDates = uniqueDates.map(date => {
      const log = dojoLogs.find(l => l.uid === studentId && l.date === date);
      return {
        date,
        status: log ? log.status : 'Absent'
      };
    });

    setSelectedStudentLogs({
      studentId,
      studentName: student.fullName,
      dates: studentLogsForDates
    });
    setIsStudentLogsModalOpen(true);
  };

  // Calculate dynamic stats
  const activeMembersCount = students.filter(s => s.role === 'student').length;
  
  // Calculate attendance averages
  const totalPresentLogs = dojoLogs.filter(log => log.status === 'Present').length;
  const totalDojoLogs = dojoLogs.length;
  const averageAttendancePercent = totalDojoLogs > 0 
    ? Math.round((totalPresentLogs / totalDojoLogs) * 100) 
    : 0;

  // Calculate black belts
  const blackBeltsCount = students.filter(s => s.role === 'student' && s.beltGrade && s.beltGrade.toLowerCase().includes('black')).length;

  // Calculate monthly income
  const paidStudentsCount = students.filter(s => s.role === 'student' && s.feesStatus && s.feesStatus.toLowerCase() === 'paid').length;
  const totalMonthlyIncome = paidStudentsCount * 500; // standard fee ₹500/month
  const formattedIncome = totalMonthlyIncome >= 100000 
    ? `₹${(totalMonthlyIncome / 100000).toFixed(2)}L` 
    : `₹${totalMonthlyIncome.toLocaleString('en-IN')}`;

  const displayStudents = students.filter(s => {
    if (s.role !== 'student') return false;
    if (role === 'super_admin') return true;
    if (profile?.dojoIds && profile.dojoIds.length > 0) {
      return profile.dojoIds.includes(s.dojoId);
    }
    return s.dojoId === (profile?.dojoId || 'pattam');
  });

  // Perform client side search & filter
  const filteredStudents = displayStudents.filter(student => {
    const fullName = student.fullName || '';
    const email = student.email || '';
    const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDojo = !selectedDojoFilter || student.dojoId === selectedDojoFilter;
    return matchesSearch && matchesDojo;
  });

  const attendanceStudentsList = students.filter(s => {
    if (s.role !== 'student') return false;
    return s.dojoId === attendanceDojo;
  });

  const filteredAttendanceStudents = attendanceStudentsList.filter(student => {
    const fullName = student.fullName || '';
    const email = student.email || '';
    return fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleTroubleshootSearch = async () => {
    if (!troubleEmail.trim()) {
      alert("Please enter an email address.");
      return;
    }
    setTroubleLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', troubleEmail.trim().toLowerCase())
      );
      const snap = await getDocs(q);
      const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTroubleResults(results);
    } catch (error) {
      console.error("Troubleshoot search error:", error);
      alert("Error searching database: " + error.message);
    } finally {
      setTroubleLoading(false);
    }
  };

  const handleTroubleDelete = async (docId, fullName) => {
    if (!window.confirm(`CRITICAL WARNING: Are you sure you want to permanently delete the document for "${fullName}" (ID: ${docId}) from Firestore? This action is irreversible and might cause database mismatch.`)) return;
    try {
      await deleteDoc(doc(db, 'users', docId));
      alert("Document deleted successfully!");
      // Update search results list
      setTroubleResults(prev => prev.filter(item => item.id !== docId));
      // Update main student roster if the deleted document was in it
      setStudents(prev => prev.filter(s => (s.id || s.uid) !== docId));
    } catch (error) {
      console.error("Troubleshoot delete error:", error);
      alert("Failed to delete document: " + error.message);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (adminForm.dojoIds.length === 0) {
      alert('Please select at least one dojo branch.');
      return;
    }
    setAdminCreating(true);
    const normalizedEmail = adminForm.email.trim().toLowerCase();
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', normalizedEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        alert(`An account with the email ${normalizedEmail} is already registered.`);
        setAdminCreating(false);
        return;
      }

      // Generate a new document reference in 'users' collection
      const newAdminRef = doc(collection(db, 'users'));
      const newUid = newAdminRef.id;

      // Primary dojoId is first selected, dojoIds holds all
      const primaryDojoId = adminForm.dojoIds[0];
      const adminData = {
        id: newUid,
        uid: newUid,
        fullName: adminForm.fullName,
        email: normalizedEmail,
        role: 'dojo_admin',
        dojoId: primaryDojoId,
        dojoIds: adminForm.dojoIds,
        isOnboarded: true,
        createdAt: serverTimestamp(),
      };
      await setDoc(newAdminRef, adminData);

      setStudents(prev => [...prev, { ...adminData, id: newUid }]);
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Dojo Admin created for ${adminForm.fullName}`, user: 'Super Admin' },
        ...prev
      ]);
      setIsAdminModalOpen(false);
      setAdminForm({ fullName: '', email: '', dojoIds: [] });
      const dojoNames = adminForm.dojoIds.map(id => DOJO_LIST.find(d => d.id === id)?.name || id).join(', ');
      alert(`Admin account created successfully!\n\nName: ${adminForm.fullName}\nEmail: ${normalizedEmail}\nDojos: ${dojoNames}\n\nThey can now sign in immediately using their Google Account.`);
    } catch (error) {
      console.error(error);
      alert('Failed to create admin profile: ' + error.message);
    } finally {
      setAdminCreating(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const normalizedEmail = studentForm.email.trim().toLowerCase();
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', normalizedEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const normalizedNewName = studentForm.fullName.trim().toLowerCase();
        const hasSameName = querySnapshot.docs.some(doc => {
          const data = doc.data();
          return data.fullName && data.fullName.trim().toLowerCase() === normalizedNewName;
        });

        if (hasSameName) {
          alert(`An account with the email ${normalizedEmail} and name ${studentForm.fullName} is already registered.`);
          return;
        }
      }

      const newStudentRef = doc(collection(db, 'users'));
      const targetRole = role === 'super_admin' ? studentForm.role : 'student';
      const targetDojoId = role === 'super_admin' ? studentForm.dojoId : (profile?.dojoId || 'pattam');
      
      const studentData = {
        id: newStudentRef.id,
        uid: newStudentRef.id,
        fullName: studentForm.fullName,
        email: normalizedEmail,
        mobileNumber: studentForm.mobileNumber,
        dojoId: targetDojoId,
        beltGrade: targetRole === 'dojo_admin' ? '' : studentForm.beltGrade,
        role: targetRole,
        isOnboarded: true,
        pendingFees: studentForm.pendingFees || '0',
        feesStatus: Number(studentForm.pendingFees || 0) > 0 ? 'pending' : 'paid',
        createdAt: serverTimestamp(),
      };
      await setDoc(newStudentRef, studentData);
      setStudents([...students, studentData]);
      setIsStudentModalOpen(false);
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `${targetRole === 'dojo_admin' ? 'Dojo Admin' : 'Student'} profile created for ${studentForm.fullName}`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
      setStudentForm({ fullName: '', email: '', mobileNumber: '', dojoId: 'pattam', beltGrade: 'White Belt', role: 'student', pendingFees: '0' });
      alert(`${targetRole === 'dojo_admin' ? 'Admin' : 'Student'} profile created successfully!`);
    } catch (error) {
      console.error(error);
      alert("Failed to create profile.");
    }
  };

  const handleDeleteStudent = async (student) => {
    const docId = student.id || student.uid;
    if (!docId) {
      alert("Cannot delete: student ID is missing.");
      return;
    }
    if (docId === user?.uid) {
      alert("You cannot delete your own profile.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${student.fullName || 'this profile'}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', docId));
      setStudents(prev => prev.filter(s => (s.id || s.uid) !== docId));
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Profile deleted: ${student.fullName || docId}`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
      alert("Profile deleted successfully.");
    } catch (error) {
      console.error("[Delete Student] Error:", error.code, error.message, "| Doc ID:", docId);
      if (error.code === 'permission-denied') {
        alert("Delete failed: You do not have permission to delete this profile. Check Firestore security rules.");
      } else {
        alert("Delete failed: " + error.message);
      }
    }
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setEditForm({
      fullName: student.fullName || '',
      email: student.email || '',
      mobileNumber: student.mobileNumber || '',
      dojoId: student.dojoId || '',
      beltGrade: student.beltGrade || 'White Belt',
      feesStatus: student.feesStatus || 'unpaid',
      address: student.address || '',
      emergencyContact: student.emergencyContact || '',
      pendingFees: student.pendingFees || '0',
    });
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    const studentId = editingStudent.id || editingStudent.uid;
    if (!studentId) {
      alert("Failed to update profile: student ID is missing.");
      return;
    }

    try {
      const studentRef = doc(db, 'users', studentId);
      
      const updateData = {
        fullName: editForm.fullName,
        email: editForm.email.trim().toLowerCase(),
        mobileNumber: editForm.mobileNumber,
        dojoId: editForm.dojoId,
        beltGrade: editForm.beltGrade,
        address: editForm.address,
        emergencyContact: editForm.emergencyContact,
        pendingFees: editForm.pendingFees || '0',
        feesStatus: Number(editForm.pendingFees || 0) > 0 ? 'pending' : 'paid'
      };

      // Automatic belt history logging if changed
      if (editForm.beltGrade !== editingStudent.beltGrade) {
        const newBeltEntry = {
          belt: editForm.beltGrade,
          date: new Date().toISOString().split('T')[0],
          updatedBy: profile?.fullName || 'Dojo Instructor'
        };
        const updatedBeltHistory = [...(editingStudent.beltHistory || []), newBeltEntry];
        updateData.beltHistory = updatedBeltHistory;

        // Write to exams collection
        const examRef = doc(collection(db, 'exams'));
        await setDoc(examRef, {
          uid: studentId,
          beltGrade: editForm.beltGrade,
          date: new Date().toISOString().split('T')[0],
          examiner: profile?.fullName || 'Dojo Instructor',
          score: 'Promoted',
          result: 'PASSED',
          createdAt: serverTimestamp()
        });
      }

      // Automatic fee collection logging (when cleared/paid)
      if (Number(editForm.pendingFees) === 0 && Number(editingStudent.pendingFees || 0) > 0) {
        const feeRef = doc(collection(db, 'fees'));
        await setDoc(feeRef, {
          uid: studentId,
          amount: `₹${editingStudent.pendingFees}`,
          date: new Date().toISOString().split('T')[0],
          month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          status: 'PAID',
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(studentRef, updateData);
      
      // Update local state
      setStudents(prev => prev.map(s => (s.id === studentId || s.uid === studentId) ? { ...s, ...updateData, beltHistory: updateData.beltHistory || s.beltHistory } : s));
      
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Updated profile: ${editForm.fullName}`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
      setEditingStudent(null);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to update profile: ' + error.message);
    }
  };

  const handleOpenQuickFee = (student) => {
    setQuickFeeStudent(student);
    setQuickFeeAmount(student.pendingFees || '0');
  };

  const handleSaveQuickFee = async (e) => {
    e.preventDefault();
    if (!quickFeeStudent) return;
    setIsQuickFeeSaving(true);
    try {
      const studentId = quickFeeStudent.id || quickFeeStudent.uid;
      const studentRef = doc(db, 'users', studentId);
      const newFees = quickFeeAmount || '0';
      const newStatus = Number(newFees) > 0 ? 'pending' : 'paid';

      // Log fee collection if setting to 0 from > 0
      if (Number(newFees) === 0 && Number(quickFeeStudent.pendingFees || 0) > 0) {
        const feeRef = doc(collection(db, 'fees'));
        await setDoc(feeRef, {
          uid: studentId,
          amount: `₹${quickFeeStudent.pendingFees}`,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(studentRef, {
        pendingFees: newFees,
        feesStatus: newStatus
      });

      // Update local state
      setStudents(prev => prev.map(s => 
        (s.id === studentId || s.uid === studentId) 
          ? { ...s, pendingFees: newFees, feesStatus: newStatus } 
          : s
      ));

      setQuickFeeStudent(null);
      alert('Fees updated successfully!');
    } catch (error) {
      console.error("Error updating fees:", error);
      alert("Failed to update fees.");
    } finally {
      setIsQuickFeeSaving(false);
    }
  };

  const handleOpenEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setEditAdminForm({
      fullName: admin.fullName || '',
      dojoIds: admin.dojoIds || (admin.dojoId ? [admin.dojoId] : []),
    });
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    if (editAdminForm.dojoIds.length === 0) {
      alert('Please select at least one dojo branch.');
      return;
    }
    setAdminSaving(true);
    try {
      const adminRef = doc(db, 'users', editingAdmin.id || editingAdmin.uid);
      const primaryDojoId = editAdminForm.dojoIds[0];
      const adminData = {
        fullName: editAdminForm.fullName,
        dojoId: primaryDojoId,
        dojoIds: editAdminForm.dojoIds,
      };
      await updateDoc(adminRef, adminData);
      
      setStudents(prev => prev.map(s => (s.id === editingAdmin.id || s.uid === editingAdmin.uid) ? { ...s, ...adminData } : s));
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Dojo Admin updated: ${editAdminForm.fullName}`, user: 'Super Admin' },
        ...prev
      ]);
      setEditingAdmin(null);
      alert('Dojo Admin profile updated successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to update admin profile: ' + e.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (id === user?.uid) {
      alert("You cannot delete your own admin account.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this Dojo Admin account? This will revoke their access.")) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setStudents(students.filter(s => s.id !== id));
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Admin deleted: ${id}`, user: 'Super Admin' },
        ...prev
      ]);
      alert("Dojo Admin account deleted successfully from the roster.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete Admin profile.");
    }
  };

  const handlePostNotification = async (e) => {
    e.preventDefault();
    try {
      const targetDojoId = role === 'super_admin' ? notificationForm.dojoId : (profile?.dojoId || 'pattam');
      
      if (editingBroadcastId) {
        // Edit Mode
        const notifRef = doc(db, 'notifications', editingBroadcastId);
        await updateDoc(notifRef, {
          title: notificationForm.title,
          message: notificationForm.message,
          dojoId: targetDojoId
        });
        setActivityLogs(prev => [
          { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Broadcast edited: "${notificationForm.title}"`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
          ...prev
        ]);
        alert("Broadcast updated successfully!");
        setEditingBroadcastId(null);
      } else {
        // Create Mode
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          title: notificationForm.title,
          message: notificationForm.message,
          dojoId: targetDojoId,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp()
        });
        setActivityLogs(prev => [
          { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Broadcast published: "${notificationForm.title}"`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
          ...prev
        ]);
        alert("Dojo Notification published!");
      }
      setNotificationForm({ title: '', message: '', dojoId: '' });
      fetchBroadcasts();
    } catch (error) {
      console.error(error);
      alert("Failed to save broadcast.");
    }
  };

  const handleEditBroadcast = (broadcast) => {
    setEditingBroadcastId(broadcast.id);
    setNotificationForm({
      title: broadcast.title,
      message: broadcast.message,
      dojoId: broadcast.dojoId || 'all'
    });

    const scrollContainer = document.getElementById("admin-main-content");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEditBroadcast = () => {
    setEditingBroadcastId(null);
    setNotificationForm({ title: '', message: '', dojoId: '' });
  };

  const handleDeleteBroadcast = async (broadcastId) => {
    if (!window.confirm("Are you sure you want to delete this broadcast?")) return;
    try {
      await deleteDoc(doc(db, 'notifications', broadcastId));
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Broadcast deleted`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
      alert("Broadcast deleted successfully!");
      if (editingBroadcastId === broadcastId) {
        setEditingBroadcastId(null);
        setNotificationForm({ title: '', message: '', dojoId: '' });
      }
      fetchBroadcasts();
    } catch (error) {
      console.error("Error deleting broadcast", error);
      alert("Failed to delete broadcast.");
    }
  };

  const handleDeleteEnquiry = async (enquiryId) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?")) return;
    try {
      await deleteDoc(doc(db, 'enquiries', enquiryId));
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Enquiry deleted`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
      alert("Enquiry deleted successfully!");
      setEnquiries(prev => prev.filter(e => e.id !== enquiryId));
    } catch (error) {
      console.error("Error deleting enquiry:", error);
      alert("Failed to delete enquiry.");
    }
  };

  // Dynamic chart data calculation - use DOJO_LIST as source of truth
  const branches = DOJO_LIST.map(d => ({ id: d.id, name: d.name }));

  const chartData = role === 'super_admin' 
    ? branches.map(b => ({
        name: b.name,
        Students: students.filter(s => s.role === 'student' && s.dojoId === b.id).length
      }))
    : branches.filter(b => b.id === (profile?.dojoId || 'pattam')).map(b => ({
        name: b.name,
        Students: students.filter(s => s.role === 'student' && s.dojoId === b.id).length
      }));

  // Dynamic Belt Grade Distribution calculations
  const beltCounts = {};
  students.filter(s => s.role === 'student').forEach(s => {
    const belt = s.beltGrade || 'White Belt';
    const normalizedBelt = belt.split(' Belt')[0];
    beltCounts[normalizedBelt] = (beltCounts[normalizedBelt] || 0) + 1;
  });

  const beltColors = {
    'White': darkMode ? '#FFFFFF' : '#D1D5DB',
    'Yellow': '#FBBF24',
    'Orange': '#F97316',
    'Green': '#10B981',
    'Blue': '#3B82F6',
    'Purple': '#8B5CF6',
    'Brown Junior': '#B45309',
    'Brown Senior': '#78350F',
    'Brown Super Senior': '#451A03',
    'Black': darkMode ? '#111827' : '#1F2937'
  };

  const beltPieData = Object.keys(beltCounts).map(belt => ({
    name: belt,
    value: beltCounts[belt],
    color: beltColors[belt] || '#6B7280'
  }));

  return (
    <div className="dark:bg-brand-dark bg-brand-light min-h-screen dark:text-white text-brand-dark flex flex-col lg:flex-row transition-colors duration-300">
      
      {/* Sidebar Dashboard Navigation */}
      <div className="w-full lg:w-64 dark:bg-white/5 bg-white border-r border-brand-dark/10 dark:border-white/10 p-6 flex flex-col justify-between shrink-0 space-y-6 text-brand-dark dark:text-white transition-colors duration-300">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <img src="/images/LOGO.png" alt="Dojo Logo" className="h-10 w-10 object-contain" />
            <div>
              <h2 className="dark:text-white text-brand-dark font-extrabold text-sm uppercase tracking-wider">Karate Admin</h2>
              <span className="text-[10px] text-brand-gold uppercase tracking-widest font-black block">
                {role === 'super_admin' ? 'SUPER ADMIN' : 'DOJO ADMIN'}
              </span>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Analytics', icon: <BarChart2 size={16} /> },
              { id: 'students', label: 'Students', icon: <Users size={16} /> },
              ...(role === 'super_admin' ? [{ id: 'admins', label: 'Admins', icon: <UserCog size={16} /> }] : []),
              { id: 'attendance', label: 'Attendance', icon: <Calendar size={16} /> },
              { id: 'notifications', label: 'Dojo Broadcast', icon: <Bell size={16} /> },
              { id: 'enquiries', label: 'Enquiries', icon: <MessageSquare size={16} /> },
              { id: 'logs', label: 'Activity Logs', icon: <FileText size={16} /> },
              { id: 'wallet', label: 'My Wallet / Docs', icon: <FolderOpen size={16} /> }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer ${
                  activeView === item.id 
                    ? 'bg-brand-red text-white shadow-lg shadow-brand-red/10' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-brand-dark/5 dark:hover:bg-white/5 hover:text-brand-dark dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-2 border-t border-brand-dark/10 dark:border-white/5 pt-4">
          {/* Theme Switcher */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400">Theme</span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl hover:bg-brand-dark/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 hover:text-brand-dark dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all text-gray-500 dark:text-gray-400 hover:bg-brand-dark/5 dark:hover:bg-white/5 hover:text-brand-dark dark:hover:text-white cursor-pointer"
          >
            <Home size={16} />
            <span>Home Page</span>
          </button>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all text-brand-red hover:bg-brand-red/10 hover:text-red-400 cursor-pointer"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pt-2">
            Okinavan Shito Ryu Karate Academy
          </div>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div id="admin-main-content" className="flex-grow p-6 sm:p-10 space-y-8 overflow-y-auto">
        
        {/* 1. OVERVIEW VIEW */}
        {activeView === 'overview' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl sm:text-3xl font-black uppercase dark:text-white text-brand-dark tracking-wide">
                Academy <span className="text-brand-red">Analytics</span>
              </h1>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Active Members', value: activeMembersCount.toString(), change: 'Registered students', icon: <Users className="text-brand-red" /> },
                { label: 'Avg Attendance', value: `${averageAttendancePercent}%`, change: 'Based on logs', icon: <Calendar className="text-brand-gold" /> },
                { label: 'Black Belts', value: blackBeltsCount.toString(), change: 'Dan grades', icon: <Award className="dark:text-white text-brand-dark" /> },
                { label: 'Monthly Income', value: formattedIncome, change: `${paidStudentsCount} active paid`, icon: <CreditCard className="text-brand-red" /> }
              ].map((m, idx) => (
                <div key={idx} className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 p-5 rounded-2xl space-y-2 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">{m.label}</span>
                    {m.icon}
                  </div>
                  <h3 className="text-2xl font-black dark:text-white text-brand-dark">{m.value}</h3>
                  <span className="text-[10px] text-emerald-400 font-bold block">{m.change}</span>
                </div>
              ))}
            </div>

            {/* Analytical Recharts Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Enrollment & Attendance Bar Chart */}
              <div className="lg:col-span-2 dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
                <h3 className="dark:text-white text-brand-dark font-extrabold text-sm uppercase tracking-wider">Branch-wise Student Enrollment</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#222" : "#e5e7eb"} />
                      <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} />
                      <YAxis stroke="#666" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0A0A0A' : '#FFF', border: darkMode ? '1px solid #333' : '1px solid #e5e7eb', color: darkMode ? '#FFF' : '#0A0A0A' }} />
                      <Bar dataKey="Students" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Belt Grade Pie Chart distribution */}
              <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
                <h3 className="dark:text-white text-brand-dark font-extrabold text-sm uppercase tracking-wider">Belt Grade Distribution</h3>
                <div className="h-52 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={beltPieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {beltPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total</span>
                    <span className="text-2xl font-black dark:text-white text-brand-dark">{activeMembersCount}</span>
                  </div>
                </div>

                {/* Pie legend labels */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold text-gray-400 mt-2">
                  {beltPieData.map((b, idx) => (
                    <span key={idx} className="flex items-center space-x-1 uppercase tracking-wider">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                      <span>{b.name} ({b.value})</span>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. STUDENTS VIEW */}
        {activeView === 'students' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase dark:text-white text-brand-dark tracking-wide">
                  Student <span className="text-brand-red">Directory</span>
                </h1>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                  Manage profiles, belts, attendance records and fees
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setStudentForm({
                      fullName: '',
                      email: '',
                      mobileNumber: '',
                      dojoId: role === 'super_admin' ? 'pattam' : (profile?.dojoIds?.[0] || profile?.dojoId || 'pattam'),
                      beltGrade: 'White Belt',
                      role: 'student',
                      pendingFees: '0'
                    });
                    setIsStudentModalOpen(true);
                  }}
                  className="px-6 py-3 bg-brand-red hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Plus size={14} />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search student or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-brand-dark/50 border border-brand-dark/15 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              {role === 'super_admin' ? (
                <select
                  value={selectedDojoFilter}
                  onChange={(e) => setSelectedDojoFilter(e.target.value)}
                  className="bg-white dark:bg-brand-dark/50 border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300 w-full md:w-auto"
                >
                  <option value="">All branches</option>
                  {DOJO_LIST.map(dojo => (
                    <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                  ))}
                </select>
              ) : (() => {
                const adminDojos = profile?.dojoIds?.length > 0
                  ? DOJO_LIST.filter(d => profile.dojoIds.includes(d.id))
                  : DOJO_LIST.filter(d => d.id === (profile?.dojoId || 'pattam'));
                
                if (adminDojos.length <= 1) {
                  return (
                    <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-brand-dark dark:text-gray-300">
                      Branch: <span className="font-extrabold uppercase">{adminDojos[0]?.name || 'Pattam Dojo'}</span>
                    </div>
                  );
                }

                return (
                  <select
                    value={selectedDojoFilter}
                    onChange={(e) => setSelectedDojoFilter(e.target.value)}
                    className="bg-white dark:bg-brand-dark/50 border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300 w-full md:w-auto"
                  >
                    <option value="">All My Branches</option>
                    {adminDojos.map(dojo => (
                      <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                    ))}
                  </select>
                );
              })()}
            </div>

            {/* Students Directory — Card on mobile, Table on md+ */}
            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">

              {/* MOBILE: Card List */}
              <div className="block md:hidden divide-y dark:divide-white/5 divide-brand-dark/10">
                {filteredStudents.map((student) => (
                  <div key={student.id || student.uid} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-brand-dark dark:text-white font-extrabold text-sm">{student.fullName}</p>
                        <p className="text-[10px] text-gray-500">{student.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{student.mobileNumber}</p>
                        <div className="mt-1">
                          {Number(student.pendingFees || 0) > 0 ? (
                            <span className="text-[9px] bg-brand-red/10 text-brand-red px-1.5 py-0.5 rounded font-black uppercase tracking-wider">₹{student.pendingFees} Due</span>
                          ) : (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Paid</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleOpenQuickFee(student)}
                          className="p-2 dark:bg-white/5 bg-brand-dark/5 hover:bg-brand-dark/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-emerald-500 rounded-xl transition-all"
                          title="Quick Fee Update"
                        >
                          <CreditCard size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-2 dark:bg-white/5 bg-brand-dark/5 hover:bg-brand-dark/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-brand-gold rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        {(student.id || student.uid) !== user?.uid && (
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-2 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-brand-dark/5 dark:bg-white/5 px-2 py-1 rounded-lg">{student.dojoId}</span>
                      <span className="text-[10px] uppercase tracking-wider text-brand-gold font-bold bg-brand-gold/10 px-2 py-1 rounded-lg">{student.beltGrade}</span>
                    </div>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-xs uppercase tracking-widest">No students found</div>
                )}
              </div>

              {/* DESKTOP: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="dark:bg-brand-dark bg-brand-dark/5 border-b border-brand-dark/10 dark:border-white/10 text-brand-dark dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-4">Student Details</th>
                      <th className="p-4">Mobile</th>
                      <th className="p-4">Dojo</th>
                      <th className="p-4">Belt Rank</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/5 divide-brand-dark/10 font-semibold text-xs sm:text-sm text-brand-dark dark:text-gray-300">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-brand-dark/5 dark:hover:bg-white/5">
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-brand-dark dark:text-white font-extrabold text-sm">{student.fullName}</p>
                            <p className="text-[10px] text-gray-500 font-semibold">{student.email}</p>
                            <div>
                              {Number(student.pendingFees || 0) > 0 ? (
                                <span className="text-[9px] bg-brand-red/10 text-brand-red px-1.5 py-0.5 rounded font-black uppercase tracking-wider">₹{student.pendingFees} Due</span>
                              ) : (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Paid</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{student.mobileNumber}</td>
                        <td className="p-4 uppercase text-gray-400 text-xs">{student.dojoId}</td>
                        <td className="p-4">
                          <span className="text-brand-gold font-bold uppercase tracking-wider text-xs">
                            {student.beltGrade}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenQuickFee(student)}
                              className="p-2 hover:bg-brand-dark/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-emerald-500 rounded-xl transition-all"
                              title="Quick Fee Update"
                            >
                              <CreditCard size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(student)}
                              className="p-2 hover:bg-brand-dark/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-brand-gold rounded-xl transition-all"
                              title="Edit student"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => alert(`View QR Code for Student ID: ${student.id}`)}
                              className="p-2 hover:bg-brand-dark/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white rounded-xl transition-all"
                              title="QR Code student ID card"
                            >
                              <Shield size={14} />
                            </button>
                            {(student.id || student.uid) !== user?.uid && (
                              <button
                                onClick={() => handleDeleteStudent(student)}
                                className="p-2 hover:bg-brand-red/10 text-brand-red rounded-xl transition-all"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-xs uppercase tracking-widest">No students found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2.2. ADMINS VIEW (super_admin only) */}
        {activeView === 'admins' && role === 'super_admin' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase dark:text-white text-brand-dark tracking-wide">
                  Dojo <span className="text-brand-gold">Admins</span>
                </h1>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                  Manage accounts and branch assignments for instructors
                </p>
              </div>

              <div>
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="px-6 py-3 bg-brand-gold hover:bg-yellow-600 text-brand-dark font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                >
                  <UserCog size={14} />
                  <span>Create Admin Account</span>
                </button>
              </div>
            </div>

            {/* Filters / Search Bar */}
            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search admin name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-brand-dark/50 border border-brand-dark/15 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-gold/50 text-brand-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Admins Table */}
            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="dark:bg-brand-dark bg-brand-dark/5 border-b border-brand-dark/10 dark:border-white/10 text-brand-dark dark:text-gray-400 text-[10px] uppercase tracking-widest font-extrabold">
                      <th className="p-4">Admin Profile</th>
                      <th className="p-4">Assigned Dojos</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/5 divide-brand-dark/10 font-semibold text-xs sm:text-sm text-brand-dark dark:text-gray-300">
                    {students
                      .filter(s => s.role === 'dojo_admin')
                      .filter(s => {
                        const q = searchQuery.toLowerCase();
                        return (s.fullName || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
                      })
                      .map((admin) => (
                        <tr key={admin.id || admin.uid} className="hover:bg-brand-dark/5 dark:hover:bg-white/5">
                          <td className="p-4">
                            <div>
                              <p className="text-brand-dark dark:text-white font-extrabold text-sm">{admin.fullName}</p>
                              <p className="text-[10px] text-gray-500 font-semibold">{admin.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                              {admin.dojoIds && admin.dojoIds.length > 0 ? (
                                admin.dojoIds.map(id => {
                                  const dName = DOJO_LIST.find(d => d.id === id)?.name || id;
                                  return (
                                    <span key={id} className="px-2 py-1 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded text-[10px] uppercase font-bold">
                                      {dName}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="px-2 py-1 bg-brand-red/10 border border-brand-red/20 text-brand-red rounded text-[10px] uppercase font-bold">
                                  {DOJO_LIST.find(d => d.id === admin.dojoId)?.name || admin.dojoId || 'No branch assigned'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleOpenEditAdmin(admin)}
                                className="p-2 hover:bg-brand-dark/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-brand-gold rounded-xl transition-all"
                                title="Edit Admin"
                              >
                                <Edit2 size={14} />
                              </button>
                              {admin.id !== user?.uid && admin.uid !== user?.uid && (
                                <button
                                  onClick={() => handleDeleteAdmin(admin.id || admin.uid)}
                                  className="p-2 hover:bg-brand-red/10 text-brand-red rounded-xl transition-all"
                                  title="Delete Admin"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    {students.filter(s => s.role === 'dojo_admin').length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-gray-500">
                          No Dojo Admin accounts registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Database Troubleshooting Tool */}
            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl mt-8">
              <div className="flex items-center space-x-2 mb-4 border-b border-brand-dark/10 dark:border-white/10 pb-3">
                <ShieldAlert className="text-brand-red shrink-0" size={20} />
                <h3 className="text-lg font-black uppercase text-brand-dark dark:text-white tracking-wide">
                  Database Troubleshooting & Cleanup Tool
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                Use this tool to find and delete orphaned, duplicate, or hidden user documents in Firestore. 
                Search by exact email address to locate documents that might not be visible in the roster above.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 items-end mb-6">
                <div className="w-full">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">
                    Search Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email to check (e.g. josemonnj68@gmail.com)"
                    value={troubleEmail}
                    onChange={(e) => setTroubleEmail(e.target.value)}
                    className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTroubleshootSearch}
                  disabled={troubleLoading}
                  className="px-6 py-2.5 bg-brand-dark text-white border border-white/10 hover:bg-gray-900 font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md shrink-0 h-[38px] flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {troubleLoading ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <span>Search Database</span>
                  )}
                </button>
              </div>

              {troubleResults !== null && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                    Search Results ({troubleResults.length})
                  </h4>
                  
                  {troubleResults.length === 0 ? (
                    <div className="p-4 bg-brand-dark/5 dark:bg-white/5 rounded-xl border border-brand-dark/10 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      No documents found in Firestore for <span className="font-extrabold text-brand-dark dark:text-white">{troubleEmail}</span>.
                      <div className="mt-2 text-[11px] text-brand-gold font-bold">
                        Note: If you still cannot register this email, it may exist in Firebase Authentication. 
                        Please delete it from the Firebase Console (Authentication &gt; Users tab).
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {troubleResults.map((docItem) => (
                        <div key={docItem.id} className="p-4 bg-brand-red/5 dark:bg-brand-red/10 border border-brand-red/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-extrabold text-brand-dark dark:text-white">{docItem.fullName || 'No Name'}</span>
                              <span className="px-1.5 py-0.5 bg-brand-dark/10 dark:bg-white/10 text-brand-dark dark:text-gray-400 rounded text-[9px] uppercase font-bold">
                                {docItem.role || 'no role'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Email: {docItem.email}</p>
                            <p className="text-[10px] font-mono text-gray-400">Doc ID: {docItem.id}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTroubleDelete(docItem.id, docItem.fullName)}
                            className="px-4 py-2 bg-brand-red text-white hover:bg-red-700 font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all shadow-sm flex items-center justify-center space-x-1 cursor-pointer shrink-0"
                          >
                            <Trash2 size={12} />
                            <span>Delete Document</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2.5. ATTENDANCE VIEW */}
        {activeView === 'attendance' && (
          <div className="space-y-8">
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-attendance-area, #printable-attendance-area * {
                  visibility: visible;
                }
                #printable-attendance-area {
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase dark:text-white text-brand-dark tracking-wide">
                  Dojo <span className="text-brand-red">Attendance</span>
                </h1>
                <p className="text-xs dark:text-gray-400 text-gray-600 mt-1 uppercase tracking-wider font-semibold">
                  Mark daily attendance logs, view calculation percentages, and generate official rosters
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex items-center space-x-2 dark:bg-white/5 bg-white p-1 rounded-xl border border-brand-dark/10 dark:border-white/10 shrink-0 shadow-sm">
                <button
                  onClick={() => setIsReportMode(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    !isReportMode 
                      ? 'bg-brand-red text-white' 
                      : 'dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-brand-dark'
                  }`}
                >
                  Mark Daily
                </button>
                <button
                  onClick={() => setIsReportMode(true)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    isReportMode 
                      ? 'bg-brand-red text-white' 
                      : 'dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-brand-dark'
                  }`}
                >
                  Attendance Report
                </button>
              </div>
            </div>

            {!isReportMode ? (
              // Mark Daily Attendance View
              <div className="space-y-6">
                <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
                      <div className="space-y-1.5 w-full sm:w-auto">
                        <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Select Session Date</label>
                        <input
                          type="date"
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                          className="dark:bg-brand-dark bg-white border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-2.5 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-red/50 w-full sm:w-64"
                        />
                      </div>

                      <div className="space-y-1.5 w-full sm:w-auto">
                        <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Dojo Branch</label>
                        {role === 'super_admin' ? (
                          <select
                            value={attendanceDojo}
                            onChange={(e) => setAttendanceDojo(e.target.value)}
                            className="bg-white dark:bg-brand-dark/50 border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300 w-full sm:w-64"
                          >
                            {DOJO_LIST.map(dojo => (
                              <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                            ))}
                          </select>
                        ) : (() => {
                          const adminDojos = profile?.dojoIds?.length > 0
                            ? DOJO_LIST.filter(d => profile.dojoIds.includes(d.id))
                            : DOJO_LIST.filter(d => d.id === (profile?.dojoId || 'pattam'));
                          
                          if (adminDojos.length <= 1) {
                            return (
                              <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-brand-dark dark:text-gray-300 w-full sm:w-64 h-11 flex items-center">
                                <span className="font-extrabold uppercase">{adminDojos[0]?.name || 'Pattam Dojo'}</span>
                              </div>
                            );
                          }

                          return (
                            <select
                              value={attendanceDojo}
                              onChange={(e) => setAttendanceDojo(e.target.value)}
                              className="bg-white dark:bg-brand-dark/50 border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300 w-full sm:w-64"
                            >
                              {adminDojos.map(dojo => (
                                <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto xl:self-end">
                      <button
                        onClick={handleResetAttendance}
                        disabled={savingAttendance}
                        className="w-full sm:w-auto px-6 py-3 bg-transparent border border-brand-red/35 hover:bg-brand-red/10 text-brand-red font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center space-x-2"
                      >
                        <Trash2 size={14} />
                        <span>Reset Logs</span>
                      </button>
                      <button
                        onClick={handleSaveAttendance}
                        disabled={savingAttendance}
                        className="w-full sm:w-auto px-6 py-3 bg-brand-red hover:bg-red-700 disabled:bg-gray-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                      >
                        {savingAttendance ? (
                          <span>Saving...</span>
                        ) : (
                          <>
                            <Calendar size={14} />
                            <span>Save Daily Logs</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="dark:bg-brand-dark/50 bg-brand-light/50 border border-brand-dark/10 dark:border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="dark:bg-brand-dark/80 bg-brand-dark/5 border-b border-brand-dark/10 dark:border-white/10 dark:text-gray-400 text-brand-dark/70 text-xs uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-4">Student Name</th>
                          <th className="p-4 hidden sm:table-cell">Email</th>
                          <th className="p-4 hidden sm:table-cell">Belt Rank</th>
                          <th className="p-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-white/5 divide-brand-dark/10 font-semibold text-xs sm:text-sm dark:text-gray-300 text-brand-dark">
                        {filteredAttendanceStudents.map((student) => {
                          const studentId = student.id || student.uid;
                          const isPresent = attendanceRecords[studentId] || false;
                          return (
                            <tr key={studentId} className="hover:bg-brand-dark/5 dark:hover:bg-white/5">
                              <td className="p-4 dark:text-white text-brand-dark font-extrabold">{student.fullName}</td>
                              <td className="p-4 text-gray-500 font-semibold hidden sm:table-cell">{student.email}</td>
                              <td className="p-4 text-brand-gold uppercase hidden sm:table-cell">{student.beltGrade}</td>
                              <td className="p-4">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => {
                                      setAttendanceRecords(prev => ({
                                        ...prev,
                                        [studentId]: !isPresent
                                      }));
                                    }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                                      isPresent
                                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-brand-red/10 border-brand-red/35 text-brand-red'
                                    }`}
                                  >
                                    {isPresent ? 'Present' : 'Absent'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              // Attendance Report / Roster Calculation & PDF View
              <div className="space-y-6">
                <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex flex-col xl:flex-row gap-4 items-center justify-between no-print">
                    <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
                      <div className="space-y-1.5 w-full sm:w-auto">
                        <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Start Date</label>
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="dark:bg-brand-dark bg-white border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-2 text-xs dark:text-white text-brand-dark focus:outline-none focus:border-brand-red/50 w-full sm:w-44"
                        />
                      </div>
                      <div className="space-y-1.5 w-full sm:w-auto">
                        <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">End Date</label>
                        <input
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="dark:bg-brand-dark bg-white border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-2 text-xs dark:text-white text-brand-dark focus:outline-none focus:border-brand-red/50 w-full sm:w-44"
                        />
                      </div>
                      <div className="space-y-1.5 w-full sm:w-auto">
                        <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Dojo Branch</label>
                        {role === 'super_admin' ? (
                          <select
                            value={attendanceDojo}
                            onChange={(e) => setAttendanceDojo(e.target.value)}
                            className="bg-white dark:bg-brand-dark/50 border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300 w-full sm:w-48"
                          >
                            {DOJO_LIST.map(dojo => (
                              <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                            ))}
                          </select>
                        ) : (() => {
                          const adminDojos = profile?.dojoIds?.length > 0
                            ? DOJO_LIST.filter(d => profile.dojoIds.includes(d.id))
                            : DOJO_LIST.filter(d => d.id === (profile?.dojoId || 'pattam'));
                          
                          if (adminDojos.length <= 1) {
                            return (
                              <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-2 text-xs text-brand-dark dark:text-gray-300 w-full sm:w-48 h-9 flex items-center">
                                <span className="font-extrabold uppercase">{adminDojos[0]?.name || 'Pattam Dojo'}</span>
                              </div>
                            );
                          }

                          return (
                            <select
                              value={attendanceDojo}
                              onChange={(e) => setAttendanceDojo(e.target.value)}
                              className="bg-white dark:bg-brand-dark/50 border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300 w-full sm:w-48"
                            >
                              {adminDojos.map(dojo => (
                                <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="w-full xl:w-auto px-6 py-3 bg-brand-gold text-brand-dark font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 xl:self-end"
                    >
                      <Download size={14} />
                      <span>Print PDF Report</span>
                    </button>
                  </div>

                  <div id="printable-attendance-area" className="dark:bg-brand-dark/50 bg-brand-light/50 border border-brand-dark/10 dark:border-white/10 rounded-2xl overflow-hidden p-4 sm:p-6 space-y-6 print:border-0 print:bg-white print:text-black">
                    <div className="hidden print:block text-center space-y-2 pb-6 border-b border-gray-200">
                      <h2 className="text-2xl font-black uppercase text-black">Okinavan Shito Ryu Karate Academy</h2>
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Official Dojo Attendance Roster Report</p>
                      <p className="text-xs text-gray-500">
                        Dojo Branch: {DOJO_LIST.find(d => d.id === attendanceDojo)?.name || attendanceDojo} | 
                        Period: {reportStartDate} to {reportEndDate} | 
                        Generated: {new Date().toLocaleDateString()}
                      </p>
                    </div>

                    <table className="w-full text-left text-sm print:text-black">
                      <thead className="dark:bg-brand-dark/80 bg-brand-dark/5 print:bg-gray-100 border-b border-brand-dark/10 dark:border-white/10 print:border-gray-200 dark:text-gray-400 text-brand-dark/70 print:text-gray-700 text-xs uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-4">Student Details</th>
                          <th className="p-4 text-center">Total Sessions</th>
                          <th className="p-4 text-center">Sessions Present</th>
                          <th className="p-4 text-right">Attendance %</th>
                          <th className="p-4 text-right no-print hidden md:table-cell">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-white/5 divide-brand-dark/10 print:divide-gray-200 font-semibold text-xs sm:text-sm dark:text-gray-300 text-brand-dark print:text-black">
                        {filteredAttendanceStudents.map((student) => {
                          const studentId = student.id || student.uid;
                          const studentLogs = dojoLogs.filter(log => log.uid === studentId && log.date >= reportStartDate && log.date <= reportEndDate);
                          const total = studentLogs.length;
                          const present = studentLogs.filter(log => log.status === 'Present').length;
                          const percent = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';
                          return (
                            <tr key={studentId} className="hover:bg-brand-dark/5 dark:hover:bg-white/5 print:hover:bg-transparent">
                              <td className="p-4">
                                <p className="dark:text-white text-brand-dark print:text-black font-extrabold">{student.fullName}</p>
                                <p className="text-[10px] text-gray-500 print:text-gray-600 font-semibold hidden md:block print:block">{student.email}</p>
                                <button
                                  onClick={() => handleOpenStudentLogs(student)}
                                  className="text-brand-red hover:text-red-700 text-[10px] font-black uppercase tracking-wider md:hidden mt-1 block no-print cursor-pointer"
                                >
                                  View Logs
                                </button>
                              </td>
                              <td className="p-4 text-center font-mono dark:text-gray-400 text-gray-600 print:text-gray-700">{total}</td>
                              <td className="p-4 text-center font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-700">{present}</td>
                              <td className="p-4 text-right font-black text-brand-gold print:text-amber-800">{percent}%</td>
                              <td className="p-4 text-right no-print hidden md:table-cell">
                                <button
                                  onClick={() => handleOpenStudentLogs(student)}
                                  className="px-3 py-1.5 bg-brand-red hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                                >
                                  View Logs
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. BROADCAST NOTIFICATIONS VIEW */}
        {activeView === 'notifications' && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase dark:text-white text-brand-dark tracking-wide">
                {editingBroadcastId ? "Edit Dojo" : "Publish Dojo"} <span className="text-brand-red">Broadcasts</span>
              </h1>
              <p className="text-xs dark:text-gray-400 text-gray-600 mt-1 uppercase tracking-wider font-semibold">
                {editingBroadcastId 
                  ? "Make changes to the active announcement" 
                  : "Broadcast announcements, test schedules and seminars instantly to Student Dashboards"}
              </p>
            </div>

            <form onSubmit={handlePostNotification} className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              {editingBroadcastId && (
                <div className="bg-brand-red/10 border border-brand-red/30 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Edit2 className="text-brand-red animate-pulse" size={16} />
                    <span className="text-xs text-brand-red font-bold uppercase tracking-wider">
                      Editing Mode Active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEditBroadcast}
                    className="text-xs dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-brand-dark uppercase tracking-wider font-extrabold"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Broadcast Title</label>
                <input
                  type="text"
                  required
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="w-full dark:bg-brand-dark bg-white border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 dark:text-white text-brand-dark placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Kyu belt grading test scheduled"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Broadcast Content</label>
                <textarea
                  required
                  rows={4}
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  className="w-full dark:bg-brand-dark bg-white border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 dark:text-white text-brand-dark placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed"
                  placeholder="Enter broadcast details, timing and instructions..."
                />
              </div>

              {role === 'super_admin' ? (
                <div className="space-y-2">
                  <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Target Dojo Branch</label>
                  <select
                    required
                    value={notificationForm.dojoId}
                    onChange={(e) => setNotificationForm({ ...notificationForm, dojoId: e.target.value })}
                    className="w-full dark:bg-brand-dark bg-white border border-brand-dark/15 dark:border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 dark:text-gray-300 text-gray-700"
                  >
                    <option value="" disabled>Select target branch</option>
                    <option value="all">Broadcast to All Dojos</option>
                    {DOJO_LIST.map((dojo) => (
                      <option key={dojo.id} value={dojo.id}>{dojo.name} Only</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-brand-red hover:bg-red-700 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  {editingBroadcastId ? <Settings size={16} /> : <Plus size={16} />}
                  <span>{editingBroadcastId ? "Save Changes" : "Publish Broadcast"}</span>
                </button>
                {editingBroadcastId && (
                  <button
                    type="button"
                    onClick={handleCancelEditBroadcast}
                    className="py-3.5 px-6 dark:bg-white/5 bg-brand-dark/5 border border-brand-dark/10 dark:border-white/10 dark:hover:bg-white/10 hover:bg-brand-dark/10 dark:text-gray-300 text-gray-600 dark:hover:text-white hover:text-brand-dark font-bold text-sm tracking-wider uppercase rounded-xl transition-all flex items-center justify-center"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="border-t border-brand-dark/10 dark:border-white/10 my-8"></div>

            <div className="flex items-center justify-between pt-4">
              <h2 className="text-lg sm:text-xl font-black uppercase dark:text-white text-brand-dark tracking-wide flex items-center space-x-2">
                <Bell size={20} className="text-brand-red" />
                <span>Active Broadcasts</span>
              </h2>
              <span className="px-3 py-1 bg-brand-red/10 border border-brand-red/20 text-brand-red rounded-full text-xs font-bold">
                {broadcasts.length}
              </span>
            </div>

            {loadingBroadcasts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-red"></div>
              </div>
            ) : broadcasts.length > 0 ? (
              <div className="space-y-4">
                {broadcasts.map((broadcast) => {
                  const targetDojo = DOJO_LIST.find(d => d.id === broadcast.dojoId);
                  const dojoName = broadcast.dojoId === 'all' ? 'All Dojos' : (targetDojo ? targetDojo.name : 'Unknown Dojo');
                  return (
                    <div key={broadcast.id} className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-5 space-y-3 dark:hover:border-white/20 hover:border-brand-dark/20 transition-all shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="dark:text-white text-brand-dark font-extrabold text-sm sm:text-base">{broadcast.title}</h4>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Published on: {broadcast.formattedDate || broadcast.date}</p>
                        </div>
                        <span className="self-start sm:self-center px-2.5 py-0.5 dark:bg-white/10 bg-brand-dark/5 dark:text-white text-brand-dark border border-brand-dark/10 dark:border-white/10 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                          {dojoName}
                        </span>
                      </div>
                      <p className="dark:text-gray-300 text-gray-700 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                        {broadcast.message}
                      </p>
                      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-brand-dark/5 dark:border-white/5">
                        <button
                          onClick={() => handleEditBroadcast(broadcast)}
                          className="flex items-center space-x-1 px-3 py-1.5 dark:bg-white/5 bg-brand-dark/5 border border-brand-dark/10 dark:border-white/10 dark:hover:bg-white/10 hover:bg-brand-dark/10 dark:text-gray-300 text-gray-600 dark:hover:text-white hover:text-brand-dark rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBroadcast(broadcast.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red/20 text-brand-red rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-2xl text-gray-500">
                <Bell size={28} className="mx-auto mb-2 opacity-30 text-brand-red" />
                <p className="font-extrabold uppercase tracking-wider text-xs">No Broadcasts Active</p>
                <p className="text-[10px] mt-0.5">Announcements published to student dashboards will show up here.</p>
              </div>
            )}
          </div>
        )}

        {/* ENQUIRIES VIEW */}
        {activeView === 'enquiries' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase dark:text-white text-brand-dark tracking-wide">
                Dojo <span className="text-brand-gold">Enquiries</span>
              </h1>
              <p className="text-xs dark:text-gray-400 text-gray-600 mt-1 uppercase tracking-wider font-semibold">
                {role === 'super_admin' ? 'All Academy Enquiries' : 'Enquiries for your assigned branch(es)'}
              </p>
            </div>

            {loadingEnquiries ? (
              <div className="flex items-center justify-center p-12 dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-red"></div>
              </div>
            ) : enquiries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {enquiries.map((enq) => {
                  const whatsappNumber = enq.phone ? enq.phone.replace(/\D/g, '') : '';
                  const formattedWhatsapp = whatsappNumber.length === 10 ? `91${whatsappNumber}` : whatsappNumber;

                  return (
                    <div key={enq.id} className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 space-y-4 flex flex-col justify-between hover:border-brand-gold/30 transition-all shadow-lg">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="dark:text-white text-brand-dark font-extrabold text-base">{enq.name}</h4>
                            <p className="text-xs dark:text-gray-400 text-gray-600 mt-0.5">{enq.email}</p>
                            <p className="text-xs dark:text-gray-400 text-gray-600">{enq.phone}</p>
                          </div>
                          <span className="px-3 py-1 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                            {enq.dojoName || 'General'}
                          </span>
                        </div>
                        <div className="dark:bg-brand-dark/50 bg-brand-light/50 border border-brand-dark/5 dark:border-white/5 rounded-2xl p-4 min-h-[100px] flex items-center">
                          <p className="dark:text-gray-300 text-gray-700 text-xs italic leading-relaxed">
                            "{enq.message}"
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-brand-dark/5 dark:border-white/5">
                        <span className="text-[10px] dark:text-gray-500 text-gray-600 font-bold uppercase tracking-wider">
                          Received: {enq.formattedDate}
                        </span>
                        <div className="flex items-center space-x-2 w-full sm:w-auto">
                          {formattedWhatsapp && (
                            <a
                              href={`https://wa.me/${formattedWhatsapp}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-grow sm:flex-grow-0 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1"
                            >
                              <MessageSquare size={12} />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          <a
                            href={`mailto:${enq.email}`}
                            className="flex-grow sm:flex-grow-0 px-3 py-1.5 dark:bg-white/10 bg-brand-dark/10 hover:bg-brand-dark/20 text-brand-dark dark:text-white dark:hover:bg-white/20 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1"
                          >
                            <Mail size={12} />
                            <span>Email</span>
                          </a>
                          <button
                            onClick={() => handleDeleteEnquiry(enq.id)}
                            className="flex-grow sm:flex-grow-0 px-3 py-1.5 bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red/20 text-brand-red text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-3xl text-gray-500">
                <MessageSquare size={36} className="mx-auto mb-3 opacity-40 text-brand-gold" />
                <p className="font-extrabold uppercase tracking-wider text-sm mb-1">No Enquiries Registered</p>
                <p className="text-xs">Incoming contact and interest requests will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* 4. ACTIVITY LOGS VIEW */}
        {activeView === 'logs' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase dark:text-white text-brand-dark tracking-wide">
                Security & <span className="text-brand-red">Activity Logs</span>
              </h1>
              <p className="text-xs dark:text-gray-400 text-gray-600 mt-1 uppercase tracking-wider font-semibold">
                Real-time security auditing log of dockets edited
              </p>
            </div>

            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
              {activityLogs.map((log, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm p-4 bg-brand-light/50 dark:bg-brand-dark/50 border border-brand-dark/5 dark:border-white/5 rounded-2xl dark:text-gray-300 text-gray-700">
                  <div className="flex items-center space-x-3">
                    <Shield size={16} className="text-brand-red shrink-0" />
                    <span>{log.action}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="dark:text-white text-brand-dark font-extrabold text-xs">{log.user}</p>
                    <p className="text-[10px] dark:text-gray-500 text-gray-600 mt-0.5">{log.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. WALLET VIEW */}
        {activeView === 'wallet' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase dark:text-white text-brand-dark tracking-wide">
                My <span className="text-brand-red">Documents Wallet</span>
              </h1>
              <p className="text-xs dark:text-gray-400 text-gray-600 mt-1 uppercase tracking-wider font-semibold">
                Store, manage, and download your administrative and personal documents.
              </p>
            </div>

            {/* Upload Area */}
            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
              <h2 className="text-sm font-bold uppercase dark:text-white text-brand-dark tracking-wide">Upload New Document</h2>
              <p className="text-xs dark:text-gray-400 text-gray-600 leading-relaxed">
                Upload your files. Supported formats: <strong>PDF, JPEG, JPG, PNG</strong> (Max 5MB).
              </p>

              {uploadError && (
                <div className="p-4 bg-brand-red/10 border border-brand-red/25 rounded-2xl text-brand-red text-xs font-bold flex items-center space-x-2">
                  <Shield size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3 dark:bg-brand-dark bg-white border border-brand-dark/5 dark:border-white/5 rounded-2xl">
                  <Loader2 className="animate-spin text-brand-red" size={32} />
                  <p className="text-xs dark:text-gray-300 text-gray-700 font-bold uppercase tracking-wider">
                    {replacingDoc ? "Replacing Document..." : "Uploading..."}
                  </p>
                  <button
                    onClick={handleCancelUpload}
                    className="px-4 py-1.5 bg-brand-red/10 border border-brand-red/25 hover:bg-brand-red/20 text-brand-red rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Cancel Upload
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-brand-dark/10 dark:border-white/10 rounded-3xl cursor-pointer hover:border-brand-red/50 dark:hover:bg-brand-red/5 hover:bg-brand-red/5 transition-all text-center">
                  <Upload className="text-brand-red mb-2" size={32} />
                  <span className="text-xs dark:text-gray-300 text-gray-700 font-extrabold uppercase tracking-widest">
                    Select File to Upload
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

            {/* List Grid */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase dark:text-white text-brand-dark tracking-wider flex items-center space-x-2">
                <FolderOpen size={16} className="text-brand-red" />
                <span>Stored Documents ({walletDocs.length})</span>
              </h2>

              {walletDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {walletDocs.map((docItem) => {
                    const isPDF = docItem.type === 'pdf';
                    return (
                      <div 
                        key={docItem.id} 
                        className="p-5 dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 hover:border-brand-red/35 rounded-2xl flex items-center justify-between gap-4 group transition-all"
                      >
                        <div className="flex items-center space-x-4 overflow-hidden">
                          <div className="p-3 dark:bg-brand-dark/50 bg-brand-light/50 border border-brand-dark/5 dark:border-white/5 rounded-xl shrink-0">
                            {isPDF ? (
                              <FileText className="text-brand-red" size={24} />
                            ) : (
                              <ImageIcon className="text-brand-gold" size={24} />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="dark:text-white text-brand-dark font-extrabold text-sm truncate uppercase" title={docItem.name}>
                              {docItem.name}
                            </h3>
                            <div className="flex items-center space-x-2 text-[10px] dark:text-gray-400 text-gray-600 font-bold uppercase mt-0.5">
                              <span>{docItem.size}</span>
                              <span>•</span>
                              <span>{docItem.uploadedAt ? new Date(docItem.uploadedAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Download Link */}
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 dark:hover:bg-white/5 hover:bg-brand-dark/5 rounded-lg text-gray-500 dark:text-gray-400 dark:hover:text-white hover:text-brand-dark transition-all"
                            title="View Document"
                          >
                            <Download size={16} />
                          </a>

                          {/* Replace File Trigger */}
                          <label className="p-2 dark:hover:bg-white/5 hover:bg-brand-dark/5 rounded-lg text-gray-500 dark:text-gray-400 dark:hover:text-white hover:text-brand-dark cursor-pointer transition-all" title="Replace Document">
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

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDocDelete(docItem.id)}
                            className="p-2 dark:hover:bg-white/5 hover:bg-brand-dark/5 rounded-lg text-gray-500 dark:text-gray-400 dark:hover:text-brand-red hover:text-brand-red transition-all"
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
                <div className="p-12 text-center border border-dashed border-brand-dark/10 dark:border-white/10 rounded-3xl dark:text-gray-400 text-gray-600 text-sm">
                  <FolderOpen size={36} className="mx-auto mb-3 opacity-40 text-brand-red" />
                  <p className="font-bold uppercase tracking-wider mb-1">No Documents Uploaded</p>
                  <p className="text-xs">Your administrative wallet is empty. Upload files above to make them accessible.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Student creation modal */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="dark:bg-brand-dark bg-white border border-brand-dark/10 dark:border-white/15 w-full max-w-md p-8 rounded-3xl space-y-6 relative shadow-2xl"
            >
              <h3 className="dark:text-white text-brand-dark font-black text-xl uppercase tracking-wide">Create Student Profile</h3>
              
              <form onSubmit={handleCreateStudent} className="space-y-4 text-xs font-bold dark:text-gray-300 text-gray-700">
                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest dark:text-gray-400 text-gray-600 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.fullName}
                    onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                    className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest dark:text-gray-400 text-gray-600 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest dark:text-gray-400 text-gray-600 block">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={studentForm.mobileNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, mobileNumber: e.target.value })}
                    className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                  />
                </div>

                {role === 'super_admin' ? (
                  <div className="space-y-1.5">
                    <label className="uppercase tracking-widest dark:text-gray-400 text-gray-600 block">Dojo Branch</label>
                    <select
                      required
                      value={studentForm.dojoId}
                      onChange={(e) => setStudentForm({ ...studentForm, dojoId: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-gray-300 text-gray-700 focus:outline-none focus:border-brand-gold/50"
                    >
                      <option value="" disabled>Select branch</option>
                      {DOJO_LIST.map(dojo => (
                        <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Dojo admin sees only their own managed dojos
                  (() => {
                    const adminDojos = profile?.dojoIds?.length > 0
                      ? DOJO_LIST.filter(d => profile.dojoIds.includes(d.id))
                      : DOJO_LIST.filter(d => d.id === (profile?.dojoId || 'pattam'));
                    return (
                      <div className="space-y-1.5">
                        <label className="uppercase tracking-widest dark:text-gray-400 text-gray-600 block">Dojo Branch</label>
                        {adminDojos.length === 1 ? (
                          <div className="w-full dark:bg-brand-dark/30 bg-brand-light border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-brand-gold font-bold uppercase tracking-wider">
                            {adminDojos[0]?.name || 'Pattam Dojo'}
                          </div>
                        ) : (
                          <select
                            required
                            value={studentForm.dojoId}
                            onChange={(e) => setStudentForm({ ...studentForm, dojoId: e.target.value })}
                            className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-gray-300 text-gray-700 focus:outline-none focus:border-brand-gold/50"
                          >
                            <option value="" disabled>Select branch</option>
                            {adminDojos.map(dojo => (
                              <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })()
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="uppercase tracking-widest dark:text-gray-400 text-gray-600 block">Starting Belt</label>
                    <select
                      value={studentForm.beltGrade}
                      onChange={(e) => setStudentForm({ ...studentForm, beltGrade: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-gray-300 text-gray-700 focus:outline-none focus:border-brand-gold/50"
                    >
                      {BELT_GRADES.map(belt => (
                        <option key={belt} value={belt}>{belt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="uppercase tracking-widest dark:text-gray-400 text-gray-600 block">Pending Balance Dues (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={studentForm.pendingFees || '0'}
                      onChange={(e) => setStudentForm({ ...studentForm, pendingFees: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                      placeholder="e.g. 1500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-grow py-3.5 bg-brand-red hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setIsStudentModalOpen(false)}
                    type="button"
                    className="px-6 py-3.5 border border-brand-dark/20 dark:border-white/20 dark:hover:bg-white/5 hover:bg-brand-dark/5 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Admin Modal — super_admin only */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="dark:bg-brand-dark bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <UserCog size={20} className="text-brand-gold" />
                  <h2 className="text-xl font-black uppercase dark:text-white text-brand-dark tracking-wide">Add Dojo Admin</h2>
                </div>
                <p className="text-xs dark:text-gray-400 text-gray-600 mt-1">Creates a login account with default password <span className="font-bold dark:text-white text-brand-dark">test12</span>. A password reset email will be sent so they can set their own.</p>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                    placeholder="e.g. Sensei John Doe"
                    className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Dojo Branches (select all that apply)</label>
                  <div className="dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                    {DOJO_LIST.map(dojo => (
                      <label key={dojo.id} className="flex items-center space-x-3 cursor-pointer group dark:hover:bg-white/5 hover:bg-brand-dark/5 px-2 py-1.5 rounded-lg transition-all">
                        <input
                          type="checkbox"
                          checked={adminForm.dojoIds.includes(dojo.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAdminForm({ ...adminForm, dojoIds: [...adminForm.dojoIds, dojo.id] });
                            } else {
                              setAdminForm({ ...adminForm, dojoIds: adminForm.dojoIds.filter(id => id !== dojo.id) });
                            }
                          }}
                          className="accent-brand-gold w-4 h-4"
                        />
                        <div>
                          <p className="dark:text-white text-brand-dark text-xs font-bold">{dojo.name}</p>
                          <p className="dark:text-gray-500 text-gray-500 text-[10px]">{dojo.instructor}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {adminForm.dojoIds.length > 0 && (
                    <p className="text-[10px] text-brand-gold font-bold">{adminForm.dojoIds.length} dojo(s) selected</p>
                  )}
                </div>

                <div className="dark:bg-white/5 bg-brand-dark/5 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-xs dark:text-gray-400 text-gray-600 space-y-1">
                  <p><span className="dark:text-white text-brand-dark font-bold">Default Password:</span> test12</p>
                  <p><span className="dark:text-white text-brand-dark font-bold">Reset Email:</span> Sent automatically so admin can change it</p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={adminCreating}
                    className="flex-grow py-3.5 bg-brand-gold hover:bg-yellow-600 disabled:bg-gray-700 text-brand-dark font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <UserCog size={15} />
                    <span>{adminCreating ? 'Creating...' : 'Create Admin Account'}</span>
                  </button>
                  <button
                    onClick={() => { setIsAdminModalOpen(false); setAdminForm({ fullName: '', email: '', dojoIds: [] }); }}
                    type="button"
                    className="px-6 py-3.5 border border-brand-dark/20 dark:border-white/20 dark:hover:bg-white/5 hover:bg-brand-dark/5 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="dark:bg-brand-dark bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <Edit2 size={18} className="text-brand-gold" />
                  <h2 className="text-xl font-black uppercase dark:text-white text-brand-dark tracking-wide">Edit Student Profile</h2>
                </div>
                <p className="text-xs dark:text-gray-400 text-gray-600">Editing: <span className="dark:text-white text-brand-dark font-bold">{editingStudent.email}</span></p>
              </div>

              <form onSubmit={handleEditStudent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Mobile Number</label>
                    <input
                      type="tel"
                      value={editForm.mobileNumber}
                      onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Belt Grade</label>
                    <select
                      value={editForm.beltGrade}
                      onChange={(e) => setEditForm({ ...editForm, beltGrade: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-gray-300 text-gray-700 focus:outline-none focus:border-brand-gold/50"
                    >
                      {BELT_GRADES.map(belt => (
                        <option key={belt} value={belt}>{belt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 dark:bg-white/5 bg-brand-light/50 p-4 border border-brand-dark/10 dark:border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div className="space-y-1.5 flex-grow">
                      <label className="text-xs font-extrabold text-brand-gold uppercase tracking-widest block">Pending Balance Dues (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.pendingFees || '0'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditForm({ 
                            ...editForm, 
                            pendingFees: val,
                            feesStatus: Number(val) > 0 ? 'pending' : 'paid'
                          });
                        }}
                        className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                        placeholder="e.g. 1500"
                      />
                    </div>
                    {Number(editForm.pendingFees || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, pendingFees: '0', feesStatus: 'paid' })}
                        className="w-full sm:w-auto px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shrink-0"
                      >
                        Clear Dues (Mark Paid)
                      </button>
                    )}
                  </div>

                  {role === 'super_admin' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Dojo Branch</label>
                      <select
                        value={editForm.dojoId}
                        onChange={(e) => setEditForm({ ...editForm, dojoId: e.target.value })}
                        className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-gray-300 text-gray-700 focus:outline-none focus:border-brand-gold/50"
                      >
                        <option value="" disabled>Select branch</option>
                        {DOJO_LIST.map(dojo => (
                          <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                      placeholder="Student's home address"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Emergency Contact</label>
                    <input
                      type="text"
                      value={editForm.emergencyContact}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-brand-gold/50"
                      placeholder="Parent / Guardian phone number"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    className="flex-grow py-3.5 bg-brand-gold hover:bg-yellow-600 text-brand-dark font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <Edit2 size={14} />
                    <span>Save Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-6 py-3.5 border border-brand-dark/20 dark:border-white/20 dark:hover:bg-white/5 hover:bg-brand-dark/5 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Fee Update Modal */}
      <AnimatePresence>
        {quickFeeStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="dark:bg-brand-dark bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <CreditCard size={20} className="text-emerald-500 animate-bounce" />
                  <h2 className="text-xl font-black uppercase dark:text-white text-brand-dark tracking-wide">Quick Fee Update</h2>
                </div>
                <p className="text-xs dark:text-gray-400 text-gray-600">Student: <span className="dark:text-white text-brand-dark font-bold">{quickFeeStudent.fullName}</span></p>
                <p className="text-[10px] text-gray-500 font-semibold">{quickFeeStudent.email}</p>
              </div>

              <form onSubmit={handleSaveQuickFee} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Pending Fees (₹)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      required
                      value={quickFeeAmount}
                      onChange={(e) => setQuickFeeAmount(e.target.value)}
                      className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g. 500"
                    />
                    {Number(quickFeeAmount || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuickFeeAmount('0')}
                        className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shrink-0"
                      >
                        Set Paid
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={isQuickFeeSaving}
                    className="flex-grow py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isQuickFeeSaving ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                    <span>Save Fees</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFeeStudent(null)}
                    className="px-6 py-3.5 border border-brand-dark/20 dark:border-white/20 dark:hover:bg-white/5 hover:bg-brand-dark/5 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Admin Modal — super_admin only */}
      <AnimatePresence>
        {editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="dark:bg-brand-dark bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <UserCog size={20} className="text-brand-gold" />
                  <h2 className="text-xl font-black uppercase dark:text-white text-brand-dark tracking-wide">Edit Dojo Admin</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Editing profile for: <span className="dark:text-white text-brand-dark font-bold">{editingAdmin.email}</span></p>
              </div>

              <form onSubmit={handleSaveAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editAdminForm.fullName}
                    onChange={(e) => setEditAdminForm({ ...editAdminForm, fullName: e.target.value })}
                    className="w-full dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-brand-dark placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold dark:text-gray-300 text-gray-700 uppercase tracking-widest block">Dojo Branches (select all that apply)</label>
                  <div className="dark:bg-brand-dark/50 bg-white border border-brand-dark/15 dark:border-white/10 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                    {DOJO_LIST.map(dojo => (
                      <label key={dojo.id} className="flex items-center space-x-3 cursor-pointer group dark:hover:bg-white/5 hover:bg-brand-dark/5 px-2 py-1.5 rounded-lg transition-all">
                        <input
                          type="checkbox"
                          checked={editAdminForm.dojoIds.includes(dojo.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditAdminForm({ ...editAdminForm, dojoIds: [...editAdminForm.dojoIds, dojo.id] });
                            } else {
                              setEditAdminForm({ ...editAdminForm, dojoIds: editAdminForm.dojoIds.filter(id => id !== dojo.id) });
                            }
                          }}
                          className="accent-brand-gold w-4 h-4"
                        />
                        <div>
                          <p className="dark:text-white text-brand-dark text-xs font-bold">{dojo.name}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-[10px]">{dojo.instructor}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {editAdminForm.dojoIds.length > 0 && (
                    <p className="text-[10px] text-brand-gold font-bold">{editAdminForm.dojoIds.length} dojo(s) selected</p>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={adminSaving}
                    className="flex-grow py-3.5 bg-brand-gold hover:bg-yellow-600 disabled:bg-gray-700 text-brand-dark font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <UserCog size={15} />
                    <span>{adminSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                  <button
                    onClick={() => setEditingAdmin(null)}
                    type="button"
                    className="px-6 py-3.5 border border-brand-dark/20 dark:border-white/20 dark:hover:bg-white/5 hover:bg-brand-dark/5 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Student Attendance Logs Modal */}
      <AnimatePresence>
        {isStudentLogsModalOpen && selectedStudentLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="dark:bg-brand-dark bg-white border border-brand-dark/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-6 max-h-[85vh] flex flex-col"
            >
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <Calendar size={20} className="text-brand-gold" />
                  <h2 className="text-lg sm:text-xl font-black uppercase dark:text-white text-brand-dark tracking-wide">Attendance Logs</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Student: <span className="dark:text-white text-brand-dark font-extrabold">{selectedStudentLogs.studentName}</span>
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Period: {reportStartDate} to {reportEndDate}
                </p>
                <p className="text-[9px] text-brand-gold font-bold uppercase tracking-wider mt-1.5 animate-pulse">
                  💡 Click any status badge below to toggle Present/Absent
                </p>
              </div>

              <div className="flex-grow overflow-y-auto pr-1 space-y-3 dark:bg-brand-dark/50 bg-brand-light/50 border border-brand-dark/10 dark:border-white/5 rounded-2xl p-4">
                {selectedStudentLogs.dates.length > 0 ? (
                  selectedStudentLogs.dates.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0 dark:border-white/5 border-brand-dark/10">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{item.date}</span>
                      <button
                        onClick={() => handleToggleStudentAttendanceSingle(
                          selectedStudentLogs.studentId,
                          selectedStudentLogs.studentName,
                          item.date,
                          item.status
                        )}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                          item.status === 'Present'
                            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-brand-red/10 border-brand-red/35 text-brand-red hover:bg-brand-red/20'
                        }`}
                      >
                        {item.status}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-xs font-semibold">
                    No sessions logged in this period.
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setIsStudentLogsModalOpen(false);
                  setSelectedStudentLogs(null);
                }}
                className="w-full py-3 bg-brand-red hover:bg-red-700 text-white font-black uppercase tracking-wider rounded-xl transition-all text-xs"
              >
                Close Logs
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminDashboard;
