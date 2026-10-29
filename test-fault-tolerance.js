const autocannon = require('autocannon');
const { execSync } = require('child_process');

async function main() {
  console.log('========================================');
  console.log('   QUESTION 1(c): FAULT TOLERANCE TEST   ');
  console.log('   Stopping backend-2 during live load  ');
  console.log('========================================\n');

  let stopped = false;

  const instance = autocannon({
    url: 'http://172.17.59.21:8080/api/items',
    connections: 20,
    amount: 1000,
    pipelining: 1
  }, (err, result) => {
    if (err) {
      console.error('Test error:', err);
      return;
    }

    console.log('\n========================================');
    console.log('       FAULT TOLERANCE TEST RESULTS     ');
    console.log('========================================');
    console.log(`Total Requests Sent : ${result.requests.total}`);
    console.log(`2xx Successes       : ${result['2xx']}`);
    console.log(`Non-2xx / Errors    : ${result.non2xx + result.errors}`);
    console.log(`Error Count         : ${result.errors}`);
    console.log(`Average Latency     : ${result.latency.average} ms`);
    console.log(`Max Latency         : ${result.latency.max} ms`);
    console.log(`Throughput          : ${result.requests.average} req/sec`);
    console.log('========================================');
    if ((result.non2xx + result.errors) === 0) {
      console.log('>> SUCCESS: Zero requests failed during container crash!');
      console.log('>> Nginx proxy_next_upstream seamlessly rerouted requests to healthy backends.');
    } else {
      console.log(`>> Failures recorded: ${result.non2xx + result.errors} requests failed.`);
    }
    console.log('========================================\n');

    // Restore container
    try {
      execSync('wsl -d Ubuntu-26.04 docker unpause backend-2', { stdio: 'inherit' });
      console.log('[RECOVERY] backend-2 unpaused and healthy.');
    } catch (e) {}
  });

  autocannon.track(instance, { renderProgressBar: true });

  // Simulate killing/pausing backend-2 after 1.5 seconds of traffic
  setTimeout(() => {
    if (!stopped) {
      stopped = true;
      console.log('\n[CRASH EVENT] Freezing/crashing backend-2 container NOW...');
      try {
        execSync('wsl -d Ubuntu-26.04 docker pause backend-2', { stdio: 'inherit' });
        console.log('[CRASH EVENT] backend-2 frozen. Testing Nginx proxy_next_upstream auto-failover...');
      } catch (e) {
        console.error('Error pausing backend-2:', e.message);
      }
    }
  }, 1500);
}

main();
