import React, { useState, useEffect } from 'react';
import { X, RefreshCw, QrCode, CheckCircle2, Clock, Package, Copy, Check, AlertCircle, Ban, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { api } from '../services/api';

export default function StudentOrdersModal({ isOpen, onClose, showToast }) {
  const { currentStudent } = useStudentAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [expandedQr, setExpandedQr] = useState(null); // orderId
  const [now, setNow] = useState(Date.now());
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  // Tick clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = async () => {
    if (!currentStudent?.username) return;
    try {
      setLoading(true);
      const data = await api.getStudentOrders(currentStudent.username);
      // Automatically sweep any stale orders older than 20 mins
      await api.autoExpireStalePendingOrders(data);
      const refreshedData = await api.getStudentOrders(currentStudent.username);
      setOrders(refreshedData);
    } catch (err) {
      console.error('Failed to load student orders:', err);
      showToast?.({ type: 'error', message: 'Could not fetch your orders: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentStudent?.username) {
      fetchOrders();
    }
  }, [isOpen, currentStudent]);

  const handleCancelOrder = async (orderId, cancelledBy = 'student', reason = 'Cancelled by student') => {
    try {
      setCancellingId(orderId);
      await api.cancelOrder(orderId, cancelledBy, reason);
      showToast?.({ 
        type: 'success', 
        message: cancelledBy === 'system_timeout' 
          ? 'Order expired after 20 minutes. Reserved items returned to store.' 
          : 'Order cancelled. Reserved items returned to store catalog.' 
      });
      await fetchOrders();
    } catch (err) {
      showToast?.({ type: 'error', message: 'Failed to cancel order: ' + err.message });
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    showToast?.({ type: 'success', message: `Copied code ${code} to clipboard!` });
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const pastOrders = orders.filter((o) => o.status !== 'pending');

  const getRemainingSeconds = (createdAt) => {
    const time = createdAt?.toDate ? createdAt.toDate().getTime() : new Date(createdAt).getTime();
    if (isNaN(time)) return 20 * 60;
    const elapsed = Math.floor((now - time) / 1000);
    return Math.max(0, 20 * 60 - elapsed);
  };

  const formatCountdown = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#D9D0C7] shadow-tactile-hover relative animate-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[#D9D0C7] flex items-center justify-between bg-[#FAF8F5]/80 rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#242E2C]">
                My Pickup Codes & Orders
              </h3>
              {pendingOrders.length > 0 && (
                <span className="bg-[#DB846E] text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {pendingOrders.length} Active
                </span>
              )}
            </div>
            <p className="text-xs text-[#62736F] mt-0.5">
              Logged in as <strong className="text-[#242E2C]">@{currentStudent?.username}</strong> ({currentStudent?.displayName})
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchOrders}
              disabled={loading}
              title="Refresh orders"
              className="p-2 rounded-xl border border-[#D9D0C7] bg-white text-[#62736F] hover:text-[#242E2C] hover:bg-[#FAF8F5] transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-[#D9D0C7] bg-white text-[#62736F] hover:text-[#242E2C] hover:bg-[#FAF8F5] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-[#62736F]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#DB846E]" />
              <p className="text-xs font-semibold">Retrieving your pickup codes from cloud...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-[#FAF8F5] border border-[#D9D0C7] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Package className="w-7 h-7 text-[#62736F]" />
              </div>
              <h4 className="font-display font-bold text-lg text-[#242E2C]">No orders placed yet</h4>
              <p className="text-xs text-[#62736F] mt-1 max-w-sm mx-auto">
                Add provisions from the campus shop catalog to your bag, place an order, and your single-use counter pickup code will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Active Pending Pickups Section */}
              {pendingOrders.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#62736F] font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#DB846E]" /> Active Pickup Codes (Pay & Collect at Counter)
                  </h4>
                  
                  {pendingOrders.map((order) => {
                    const remainingSecs = getRemainingSeconds(order.createdAt);
                    const isUrgent = remainingSecs < 300; // under 5 mins

                    // If timer expired, trigger auto-expiration
                    if (remainingSecs === 0 && !cancellingId) {
                      handleCancelOrder(order.orderId, 'system_timeout', 'Pickup window expired (20 minutes)');
                    }

                    return (
                      <div 
                        key={order.orderId}
                        className="p-5 rounded-2xl border-2 border-[#DB846E]/40 bg-[#FAF8F5] shadow-tactile transition hover:border-[#DB846E]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Pickup Code Voucher Block */}
                          <div>
                            <span className="text-[10px] font-mono tracking-widest uppercase text-[#62736F] font-bold block mb-1">
                              Counter Pickup Code
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-2xl sm:text-3xl font-black text-[#242E2C] tracking-widest bg-white px-3 py-1 rounded-xl border border-[#D9D0C7] shadow-xs select-all">
                                {order.verificationCode || 'PENDING'}
                              </span>
                              <button
                                onClick={() => handleCopy(order.verificationCode)}
                                className="p-2 rounded-xl bg-white border border-[#D9D0C7] hover:border-[#62736F] text-[#62736F] hover:text-[#242E2C] transition"
                                title="Copy code"
                              >
                                {copiedCode === order.verificationCode ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setExpandedQr(expandedQr === order.orderId ? null : order.orderId)}
                                className={`p-2 rounded-xl border transition ${
                                  expandedQr === order.orderId
                                    ? 'bg-[#DB846E] text-white border-[#DB846E]'
                                    : 'bg-white border-[#D9D0C7] text-[#62736F] hover:text-[#242E2C]'
                                }`}
                                title="Show QR Code for staff scanner"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                            </div>

                            {/* 20-Minute Countdown Timer */}
                            <div className="mt-2.5 flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                                isUrgent 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                                  : 'bg-[#E8B5A7]/30 text-[#DB846E] border-[#E8B5A7]'
                              }`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Expires in {formatCountdown(remainingSecs)}</span>
                              </span>
                              <span className="text-[10px] text-[#62736F]">
                                (Uncollected orders cancel at 20 min)
                              </span>
                            </div>
                          </div>

                          {/* Order Summary Block & Actions */}
                          <div className="text-left sm:text-right flex flex-col sm:items-end justify-between space-y-2">
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E8B5A7]/30 text-[#DB846E] border border-[#E8B5A7]">
                                <span className="w-2 h-2 rounded-full bg-[#DB846E] animate-pulse" />
                                Ready for Counter Pickup
                              </span>
                              <div className="mt-1 font-mono font-bold text-xl text-[#242E2C]">
                                ₹{order.totalPrice}{' '}
                                <span className="text-xs font-normal text-[#62736F]">Cash Due</span>
                              </div>
                            </div>

                            {/* Cancel Order Action */}
                            <div className="pt-1">
                              {confirmCancelId === order.orderId ? (
                                <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-rose-200 shadow-xs">
                                  <span className="text-[11px] text-rose-700 font-semibold px-1">Cancel & release items?</span>
                                  <button
                                    onClick={() => handleCancelOrder(order.orderId, 'student')}
                                    disabled={cancellingId === order.orderId}
                                    className="px-2 py-1 bg-[#DB846E] hover:bg-[#C76F59] text-white text-[11px] font-bold rounded-lg transition disabled:opacity-50"
                                  >
                                    {cancellingId === order.orderId ? 'Cancelling...' : 'Yes, Cancel'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmCancelId(null)}
                                    className="px-2 py-1 bg-[#FAF8F5] border border-[#D9D0C7] text-[#62736F] hover:text-[#242E2C] text-[11px] font-semibold rounded-lg transition"
                                  >
                                    Keep
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmCancelId(order.orderId)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D9D0C7] hover:border-rose-300 hover:bg-rose-50 text-[#62736F] hover:text-rose-700 text-xs font-semibold transition bg-white"
                                  title="Cancel this order and release items back to store"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Cancel Order</span>
                                </button>
                              )}
                            </div>

                          </div>

                        </div>

                        {/* Expandable QR Code */}
                        {expandedQr === order.orderId && order.verificationCode && (
                          <div className="mt-4 pt-4 border-t border-[#D9D0C7] flex flex-col items-center bg-white p-4 rounded-xl">
                            <QRCodeSVG value={order.verificationCode} size={130} level="M" />
                            <p className="text-[11px] text-[#62736F] font-mono mt-2 text-center">
                              Show this QR code or code <strong>{order.verificationCode}</strong> to the counter staff
                            </p>
                          </div>
                        )}

                        {/* Items List */}
                        <div className="mt-4 pt-3 border-t border-[#D9D0C7]/70 flex flex-wrap gap-2">
                          {order.itemsOrdered?.map((it, idx) => (
                            <span 
                              key={idx}
                              className="text-xs bg-white px-2.5 py-1 rounded-lg border border-[#D9D0C7] text-[#242E2C] font-medium"
                            >
                              {it.itemName} <strong className="text-[#62736F]">×{it.quantity}</strong> (₹{it.subtotal})
                            </span>
                          ))}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* Past / Collected / Cancelled Orders */}
              {pastOrders.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#62736F] font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Order History
                  </h4>

                  {pastOrders.map((order) => {
                    const isCancelled = order.status === 'cancelled';

                    return (
                      <div 
                        key={order.orderId}
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isCancelled ? 'border-[#D9D0C7]/80 bg-[#FAF8F5]/30 opacity-75' : 'border-[#D9D0C7] bg-[#FAF8F5]/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2 font-semibold text-[#242E2C]">
                            <span className="font-mono text-sm text-[#62736F] line-through">{order.verificationCode}</span>
                            {isCancelled ? (
                              <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">
                                Cancelled
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                                Collected
                              </span>
                            )}
                          </div>
                          <p className="text-[#62736F] text-[11px] mt-1">
                            {order.itemsOrdered?.map(i => `${i.itemName} (×${i.quantity})`).join(', ')}
                          </p>
                          {isCancelled && order.cancelReason && (
                            <p className="text-[10px] text-rose-600 italic mt-0.5">
                              {order.cancelReason}
                            </p>
                          )}
                        </div>
                        <div className="text-left sm:text-right">
                          <span className={`font-bold ${isCancelled ? 'text-[#62736F] line-through' : 'text-[#242E2C]'}`}>
                            ₹{order.totalPrice}
                          </span>
                          <p className="text-[11px] text-[#62736F]">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#D9D0C7] bg-[#FAF8F5]/80 rounded-b-3xl text-center text-xs text-[#62736F]">
          Pay cash directly at the shop counter when claiming your items.
        </div>
      </div>
    </div>
  );
}
