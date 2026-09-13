import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function OrderConfirmation({ orderData, onNavigate, showToast }) {
  const [copied, setCopied] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(orderData || null);
  const [loading, setLoading] = useState(!orderData);

  useEffect(() => {
    if (!orderData) {
      try {
        const saved = sessionStorage.getItem('hostel_shop_last_order');
        if (saved) {
          setCurrentOrder(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Failed to load cached order:", err);
      }
      setLoading(false);
    } else {
      sessionStorage.setItem('hostel_shop_last_order', JSON.stringify(orderData));
    }
  }, [orderData]);

  const handleCopy = () => {
    const code = currentOrder?.verificationCode || '';
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast?.({ type: 'success', message: 'Verification code copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <div className="w-8 h-8 border-3 border-[#DB846E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-[#62736F] font-semibold">Generating pickup voucher...</p>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center bg-white rounded-3xl border border-[#D9D0C7] p-8 shadow-tactile">
        <h2 className="font-display text-xl font-bold text-[#242E2C] mb-2">No active voucher found</h2>
        <p className="text-xs text-[#62736F] mb-6">
          Your order voucher may have expired or not yet been created.
        </p>
        <button
          onClick={() => onNavigate('shop')}
          className="px-5 py-2.5 bg-[#DB846E] hover:bg-[#C76F59] text-white rounded-xl text-xs font-semibold transition shadow-sm"
        >
          Return to Store
        </button>
      </div>
    );
  }

  const { orderId, verificationCode, totalPrice, itemsOrdered = [], studentName } = currentOrder;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-reveal">
      
      {/* Top Controls */}
      <div className="no-print flex items-center justify-between mb-6 text-xs font-semibold">
        <button
          onClick={() => onNavigate('shop')}
          className="inline-flex items-center text-[#62736F] hover:text-[#242E2C] transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Catalog
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-white border border-[#D9D0C7] hover:border-[#62736F] rounded-xl text-[#242E2C] transition flex items-center gap-1.5 shadow-tactile"
        >
          <Printer className="w-4 h-4 text-[#62736F]" />
          <span>Print Slip</span>
        </button>
      </div>

      {/* Solid Collegiate Pickup Voucher Card */}
      <div className="receipt-container bg-white border border-[#D9D0C7] rounded-3xl shadow-tactile overflow-hidden">
        
        {/* Top Header in Slate */}
        <div className="bg-[#62736F] p-8 text-[#FAF8F5] text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
            <CheckCircle2 className="w-6 h-6 text-[#E8B5A7] stroke-[2.5]" />
          </div>
          <p className="text-[#D9D0C7] text-[11px] font-mono tracking-wider uppercase mb-1">
            Order Reserved Successfully
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-white">
            Ready for Counter Collection
          </h1>
          <p className="text-[#D9D0C7] text-xs font-mono">
            Ref: #{orderId.slice(-8)}
          </p>
        </div>

        {/* Verification Code Section */}
        <div className="p-6 sm:p-8 bg-[#FAF8F5] text-center border-b border-[#D9D0C7]">
          <p className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#62736F] mb-2">
            Pickup Collection Code
          </p>

          <div className="inline-flex items-center justify-center bg-white border-2 border-[#D9D0C7] px-8 py-4 rounded-2xl shadow-tactile my-2 select-all">
            <span className="font-mono font-bold text-4xl sm:text-5xl text-[#242E2C] tracking-widest">
              {verificationCode}
            </span>
          </div>

          <div className="mt-3 flex justify-center">
            <button
              onClick={handleCopy}
              className={`no-print text-xs font-semibold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 border shadow-tactile ${
                copied
                  ? 'bg-[#62736F] text-white border-[#62736F]'
                  : 'bg-white text-[#242E2C] hover:bg-[#FAF8F5] border-[#D9D0C7]'
              }`}
            >
              {copied ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <p className="text-xs font-normal text-[#62736F] mt-4 max-w-md mx-auto leading-relaxed">
            Present this code to the attendant at the shop counter to collect your reserved provisions and pay.
          </p>
        </div>

        {/* QR Code & Order Breakdown */}
        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-12 gap-8 items-center border-b border-[#D9D0C7]/60">
          
          {/* QR Matrix Stage */}
          <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-[#FAF8F5] rounded-2xl border border-[#D9D0C7]">
            <div className="bg-white p-2.5 rounded-xl border border-[#D9D0C7]">
              <QRCodeSVG
                value={verificationCode}
                size={130}
                level="M"
                includeMargin={false}
              />
            </div>
            <span className="text-[10px] font-mono font-medium text-[#62736F] mt-2 tracking-wider uppercase">
              Scan at counter
            </span>
          </div>

          {/* Details Column */}
          <div className="sm:col-span-8 space-y-4 text-xs">
            <div>
              <p className="text-[10px] font-mono font-medium text-[#62736F] uppercase">Name</p>
              <p className="font-sans font-bold text-[#242E2C] text-base mt-0.5">{studentName}</p>
            </div>

            <div className="border-t border-[#D9D0C7]/60 pt-3">
              <p className="text-[10px] font-mono font-medium text-[#62736F] uppercase mb-2">Items Reserved</p>
              <div className="space-y-2">
                {itemsOrdered.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-baseline font-medium">
                    <span className="text-[#242E2C]">
                      {item.quantity}× {item.itemName || item.name}
                    </span>
                    <span className="font-mono text-[#62736F]">
                      ₹{item.subtotal || item.pricePerUnit * item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#D9D0C7]/60 pt-3 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-mono font-medium text-[#62736F] uppercase block">Payable</span>
                <span className="text-[#62736F] font-semibold text-xs">Pay on collection</span>
              </div>
              <span className="font-mono font-bold text-2xl text-[#DB846E]">
                ₹{totalPrice}
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Voucher Notice */}
        <div className="p-4 bg-[#FAF8F5] text-center text-xs text-[#62736F] font-medium border-t border-[#D9D0C7]/60">
          Single-use security code. Automatically verified and completed upon counter collection.
        </div>

      </div>

      {/* Return to shop */}
      <div className="no-print mt-8 text-center">
        <button
          onClick={() => onNavigate('shop')}
          className="text-xs font-semibold text-[#62736F] hover:text-[#DB846E] transition underline underline-offset-4"
        >
          Return to Store Catalog
        </button>
      </div>

    </div>
  );
}
