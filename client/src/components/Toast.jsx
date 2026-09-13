import React from 'react';
import { X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-reveal shadow-2xl">
      <div className={`flex items-center justify-between p-4 rounded-2xl text-xs font-semibold shadow-tactile border ${
        isError
          ? 'bg-[#3E1B13] text-[#FDF4F2] border-[#E8B5A7]'
          : 'bg-[#242E2C] text-[#FAF8F5] border-[#4F5D59]'
      }`}>
        <div className="flex items-center space-x-2.5 pr-3">
          <span className={`w-2 h-2 rounded-full ${isError ? 'bg-[#DB846E]' : 'bg-[#9FAD9F]'}`} />
          <span className="font-medium">{toast.message}</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#8C9B97] hover:text-white p-1 rounded-lg hover:bg-white/10 transition flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
