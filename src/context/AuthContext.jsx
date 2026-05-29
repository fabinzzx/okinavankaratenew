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
      if (user) {
        localStorage.setItem(`selectedStudentId_${user.uid}`, profileId);
      }
    }
  };

  const switchProfile = () => {
    setProfile(null);
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
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google Log In with intelligent onboarding checks and manual registration mapping
  const loginWithGoogle = async () => {
    clearSelectedProfiles();
    const userCredential = await signInWithPopup(auth, googleProvider);
    const u = userCredential.user;
    
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

              // First, check if there's an admin profile
              const adminDoc = docs.find(d => d.role === 'super_admin' || d.role === 'dojo_admin');
              if (adminDoc) {
                // For super admin, verify fields
                if (isAdminEmail && (adminDoc.role !== 'super_admin' || adminDoc.dojoId !== 'pattam' || !adminDoc.isOnboarded)) {
                  const docRef = doc(db, 'users', adminDoc.id);
                  await setDoc(docRef, { role: 'super_admin', dojoId: 'pattam', isOnboarded: true }, { merge: true });
                  return;
                }
                setRole(adminDoc.role);
                setProfile(adminDoc);
                setAvailableProfiles([]);
                setLoading(false);
                return;
              }

              // Filter for student profiles
              let studentProfiles = docs.filter(d => d.role === 'student');

              // Deduplicate in-memory if an official Google UID document exists
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

              if (studentProfiles.length > 0) {
                setRole('student');
                if (studentProfiles.length > 1) {
                  setAvailableProfiles(studentProfiles);
                  // Load preference from localStorage
                  const savedId = localStorage.getItem(`selectedStudentId_${currentUser.uid}`);
                  const selected = studentProfiles.find(p => p.id === savedId);
                  if (selected) {
                    setProfile(selected);
                  } else {
                    setProfile(null); // Parent must select profile
                  }
                } else {
                  setAvailableProfiles([]);
                  setProfile(studentProfiles[0]);
                }
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

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
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
