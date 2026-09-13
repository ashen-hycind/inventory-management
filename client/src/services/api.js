/**
 * Unified API & Data Access Layer
 * Supports:
 *   1. Cloud Functions REST API (when VITE_API_BASE_URL is configured)
 *   2. Direct Firestore SDK with atomic transactions (Spark-plan zero-cost mode)
 *   3. Demo/Local Fallback (if Firebase keys not yet configured)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { generateVerificationCode } from "./codeGenerator";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Default demo items in case Firestore is empty or not yet configured
export const INITIAL_DEMO_ITEMS = [
  {
    itemId: "demo-1",
    name: "Maggi Noodles",
    price: 50,
    category: "snacks",
    stockQuantity: 25,
    imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60"
  },
  {
    itemId: "demo-2",
    name: "Chai Tea Powder",
    price: 30,
    category: "beverages",
    stockQuantity: 40,
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=60"
  },
  {
    itemId: "demo-3",
    name: "Biscuits",
    price: 20,
    category: "snacks",
    stockQuantity: 50,
    imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=60"
  },
  {
    itemId: "demo-4",
    name: "Notebook",
    price: 80,
    category: "stationery",
    stockQuantity: 15,
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=60"
  },
  {
    itemId: "demo-5",
    name: "Pen Set",
    price: 40,
    category: "stationery",
    stockQuantity: 30,
    imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=60"
  },
  {
    itemId: "demo-6",
    name: "Juice",
    price: 60,
    category: "beverages",
    stockQuantity: 20,
    imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&auto=format&fit=crop&q=60"
  },
  {
    itemId: "demo-7",
    name: "Chips",
    price: 20,
    category: "snacks",
    stockQuantity: 35,
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=60"
  },
  {
    itemId: "demo-8",
    name: "Coffee",
    price: 50,
    category: "beverages",
    stockQuantity: 18,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=60"
  }
];

// Helper to check if using REST API
const useRestApi = Boolean(API_BASE_URL);

export const api = {
  // -------------------------------------------------------------
  // ITEMS
  // -------------------------------------------------------------
  async getItems() {
    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/items`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to fetch items");
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem("hostel_shop_mock_items");
      if (stored) return JSON.parse(stored);
      localStorage.setItem("hostel_shop_mock_items", JSON.stringify(INITIAL_DEMO_ITEMS));
      return INITIAL_DEMO_ITEMS;
    }

    try {
      const colRef = collection(db, "items");
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => ({ itemId: d.id, ...d.data() }));
    } catch (err) {
      console.warn("Firestore read failed, falling back to local storage items:", err);
      const stored = localStorage.getItem("hostel_shop_mock_items");
      if (stored) return JSON.parse(stored);
      return INITIAL_DEMO_ITEMS;
    }
  },

  async createItem(itemData) {
    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const items = await this.getItems();
      const newItem = {
        itemId: `item-${Date.now()}`,
        ...itemData,
        price: Number(itemData.price),
        stockQuantity: Number(itemData.stockQuantity),
        createdAt: new Date().toISOString()
      };
      items.unshift(newItem);
      localStorage.setItem("hostel_shop_mock_items", JSON.stringify(items));
      return newItem;
    }

    const payload = {
      name: itemData.name.trim(),
      price: Number(itemData.price),
      category: itemData.category.toLowerCase().trim(),
      stockQuantity: Number(itemData.stockQuantity),
      imageUrl: itemData.imageUrl || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "items"), payload);
    return { itemId: docRef.id, ...payload };
  },

  async updateItem(itemId, itemData) {
    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const items = await this.getItems();
      const idx = items.findIndex((i) => i.itemId === itemId);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...itemData, updatedAt: new Date().toISOString() };
        localStorage.setItem("hostel_shop_mock_items", JSON.stringify(items));
        return items[idx];
      }
      throw new Error("Item not found");
    }

    const itemRef = doc(db, "items", itemId);
    const updates = {
      ...itemData,
      price: Number(itemData.price),
      stockQuantity: Number(itemData.stockQuantity),
      updatedAt: serverTimestamp()
    };
    await updateDoc(itemRef, updates);
    return { itemId, ...updates };
  },

  async deleteItem(itemId) {
    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/items/${itemId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return true;
    }

    if (!isFirebaseConfigured) {
      const items = await this.getItems();
      const filtered = items.filter((i) => i.itemId !== itemId);
      localStorage.setItem("hostel_shop_mock_items", JSON.stringify(filtered));
      return true;
    }

    await deleteDoc(doc(db, "items", itemId));
    return true;
  },

  // -------------------------------------------------------------
  // ORDERS
  // -------------------------------------------------------------
  async createOrder({ studentName, studentUsername = "", studentEmail = "", itemsOrdered }) {
    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, studentUsername, studentEmail, itemsOrdered })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    const verificationCode = generateVerificationCode(7);

    if (!isFirebaseConfigured) {
      // Mock order creation with stock adjustment
      const items = await this.getItems();
      let totalPrice = 0;
      const orderItems = [];

      for (const reqItem of itemsOrdered) {
        const product = items.find((i) => i.itemId === reqItem.itemId);
        if (!product) throw new Error(`Product not found: ${reqItem.itemId}`);
        if (product.stockQuantity < reqItem.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        product.stockQuantity -= reqItem.quantity;
        const subtotal = product.price * reqItem.quantity;
        totalPrice += subtotal;
        orderItems.push({
          itemId: product.itemId,
          itemName: product.name,
          quantity: reqItem.quantity,
          pricePerUnit: product.price,
          subtotal
        });
      }

      localStorage.setItem("hostel_shop_mock_items", JSON.stringify(items));

      const orderId = `ord-${Date.now()}`;
      const newOrder = {
        orderId,
        studentName: studentName.trim(),
        studentUsername: (studentUsername || "").trim().toLowerCase(),
        studentEmail: studentEmail || "",
        itemsOrdered: orderItems,
        totalPrice,
        status: "pending",
        verificationCode,
        createdAt: new Date().toISOString(),
        collectedAt: null
      };

      const orders = JSON.parse(localStorage.getItem("hostel_shop_mock_orders") || "[]");
      orders.unshift(newOrder);
      localStorage.setItem("hostel_shop_mock_orders", JSON.stringify(orders));

      const codes = JSON.parse(localStorage.getItem("hostel_shop_mock_codes") || "[]");
      codes.push({
        codeId: `code-${Date.now()}`,
        orderId,
        verificationCode,
        isUsed: false,
        usedAt: null
      });
      localStorage.setItem("hostel_shop_mock_codes", JSON.stringify(codes));

      return {
        orderId,
        verificationCode,
        totalPrice,
        itemsOrdered: orderItems,
        qrCode: verificationCode
      };
    }

    // Direct Firestore atomic transaction
    return await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST: Read all item documents
      const itemSnapshots = [];
      for (const item of itemsOrdered) {
        const itemRef = doc(db, "items", item.itemId);
        const itemSnap = await transaction.get(itemRef);
        itemSnapshots.push({ item, itemRef, itemSnap });
      }

      // 2. VALIDATION & PREPARATION
      let totalPrice = 0;
      const verifiedItems = [];
      const stockUpdates = [];

      for (const { item, itemRef, itemSnap } of itemSnapshots) {
        if (!itemSnap.exists()) {
          throw new Error(`Item ${item.itemId} not found in inventory.`);
        }

        const itemData = itemSnap.data();
        const quantity = Number(item.quantity);

        if (quantity <= 0) {
          throw new Error(`Invalid quantity for "${itemData.name}".`);
        }

        if (itemData.stockQuantity < quantity) {
          throw new Error(`Insufficient stock for "${itemData.name}". Available: ${itemData.stockQuantity}`);
        }

        const subtotal = itemData.price * quantity;
        totalPrice += subtotal;
        verifiedItems.push({
          itemId: item.itemId,
          itemName: itemData.name,
          quantity,
          pricePerUnit: itemData.price,
          subtotal
        });

        stockUpdates.push({
          itemRef,
          newStock: itemData.stockQuantity - quantity
        });
      }

      // 3. ALL WRITES AFTER: Deduct inventory stock
      for (const update of stockUpdates) {
        transaction.update(update.itemRef, {
          stockQuantity: update.newStock,
          updatedAt: serverTimestamp()
        });
      }

      // 4. Order record (stores verificationCode and studentUsername for student recovery)
      const orderRef = doc(collection(db, "orders"));
      const orderPayload = {
        studentName: studentName.trim(),
        studentUsername: (studentUsername || "").trim().toLowerCase(),
        studentEmail: studentEmail ? studentEmail.trim() : "",
        itemsOrdered: verifiedItems,
        totalPrice,
        status: "pending",
        verificationCode,
        createdAt: serverTimestamp(),
        collectedAt: null
      };
      transaction.set(orderRef, orderPayload);

      // 5. Verification code record
      const codeRef = doc(collection(db, "verificationCodes"));
      transaction.set(codeRef, {
        orderId: orderRef.id,
        verificationCode,
        isUsed: false,
        usedAt: null,
        createdAt: serverTimestamp()
      });

      return {
        orderId: orderRef.id,
        verificationCode,
        totalPrice,
        itemsOrdered: verifiedItems,
        qrCode: verificationCode
      };
    });
  },

  async getOrders(statusFilter = "all") {
    if (useRestApi) {
      const url = statusFilter && statusFilter !== "all"
        ? `${API_BASE_URL}/orders?status=${statusFilter}`
        : `${API_BASE_URL}/orders`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const orders = JSON.parse(localStorage.getItem("hostel_shop_mock_orders") || "[]");
      if (statusFilter && statusFilter !== "all") {
        return orders.filter((o) => o.status === statusFilter);
      }
      return orders;
    }

    try {
      let q = collection(db, "orders");
      const snap = await getDocs(q);
      const orders = snap.docs.map((d) => ({ orderId: d.id, ...d.data() }));

      // Sort client-side by createdAt descending
      orders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      if (statusFilter && statusFilter !== "all") {
        return orders.filter((o) => o.status === statusFilter);
      }
      return orders;
    } catch (err) {
      console.warn("Firestore getOrders error:", err);
      return [];
    }
  },

  async getOrder(orderId) {
    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const orders = JSON.parse(localStorage.getItem("hostel_shop_mock_orders") || "[]");
      const found = orders.find((o) => o.orderId === orderId);
      if (!found) throw new Error("Order not found");
      return found;
    }

    const orderSnap = await getDoc(doc(db, "orders", orderId));
    if (!orderSnap.exists()) throw new Error("Order not found");

    // Fetch code for this order
    const codeQuery = query(collection(db, "verificationCodes"), where("orderId", "==", orderId));
    const codeSnap = await getDocs(codeQuery);
    let verificationCode = null;
    let isCodeUsed = false;
    if (!codeSnap.empty) {
      const cd = codeSnap.docs[0].data();
      verificationCode = cd.verificationCode;
      isCodeUsed = cd.isUsed;
    }

    return {
      orderId: orderSnap.id,
      ...orderSnap.data(),
      verificationCode,
      isCodeUsed
    };
  },

  async cancelOrder(orderId, cancelledBy = "student", reason = "") {
    if (!orderId) throw new Error("Order ID is required");

    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelledBy, reason })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const orders = JSON.parse(localStorage.getItem("hostel_shop_mock_orders") || "[]");
      const idx = orders.findIndex((o) => o.orderId === orderId);
      if (idx === -1) throw new Error("Order not found");
      const order = orders[idx];
      if (order.status !== "pending") {
        throw new Error(`Cannot cancel an order with status "${order.status}".`);
      }
      order.status = "cancelled";
      order.cancelledBy = cancelledBy;
      order.cancelReason = reason || (cancelledBy === "student" ? "Cancelled by student" : cancelledBy === "system_timeout" ? "20-minute pickup window expired" : "Cancelled by shop staff");
      order.cancelledAt = new Date().toISOString();
      localStorage.setItem("hostel_shop_mock_orders", JSON.stringify(orders));

      // Restore mock inventory
      const items = JSON.parse(localStorage.getItem("hostel_shop_mock_items") || "[]");
      for (const ordItem of (order.itemsOrdered || [])) {
        const itm = items.find((i) => i.itemId === ordItem.itemId);
        if (itm) itm.stockQuantity = (itm.stockQuantity || 0) + (ordItem.quantity || 0);
      }
      localStorage.setItem("hostel_shop_mock_items", JSON.stringify(items));
      return order;
    }

    // Direct Firestore atomic transaction to restore stock and cancel
    return await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error("Order not found");

      const orderData = orderSnap.data();
      if (orderData.status !== "pending") {
        throw new Error(`Order cannot be cancelled because it is already "${orderData.status}".`);
      }

      const itemsOrdered = orderData.itemsOrdered || [];
      const itemSnapshots = [];
      for (const item of itemsOrdered) {
        if (item.itemId) {
          const itemRef = doc(db, "items", item.itemId);
          const itemSnap = await transaction.get(itemRef);
          itemSnapshots.push({ item, itemRef, itemSnap });
        }
      }

      // 2. ALL WRITES AFTER
      // Restore inventory stock
      for (const { item, itemRef, itemSnap } of itemSnapshots) {
        if (itemSnap.exists()) {
          const currentStock = itemSnap.data().stockQuantity || 0;
          transaction.update(itemRef, {
            stockQuantity: currentStock + Number(item.quantity || 0),
            updatedAt: serverTimestamp()
          });
        }
      }

      // Mark order cancelled
      const cancelData = {
        status: "cancelled",
        cancelledBy,
        cancelReason: reason || (cancelledBy === "student" ? "Cancelled by student" : cancelledBy === "system_timeout" ? "20-minute pickup window expired" : "Cancelled by shop staff"),
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      transaction.update(orderRef, cancelData);

      return { orderId, ...orderData, ...cancelData };
    });
  },

  async autoExpireStalePendingOrders(orders = []) {
    const now = Date.now();
    const twentyMinutesMs = 20 * 60 * 1000;
    const expiredOrders = (orders || []).filter((order) => {
      if (order.status !== "pending") return false;
      const orderTime = order.createdAt?.toDate ? order.createdAt.toDate().getTime() : (new Date(order.createdAt).getTime());
      return !isNaN(orderTime) && (now - orderTime > twentyMinutesMs);
    });

    for (const expOrder of expiredOrders) {
      try {
        await this.cancelOrder(expOrder.orderId, "system_timeout", "20-minute pickup window expired");
      } catch (e) {
        console.warn(`Could not auto-expire order ${expOrder.orderId}:`, e.message);
      }
    }
    return expiredOrders.length;
  },

  async updateOrderStatus(orderId, status) {
    if (status === "cancelled") {
      return await this.cancelOrder(orderId, "admin", "Cancelled by shop staff");
    }

    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const orders = JSON.parse(localStorage.getItem("hostel_shop_mock_orders") || "[]");
      const idx = orders.findIndex((o) => o.orderId === orderId);
      if (idx !== -1) {
        orders[idx].status = status;
        if (status === "collected") orders[idx].collectedAt = new Date().toISOString();
        localStorage.setItem("hostel_shop_mock_orders", JSON.stringify(orders));
        return orders[idx];
      }
      throw new Error("Order not found");
    }

    const orderRef = doc(db, "orders", orderId);
    const updates = {
      status,
      updatedAt: serverTimestamp(),
      ...(status === "collected" ? { collectedAt: serverTimestamp() } : {})
    };
    await updateDoc(orderRef, updates);
    return { orderId, ...updates };
  },

  // -------------------------------------------------------------
  // VERIFICATION
  // -------------------------------------------------------------
  async checkVerificationCode(code) {
    const cleanCode = String(code).toUpperCase().trim();

    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/verification/check/${cleanCode}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const codes = JSON.parse(localStorage.getItem("hostel_shop_mock_codes") || "[]");
      const entry = codes.find((c) => c.verificationCode === cleanCode);
      if (!entry) throw new Error("Invalid code");
      if (entry.isUsed) throw new Error("This code has already been used. Order may already be collected.");

      const orders = JSON.parse(localStorage.getItem("hostel_shop_mock_orders") || "[]");
      const order = orders.find((o) => o.orderId === entry.orderId);
      if (!order) throw new Error("Associated order not found");

      if (order.status === "cancelled") {
        throw new Error(`This order was cancelled (${order.cancelReason || 'Order voided'}). Items were returned to inventory.`);
      }

      return {
        codeId: entry.codeId,
        verificationCode: entry.verificationCode,
        isUsed: false,
        order
      };
    }

    const q = query(collection(db, "verificationCodes"), where("verificationCode", "==", cleanCode));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Invalid code");

    const codeDoc = snap.docs[0];
    const codeData = codeDoc.data();

    if (codeData.isUsed) {
      throw new Error("This code has already been used. Order may already be collected.");
    }

    const orderSnap = await getDoc(doc(db, "orders", codeData.orderId));
    if (!orderSnap.exists()) throw new Error("Associated order not found");

    const orderData = orderSnap.data();
    if (orderData.status === "cancelled") {
      throw new Error(`This order was cancelled (${orderData.cancelReason || 'Order voided'}). Items were returned to inventory.`);
    }

    // Check 20-minute expiration
    const orderTime = orderData.createdAt?.toDate ? orderData.createdAt.toDate().getTime() : (new Date(orderData.createdAt).getTime());
    if (orderData.status === "pending" && !isNaN(orderTime) && (Date.now() - orderTime > 20 * 60 * 1000)) {
      await this.cancelOrder(orderSnap.id, "system_timeout", "20-minute pickup window expired");
      throw new Error("This order exceeded the 20-minute pickup window and has been automatically cancelled. Items returned to inventory.");
    }

    return {
      codeId: codeDoc.id,
      verificationCode: codeData.verificationCode,
      isUsed: false,
      order: { orderId: orderSnap.id, ...orderData }
    };
  },

  async verifyAndCollectOrder(code) {
    const cleanCode = String(code).toUpperCase().trim();

    if (useRestApi) {
      const res = await fetch(`${API_BASE_URL}/verification/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: cleanCode })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    }

    if (!isFirebaseConfigured) {
      const codes = JSON.parse(localStorage.getItem("hostel_shop_mock_codes") || "[]");
      const entry = codes.find((c) => c.verificationCode === cleanCode);
      if (!entry) throw new Error("Invalid code");
      if (entry.isUsed) throw new Error("This code has already been used");

      entry.isUsed = true;
      entry.usedAt = new Date().toISOString();
      localStorage.setItem("hostel_shop_mock_codes", JSON.stringify(codes));

      const orders = JSON.parse(localStorage.getItem("hostel_shop_mock_orders") || "[]");
      const order = orders.find((o) => o.orderId === entry.orderId);
      if (!order) throw new Error("Order not found");

      order.status = "collected";
      order.collectedAt = new Date().toISOString();
      localStorage.setItem("hostel_shop_mock_orders", JSON.stringify(orders));

      return {
        orderId: order.orderId,
        studentName: order.studentName,
        itemsOrdered: order.itemsOrdered,
        totalPrice: order.totalPrice,
        collectedAt: order.collectedAt
      };
    }

    // Fetch code reference before running atomic transaction
    const codeQuery = query(collection(db, "verificationCodes"), where("verificationCode", "==", cleanCode));
    const codeSnap = await getDocs(codeQuery);

    if (codeSnap.empty) {
      throw new Error("Invalid code");
    }

    const codeDocSnap = codeSnap.docs[0];
    const codeRef = doc(db, "verificationCodes", codeDocSnap.id);

    // Direct Firestore atomic transaction
    return await runTransaction(db, async (transaction) => {
      const codeDoc = await transaction.get(codeRef);
      if (!codeDoc.exists()) throw new Error("Code not found");
      const codeData = codeDoc.data();

      if (codeData.isUsed) {
        throw new Error("This code has already been used");
      }

      const orderRef = doc(db, "orders", codeData.orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists()) {
        throw new Error("Order not found");
      }

      const orderData = orderDoc.data();

      transaction.update(codeRef, {
        isUsed: true,
        usedAt: serverTimestamp()
      });

      transaction.update(orderRef, {
        status: "collected",
        collectedAt: serverTimestamp()
      });

      return {
        orderId: orderDoc.id,
        studentName: orderData.studentName,
        itemsOrdered: orderData.itemsOrdered,
        totalPrice: orderData.totalPrice,
        collectedAt: new Date().toISOString()
      };
    });
  },

  // -------------------------------------------------------------
  // STUDENT ACCOUNTS & RETRIEVAL
  // -------------------------------------------------------------
  async checkUsernameAvailability(username) {
    const cleanUser = (username || "").trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      return { available: false, reason: "too-short", message: "Username must be at least 3 characters" };
    }

    if (!isFirebaseConfigured) {
      const accounts = JSON.parse(localStorage.getItem("hostel_shop_student_accounts") || "{}");
      const exists = Boolean(accounts[cleanUser]);
      return {
        available: !exists,
        reason: exists ? "taken" : "available",
        message: exists ? "Username already taken" : "Username is available"
      };
    }

    try {
      const studentRef = doc(db, "studentAccounts", cleanUser);
      const snap = await getDoc(studentRef);
      const exists = snap.exists();
      return {
        available: !exists,
        reason: exists ? "taken" : "available",
        message: exists ? "Username already taken" : "Username is available"
      };
    } catch (err) {
      console.error("Error checking username availability:", err);
      return { available: true, reason: "available", message: "Username is available" };
    }
  },

  async registerStudent({ username, displayName, password }) {
    const cleanUser = (username || "").trim().toLowerCase();
    const cleanName = (displayName || "").trim();
    const cleanPass = (password || "").trim();

    if (!cleanUser || !cleanPass || !cleanName) {
      throw new Error("Full name, username, and password are required.");
    }
    if (cleanUser.length < 3) {
      throw new Error("Username must be at least 3 characters long.");
    }
    if (cleanPass.length < 4) {
      throw new Error("Password must be at least 4 characters long.");
    }

    if (!isFirebaseConfigured) {
      const accounts = JSON.parse(localStorage.getItem("hostel_shop_student_accounts") || "{}");
      if (accounts[cleanUser]) {
        throw new Error(`Username "${cleanUser}" is already registered. Please sign in.`);
      }
      const student = {
        username: cleanUser,
        displayName: cleanName,
        password: cleanPass,
        createdAt: new Date().toISOString()
      };
      accounts[cleanUser] = student;
      localStorage.setItem("hostel_shop_student_accounts", JSON.stringify(accounts));
      return { username: student.username, displayName: student.displayName };
    }

    const studentRef = doc(db, "studentAccounts", cleanUser);
    const existing = await getDoc(studentRef);
    if (existing.exists()) {
      throw new Error(`Username "${cleanUser}" is already registered. Please sign in.`);
    }

    const newStudent = {
      username: cleanUser,
      displayName: cleanName,
      password: cleanPass,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(studentRef, newStudent);
    return { username: newStudent.username, displayName: newStudent.displayName };
  },

  async loginStudent({ username, password }) {
    const cleanUser = (username || "").trim().toLowerCase();
    const cleanPass = (password || "").trim();

    if (!cleanUser || !cleanPass) {
      throw new Error("Please enter both username and password.");
    }

    if (!isFirebaseConfigured) {
      const accounts = JSON.parse(localStorage.getItem("hostel_shop_student_accounts") || "{}");
      const account = accounts[cleanUser];
      if (!account || account.password !== cleanPass) {
        throw new Error("Invalid username or password.");
      }
      return { username: account.username, displayName: account.displayName };
    }

    const studentRef = doc(db, "studentAccounts", cleanUser);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) {
      throw new Error("Student account not found. Please create an account.");
    }

    const data = snap.data();
    if (data.password !== cleanPass) {
      throw new Error("Incorrect password for this student account.");
    }

    return { username: data.username, displayName: data.displayName };
  },

  async getStudentOrders(username) {
    if (!username) return [];
    const cleanUser = username.trim().toLowerCase();

    if (!isFirebaseConfigured) {
      const orders = JSON.parse(localStorage.getItem("hostel_shop_mock_orders") || "[]");
      return orders.filter(
        (o) => (o.studentUsername || "").toLowerCase() === cleanUser
      );
    }

    try {
      const q = query(
        collection(db, "orders"),
        where("studentUsername", "==", cleanUser)
      );
      const snap = await getDocs(q);
      const orders = snap.docs.map((d) => ({
        orderId: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate
          ? d.data().createdAt.toDate().toISOString()
          : d.data().createdAt || new Date().toISOString()
      }));

      // Sort newest orders first
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return orders;
    } catch (err) {
      console.error("Error fetching student orders:", err);
      throw err;
    }
  }
};
