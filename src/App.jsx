import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Dojos from './pages/Dojos';
import Achievements from './pages/Achievements';
import Downloads from './pages/Downloads';
import Contact from './pages/Contact';
import Login from './pages/Login';
import JoinUs from './pages/JoinUs';
import BlackBelts from './pages/BlackBelts';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Layout wrapper to conditionally hide Navbar & Footer on dashboard pages
const AppContent = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen">
      {!isDashboard && <Navbar />}
      <div className={`flex flex-col min-h-screen ${!isDashboard ? 'lg:pl-64' : ''}`}>
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/dojos" element={<Dojos />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/joinus" element={<JoinUs />} />
            <Route path="/blackbelt" element={<BlackBelts />} />

            {/* Protected Student Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['student', 'super_admin']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Protected Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'dojo_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        {!isDashboard && <Footer />}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
