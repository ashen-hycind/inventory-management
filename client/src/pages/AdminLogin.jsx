import React, { useState } from 'react';
import { Loader2, ShieldCheck, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin({ onNavigate, showToast }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both identifier and password.');
      return;
    }

    try {
      setLoading(true);
      await login(identifier.trim(), password);
      showToast?.({ type: 'success', message: 'Staff session started' });
      onNavigate('admin-dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
        ? 'Invalid credentials provided.'
        : err.message || 'Login failed. Please check your credentials.';
      setErrorMessage(msg);
      showToast?.({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setIdentifier('admin@vmart.com');
    setPassword('pass123');
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center py-12 px-4 sm:px-6 max-w-md mx-auto animate-reveal">
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#D9D0C7] shadow-tactile">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#FAF8F5] text-[#242E2C] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#D9D0C7] shadow-sm">
            <ShieldCheck className="w-6 h-6 text-[#62736F]" />
          </div>
          <p className="text-[11px] font-mono tracking-wider uppercase text-[#62736F] mb-1">
            Restricted Staff Access
          </p>
          <h2 className="text-2xl font-display font-bold text-[#242E2C] tracking-tight">Staff Portal Login</h2>
          <p className="text-xs text-[#62736F] mt-1 font-normal">
            Authenticate to access counter operations and inventory control.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#FDF4F2] border border-[#E8B5A7] text-[#DB846E] text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#62736F] mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8C9B97] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="admin@vmart.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9D0C7] focus:border-[#DB846E] focus:ring-2 focus:ring-[#DB846E]/20 focus:outline-none text-xs text-[#242E2C] font-medium placeholder:text-[#8C9B97] bg-[#FAF8F5]/50 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#62736F] mb-1.5">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9D0C7] focus:border-[#DB846E] focus:ring-2 focus:ring-[#DB846E]/20 focus:outline-none text-xs text-[#242E2C] font-medium placeholder:text-[#8C9B97] bg-[#FAF8F5]/50 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-[#DB846E] hover:bg-[#C76F59] text-white text-xs font-bold rounded-xl shadow-tactile hover:shadow-terracotta transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-60 active:scale-98 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span className="text-sm font-semibold tracking-wide">Sign In to Dashboard</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#D9D0C7]/60 text-center">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs font-semibold text-[#62736F] hover:text-[#DB846E] transition underline underline-offset-4 cursor-pointer"
          >
            Auto-fill staff credentials (admin@vmart.com)
          </button>
        </div>

      </div>
    </div>
  );
}
