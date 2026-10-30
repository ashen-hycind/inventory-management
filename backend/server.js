const express = require('express');
const cors = require('cors');
const os = require('os');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
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
  runTransaction,
  serverTimestamp
} = require('firebase/firestore');

const app = express();
const PORT = process.env.PORT || 5000;
const INSTANCE_NAME = process.env.INSTANCE_NAME || `instance-${os.hostname()}`;
const JWT_SECRET = process.env.JWT_SECRET || 'hostel-tuckshop-super-secret-jwt-key-2026';

app.use(cors());
app.use(express.json());

// Add header to identify which container instance handled the request (for Load Balancer verification)
app.use((req, res, next) => {
  res.setHeader('X-Handled-By', INSTANCE_NAME);
  res.setHeader('X-Container-Hostname', os.hostname());
  next();
});

// Initialize Cloud Firestore using existing Firebase Project configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBb37jd_mToWBX_hd6p6bfzd1StPfW8Myo",
  authDomain: "vmart-hostel-shop-9281.firebaseapp.com",
  projectId: "vmart-hostel-shop-9281",
  storageBucket: "vmart-hostel-shop-9281.firebasestorage.app",
  messagingSenderId: "1051139944233",
  appId: "1:1051139944233:web:2bf87b7ac035a0b75b9138"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

console.log(`[${INSTANCE_NAME}] Initialized Cloud Firestore for project: vmart-hostel-shop-9281`);

// -------------------------------------------------------------
// 1. HEALTH & METRICS
// -------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    instance: INSTANCE_NAME,
    hostname: os.hostname(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// 2. PEAK-DEMAND API (Question 1a & 1b)
// GET /api/items - Fetches catalog & stock levels
// -------------------------------------------------------------
let itemsCache = null;
let lastCacheFetch = 0;
const CACHE_TTL_MS = 20000; // 20 seconds TTL cache for rush hour optimization

app.get('/api/items', async (req, res) => {
  try {
    const now = Date.now();
    if (!itemsCache || (now - lastCacheFetch > CACHE_TTL_MS)) {
      const snap = await getDocs(collection(db, 'items'));
      const items = [];
      snap.forEach((d) => {
        items.push({ itemId: d.id, ...d.data() });
      });
      itemsCache = items;
      lastCacheFetch = now;
    }

    res.json({
      success: true,
      handledBy: INSTANCE_NAME,
      containerHostname: os.hostname(),
      count: itemsCache.length,
      data: itemsCache,
      cached: (now - lastCacheFetch <= CACHE_TTL_MS),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${INSTANCE_NAME}] Error fetching items:`, error);
    res.status(500).json({
      success: false,
      handledBy: INSTANCE_NAME,
      message: error.message
    });
  }
});

// GET /api/items/search?q=maggi
app.get('/api/items/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase().trim();
    const snap = await getDocs(collection(db, 'items'));
    const results = [];
    snap.forEach((d) => {
      const data = d.data();
      if (
        data.name?.toLowerCase().includes(q) ||
        data.category?.toLowerCase().includes(q)
      ) {
        results.push({ itemId: d.id, ...data });
      }
    });

    res.json({
      success: true,
      handledBy: INSTANCE_NAME,
      query: q,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, handledBy: INSTANCE_NAME, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. SECURITY: AUTHENTICATION & PASSWORD HASHING (Question 2a)
// User passwords stored as salted bcrypt hashes ($2b$10$...)
// -------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, displayName, role = 'student' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const cleanUser = username.trim().toLowerCase();
    const userRef = doc(db, 'studentAccounts', cleanUser);
    const existing = await getDoc(userRef);
    if (existing.exists()) {
      return res.status(400).json({ success: false, message: `Username @${cleanUser} is already taken` });
    }

    // Hash password with bcrypt (10 salt rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUserData = {
      username: cleanUser,
      displayName: displayName || cleanUser,
      passwordHash, // Salted bcrypt hash
      role,         // 'student' or 'admin' / 'staff'
      mfaEnabled: false,
      createdAt: serverTimestamp()
    };

    await setDoc(userRef, newUserData);

    res.status(201).json({
      success: true,
      handledBy: INSTANCE_NAME,
      message: `Account created securely for @${cleanUser} with bcrypt password hash`,
      data: {
        username: cleanUser,
        displayName: newUserData.displayName,
        role: newUserData.role,
        passwordHashPreview: passwordHash.substring(0, 15) + '...'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, handledBy: INSTANCE_NAME, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const cleanUser = username.trim().toLowerCase();
    const userRef = doc(db, 'studentAccounts', cleanUser);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const userData = userSnap.data();

    // Verify bcrypt hash or fallback to legacy comparison
    let isPasswordValid = false;
    if (userData.passwordHash) {
      isPasswordValid = await bcrypt.compare(password, userData.passwordHash);
    } else if (userData.password) {
      // Legacy plaintext comparison, automatically upgrade to bcrypt
      isPasswordValid = (userData.password === password);
      if (isPasswordValid) {
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(password, salt);
        await updateDoc(userRef, { passwordHash: newHash, password: null });
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Check if MFA is required
    if (userData.mfaEnabled) {
      return res.json({
        success: true,
        mfaRequired: true,
        handledBy: INSTANCE_NAME,
        message: 'MFA verification required. Please provide 6-digit TOTP code.',
        tempToken: jwt.sign({ username: cleanUser, role: userData.role || 'student', mfaPending: true }, JWT_SECRET, { expiresIn: '5m' })
      });
    }

    // Issue full JWT token
    const token = jwt.sign(
      { username: cleanUser, role: userData.role || 'student' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      handledBy: INSTANCE_NAME,
      token,
      user: {
        username: cleanUser,
        displayName: userData.displayName,
        role: userData.role || 'student',
        mfaEnabled: Boolean(userData.mfaEnabled)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, handledBy: INSTANCE_NAME, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. SECURITY: TOTP MULTI-FACTOR AUTHENTICATION (Question 2b)
// Supports Google Authenticator / Microsoft Authenticator
// -------------------------------------------------------------
app.post('/api/auth/mfa/setup', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const cleanUser = username.trim().toLowerCase();
    const userRef = doc(db, 'studentAccounts', cleanUser);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ success: false, message: 'User not found' });

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `VMart Campus Shop (${cleanUser})`,
      issuer: 'VMart Hostel Shop'
    });

    // Generate QR Code data URL for scanning in Google Authenticator
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save temporary secret to user document
    await updateDoc(userRef, {
      tempMfaSecret: secret.base32,
      updatedAt: serverTimestamp()
    });

    res.json({
      success: true,
      handledBy: INSTANCE_NAME,
      secretBase32: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeDataUrl: qrCodeUrl,
      instruction: 'Scan this QR code in Google Authenticator or Microsoft Authenticator, then verify with the 6-digit code.'
    });
  } catch (error) {
    res.status(500).json({ success: false, handledBy: INSTANCE_NAME, message: error.message });
  }
});

app.post('/api/auth/mfa/verify', async (req, res) => {
  try {
    const { username, token } = req.body;
    if (!username || !token) {
      return res.status(400).json({ success: false, message: 'Username and 6-digit token required' });
    }

    const cleanUser = username.trim().toLowerCase();
    const userRef = doc(db, 'studentAccounts', cleanUser);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ success: false, message: 'User not found' });

    const userData = userSnap.data();
    const secretToVerify = userData.mfaSecret || userData.tempMfaSecret;
    if (!secretToVerify) {
      return res.status(400).json({ success: false, message: 'MFA setup not initiated' });
    }

    const verified = speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: 'base32',
      token: String(token).trim(),
      window: 1 // Allow 1 step (30s) drift
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid or expired 6-digit code. Try again.' });
    }

    // Enable MFA permanently
    await updateDoc(userRef, {
      mfaEnabled: true,
      mfaSecret: secretToVerify,
      tempMfaSecret: null,
      updatedAt: serverTimestamp()
    });

    const jwtToken = jwt.sign(
      { username: cleanUser, role: userData.role || 'student' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      handledBy: INSTANCE_NAME,
      message: 'MFA verified successfully! Access granted.',
      token: jwtToken,
      user: {
        username: cleanUser,
        displayName: userData.displayName,
        role: userData.role || 'student',
        mfaEnabled: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, handledBy: INSTANCE_NAME, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. SECURITY: RBAC MIDDLEWARE (Question 2b)
// Restricts Update & Delete APIs to specific roles
// -------------------------------------------------------------
function requireRole(allowedRoles = ['admin', 'staff']) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        handledBy: INSTANCE_NAME,
        error: 'Unauthorized',
        message: 'Access Denied: Missing or invalid Bearer token. Please log in with credentials and TOTP MFA.'
      });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          handledBy: INSTANCE_NAME,
          error: 'Forbidden',
          message: `Access Denied: Role '${decoded.role}' does not have permission for this operation. Required role(s): [${allowedRoles.join(', ')}].`
        });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        handledBy: INSTANCE_NAME,
        error: 'Unauthorized',
        message: 'Access Denied: Expired or malformed token: ' + err.message
      });
    }
  };
}

// -------------------------------------------------------------
// 6. RESTRICTED UPDATE & DELETE APIS (Question 2b)
// -------------------------------------------------------------
// PUT /api/items/:id - Restricted to admin/staff
app.put('/api/items/:id', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stockQuantity, category } = req.body;
    const itemRef = doc(db, 'items', id);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const updates = {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(stockQuantity !== undefined && { stockQuantity: Number(stockQuantity) }),
      ...(category !== undefined && { category }),
      updatedAt: serverTimestamp(),
      updatedBy: req.user.username
    };

    await updateDoc(itemRef, updates);

    res.json({
      success: true,
      handledBy: INSTANCE_NAME,
      message: `Item '${id}' successfully updated by authorized user @${req.user.username} (${req.user.role})`,
      data: { itemId: id, ...updates }
    });
  } catch (error) {
    res.status(500).json({ success: false, handledBy: INSTANCE_NAME, message: error.message });
  }
});

// DELETE /api/items/:id - Restricted to admin/staff
app.delete('/api/items/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const itemRef = doc(db, 'items', id);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    await deleteDoc(itemRef);

    res.json({
      success: true,
      handledBy: INSTANCE_NAME,
      message: `Item '${id}' successfully deleted by authorized administrator @${req.user.username}`,
      deletedItemId: id
    });
  } catch (error) {
    res.status(500).json({ success: false, handledBy: INSTANCE_NAME, message: error.message });
  }
});

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(` Campus Tuck Shop Backend Instance: [${INSTANCE_NAME}]`);
  console.log(` Listening on port: ${PORT}`);
  console.log(` Hostname: ${os.hostname()}`);
  console.log(`=======================================================`);
});
