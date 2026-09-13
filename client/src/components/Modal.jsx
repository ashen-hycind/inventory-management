import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        
        {/* Clean Backdrop */}
        <div 
          className="fixed inset-0 bg-[#242E2C]/50 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div className={`relative w-full ${maxWidth} transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-tactile-hover transition-all my-8 border border-[#D9D0C7]`}>
          
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#D9D0C7]/60">
            <h3 className="text-base font-bold text-[#242E2C] tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="text-[#62736F] hover:text-[#242E2C] rounded-lg p-1.5 hover:bg-[#D9D0C7]/30 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>{children}</div>
        </div>

      </div>
    </div>
  );
}
