import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const StudentAuthContext = createContext(null);

export function StudentAuthProvider({ children }) {
  const [currentStudent, setCurrentStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore student session from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hostel_shop_student_session');
      if (saved) {
        setCurrentStudent(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse saved student session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const student = await api.loginStudent({ username, password });
    setCurrentStudent(student);
    localStorage.setItem('hostel_shop_student_session', JSON.stringify(student));
    return student;
  };

  const register = async (username, displayName, password) => {
    const student = await api.registerStudent({ username, displayName, password });
    setCurrentStudent(student);
    localStorage.setItem('hostel_shop_student_session', JSON.stringify(student));
    return student;
  };

  const logout = () => {
    setCurrentStudent(null);
    localStorage.removeItem('hostel_shop_student_session');
  };

  return (
    <StudentAuthContext.Provider
      value={{
        currentStudent,
        isAuthenticated: Boolean(currentStudent),
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
}
