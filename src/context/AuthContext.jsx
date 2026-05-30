import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectProfile = (profileId) => {
    const selected = availableProfiles.find(p => p.id === profileId);
    if (selected) {
      setProfile(selected);
      setRole(selected.role);
      if (user) {
        localStorage.setItem(`selectedStudentId_${user.uid}`, profileId);
      }
    }
  };

  const switchProfile = () => {
    setProfile(null);
    setRole('student');
    if (user) {
      localStorage.removeItem(`selectedStudentId_${user.uid}`);
    }
  };

  // Sign Up with Email and Password
  const register = async (email, password, additionalData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const u = userCredential.user;
    
    // Create user document in Firestore
    const userProfile = {
      uid: u.uid,
      email: u.email,
      role: 'student', // default role is student
      isOnboarded: true,
      createdAt: serverTimestamp(),
      ...additionalData
    };
    
    await setDoc(doc(db, 'users', u.uid), userProfile);
    return u;
  };

  const clearSelectedProfiles = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('selectedStudentId_')) {
        localStorage.removeItem(key);
      }
    });
  };

  // Log In with Email and Password
  const login = (email, password) => {
    clearSelectedProfiles();
    localStorage.setItem('loginTimestamp', String(new Date().getTime()));
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google Log In with intelligent onboarding checks and manual registration mapping
  const loginWithGoogle = async () => {
    clearSelectedProfiles();
    const userCredential = await signInWithPopup(auth, googleProvider);
    const u = userCredential.user;
    localStorage.setItem('loginTimestamp', String(new Date().getTime()));
    
    const isAdminEmail = u.email === 'francisfabin860@gmail.com';
    let isNewUser = false;
    
    try {
      const usersRef = collection(db, 'users');
      // Normalize email search to lowercase
      const q = query(usersRef, where('email', '==', u.email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        if (isAdminEmail) {
          // Create super admin profile if it doesn't exist
          const userProfile = {
            uid: u.uid,
            email: u.email.trim().toLowerCase(),
            fullName: u.displayName || 'Fabin Paul Francis',
            profilePhotoUrl: u.photoURL || '',
            role: 'super_admin',
            dojoId: 'pattam',
            isOnboarded: true,
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', u.uid), userProfile);
        } else {
          // Unknown user — not pre-registered by any admin. Block them.
          await signOut(auth);
          throw new Error('ACCESS_DENIED');
        }
      } else {
        // Document(s) with this email already exists (e.g. manually created by dojo head)
        if (querySnapshot.docs.length === 1) {
          const existingDoc = querySnapshot.docs[0];
          const existingData = existingDoc.data();
          
          // If the document ID is not the user's Google UID, migrate it to u.uid
          if (existingDoc.id !== u.uid) {
            await setDoc(doc(db, 'users', u.uid), {
              ...existingData,
              uid: u.uid,
              id: u.uid,
              email: existingData.email ? existingData.email.trim().toLowerCase() : u.email.trim().toLowerCase(),
              profilePhotoUrl: existingData.profilePhotoUrl || u.photoURL || '',
              isOnboarded: existingData.isOnboarded !== undefined ? existingData.isOnboarded : true,
            });
            
            // Migrate related records: attendance, exams, fees, documents
            try {
              const oldId = existingDoc.id;
              const newId = u.uid;
              
              // 1. Attendance
              const attQuery = query(collection(db, 'attendance'), where('uid', '==', oldId));
              const attSnap = await getDocs(attQuery);
              for (const d of attSnap.docs) {
                const attData = d.data();
                const newAttDocId = `${newId}_${attData.date}`;
                await setDoc(doc(db, 'attendance', newAttDocId), {
                  ...attData,
                  uid: newId
                });
                await deleteDoc(doc(db, 'attendance', d.id));
              }

              // 2. Exams
              const examQuery = query(collection(db, 'exams'), where('uid', '==', oldId));
              const examSnap = await getDocs(examQuery);
              for (const d of examSnap.docs) {
                await setDoc(doc(db, 'exams', d.id), { uid: newId }, { merge: true });
              }

              // 3. Fees
              const feeQuery = query(collection(db, 'fees'), where('uid', '==', oldId));
              const feeSnap = await getDocs(feeQuery);
              for (const d of feeSnap.docs) {
                await setDoc(doc(db, 'fees', d.id), { uid: newId }, { merge: true });
              }

              // 4. Documents
              const docQuery = query(collection(db, 'documents'), where('ownerId', '==', oldId));
              const docSnap = await getDocs(docQuery);
              for (const d of docSnap.docs) {
                await setDoc(doc(db, 'documents', d.id), { ownerId: newId }, { merge: true });
              }
            } catch (migErr) {
              console.error("Failed to migrate related student records:", migErr);
            }

            // Delete old random/temporary document
            try {
              await deleteDoc(doc(db, 'users', existingDoc.id));
            } catch (delErr) {
              console.warn("Could not delete temporary document during migration (will be auto-cleaned by admin dashboard):", delErr);
            }
          } else {
            // If the profile already has UID, check if it needs to complete onboarding details
            if (!isAdminEmail && existingData.role !== 'dojo_admin' && existingData.role !== 'super_admin' && (existingData.isOnboarded === false || !existingData.mobileNumber)) {
              isNewUser = true;
            }
          }
        } else {
          // Multiple sibling profiles exist. Skip auto-migration to uid to preserve both documents.
          console.log("[AuthContext] Sibling profiles found. Skipping auto-migration to Google uid.");
        }
        
        // Ensure admin has correct credentials
        if (isAdminEmail) {
          await setDoc(doc(db, 'users', u.uid), { role: 'super_admin', dojoId: 'pattam', isOnboarded: true }, { merge: true });
          isNewUser = false;
        }
      }
    } catch (error) {
      if (error.message === 'ACCESS_DENIED' || error.message === 'ADMIN_NOT_ALLOWED') throw error;
      console.warn("Failed to check or create user profile on google sign-in:", error);
    }
    
    return { user: u, isNewUser };
  };

  // Log Out
  const logout = () => {
    clearSelectedProfiles();
    localStorage.removeItem('loginTimestamp');
    return signOut(auth);
  };

  // Reset Password
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous user snapshot listener if any
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (currentUser) {
        // Enforce 12-hour session limit
        const loginTimeStr = localStorage.getItem('loginTimestamp');
        if (loginTimeStr) {
          const loginTime = Number(loginTimeStr);
          const now = new Date().getTime();
          if (now - loginTime > 43200000) { // 12 hours in ms
            console.log("[AuthContext] Session expired (12 hours). Logging out.");
            localStorage.removeItem('loginTimestamp');
            signOut(auth);
            setUser(null);
            setRole(null);
            setProfile(null);
            setAvailableProfiles([]);
            setLoading(false);
            return;
          }
        } else {
          // If no timestamp exists (e.g. legacy session), set it now
          localStorage.setItem('loginTimestamp', String(new Date().getTime()));
        }

        setUser(currentUser);
        try {
          const q = query(
            collection(db, 'users'),
            where('email', '==', currentUser.email.trim().toLowerCase())
          );

          unsubscribeSnapshot = onSnapshot(q, async (querySnapshot) => {
            const isAdminEmail = currentUser.email === 'francisfabin860@gmail.com';

            if (!querySnapshot.empty) {
              const docs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

              // Separate admin profiles
              const adminProfiles = docs.filter(d => d.role === 'super_admin' || d.role === 'dojo_admin');

              // Filter and deduplicate student profiles
              let studentProfiles = docs.filter(d => d.role === 'student');
              const officialStudentProfile = studentProfiles.find(p => p.id === currentUser.uid);
              if (officialStudentProfile) {
                studentProfiles = studentProfiles.filter(p => {
                  if (p.id === currentUser.uid) return true;
                  // If it's a different doc ID but has same email and same name (case-insensitive), it's a duplicate
                  const isDuplicate = p.email?.trim().toLowerCase() === officialStudentProfile.email?.trim().toLowerCase() && 
                                      p.fullName?.trim().toLowerCase() === officialStudentProfile.fullName?.trim().toLowerCase();
                  return !isDuplicate;
                });
              }

              // Combine all available profiles
              const combinedProfiles = [...adminProfiles, ...studentProfiles];

              if (combinedProfiles.length > 1) {
                setAvailableProfiles(combinedProfiles);
                // Load preference from localStorage
                const savedId = localStorage.getItem(`selectedStudentId_${currentUser.uid}`);
                const selected = combinedProfiles.find(p => p.id === savedId);
                if (selected) {
                  setProfile(selected);
                  setRole(selected.role);
                } else {
                  setProfile(null); // User must select profile
                  setRole('student'); // Default role to student so they go to student selection screen on /dashboard
                }
                setLoading(false);
              } else if (combinedProfiles.length === 1) {
                const singleProfile = combinedProfiles[0];
                if (singleProfile.role === 'super_admin' || singleProfile.role === 'dojo_admin') {
                  // For super admin, verify fields
                  if (isAdminEmail && (singleProfile.role !== 'super_admin' || singleProfile.dojoId !== 'pattam' || !singleProfile.isOnboarded)) {
                    const docRef = doc(db, 'users', singleProfile.id);
                    await setDoc(docRef, { role: 'super_admin', dojoId: 'pattam', isOnboarded: true }, { merge: true });
                    return;
                  }
                }
                setRole(singleProfile.role);
                setProfile(singleProfile);
                setAvailableProfiles([]);
                setLoading(false);
              } else {
                setRole('student');
                setProfile(null);
                setAvailableProfiles([]);
                setLoading(false);
              }
            } else {
              // No user profile exists under this email yet.
              if (isAdminEmail) {
                // Auto-create super admin profile
                const docRef = doc(db, 'users', currentUser.uid);
                const userProfile = {
                  uid: currentUser.uid,
                  id: currentUser.uid,
                  email: currentUser.email.trim().toLowerCase(),
                  fullName: currentUser.displayName || 'Fabin Paul Francis',
                  role: 'super_admin',
                  dojoId: 'pattam',
                  isOnboarded: true,
                  createdAt: serverTimestamp(),
                };
                await setDoc(docRef, userProfile);
              } else {
                setRole('student');
                setProfile(null);
                setAvailableProfiles([]);
                setLoading(false);
              }
            }
          }, (error) => {
            console.warn("Error listening to user profile:", error);
            setRole('student');
            setProfile(null);
            setAvailableProfiles([]);
            setLoading(false);
          });
        } catch (error) {
          console.warn("Error establishing profile listener:", error);
          setRole('student');
          setProfile(null);
          setAvailableProfiles([]);
          setLoading(false);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
        setAvailableProfiles([]);
        setLoading(false);
      }
    });

    // Background session expiration checker interval (checks every 10 seconds)
    const intervalId = setInterval(() => {
      const loginTimeStr = localStorage.getItem('loginTimestamp');
      if (auth.currentUser && loginTimeStr) {
        const loginTime = Number(loginTimeStr);
        const now = new Date().getTime();
        if (now - loginTime > 43200000) {
          console.log("[AuthContext] Active session expired (12 hours). Auto-logging out.");
          localStorage.removeItem('loginTimestamp');
          signOut(auth);
        }
      }
    }, 10000);

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      clearInterval(intervalId);
    };
  }, []);

  const value = {
    user,
    role,
    profile,
    availableProfiles,
    selectProfile,
    switchProfile,
    loading,
    login,
    register,
    logout,
    resetPassword,
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
