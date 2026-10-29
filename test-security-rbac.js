const speakeasy = require('speakeasy');

const BASE_URL = 'http://172.17.59.21:8080';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, body: json };
}

async function runSecurityTests() {
  console.log('=====================================================');
  console.log('   QUESTION 2: SECURITY, PASSWORD HASHING, MFA & RBAC');
  console.log('=====================================================\n');

  // Test 1: Password Hashing (2a)
  console.log('--- TEST 1: Salted Bcrypt Password Hashing ---');
  const studentUsername = `student_${Date.now().toString().slice(-4)}`;
  const studentPassword = 'SecretPassword!2026';

  console.log(`Registering student: ${studentUsername}`);
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: studentUsername,
      password: studentPassword,
      role: 'student'
    })
  });

  console.log(`HTTP Status : ${regRes.status}`);
  console.log(`Response    :`, regRes.body);
  const hashPreview = regRes.body.data ? regRes.body.data.passwordHashPreview : '';
  console.log(`Password Hash Verified: ${hashPreview.startsWith('$2') ? 'YES (Bcrypt 10 rounds: ' + hashPreview + ')' : 'NO'}`);

  await new Promise(r => setTimeout(r, 1000));

  // Test 2: RBAC - Missing Token (401 Unauthorized)
  console.log('\n--- TEST 2: RBAC - Rejection Without Valid Token (401) ---');
  console.log('Attempting PUT /api/items/mock-item without Authorization header...');
  const unauthRes = await request('/api/items/mock-item', {
    method: 'PUT',
    body: JSON.stringify({ stock: 50 })
  });
  console.log(`HTTP Status : ${unauthRes.status} (Expected: 401)`);
  console.log(`Response    :`, unauthRes.body);

  await new Promise(r => setTimeout(r, 1000));

  // Test 3: RBAC - Student Role Rejection (403 Forbidden)
  console.log('\n--- TEST 3: RBAC - Student Role Rejection (403 Forbidden) ---');
  console.log('Logging in as student to get student JWT...');
  const studentLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: studentUsername,
      password: studentPassword
    })
  });
  const studentToken = studentLoginRes.body.token;
  console.log(`Student token obtained. Attempting PUT /api/items/mock-item...`);

  const studentPutRes = await request('/api/items/mock-item', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    body: JSON.stringify({ stock: 999 })
  });
  console.log(`HTTP Status : ${studentPutRes.status} (Expected: 403)`);
  console.log(`Response    :`, studentPutRes.body);

  await new Promise(r => setTimeout(r, 1000));

  // Test 4: Admin MFA Setup & Verification (2b)
  console.log('\n--- TEST 4: Multi-Factor Authentication (TOTP) Setup & Verification ---');
  const adminUsername = `admin_${Date.now().toString().slice(-4)}`;
  const adminPassword = 'AdminSecurePass!99';

  console.log(`Registering admin: ${adminUsername}`);
  const regAdminRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: adminUsername,
      password: adminPassword,
      role: 'admin'
    })
  });
  console.log(`Admin registered. Status: ${regAdminRes.status}`);

  await new Promise(r => setTimeout(r, 1000));

  console.log('Setting up TOTP MFA for admin...');
  const mfaSetupRes = await request('/api/auth/mfa/setup', {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername })
  });
  const secretKey = mfaSetupRes.body.secretBase32;
  console.log(`TOTP Secret generated: ${secretKey}`);
  console.log(`QR Code Data URL (Google Authenticator compatible): Present (${mfaSetupRes.body.qrCodeDataUrl ? 'Valid' : 'None'})`);

  // Generate 6-digit TOTP code using secret
  const totpCode = speakeasy.totp({
    secret: secretKey,
    encoding: 'base32'
  });
  console.log(`Simulated Google Authenticator 6-digit TOTP code: ${totpCode}`);

  console.log('Verifying TOTP code...');
  const mfaVerifyRes = await request('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({
      username: adminUsername,
      token: totpCode
    })
  });
  console.log(`MFA Verification HTTP Status : ${mfaVerifyRes.status}`);
  console.log(`Response                     :`, mfaVerifyRes.body);
  const adminToken = mfaVerifyRes.body.token;

  await new Promise(r => setTimeout(r, 1000));

  // Test 5: RBAC - Admin Token Allowed (200 OK)
  console.log('\n--- TEST 5: RBAC - Verified Admin Authorized (200 OK) ---');
  console.log('Attempting PUT /api/items/NFMfgfQCQ9fDuwVIV77E with Verified Admin Token...');
  const adminPutRes = await request('/api/items/NFMfgfQCQ9fDuwVIV77E', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ stockQuantity: 25, price: 50 })
  });
  console.log(`HTTP Status : ${adminPutRes.status}`);
  console.log(`Response    :`, adminPutRes.body);

  console.log('\n=====================================================');
  console.log('       ALL SECURITY & RBAC TESTS COMPLETED           ');
  console.log('=====================================================\n');
}

runSecurityTests().catch(console.error);
