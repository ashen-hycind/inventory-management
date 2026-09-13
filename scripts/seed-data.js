/**
 * Seed Script for Hostel Shop Inventory Management
 *
 * Populates Firestore with sample items and sets up initial staff account.
 *
 * Usage:
 *   1. Download your Firebase Service Account key JSON from:
 *      Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
 *   2. Save it as `serviceAccountKey.json` in the project root (or scripts/ directory).
 *   3. Run: node scripts/seed-data.js
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Check for service account key file
const possibleKeyPaths = [
  path.join(__dirname, "serviceAccountKey.json"),
  path.join(__dirname, "..", "serviceAccountKey.json"),
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
].filter(Boolean);

let serviceAccountPath = possibleKeyPaths.find((p) => fs.existsSync(p));

if (serviceAccountPath) {
  console.log(`Using service account key from: ${serviceAccountPath}`);
  const serviceAccount = require(path.resolve(serviceAccountPath));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.log("No serviceAccountKey.json found. Attempting default application credentials or emulator...");
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

const SAMPLE_ITEMS = [
  {
    name: "Maggi Noodles",
    price: 50,
    category: "snacks",
    stockQuantity: 25,
    imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60",
  },
  {
    name: "Chai Tea Powder",
    price: 30,
    category: "beverages",
    stockQuantity: 40,
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=60",
  },
  {
    name: "Biscuits",
    price: 20,
    category: "snacks",
    stockQuantity: 50,
    imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=60",
  },
  {
    name: "Notebook",
    price: 80,
    category: "stationery",
    stockQuantity: 15,
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=60",
  },
  {
    name: "Pen Set",
    price: 40,
    category: "stationery",
    stockQuantity: 30,
    imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=60",
  },
  {
    name: "Juice",
    price: 60,
    category: "beverages",
    stockQuantity: 20,
    imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&auto=format&fit=crop&q=60",
  },
  {
    name: "Chips",
    price: 20,
    category: "snacks",
    stockQuantity: 35,
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=60",
  },
  {
    name: "Coffee",
    price: 50,
    category: "beverages",
    stockQuantity: 18,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=60",
  },
];

const DEFAULT_ADMIN = {
  email: "admin@hostelshop.local",
  password: "test123Password!",
  username: "shop_admin",
  role: "admin",
};

async function seed() {
  console.log("Starting Firestore database seeding...");

  // 1. Seed items
  const itemsCollection = db.collection("items");
  const existingItems = await itemsCollection.get();

  if (!existingItems.empty) {
    console.log(`Found ${existingItems.size} existing items. Clearing existing sample items...`);
    const batch = db.batch();
    existingItems.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  console.log("Seeding sample items...");
  for (const item of SAMPLE_ITEMS) {
    await itemsCollection.add({
      ...item,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✓ Added: ${item.name} (₹${item.price}, Stock: ${item.stockQuantity})`);
  }

  // 2. Create staff record and Auth user if possible
  console.log(`\nSetting up default admin staff account: ${DEFAULT_ADMIN.email}...`);
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(DEFAULT_ADMIN.email);
      console.log(`Admin user already exists in Firebase Auth (UID: ${userRecord.uid})`);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        userRecord = await auth.createUser({
          email: DEFAULT_ADMIN.email,
          password: DEFAULT_ADMIN.password,
          displayName: "Shop Admin",
        });
        console.log(`✓ Created Firebase Auth user: ${DEFAULT_ADMIN.email} (UID: ${userRecord.uid})`);
      } else {
        throw err;
      }
    }

    // Write to staffAccounts collection in Firestore
    await db.collection("staffAccounts").doc(userRecord.uid).set({
      staffId: userRecord.uid,
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      role: DEFAULT_ADMIN.role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✓ Staff account document saved to staffAccounts/${userRecord.uid}`);
  } catch (authError) {
    console.warn("Notice: Could not automatically create Firebase Auth account (requires Service Account credentials).", authError.message);
    console.log(`You can create the admin user manually in Firebase Console -> Authentication with:`);
    console.log(`Email: ${DEFAULT_ADMIN.email} | Password: ${DEFAULT_ADMIN.password}`);
  }

  console.log("\nSeeding completed successfully! 🎉");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
