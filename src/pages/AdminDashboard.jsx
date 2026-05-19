import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BarChart2, Calendar, Award, CreditCard, Bell, UserCog, Home,
  Settings, Search, Plus, Edit2, Trash2, Shield, Eye, Download, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, auth, firebaseConfig } from '../firebase/config';
import { DOJO_LIST } from '../data/dojos';

const AdminDashboard = () => {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');
  
  // States
  const [students, setStudents] = useState([]);
  const [selectedDojoFilter, setSelectedDojoFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Attendance states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [dojoLogs, setDojoLogs] = useState([]);
  const [isReportMode, setIsReportMode] = useState(false);

  // Form states for creating student / attendance / grades / fee / notifications
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    dojoId: '',
    beltGrade: 'White Belt',
    role: 'student'
  });

  // Admin creation modal (super_admin only)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', dojoIds: [] });
  const [adminCreating, setAdminCreating] = useState(false);

  // Edit student modal
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    dojoId: ''
  });

  const [activityLogs, setActivityLogs] = useState([]);

  // Load students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Access control filter
        if (role === 'dojo_admin') {
          // Dojo Admin can only see students in their dojo
          const filtered = list.filter(student => student.dojoId === profile?.dojoId);
          setStudents(filtered);
        } else {
          // Super Admin can see everyone
          setStudents(list);
        }
      } catch (error) {
        console.error("Error loading students", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [role, profile]);

  // Load attendance records for the selected date
  useEffect(() => {
    if (activeView === 'attendance') {
      const loadAttendance = async () => {
        try {
          const targetDojo = role === 'super_admin' ? (selectedDojoFilter || 'pattam') : (profile?.dojoId || 'pattam');
          const q = query(
            collection(db, 'attendance'),
            where('dojoId', '==', targetDojo),
            where('date', '==', attendanceDate)
          );
          const snap = await getDocs(q);
          const records = {};
          snap.docs.forEach(doc => {
            const data = doc.data();
            records[data.uid] = data.status === 'Present';
          });
          setAttendanceRecords(records);
        } catch (e) {
          console.error("Failed to load attendance records:", e);
        }
      };
      loadAttendance();
    }
  }, [activeView, attendanceDate, role, profile, selectedDojoFilter]);

  // Load all logs for percentage calculation
  useEffect(() => {
    if (activeView === 'attendance') {
      const loadAllLogs = async () => {
        try {
          const targetDojo = role === 'super_admin' ? (selectedDojoFilter || 'pattam') : (profile?.dojoId || 'pattam');
          const q = query(
            collection(db, 'attendance'),
            where('dojoId', '==', targetDojo)
          );
          const snap = await getDocs(q);
          setDojoLogs(snap.docs.map(d => d.data()));
        } catch (e) {
          console.error("Failed to load all dojo logs:", e);
        }
      };
      loadAllLogs();
    }
  }, [activeView, savingAttendance, role, profile, selectedDojoFilter]);

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const targetDojo = role === 'super_admin' ? (selectedDojoFilter || 'pattam') : (profile?.dojoId || 'pattam');
      const activeStudentsList = filteredStudents;
      
      for (const student of activeStudentsList) {
        const docId = `${student.id || student.uid}_${attendanceDate}`;
        const isPresent = attendanceRecords[student.id || student.uid] || false;
        
        await setDoc(doc(db, 'attendance', docId), {
          uid: student.id || student.uid,
          studentName: student.fullName,
          date: attendanceDate,
          session: "Regular Training",
          status: isPresent ? 'Present' : 'Absent',
          dojoId: targetDojo,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      alert(`Attendance for ${attendanceDate} successfully updated!`);
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

  // Calculate dynamic stats
  const activeMembersCount = students.filter(s => s.role === 'student').length;
  
  // Calculate attendance averages
  const totalPresentLogs = dojoLogs.filter(log => log.status === 'Present').length;
  const totalDojoLogs = dojoLogs.length;
  const averageAttendancePercent = totalDojoLogs > 0 
    ? Math.round((totalPresentLogs / totalDojoLogs) * 100) 
    : 0;

  // Calculate black belts
  const blackBeltsCount = students.filter(s => s.beltGrade && s.beltGrade.toLowerCase().includes('black')).length;

  // Calculate monthly income
  const paidStudentsCount = students.filter(s => s.feesStatus && s.feesStatus.toLowerCase() === 'paid').length;
  const totalMonthlyIncome = paidStudentsCount * 1000; // standard fee ₹1000/month
  const formattedIncome = totalMonthlyIncome >= 100000 
    ? `₹${(totalMonthlyIncome / 100000).toFixed(2)}L` 
    : `₹${totalMonthlyIncome.toLocaleString('en-IN')}`;

  const displayStudents = students.filter(s => s.role === 'student');

  // Perform client side search & filter
  const filteredStudents = displayStudents.filter(student => {
    const fullName = student.fullName || '';
    const email = student.email || '';
    const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDojo = !selectedDojoFilter || student.dojoId === selectedDojoFilter;
    return matchesSearch && matchesDojo;
  });

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (adminForm.dojoIds.length === 0) {
      alert('Please select at least one dojo branch.');
      return;
    }
    setAdminCreating(true);
    try {
      const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const credential = await createUserWithEmailAndPassword(secondaryAuth, adminForm.email, 'test12');
      const newUid = credential.user.uid;
      await firebaseSignOut(secondaryAuth);
      await deleteApp(secondaryApp);

      // Primary dojoId is first selected, dojoIds holds all
      const primaryDojoId = adminForm.dojoIds[0];
      const adminData = {
        uid: newUid,
        fullName: adminForm.fullName,
        email: adminForm.email,
        role: 'dojo_admin',
        dojoId: primaryDojoId,
        dojoIds: adminForm.dojoIds,
        isOnboarded: true,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', newUid), adminData);
      await sendPasswordResetEmail(auth, adminForm.email);

      setStudents(prev => [...prev, { ...adminData, id: newUid }]);
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Dojo Admin created for ${adminForm.fullName}`, user: 'Super Admin' },
        ...prev
      ]);
      setIsAdminModalOpen(false);
      setAdminForm({ fullName: '', email: '', dojoIds: [] });
      const dojoNames = adminForm.dojoIds.map(id => DOJO_LIST.find(d => d.id === id)?.name || id).join(', ');
      alert(`Admin account created!\n\nName: ${adminForm.fullName}\nEmail: ${adminForm.email}\nDojos: ${dojoNames}\nDefault Password: test12\n\nA password reset email has been sent.`);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        alert('An account with this email already exists.');
      } else {
        alert('Failed to create admin profile: ' + error.message);
      }
    } finally {
      setAdminCreating(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      const newStudentRef = doc(collection(db, 'users'));
      const targetRole = role === 'super_admin' ? studentForm.role : 'student';
      const targetDojoId = role === 'super_admin' ? studentForm.dojoId : (profile?.dojoId || 'pattam');
      
      const studentData = {
        uid: newStudentRef.id,
        fullName: studentForm.fullName,
        email: studentForm.email,
        mobileNumber: studentForm.mobileNumber,
        dojoId: targetDojoId,
        beltGrade: targetRole === 'dojo_admin' ? '' : studentForm.beltGrade,
        role: targetRole,
        isOnboarded: true,
        createdAt: serverTimestamp(),
      };
      await setDoc(newStudentRef, studentData);
      setStudents([...students, studentData]);
      setIsStudentModalOpen(false);
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `${targetRole === 'dojo_admin' ? 'Dojo Admin' : 'Student'} profile created for ${studentForm.fullName}`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
      setStudentForm({ fullName: '', email: '', mobileNumber: '', dojoId: '', beltGrade: 'White Belt', role: 'student' });
      alert(`${targetRole === 'dojo_admin' ? 'Admin' : 'Student'} profile created successfully!`);
    } catch (error) {
      console.error(error);
      alert("Failed to create profile.");
    }
  };

  const handleDeleteStudent = async (id) => {
    if (id === user?.uid) {
      alert("You cannot delete your own admin profile.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this profile?")) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setStudents(students.filter(s => s.id !== id));
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Profile deleted: ${id}`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
      alert("Profile deleted successfully.");
    } catch (error) {
      console.error(error);
      alert("Delete failed.");
    }
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setEditForm({
      fullName: student.fullName || '',
      mobileNumber: student.mobileNumber || '',
      dojoId: student.dojoId || '',
      beltGrade: student.beltGrade || 'White Belt',
      feesStatus: student.feesStatus || 'unpaid',
      address: student.address || '',
      emergencyContact: student.emergencyContact || '',
    });
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const studentRef = doc(db, 'users', editingStudent.id);
      await updateDoc(studentRef, {
        fullName: editForm.fullName,
        mobileNumber: editForm.mobileNumber,
        dojoId: editForm.dojoId,
        beltGrade: editForm.beltGrade,
        feesStatus: editForm.feesStatus,
        address: editForm.address,
        emergencyContact: editForm.emergencyContact,
      });
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...editForm } : s));
      setActivityLogs(prev => [
        { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), action: `Updated profile: ${editForm.fullName}`, user: role === 'super_admin' ? 'Super Admin' : 'Dojo Admin' },
        ...prev
      ]);
      setEditingStudent(null);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to update profile.');
    }
  };

  const handlePostNotification = async (e) => {
    e.preventDefault();
    try {
      const notifRef = doc(collection(db, 'notifications'));
      const targetDojoId = role === 'super_admin' ? notificationForm.dojoId : (profile?.dojoId || 'pattam');
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
      setNotificationForm({ title: '', message: '', dojoId: '' });
    } catch (error) {
      console.error(error);
    }
  };

  // Dynamic chart data calculation - use DOJO_LIST as source of truth
  const branches = DOJO_LIST.map(d => ({ id: d.id, name: d.name }));

  const chartData = role === 'super_admin' 
    ? branches.map(b => ({
        name: b.name,
        Students: students.filter(s => s.dojoId === b.id).length
      }))
    : branches.filter(b => b.id === (profile?.dojoId || 'pattam')).map(b => ({
        name: b.name,
        Students: students.filter(s => s.dojoId === b.id).length
      }));

  // Dynamic Belt Grade Distribution calculations
  const beltCounts = {};
  students.filter(s => s.role === 'student').forEach(s => {
    const belt = s.beltGrade || 'White Belt';
    const normalizedBelt = belt.split(' Belt')[0];
    beltCounts[normalizedBelt] = (beltCounts[normalizedBelt] || 0) + 1;
  });

  const beltColors = {
    'White': '#FFFFFF',
    'Yellow': '#FBBF24',
    'Orange': '#F97316',
    'Green': '#10B981',
    'Blue': '#3B82F6',
    'Purple': '#8B5CF6',
    'Brown Junior': '#B45309',
    'Brown Senior': '#78350F',
    'Brown Super Senior': '#451A03',
    'Black': '#111827'
  };

  const beltPieData = Object.keys(beltCounts).map(belt => ({
    name: belt,
    value: beltCounts[belt],
    color: beltColors[belt] || '#6B7280'
  }));

  return (
    <div className="bg-brand-dark min-h-screen text-white flex flex-col lg:flex-row">
      
      {/* Sidebar Dashboard Navigation */}
      <div className="w-full lg:w-64 bg-white/5 border-r border-white/10 p-6 flex flex-col justify-between shrink-0 space-y-6">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <img src="/images/LOGO.png" alt="Dojo Logo" className="h-10 w-10 object-contain" />
            <div>
              <h2 className="text-white font-extrabold text-sm uppercase tracking-wider">Karate Admin</h2>
              <span className="text-[10px] text-brand-gold uppercase tracking-widest font-black block">
                {role === 'super_admin' ? 'SUPER ADMIN' : 'DOJO ADMIN'}
              </span>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Analytics', icon: <BarChart2 size={16} /> },
              { id: 'students', label: 'Students', icon: <Users size={16} /> },
              { id: 'attendance', label: 'Attendance', icon: <Calendar size={16} /> },
              { id: 'notifications', label: 'Dojo Broadcast', icon: <Bell size={16} /> },
              { id: 'logs', label: 'Activity Logs', icon: <FileText size={16} /> }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${
                  activeView === item.id 
                    ? 'bg-brand-red text-white shadow-lg shadow-brand-red/10' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/5 pt-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <Home size={16} />
            <span>Home Page</span>
          </button>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
            Okinavan Shito Ryu Karate Academy
          </div>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-grow p-6 sm:p-10 space-y-8 overflow-y-auto">
        
        {/* 1. OVERVIEW VIEW */}
        {activeView === 'overview' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wide">
                Academy <span className="text-brand-red">Analytics</span>
              </h1>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Active Members', value: activeMembersCount.toString(), change: 'Registered students', icon: <Users className="text-brand-red" /> },
                { label: 'Avg Attendance', value: `${averageAttendancePercent}%`, change: 'Based on logs', icon: <Calendar className="text-brand-gold" /> },
                { label: 'Black Belts', value: blackBeltsCount.toString(), change: 'Dan grades', icon: <Award className="text-white" /> },
                { label: 'Monthly Income', value: formattedIncome, change: `${paidStudentsCount} active paid`, icon: <CreditCard className="text-brand-red" /> }
              ].map((m, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">{m.label}</span>
                    {m.icon}
                  </div>
                  <h3 className="text-2xl font-black text-white">{m.value}</h3>
                  <span className="text-[10px] text-emerald-400 font-bold block">{m.change}</span>
                </div>
              ))}
            </div>

            {/* Analytical Recharts Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Enrollment & Attendance Bar Chart */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Branch-wise Student Enrollment</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} />
                      <YAxis stroke="#666" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', color: '#FFF' }} />
                      <Bar dataKey="Students" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Belt Grade Pie Chart distribution */}
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
                <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Belt Grade Distribution</h3>
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
                    <span className="text-2xl font-black text-white">{activeMembersCount}</span>
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
                <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wide">
                  Student <span className="text-brand-red">Directory</span>
                </h1>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                  Manage profiles, belts, attendance records and fees
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {role === 'super_admin' && (
                  <button
                    onClick={() => setIsAdminModalOpen(true)}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <UserCog size={14} />
                    <span>Add Admin</span>
                  </button>
                )}
                <button
                  onClick={() => setIsStudentModalOpen(true)}
                  className="px-6 py-3 bg-brand-red hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Plus size={14} />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search student or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-brand-dark/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-red/50 text-white placeholder-gray-500"
                />
              </div>

              {role === 'super_admin' ? (
                <select
                  value={selectedDojoFilter}
                  onChange={(e) => setSelectedDojoFilter(e.target.value)}
                  className="bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-red/50 text-gray-300 w-full md:w-auto"
                >
                  <option value="">All branches</option>
                  <option value="sunil_hall">Sunil Hall</option>
                  <option value="puliyamthuruthu">Puliyamthuruthu Dojo</option>
                  <option value="pothanicad">Pothanicad Dojo</option>
                  <option value="panayikulam">Bhavas Building</option>
                  <option value="pattam">Pattam Dojo</option>
                </select>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-300">
                  Branch: <span className="font-extrabold uppercase">{branches.find(b => b.id === profile?.dojoId)?.name || profile?.dojoId || 'Pattam Dojo'}</span>
                </div>
              )}
            </div>

            {/* Students Directory Grid/Table */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-dark border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Student Details</th>
                    <th className="p-4">Mobile</th>
                    <th className="p-4">Dojo</th>
                    <th className="p-4">Belt Rank</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold text-xs sm:text-sm text-gray-300">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-white/5">
                      <td className="p-4">
                        <div>
                          <p className="text-white font-extrabold text-sm">{student.fullName}</p>
                          <p className="text-[10px] text-gray-500 font-semibold">{student.email}</p>
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
                            onClick={() => handleOpenEdit(student)}
                            className="p-2 hover:bg-white/5 text-gray-400 hover:text-brand-gold rounded-xl transition-all"
                            title="Edit student"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => alert(`View QR Code for Student ID: ${student.id}`)}
                            className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all"
                            title="QR Code student ID card"
                          >
                            <Shield size={14} />
                          </button>
                          {student.id !== user?.uid && (
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
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
                </tbody>
              </table>
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
                <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wide">
                  Dojo <span className="text-brand-red">Attendance</span>
                </h1>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                  Mark daily attendance logs, view calculation percentages, and generate official rosters
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setIsReportMode(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    !isReportMode 
                      ? 'bg-brand-red text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Mark Daily
                </button>
                <button
                  onClick={() => setIsReportMode(true)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    isReportMode 
                      ? 'bg-brand-red text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Attendance Report
                </button>
              </div>
            </div>

            {!isReportMode ? (
              // Mark Daily Attendance View
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="space-y-1.5 w-full sm:w-auto">
                      <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Select Session Date</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="bg-brand-dark border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red/50 w-full sm:w-64"
                      />
                    </div>

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

                  <div className="bg-brand-dark/50 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-brand-dark/80 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-4">Student Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Belt Rank</th>
                          <th className="p-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-semibold text-xs sm:text-sm text-gray-300">
                        {filteredStudents.map((student) => {
                          const studentId = student.id || student.uid;
                          const isPresent = attendanceRecords[studentId] || false;
                          return (
                            <tr key={studentId} className="hover:bg-white/5">
                              <td className="p-4 text-white font-extrabold">{student.fullName}</td>
                              <td className="p-4 text-gray-500 font-semibold">{student.email}</td>
                              <td className="p-4 text-brand-gold uppercase">{student.beltGrade}</td>
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
                                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
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
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex justify-between items-center no-print">
                    <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Attendance Report & Calculations</h3>
                    <button
                      onClick={() => window.print()}
                      className="px-6 py-3 bg-brand-gold text-brand-dark font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
                    >
                      <Download size={14} />
                      <span>Print PDF Report</span>
                    </button>
                  </div>

                  <div id="printable-attendance-area" className="bg-brand-dark/50 border border-white/10 rounded-2xl overflow-hidden p-4 sm:p-6 space-y-6 print:border-0 print:bg-white print:text-black">
                    <div className="hidden print:block text-center space-y-2 pb-6 border-b border-gray-200">
                      <h2 className="text-2xl font-black uppercase text-black">Okinavan Shito Ryu Karate Academy</h2>
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Official Dojo Attendance Roster Report</p>
                      <p className="text-xs text-gray-500">Dojo Branch: {role === 'super_admin' ? (selectedDojoFilter || 'Pattam') : (profile?.dojoId || 'Pattam')} | Generated: {new Date().toLocaleDateString()}</p>
                    </div>

                    <table className="w-full text-left text-sm print:text-black">
                      <thead className="bg-brand-dark/80 print:bg-gray-100 border-b border-white/10 print:border-gray-200 text-gray-400 print:text-gray-700 text-xs uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-4">Student Details</th>
                          <th className="p-4 text-center">Total Sessions</th>
                          <th className="p-4 text-center">Sessions Present</th>
                          <th className="p-4 text-right">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 print:divide-gray-200 font-semibold text-xs sm:text-sm text-gray-300 print:text-black">
                        {filteredStudents.map((student) => {
                          const studentId = student.id || student.uid;
                          const studentLogs = dojoLogs.filter(log => log.uid === studentId);
                          const total = studentLogs.length;
                          const present = studentLogs.filter(log => log.status === 'Present').length;
                          const percent = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';
                          return (
                            <tr key={studentId} className="hover:bg-white/5 print:hover:bg-transparent">
                              <td className="p-4">
                                <p className="text-white print:text-black font-extrabold">{student.fullName}</p>
                                <p className="text-[10px] text-gray-500 print:text-gray-600 font-semibold">{student.email}</p>
                              </td>
                              <td className="p-4 text-center font-mono text-gray-400 print:text-gray-700">{total}</td>
                              <td className="p-4 text-center font-mono text-emerald-400 print:text-emerald-700">{present}</td>
                              <td className="p-4 text-right font-black text-brand-gold print:text-amber-800">{percent}%</td>
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
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wide">
                Publish Dojo <span className="text-brand-red">Broadcasts</span>
              </h1>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                Broadcast announcements, test schedules and seminars instantly to Student Dashboards
              </p>
            </div>

            <form onSubmit={handlePostNotification} className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Broadcast Title</label>
                <input
                  type="text"
                  required
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="w-full bg-brand-dark border border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-white placeholder-gray-500"
                  placeholder="Kyu belt grading test scheduled"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Broadcast Content</label>
                <textarea
                  required
                  rows={4}
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  className="w-full bg-brand-dark border border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-white placeholder-gray-500 leading-relaxed"
                  placeholder="Enter broadcast details, timing and instructions..."
                />
              </div>

              {role === 'super_admin' ? (
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Target Dojo Branch</label>
                  <select
                    required
                    value={notificationForm.dojoId}
                    onChange={(e) => setNotificationForm({ ...notificationForm, dojoId: e.target.value })}
                    className="w-full bg-brand-dark border border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-gray-300"
                  >
                    <option value="" disabled>Select target branch</option>
                    <option value="all">Broadcast to All Dojos</option>
                    <option value="sunil_hall">Sunil Hall Only</option>
                    <option value="puliyamthuruthu">Puliyamthuruthu Only</option>
                    <option value="pothanicad">Pothanicad Only</option>
                    <option value="panayikulam">Bhavas Building Only</option>
                    <option value="pattam">Pattam Dojo Only</option>
                  </select>
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
              >
                <Plus size={16} />
                <span>Publish Broadcast</span>
              </button>
            </form>
          </div>
        )}

        {/* 4. ACTIVITY LOGS VIEW */}
        {activeView === 'logs' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wide">
                Security & <span className="text-brand-red">Activity Logs</span>
              </h1>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                Real-time security auditing log of dockets edited
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
              {activityLogs.map((log, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm p-4 bg-brand-dark/50 border border-white/5 rounded-2xl text-gray-300">
                  <div className="flex items-center space-x-3">
                    <Shield size={16} className="text-brand-red shrink-0" />
                    <span>{log.action}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-extrabold text-xs">{log.user}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{log.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Student creation modal */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <div className="fixed inset-0 bg-brand-dark/90 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-dark border border-white/15 w-full max-w-md p-8 rounded-3xl space-y-6 relative overflow-hidden"
            >
              <h3 className="text-white font-black text-xl uppercase tracking-wide">Create Student Profile</h3>
              
              <form onSubmit={handleCreateStudent} className="space-y-4 text-xs font-bold text-gray-300">
                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-gray-400 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.fullName}
                    onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                    className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-gray-400 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="uppercase tracking-widest text-gray-400 block">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={studentForm.mobileNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, mobileNumber: e.target.value })}
                    className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>

                {role === 'super_admin' ? (
                  <div className="space-y-1.5">
                    <label className="uppercase tracking-widest text-gray-400 block">Dojo Branch</label>
                    <select
                      required
                      value={studentForm.dojoId}
                      onChange={(e) => setStudentForm({ ...studentForm, dojoId: e.target.value })}
                      className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300"
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
                    return adminDojos.length === 1 ? null : (
                      <div className="space-y-1.5">
                        <label className="uppercase tracking-widest text-gray-400 block">Dojo Branch</label>
                        <select
                          required
                          value={studentForm.dojoId}
                          onChange={(e) => setStudentForm({ ...studentForm, dojoId: e.target.value })}
                          className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300"
                        >
                          <option value="" disabled>Select branch</option>
                          {adminDojos.map(dojo => (
                            <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="uppercase tracking-widest text-gray-400 block">Starting Belt</label>
                    <select
                      value={studentForm.beltGrade}
                      onChange={(e) => setStudentForm({ ...studentForm, beltGrade: e.target.value })}
                      className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300"
                    >
                      <option value="White Belt">White Belt</option>
                      <option value="Yellow Belt">Yellow Belt</option>
                      <option value="Orange Belt">Orange Belt</option>
                      <option value="Green Belt">Green Belt</option>
                      <option value="Blue Belt">Blue Belt</option>
                      <option value="Purple Belt">Purple Belt</option>
                      <option value="Brown Junior">Brown Junior</option>
                      <option value="Brown Senior">Brown Senior</option>
                      <option value="Brown Super Senior">Brown Super Senior</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="uppercase tracking-widest text-gray-400 block">Role</label>
                    {role === 'super_admin' ? (
                      <select
                        value={studentForm.role}
                        onChange={(e) => setStudentForm({ ...studentForm, role: e.target.value })}
                        className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300"
                      >
                        <option value="student">Student</option>
                        <option value="dojo_admin">Dojo Admin</option>
                      </select>
                    ) : (
                      <select
                        value="student"
                        disabled
                        className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
                      >
                        <option value="student">Student</option>
                      </select>
                    )}
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
                    className="px-6 py-3.5 border border-white/20 hover:bg-white/5 text-gray-300 rounded-xl transition-all"
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
              className="bg-brand-dark border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <UserCog size={20} className="text-brand-gold" />
                  <h2 className="text-xl font-black uppercase text-white tracking-wide">Add Dojo Admin</h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">Creates a login account with default password <span className="font-bold text-white">test12</span>. A password reset email will be sent so they can set their own.</p>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                    placeholder="e.g. Sensei John Doe"
                    className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Dojo Branches (select all that apply)</label>
                  <div className="bg-brand-dark/50 border border-white/10 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                    {DOJO_LIST.map(dojo => (
                      <label key={dojo.id} className="flex items-center space-x-3 cursor-pointer group hover:bg-white/5 px-2 py-1.5 rounded-lg transition-all">
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
                          <p className="text-white text-xs font-bold">{dojo.name}</p>
                          <p className="text-gray-500 text-[10px]">{dojo.instructor}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {adminForm.dojoIds.length > 0 && (
                    <p className="text-[10px] text-brand-gold font-bold">{adminForm.dojoIds.length} dojo(s) selected</p>
                  )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-400 space-y-1">
                  <p><span className="text-white font-bold">Default Password:</span> test12</p>
                  <p><span className="text-white font-bold">Reset Email:</span> Sent automatically so admin can change it</p>
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
                    className="px-6 py-3.5 border border-white/20 hover:bg-white/5 text-gray-300 rounded-xl transition-all"
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
              className="bg-brand-dark border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <Edit2 size={18} className="text-brand-gold" />
                  <h2 className="text-xl font-black uppercase text-white tracking-wide">Edit Student Profile</h2>
                </div>
                <p className="text-xs text-gray-400">Editing: <span className="text-white font-bold">{editingStudent.email}</span></p>
              </div>

              <form onSubmit={handleEditStudent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Mobile Number</label>
                    <input
                      type="tel"
                      value={editForm.mobileNumber}
                      onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                      className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Belt Grade</label>
                    <select
                      value={editForm.beltGrade}
                      onChange={(e) => setEditForm({ ...editForm, beltGrade: e.target.value })}
                      className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-brand-gold/50"
                    >
                      <option value="White Belt">White Belt</option>
                      <option value="Yellow Belt">Yellow Belt</option>
                      <option value="Orange Belt">Orange Belt</option>
                      <option value="Green Belt">Green Belt</option>
                      <option value="Blue Belt">Blue Belt</option>
                      <option value="Purple Belt">Purple Belt</option>
                      <option value="Brown Junior">Brown Junior</option>
                      <option value="Brown Senior">Brown Senior</option>
                      <option value="Brown Super Senior">Brown Super Senior</option>
                      <option value="Black Belt">Black Belt</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Fees Status</label>
                    <select
                      value={editForm.feesStatus}
                      onChange={(e) => setEditForm({ ...editForm, feesStatus: e.target.value })}
                      className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-brand-gold/50"
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  {role === 'super_admin' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Dojo Branch</label>
                      <select
                        value={editForm.dojoId}
                        onChange={(e) => setEditForm({ ...editForm, dojoId: e.target.value })}
                        className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-brand-gold/50"
                      >
                        <option value="" disabled>Select branch</option>
                        {DOJO_LIST.map(dojo => (
                          <option key={dojo.id} value={dojo.id}>{dojo.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
                      placeholder="Student's home address"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-widest block">Emergency Contact</label>
                    <input
                      type="text"
                      value={editForm.emergencyContact}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                      className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
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
                    className="px-6 py-3.5 border border-white/20 hover:bg-white/5 text-gray-300 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminDashboard;
