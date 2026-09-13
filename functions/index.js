const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Verification code generator helper (unambiguous 6-8 chars: exclude 0, O, 1, I, L)
const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateVerificationCode(length = 7) {
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    code += CHARSET[randomIndex];
  }
  return code;
}

// -------------------------------------------------------------
// ITEMS MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// GET /api/items - List all items with stock levels
app.get("/items", async (req, res) => {
  try {
    const snapshot = await db.collection("items").orderBy("name", "asc").get();
    const items = [];
    snapshot.forEach((doc) => {
      items.push({ itemId: doc.id, ...doc.data() });
    });
    return res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/items/search?q=maggi - Search items by name
app.get("/items/search", async (req, res) => {
  try {
    const query = (req.query.q || "").toLowerCase().trim();
    const snapshot = await db.collection("items").get();
    const results = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (
        data.name?.toLowerCase().includes(query) ||
        data.category?.toLowerCase().includes(query)
      ) {
        results.push({ itemId: doc.id, ...data });
      }
    });
    return res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error("Error searching items:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/items/:itemId - Get single item details
app.get("/items/:itemId", async (req, res) => {
  try {
    const docRef = db.collection("items").doc(req.params.itemId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    return res.json({ success: true, data: { itemId: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Error getting item:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/items - Admin: Create new item
app.post("/items", async (req, res) => {
  try {
    const { name, price, category, stockQuantity, imageUrl } = req.body;
    if (!name || price === undefined || stockQuantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "name, price, and stockQuantity are required fields",
      });
    }

    const newItem = {
      name: String(name).trim(),
      price: Number(price),
      category: String(category || "general").toLowerCase().trim(),
      stockQuantity: Number(stockQuantity),
      imageUrl: imageUrl || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("items").add(newItem);
    return res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: { itemId: docRef.id, ...newItem },
    });
  } catch (error) {
    console.error("Error creating item:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/items/:itemId - Admin: Update item
app.put("/items/:itemId", async (req, res) => {
  try {
    const { name, price, category, stockQuantity, imageUrl } = req.body;
    const docRef = db.collection("items").doc(req.params.itemId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (name !== undefined) updates.name = String(name).trim();
    if (price !== undefined) updates.price = Number(price);
    if (category !== undefined) updates.category = String(category).toLowerCase().trim();
    if (stockQuantity !== undefined) updates.stockQuantity = Number(stockQuantity);
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;

    await docRef.update(updates);
    const updated = await docRef.get();
    return res.json({
      success: true,
      message: "Item updated successfully",
      data: { itemId: updated.id, ...updated.data() },
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/items/:itemId - Admin: Delete item
app.delete("/items/:itemId", async (req, res) => {
  try {
    const docRef = db.collection("items").doc(req.params.itemId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    await docRef.delete();
    return res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// ORDERS MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// POST /api/orders - Student: Create new order
app.post("/orders", async (req, res) => {
  try {
    const { studentName, studentEmail, itemsOrdered } = req.body;

    if (!studentName || !itemsOrdered || !Array.isArray(itemsOrdered) || itemsOrdered.length === 0) {
      return res.status(400).json({
        success: false,
        message: "studentName and a non-empty itemsOrdered array are required",
      });
    }

    // Run in a Firestore transaction to verify and atomically reduce stock
    const result = await db.runTransaction(async (transaction) => {
      // 1. ALL READS FIRST: Fetch current stock for all items
      const itemSnapshots = [];
      for (const item of itemsOrdered) {
        const itemRef = db.collection("items").doc(item.itemId);
        const itemDoc = await transaction.get(itemRef);
        itemSnapshots.push({ item, itemRef, itemDoc });
      }

      // 2. VALIDATE & CALCULATE
      let totalPrice = 0;
      const verifiedItems = [];
      const stockUpdates = [];

      for (const { item, itemRef, itemDoc } of itemSnapshots) {
        if (!itemDoc.exists) {
          throw new Error(`Item ${item.itemId} not found in inventory.`);
        }

        const itemData = itemDoc.data();
        const quantity = Number(item.quantity);

        if (quantity <= 0) {
          throw new Error(`Invalid quantity for ${itemData.name}`);
        }

        if (itemData.stockQuantity < quantity) {
          throw new Error(
            `Insufficient stock for "${itemData.name}". Available: ${itemData.stockQuantity}, Requested: ${quantity}`
          );
        }

        const unitPrice = Number(itemData.price);
        totalPrice += unitPrice * quantity;

        verifiedItems.push({
          itemId: item.itemId,
          itemName: itemData.name,
          quantity: quantity,
          pricePerUnit: unitPrice,
          subtotal: unitPrice * quantity,
        });

        stockUpdates.push({
          itemRef,
          newStock: itemData.stockQuantity - quantity,
        });
      }

      // 3. ALL WRITES AFTER: Deduct stock
      for (const update of stockUpdates) {
        transaction.update(update.itemRef, {
          stockQuantity: update.newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 4. Create Order document
      const orderRef = db.collection("orders").doc();
      const orderData = {
        studentName: String(studentName).trim(),
        studentEmail: studentEmail ? String(studentEmail).trim() : "",
        itemsOrdered: verifiedItems,
        totalPrice: totalPrice,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        collectedAt: null,
      };
      transaction.set(orderRef, orderData);

      // 3. Generate unique verification code
      const verificationCode = generateVerificationCode(7);
      const codeRef = db.collection("verificationCodes").doc();
      const codeData = {
        orderId: orderRef.id,
        verificationCode: verificationCode,
        isUsed: false,
        usedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.set(codeRef, codeData);

      return {
        orderId: orderRef.id,
        verificationCode,
        codeId: codeRef.id,
        totalPrice,
        itemsOrdered: verifiedItems,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: {
        orderId: result.orderId,
        verificationCode: result.verificationCode,
        totalPrice: result.totalPrice,
        itemsOrdered: result.itemsOrdered,
        qrCode: result.verificationCode, // Payload for QR scanning
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/orders - Admin: Get all orders (filter by status)
app.get("/orders", async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection("orders").orderBy("createdAt", "desc");

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ orderId: doc.id, ...doc.data() });
    });

    return res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/orders/:orderId - Get single order details
app.get("/orders/:orderId", async (req, res) => {
  try {
    const docRef = db.collection("orders").doc(req.params.orderId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Also look up the verification code associated with this order
    const codeSnap = await db
      .collection("verificationCodes")
      .where("orderId", "==", req.params.orderId)
      .limit(1)
      .get();

    let verificationCode = null;
    let isUsed = false;
    if (!codeSnap.empty) {
      const codeDoc = codeSnap.docs[0].data();
      verificationCode = codeDoc.verificationCode;
      isUsed = codeDoc.isUsed;
    }

    return res.json({
      success: true,
      data: {
        orderId: doc.id,
        ...doc.data(),
        verificationCode,
        isCodeUsed: isUsed,
      },
    });
  } catch (error) {
    console.error("Error getting order:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/orders/:orderId - Admin: Update order status
app.put("/orders/:orderId", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["pending", "collected", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status required: pending, collected, or cancelled",
      });
    }

    const docRef = db.collection("orders").doc(req.params.orderId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const updates = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status === "collected") {
      updates.collectedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await docRef.update(updates);
    const updated = await docRef.get();
    return res.json({
      success: true,
      message: "Order status updated",
      data: { orderId: updated.id, ...updated.data() },
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/orders/:orderId - Admin: Cancel order (restores stock)
app.delete("/orders/:orderId", async (req, res) => {
  try {
    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection("orders").doc(req.params.orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error("Order not found");
      }

      const orderData = orderDoc.data();

      // Only restore stock if the order was not already cancelled
      if (orderData.status !== "cancelled" && Array.isArray(orderData.itemsOrdered)) {
        // Read all items first
        const itemSnapshots = [];
        for (const item of orderData.itemsOrdered) {
          const itemRef = db.collection("items").doc(item.itemId);
          const itemDoc = await transaction.get(itemRef);
          itemSnapshots.push({ item, itemRef, itemDoc });
        }

        // Write updates after reads
        for (const { item, itemRef, itemDoc } of itemSnapshots) {
          if (itemDoc.exists) {
            const currentStock = itemDoc.data().stockQuantity || 0;
            transaction.update(itemRef, {
              stockQuantity: currentStock + item.quantity,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }

      transaction.update(orderRef, {
        status: "cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return res.json({ success: true, message: "Order cancelled and stock restored" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// VERIFICATION CODE MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// POST /api/verification/generate - Generate verification code for an order
app.post("/verification/generate", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const code = generateVerificationCode(7);
    const codeRef = await db.collection("verificationCodes").add({
      orderId,
      verificationCode: code,
      isUsed: false,
      usedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      success: true,
      data: {
        codeId: codeRef.id,
        verificationCode: code,
        message: "Share this code with shop staff to collect your items",
      },
    });
  } catch (error) {
    console.error("Error generating code:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/verification/check/:verificationCode - Check if code is valid and not used yet
app.get("/verification/check/:verificationCode", async (req, res) => {
  try {
    const inputCode = String(req.params.verificationCode).toUpperCase().trim();
    const snapshot = await db
      .collection("verificationCodes")
      .where("verificationCode", "==", inputCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: "Invalid code" });
    }

    const codeDoc = snapshot.docs[0];
    const codeData = codeDoc.data();

    if (codeData.isUsed) {
      return res.status(400).json({
        success: false,
        message: "This code has already been used. Order may already be collected.",
      });
    }

    // Fetch order details
    const orderDoc = await db.collection("orders").doc(codeData.orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, message: "Associated order not found" });
    }

    return res.json({
      success: true,
      data: {
        codeId: codeDoc.id,
        verificationCode: codeData.verificationCode,
        isUsed: false,
        order: { orderId: orderDoc.id, ...orderDoc.data() },
      },
    });
  } catch (error) {
    console.error("Error checking verification code:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/verification/verify - Admin: Enter code to approve payment/collection
app.post("/verification/verify", async (req, res) => {
  try {
    const { verificationCode } = req.body;
    if (!verificationCode) {
      return res.status(400).json({ success: false, message: "Verification code is required" });
    }

    const codeStr = String(verificationCode).toUpperCase().trim();

    const verificationResult = await db.runTransaction(async (transaction) => {
      // 1. Query the verification code
      const codeQuery = await db
        .collection("verificationCodes")
        .where("verificationCode", "==", codeStr)
        .limit(1)
        .get();

      if (codeQuery.empty) {
        throw new Error("Invalid code");
      }

      const codeDocSnap = codeQuery.docs[0];
      const codeRef = codeDocSnap.ref;
      const codeDoc = await transaction.get(codeRef);
      const codeData = codeDoc.data();

      // 2. Check if already used
      if (codeData.isUsed) {
        throw new Error("This code has already been used");
      }

      // 3. Fetch the order
      const orderRef = db.collection("orders").doc(codeData.orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error("Order not found");
      }

      const orderData = orderDoc.data();

      // 4. Mark code as used
      transaction.update(codeRef, {
        isUsed: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 5. Update order status to collected
      transaction.update(orderRef, {
        status: "collected",
        collectedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        orderId: orderDoc.id,
        studentName: orderData.studentName,
        itemsOrdered: orderData.itemsOrdered,
        totalPrice: orderData.totalPrice,
        collectedAt: new Date().toISOString(),
      };
    });

    return res.json({
      success: true,
      message: "Order approved! Student can now collect items",
      data: verificationResult,
    });
  } catch (error) {
    console.error("Verification error:", error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Expose Express API as Cloud Function
exports.api = functions.https.onRequest(app);
