import React, { useState, useEffect } from 'react';
import { X, User, Lock, ArrowRight, Loader2, Check, AlertCircle } from 'lucide-react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { api } from '../services/api';

export default function StudentAuthModal({ isOpen, onClose, onSuccess, showToast }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Username availability state
  const [availability, setAvailability] = useState({
    status: 'idle', // 'idle' | 'checking' | 'available' | 'taken' | 'too-short'
    message: ''
  });

  const { login, register } = useStudentAuth();

  // Debounced username availability check on register tab
  useEffect(() => {
    if (tab !== 'register') {
      setAvailability({ status: 'idle', message: '' });
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setAvailability({ status: 'idle', message: '' });
      return;
    }

    if (cleanUser.length < 3) {
      setAvailability({ status: 'too-short', message: 'Must be at least 3 characters' });
      return;
    }

    setAvailability({ status: 'checking', message: 'Checking availability...' });

    const timer = setTimeout(async () => {
      try {
        const result = await api.checkUsernameAvailability(cleanUser);
        if (result.available) {
          setAvailability({ status: 'available', message: `@${cleanUser} is available` });
        } else {
          setAvailability({ status: 'taken', message: `@${cleanUser} is already taken` });
        }
      } catch (err) {
        console.error('Availability check failed:', err);
        setAvailability({ status: 'idle', message: '' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, tab]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (tab === 'register' && availability.status === 'taken') {
      setError(`The username "${username}" is already taken. Please choose another.`);
      return;
    }

    setLoading(true);

    try {
      if (tab === 'login') {
        await login(username, password);
        showToast?.({ type: 'success', message: `Welcome back, ${username}!` });
      } else {
        await register(username, displayName, password);
        showToast?.({ type: 'success', message: `Account created for ${displayName}!` });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Student auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const isRegisterDisabled = 
    tab === 'register' && 
    (availability.status === 'taken' || availability.status === 'checking' || username.trim().length < 3);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#D9D0C7] shadow-tactile-hover relative animate-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#D9D0C7] text-[#62736F] hover:text-[#242E2C] hover:bg-[#EBE3DA] flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Clean Header (Icon removed as requested) */}
        <div className="text-center mb-6 pt-2">
          <h3 className="font-display text-2xl font-bold text-[#242E2C]">
            {tab === 'login' ? 'Student Sign In' : 'Create Student Account'}
          </h3>
          <p className="text-xs text-[#62736F] mt-1.5">
            {tab === 'login' 
              ? 'Access your saved orders and retrieve active pickup codes.' 
              : 'Save your orders so you can see your pickup code anytime.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#FAF8F5] p-1 rounded-2xl border border-[#D9D0C7] mb-6">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-[#242E2C] shadow-xs'
                : 'text-[#62736F] hover:text-[#242E2C]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === 'register'
                ? 'bg-white text-[#242E2C] shadow-xs'
                : 'text-[#62736F] hover:text-[#242E2C]'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FDF4F2] border border-[#E8B5A7] text-[#DB846E] text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#62736F] mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D0C7] focus:border-[#DB846E] focus:ring-2 focus:ring-[#DB846E]/15 focus:outline-none text-xs text-[#242E2C] font-semibold bg-[#FAF8F5]/50 transition"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#62736F]">
                Username / User ID
              </label>
            </div>
            
            <div className="relative">
              <User className="w-4 h-4 text-[#8C9B97] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-10 pr-9 py-2.5 rounded-xl border focus:ring-2 focus:outline-none text-xs text-[#242E2C] font-semibold bg-[#FAF8F5]/50 transition ${
                  tab === 'register' && availability.status === 'available'
                    ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20'
                    : tab === 'register' && availability.status === 'taken'
                    ? 'border-[#DB846E] focus:border-[#DB846E] focus:ring-[#DB846E]/20'
                    : 'border-[#D9D0C7] focus:border-[#DB846E] focus:ring-[#DB846E]/15'
                }`}
              />
              
              {/* Right Input Icon Indicator */}
              {tab === 'register' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {availability.status === 'checking' && (
                    <Loader2 className="w-4 h-4 text-[#DB846E] animate-spin" />
                  )}
                  {availability.status === 'available' && (
                    <Check className="w-4 h-4 text-emerald-600" />
                  )}
                  {availability.status === 'taken' && (
                    <AlertCircle className="w-4 h-4 text-[#DB846E]" />
                  )}
                </div>
              )}
            </div>

            {/* Live Status Message */}
            {tab === 'register' && availability.status !== 'idle' && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                {availability.status === 'checking' && (
                  <span className="text-[#62736F] font-mono">Checking availability...</span>
                )}
                {availability.status === 'available' && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    ✓ {availability.message}
                  </span>
                )}
                {availability.status === 'taken' && (
                  <span className="text-[#DB846E] font-semibold flex items-center gap-1">
                    ✕ {availability.message}
                  </span>
                )}
                {availability.status === 'too-short' && (
                  <span className="text-[#8C9B97] font-mono">{availability.message}</span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#62736F] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C9B97] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="•••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D9D0C7] focus:border-[#DB846E] focus:ring-2 focus:ring-[#DB846E]/15 focus:outline-none text-xs text-[#242E2C] font-semibold bg-[#FAF8F5]/50 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isRegisterDisabled}
            className="w-full mt-3 py-3 px-4 bg-[#DB846E] hover:bg-[#C76F59] text-white text-xs font-bold rounded-xl shadow-tactile hover:shadow-terracotta transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-98 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
