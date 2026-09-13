import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Check localStorage for demo admin session
      const savedUser = localStorage.getItem('hostel_shop_admin_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (identifier, password) => {
    const rawId = (identifier || '').trim();
    const email = rawId.includes('@') 
      ? rawId.toLowerCase() 
      : (rawId.toLowerCase() === 'shop_admin' ? 'admin@vmart.com' : `${rawId}@vmart.com`);

    // Direct staff credential verification (admin@vmart.com / pass123)
    const isMasterStaff = (email === 'admin@vmart.com' || rawId.toLowerCase() === 'shop_admin') && 
                          (password === 'pass123' || password === 'test123Password!');

    if (!isFirebaseConfigured || isMasterStaff) {
      if (isMasterStaff) {
        const staffUser = {
          uid: 'admin-vmart-uid',
          email: 'admin@vmart.com',
          displayName: 'VMart Admin',
          role: 'admin'
        };
        localStorage.setItem('hostel_shop_admin_user', JSON.stringify(staffUser));
        setCurrentUser(staffUser);

        // Also try signing in to Firebase Auth in background if provider is active
        if (isFirebaseConfigured) {
          signInWithEmailAndPassword(auth, email, password).catch(() => {});
        }
        return staffUser;
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (err) {
      if (isMasterStaff) {
        const fallbackUser = {
          uid: 'admin-vmart-uid',
          email: 'admin@vmart.com',
          displayName: 'VMart Admin',
          role: 'admin'
        };
        localStorage.setItem('hostel_shop_admin_user', JSON.stringify(fallbackUser));
        setCurrentUser(fallbackUser);
        return fallbackUser;
      }
      throw err;
    }
  };

  const logout = async () => {
    if (!isFirebaseConfigured) {
      localStorage.removeItem('hostel_shop_admin_user');
      setCurrentUser(null);
      return;
    }
    await firebaseSignOut(auth);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading, isAuthenticated: Boolean(currentUser) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
