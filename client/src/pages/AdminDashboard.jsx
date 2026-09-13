import React, { useState, useEffect } from 'react';
import {
  Package,
  ShoppingBag,
  QrCode,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  Check,
  Loader2,
  Eye,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function AdminDashboard({ onNavigate, showToast }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'orders' | 'verify'

  // INVENTORY STATE
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemSearch, setItemSearch] = useState('');
  
  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    price: '',
    category: 'snacks',
    stockQuantity: '',
    imageUrl: ''
  });
  const [savingItem, setSavingItem] = useState(false);

  // ORDERS STATE
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // VERIFY & COLLECT STATE
  const [verificationInput, setVerificationInput] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [approvingCode, setApprovingCode] = useState(false);
  const [verifiedOrderPreview, setVerifiedOrderPreview] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [verificationHistory, setVerificationHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('hostel_shop_verify_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      onNavigate('admin-login');
    }
  }, [isAuthenticated, authLoading, onNavigate]);

  const loadInventory = async () => {
    try {
      setLoadingItems(true);
      const data = await api.getItems();
      setItems(data);
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', message: 'Failed to load inventory: ' + err.message });
    } finally {
      setLoadingItems(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await api.getOrders(orderStatusFilter);
      // Automatically sweep stale pending orders older than 20 mins
      await api.autoExpireStalePendingOrders(data);
      const refreshedData = await api.getOrders(orderStatusFilter);
      setOrders(refreshedData);
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', message: 'Failed to load orders: ' + err.message });
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadInventory();
      loadOrders();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'orders') {
      loadOrders();
    }
  }, [orderStatusFilter, activeTab]);

  // Periodic sweeper for 20-min expirations
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadOrders();
      loadInventory();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, orderStatusFilter]);

  useEffect(() => {
    try {
      localStorage.setItem('hostel_shop_verify_history', JSON.stringify(verificationHistory));
    } catch (e) {
      console.error(e);
    }
  }, [verificationHistory]);

  const handleOpenNewItemModal = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      price: '',
      category: 'snacks',
      stockQuantity: '',
      imageUrl: ''
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      price: item.price,
      category: item.category || 'snacks',
      stockQuantity: item.stockQuantity,
      imageUrl: item.imageUrl || ''
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name || itemForm.price === '' || itemForm.stockQuantity === '') {
      showToast?.({ type: 'error', message: 'Please fill all required fields.' });
      return;
    }

    try {
      setSavingItem(true);
      if (editingItem) {
        await api.updateItem(editingItem.itemId, itemForm);
        showToast?.({ type: 'success', message: `Item "${itemForm.name}" updated!` });
      } else {
        await api.createItem(itemForm);
        showToast?.({ type: 'success', message: `Item "${itemForm.name}" added!` });
      }
      setIsItemModalOpen(false);
      loadInventory();
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', message: err.message || 'Failed to save item' });
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId, name) => {
    if (window.confirm(`Delete "${name}" from inventory?`)) {
      try {
        await api.deleteItem(itemId);
        showToast?.({ type: 'success', message: `Deleted "${name}"` });
        loadInventory();
      } catch (err) {
        showToast?.({ type: 'error', message: 'Delete failed: ' + err.message });
      }
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      showToast?.({ type: 'info', message: 'No inventory items to export.' });
      return;
    }
    const headers = ['Item ID', 'Name', 'Category', 'Price (INR)', 'Stock Quantity'];
    const rows = items.map((i) => [
      i.itemId,
      `"${i.name.replace(/"/g, '""')}"`,
      i.category || 'general',
      i.price,
      i.stockQuantity
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.({ type: 'success', message: 'CSV exported!' });
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      showToast?.({ 
        type: 'success', 
        message: newStatus === 'cancelled' 
          ? `Order #${orderId.slice(-6)} cancelled and items returned to stock` 
          : `Order #${orderId.slice(-6)} marked as ${newStatus}` 
      });
      loadOrders();
      loadInventory();
      if (selectedOrderDetails?.orderId === orderId) {
        setSelectedOrderDetails(null);
      }
    } catch (err) {
      showToast?.({ type: 'error', message: 'Status update failed: ' + err.message });
    }
  };

  const getOrderRemainingMinutes = (createdAt) => {
    const time = createdAt?.toDate ? createdAt.toDate().getTime() : new Date(createdAt).getTime();
    if (isNaN(time)) return 20;
    const elapsedMinutes = Math.floor((Date.now() - time) / (60 * 1000));
    return Math.max(0, 20 - elapsedMinutes);
  };

  const handleCheckCode = async (e) => {
    if (e) e.preventDefault();
    setVerificationError('');
    setVerificationSuccess('');
    setVerifiedOrderPreview(null);

    const clean = verificationInput.trim().toUpperCase();
    if (!clean) {
      setVerificationError('Please enter a verification code.');
      return;
    }

    try {
      setCheckingCode(true);
      const res = await api.checkVerificationCode(clean);
      setVerifiedOrderPreview(res);
    } catch (err) {
      setVerificationError(err.message || 'Verification failed. Double check code.');
    } finally {
      setCheckingCode(false);
    }
  };

  const handleApproveCollection = async () => {
    if (!verifiedOrderPreview) return;
    setVerificationError('');
    setVerificationSuccess('');

    try {
      setApprovingCode(true);
      const result = await api.verifyAndCollectOrder(verifiedOrderPreview.verificationCode);
      
      const successMsg = `Order #${result.orderId.slice(-6)} approved! Student can collect items.`;
      setVerificationSuccess(successMsg);
      showToast?.({ type: 'success', message: successMsg });

      const historyEntry = {
        code: verifiedOrderPreview.verificationCode,
        orderId: result.orderId,
        studentName: result.studentName,
        totalPrice: result.totalPrice,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setVerificationHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);

      setVerifiedOrderPreview(null);
      setVerificationInput('');
      loadOrders();
    } catch (err) {
      setVerificationError(err.message || 'Failed to approve collection.');
      showToast?.({ type: 'error', message: err.message });
    } finally {
      setApprovingCode(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500 mb-3" />
        <p className="text-xs text-slate-500 font-bold">Loading staff session...</p>
      </div>
    );
  }

  const totalInventoryValue = items.reduce((sum, item) => sum + (item.price * item.stockQuantity), 0);
  const outOfStockCount = items.filter((i) => i.stockQuantity <= 0).length;
  const lowStockCount = items.filter((i) => i.stockQuantity > 0 && i.stockQuantity <= 5).length;

  const filteredTableItems = items.filter((item) =>
    item.name?.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.category?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredOrders = orders.filter((o) =>
    o.orderId?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.studentName?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Studio Header */}
      <div className="mb-8 pb-6 border-b border-[#D9D0C7] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono font-medium text-[#62736F] uppercase tracking-wider mb-1">
            Store Operations & Inventory
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-[#242E2C]">
            Campus Store Management
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#D9D0C7] shadow-tactile">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition ${
              activeTab === 'inventory'
                ? 'bg-[#62736F] text-white shadow-sm'
                : 'text-[#62736F] hover:text-[#242E2C] hover:bg-[#D9D0C7]/30'
            }`}
          >
            Inventory ({items.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition ${
              activeTab === 'orders'
                ? 'bg-[#62736F] text-white shadow-sm'
                : 'text-[#62736F] hover:text-[#242E2C] hover:bg-[#D9D0C7]/30'
            }`}
          >
            Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition ${
              activeTab === 'verify'
                ? 'bg-[#DB846E] text-white shadow-sm'
                : 'text-[#62736F] hover:text-[#242E2C] hover:bg-[#D9D0C7]/30'
            }`}
          >
            Verify & Collect
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: INVENTORY MANAGEMENT                                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Solid Color-Blocked Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-xs">
              <p className="text-xs font-bold text-emerald-800 uppercase">Total Products</p>
              <p className="font-mono text-2xl font-black text-slate-900 mt-1">{items.length}</p>
            </div>
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 shadow-xs">
              <p className="text-xs font-bold text-orange-800 uppercase">Inventory Value</p>
              <p className="font-mono text-2xl font-black text-slate-900 mt-1">₹{totalInventoryValue}</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-xs">
              <p className="text-xs font-bold text-amber-800 uppercase">Low Stock (≤ 5)</p>
              <p className="font-mono text-2xl font-black text-amber-800 mt-1">{lowStockCount}</p>
            </div>
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 shadow-xs">
              <p className="text-xs font-bold text-rose-800 uppercase">Sold Out</p>
              <p className="font-mono text-2xl font-black text-rose-800 mt-1">{outOfStockCount}</p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#8C9B97] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search inventory items..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#D9D0C7] text-xs text-[#242E2C] font-semibold focus:border-[#62736F] focus:outline-none shadow-tactile"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 border border-[#D9D0C7] hover:border-[#62736F] rounded-xl text-xs font-semibold text-[#62736F] hover:text-[#242E2C] transition flex items-center gap-1.5 bg-white shadow-tactile"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleOpenNewItemModal}
                className="px-4 py-2.5 bg-[#DB846E] hover:bg-[#C76F59] text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-tactile active:scale-98"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add New Item</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingItems ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">
                Loading inventory items...
              </div>
            ) : filteredTableItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">
                No inventory items found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                      <th className="py-3.5 px-5">Item</th>
                      <th className="py-3.5 px-5">Category</th>
                      <th className="py-3.5 px-5">Price</th>
                      <th className="py-3.5 px-5">Stock Level</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTableItems.map((item) => (
                      <tr key={item.itemId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-5 flex items-center space-x-3">
                          <img
                            src={item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=80&auto=format&fit=crop&q=80"}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=80&auto=format&fit=crop&q=80";
                            }}
                          />
                          <span className="font-extrabold text-slate-900 text-sm">{item.name}</span>
                        </td>
                        <td className="py-3.5 px-5 capitalize font-semibold text-slate-600">
                          {item.category || "general"}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold text-sm text-slate-900">
                          ₹{item.price}
                        </td>
                        <td className="py-3.5 px-5 font-mono">
                          {item.stockQuantity <= 0 ? (
                            <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Sold Out</span>
                          ) : item.stockQuantity <= 5 ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">{item.stockQuantity} left</span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">{item.stockQuantity} in stock</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditItemModal(item)}
                            className="p-1.5 text-slate-400 hover:text-orange-600 transition rounded-lg hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.itemId, item.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-slate-100"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ORDERS MANAGEMENT                                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {['all', 'pending', 'collected', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  className={`text-xs font-bold capitalize px-3.5 py-1.5 rounded-xl border transition ${
                    orderStatusFilter === status
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student or order..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-bold focus:border-orange-500 focus:outline-none shadow-xs"
                />
              </div>

              <button
                onClick={loadOrders}
                className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 transition bg-white shadow-xs"
                title="Refresh orders"
              >
                <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingOrders ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">
                No orders found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                      <th className="py-3.5 px-5">Ref</th>
                      <th className="py-3.5 px-5">Student</th>
                      <th className="py-3.5 px-5">Items Summary</th>
                      <th className="py-3.5 px-5">Total</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-[#DB846E] text-sm">
                          #{order.orderId.slice(-6)}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-[#242E2C] text-sm">
                          {order.studentName}
                        </td>
                        <td className="py-3.5 px-5 text-[#62736F] max-w-xs truncate font-medium">
                          {order.itemsOrdered?.map((i) => `${i.quantity}× ${i.itemName || i.name}`).join(', ') || '—'}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold text-sm text-[#242E2C]">
                          ₹{order.totalPrice}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                              order.status === 'collected'
                                ? 'bg-[#E4ECE4] text-[#4F5C4F] border border-[#CAD8CA]'
                                : order.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-[#FDF4F2] text-[#DB846E] border border-[#E8B5A7]'
                            }`}>
                              {order.status}
                            </span>
                            {order.status === 'pending' && (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                getOrderRemainingMinutes(order.createdAt) <= 5
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse'
                                  : 'bg-[#FAF8F5] text-[#62736F] border-[#D9D0C7]'
                              }`}>
                                ⏳ {getOrderRemainingMinutes(order.createdAt)}m left
                              </span>
                            )}
                            {order.status === 'cancelled' && order.cancelReason && (
                              <span className="text-[10px] text-rose-600 block w-full mt-0.5 italic">
                                {order.cancelReason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="text-xs font-semibold text-[#62736F] hover:text-[#DB846E] transition underline"
                          >
                            Details
                          </button>
                          
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.orderId, 'collected')}
                                className="px-3 py-1 bg-[#62736F] hover:bg-[#4F5D59] text-white text-xs font-semibold rounded-lg transition shadow-sm"
                              >
                                Collect
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Cancel order #${order.orderId.slice(-6)} and return items to stock?`)) {
                                    handleUpdateOrderStatus(order.orderId, 'cancelled');
                                  }
                                }}
                                className="px-2.5 py-1 border border-[#D9D0C7] hover:border-rose-300 hover:bg-rose-50 text-[#62736F] hover:text-rose-700 text-xs font-semibold rounded-lg transition"
                                title="Cancel order and restock items"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: VERIFY PAYMENT / COLLECT ORDER                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'verify' && (
        <div className="max-w-xl mx-auto space-y-8">
          
          <div className="bg-white rounded-3xl border border-[#D9D0C7] p-8 shadow-tactile">
            <div className="text-center mb-6">
              <p className="text-[11px] font-mono tracking-wider uppercase text-[#62736F] mb-1">
                Counter Scan & Approve
              </p>
              <h2 className="text-2xl font-display font-bold text-[#242E2C] tracking-tight">Verify Student Pickup Code</h2>
              <p className="text-xs text-[#62736F] mt-1.5 font-normal">
                Enter the student's pickup code or scan receipt to verify and complete handoff.
              </p>
            </div>

            <form onSubmit={handleCheckCode} className="space-y-4">
              <div className="flex gap-2.5">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. K9X2M4"
                  maxLength={10}
                  value={verificationInput}
                  onChange={(e) => setVerificationInput(e.target.value.toUpperCase())}
                  className="flex-1 py-3.5 px-4 text-center font-mono font-bold text-2xl tracking-widest uppercase rounded-xl border border-[#D9D0C7] focus:border-[#62736F] focus:outline-none bg-[#FAF8F5] shadow-tactile text-[#242E2C]"
                />
                <button
                  type="submit"
                  disabled={checkingCode || !verificationInput.trim()}
                  className="px-6 py-3.5 bg-[#DB846E] hover:bg-[#C76F59] text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 shadow-tactile active:scale-98"
                >
                  {checkingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check Code'}
                </button>
              </div>
            </form>

            {verificationError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-bold">
                {verificationError}
              </div>
            )}

            {verificationSuccess && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-bold">
                {verificationSuccess}
              </div>
            )}

            {/* Verified Inspection Card */}
            {verifiedOrderPreview && (
              <div className="mt-6 p-6 rounded-2xl border border-emerald-200 bg-emerald-50 space-y-4 animate-fade-in text-xs">
                <div className="flex items-baseline justify-between pb-3 border-b border-emerald-200">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">● Order Verified</span>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {verifiedOrderPreview.order?.studentName}
                    </h3>
                  </div>
                  <span className="font-mono font-black text-white bg-emerald-600 px-3 py-1 rounded-full text-xs shadow-sm">
                    {verifiedOrderPreview.verificationCode}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Provisions</p>
                  <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 p-3">
                    {verifiedOrderPreview.order?.itemsOrdered?.map((item, idx) => (
                      <div key={idx} className="py-2 first:pt-0 last:pb-0 flex justify-between font-bold">
                        <span className="text-slate-800">
                          {item.quantity}× {item.itemName || item.name}
                        </span>
                        <span className="font-mono text-slate-900">₹{item.subtotal || item.pricePerUnit * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-emerald-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Cash Due at Counter</span>
                    <span className="text-xl font-mono font-black text-orange-600">₹{verifiedOrderPreview.order?.totalPrice}</span>
                  </div>

                  <button
                    onClick={handleApproveCollection}
                    disabled={approvingCode}
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-60 shadow-sm"
                  >
                    {approvingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Approve Collection</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* History of verified codes */}
          {verificationHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                Verified Today
              </h3>
              <div className="divide-y divide-slate-100 text-xs font-bold">
                {verificationHistory.map((h, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-orange-600 font-bold text-sm">{h.code}</span>
                      <span className="text-slate-900">{h.studentName}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-mono text-slate-900">₹{h.totalPrice}</span>
                      <span className="text-slate-400 text-[11px]">{h.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL: ADD / EDIT ITEM */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? "Edit Inventory Item" : "Add New Item"}
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#62736F] mb-1">
              Item Name <span className="text-[#DB846E]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maggi Noodles"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D9D0C7] bg-[#FAF8F5] focus:bg-white focus:border-[#62736F] focus:outline-none font-semibold text-[#242E2C] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#62736F] mb-1">
                Price (₹) <span className="text-[#DB846E]">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="50"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9D0C7] bg-[#FAF8F5] focus:bg-white focus:border-[#62736F] focus:outline-none font-mono font-bold text-[#242E2C] transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#62736F] mb-1">
                Stock Quantity <span className="text-[#DB846E]">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="25"
                value={itemForm.stockQuantity}
                onChange={(e) => setItemForm({ ...itemForm, stockQuantity: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9D0C7] bg-[#FAF8F5] focus:bg-white focus:border-[#62736F] focus:outline-none font-mono font-bold text-[#242E2C] transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#62736F] mb-1">
              Category
            </label>
            <select
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D9D0C7] bg-[#FAF8F5] focus:bg-white focus:border-[#62736F] focus:outline-none font-semibold text-[#242E2C] capitalize transition"
            >
              <option value="snacks">Snacks</option>
              <option value="beverages">Beverages</option>
              <option value="stationery">Stationery</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#62736F] mb-1">
              Image URL <span className="text-[#8C9B97] font-normal">(Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={itemForm.imageUrl}
              onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D9D0C7] bg-[#FAF8F5] focus:bg-white focus:border-[#62736F] focus:outline-none text-[#242E2C] transition"
            />
          </div>

          <div className="pt-4 border-t border-[#D9D0C7]/60 flex justify-end items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="px-4 py-2.5 text-[#62736F] font-semibold hover:text-[#242E2C] hover:bg-[#D9D0C7]/30 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingItem}
              className="px-5 py-2.5 bg-[#DB846E] hover:bg-[#C76F59] text-white font-semibold rounded-xl transition shadow-tactile active:scale-95 disabled:opacity-60"
            >
              {savingItem ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW ORDER DETAILS */}
      {selectedOrderDetails && (
        <Modal
          isOpen={Boolean(selectedOrderDetails)}
          onClose={() => setSelectedOrderDetails(null)}
          title={`Order #${selectedOrderDetails.orderId.slice(-8)}`}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-[#FAF8F5] p-4 rounded-xl space-y-1 border border-[#D9D0C7]">
              <div className="flex justify-between">
                <span className="text-[#62736F] font-semibold">Student:</span>
                <span className="font-bold text-[#242E2C] text-sm">{selectedOrderDetails.studentName}</span>
              </div>
              {selectedOrderDetails.studentEmail && (
                <div className="flex justify-between">
                  <span className="text-[#62736F] font-semibold">Email:</span>
                  <span className="text-[#242E2C] font-medium">{selectedOrderDetails.studentEmail}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#62736F] font-semibold">Status:</span>
                <span className="font-bold capitalize text-[#DB846E]">{selectedOrderDetails.status}</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-mono font-medium text-[#62736F] uppercase mb-2">Items Ordered</p>
              <div className="divide-y divide-[#D9D0C7]/40 border border-[#D9D0C7] rounded-xl p-3 bg-white">
                {selectedOrderDetails.itemsOrdered?.map((item, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0 flex justify-between font-medium">
                    <span className="text-[#242E2C]">{item.quantity}× {item.itemName || item.name}</span>
                    <span className="font-mono font-bold text-[#62736F]">₹{item.subtotal || item.pricePerUnit * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-baseline text-base font-bold pt-2 border-t border-[#D9D0C7]/60">
              <span className="text-[#242E2C]">Total Amount:</span>
              <span className="font-mono font-bold text-xl text-[#DB846E]">₹{selectedOrderDetails.totalPrice}</span>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-[#D9D0C7]/60">
              {selectedOrderDetails.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm(`Cancel order #${selectedOrderDetails.orderId.slice(-6)} and return items to inventory?`)) {
                        handleUpdateOrderStatus(selectedOrderDetails.orderId, 'cancelled');
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel Order & Restock
                  </button>
                  <button
                    onClick={() => handleUpdateOrderStatus(selectedOrderDetails.orderId, 'collected')}
                    className="px-4 py-2 bg-[#62736F] hover:bg-[#4F5D59] text-white rounded-xl text-xs font-semibold transition shadow-sm"
                  >
                    Mark as Collected
                  </button>
                </div>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 border border-[#D9D0C7] rounded-xl text-[#242E2C] text-xs font-semibold hover:bg-[#FAF8F5] transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
