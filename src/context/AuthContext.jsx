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
  const [loading, setLoading] = useState(true);

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

  // Log In with Email and Password
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google Log In with intelligent onboarding checks and manual registration mapping
  const loginWithGoogle = async () => {
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
        // Document with this email already exists (e.g. manually created by dojo head)
        const migratedDoc = querySnapshot.docs.find(d => d.id === u.uid);
        const existingDoc = migratedDoc || querySnapshot.docs[0];
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
          // Delete old random/temporary document
          try {
            await deleteDoc(doc(db, 'users', existingDoc.id));
          } catch (delErr) {
            console.warn("Could not delete temporary document during migration (will be auto-cleaned by admin dashboard):", delErr);
          }
        } else {
          // If the profile already has UID, check if it needs to complete onboarding details
          if (!isAdminEmail && (existingData.isOnboarded === false || !existingData.mobileNumber)) {
            isNewUser = true;
          }
        }
        
        // Ensure admin has correct credentials
        if (isAdminEmail) {
          await setDoc(doc(db, 'users', u.uid), { role: 'super_admin', dojoId: 'pattam', isOnboarded: true }, { merge: true });
          isNewUser = false;
        } else if (existingData.role === 'dojo_admin') {
          // Dojo admins must sign in via email+password, not Google
          await signOut(auth);
          throw new Error('ADMIN_NOT_ALLOWED');
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
          const docRef = doc(db, 'users', currentUser.uid);
          
          // Subscribe to real-time updates for user profile
          unsubscribeSnapshot = onSnapshot(docRef, async (docSnap) => {
            const isAdminEmail = currentUser.email === 'francisfabin860@gmail.com';
            
            if (docSnap.exists()) {
              let data = docSnap.data();
              // Admin onboarding check
              if (isAdminEmail && (data.role !== 'super_admin' || data.dojoId !== 'pattam' || !data.isOnboarded)) {
                await setDoc(docRef, { role: 'super_admin', dojoId: 'pattam', isOnboarded: true }, { merge: true });
                return;
              }
              setRole(data.role || 'student');
              setProfile(data);
              setLoading(false);
            } else {
              // The user document does not exist under their UID yet.
              // Check if a document matches their email under a temporary ID.
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', currentUser.email.trim().toLowerCase()));
              
              getDocs(q).then((querySnapshot) => {
                if (!querySnapshot.empty) {
                  // A profile exists with this email but is under a temporary ID.
                  // Migration is in progress! Keep loading = true, do not set loading = false yet.
                  console.log("[AuthContext Trace] Temp profile found, migration in progress...");
                } else {
                  if (isAdminEmail) {
                    const userProfile = {
                      uid: currentUser.uid,
                      email: currentUser.email.trim().toLowerCase(),
                      fullName: currentUser.displayName || 'Fabin Paul Francis',
                      role: 'super_admin',
                      dojoId: 'pattam',
                      isOnboarded: true,
                      createdAt: serverTimestamp(),
                    };
                    setDoc(docRef, userProfile);
                  } else {
                    setRole('student');
                    setProfile(null);
                    setLoading(false);
                  }
                }
              }).catch((err) => {
                console.warn("Failed to check temporary email status:", err);
                setRole('student');
                setProfile(null);
                setLoading(false);
              });
            }
          }, (error) => {
            console.warn("Error listening to user profile:", error);
            setRole('student');
            setProfile(null);
            setLoading(false);
          });
        } catch (error) {
          console.warn("Error establishing profile listener:", error);
          setRole('student');
          setProfile(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
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
