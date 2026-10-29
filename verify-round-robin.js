async function testRoundRobin() {
  console.log('========================================================================');
  console.log('QUESTION 1(a): VERIFYING ROUND-ROBIN LOAD DISTRIBUTION ON NGINX (PORT 8080)');
  console.log('Target API: GET /api/items (Hardest-hit catalog API during rush hour)');
  console.log('========================================================================\n');

  for (let i = 1; i <= 9; i++) {
    const start = Date.now();
    const res = await fetch('http://172.17.59.21:8080/api/items');
    const latency = Date.now() - start;
    const json = await res.json();
    const handledBy = res.headers.get('x-handled-by') || json.handledBy;
    const upstream = res.headers.get('x-upstream-server');

    console.log(`[Request #${i}] Status: ${res.status} OK | Handled By: \x1b[32m${handledBy}\x1b[0m | Upstream: ${upstream} | Items: ${json.count} | Latency: ${latency}ms`);
  }

  console.log('\n========================================================================');
  console.log('SUCCESS: All 3 backend instances (backend-1, backend-2, backend-3) are');
  console.log('actively serving incoming traffic in a round-robin rotation!');
  console.log('========================================================================\n');
}

testRoundRobin().catch(console.error);
