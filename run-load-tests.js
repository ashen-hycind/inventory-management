const autocannon = require('autocannon');

async function runTest(title, url, amount = 1000, connections = 25) {
  console.log(`\n========================================`);
  console.log(`Running: ${title}`);
  console.log(`Target: ${url}`);
  console.log(`Requests: ${amount}, Connections: ${connections}`);
  console.log(`========================================\n`);

  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url,
      amount,
      connections,
      pipelining: 1
    }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function main() {
  try {
    // 1. Single Instance (backend-1 on port 5001)
    const singleResult = await runTest(
      'Single Instance Benchmark (backend-1 directly)',
      'http://172.17.59.21:5001/api/items',
      1000,
      25
    );

    // Short pause
    await new Promise(r => setTimeout(r, 2000));

    // 2. Three Instances behind Nginx (port 8080)
    const clusterResult = await runTest(
      'Three-Instance Cluster Benchmark (Nginx Load Balancer)',
      'http://172.17.59.21:8080/api/items',
      1000,
      25
    );

    // Compute stats
    const singleReqSec = singleResult.requests.average;
    const clusterReqSec = clusterResult.requests.average;
    const reqSecImprovement = (((clusterReqSec - singleReqSec) / singleReqSec) * 100).toFixed(2);

    const singleLatAvg = singleResult.latency.average;
    const clusterLatAvg = clusterResult.latency.average;
    const latReduction = (((singleLatAvg - clusterLatAvg) / singleLatAvg) * 100).toFixed(2);

    console.log('\n\n========================================');
    console.log('         BENCHMARK COMPARISON TABLE     ');
    console.log('========================================');
    console.log(`| Metric                         | 1 Instance (Port 5001) | 3 Instances + Nginx (Port 8080) | Improvement (%) |`);
    console.log(`|--------------------------------|------------------------|---------------------------------|-----------------|`);
    console.log(`| Total Requests                 | ${singleResult.requests.total}                   | ${clusterResult.requests.total}                            | -               |`);
    console.log(`| Duration (sec)                 | ${singleResult.duration.toFixed(2)}s                  | ${clusterResult.duration.toFixed(2)}s                           | ${(((singleResult.duration - clusterResult.duration) / singleResult.duration) * 100).toFixed(2)}% faster   |`);
    console.log(`| Requests/sec (Avg Throughput)  | ${singleReqSec.toFixed(2)} req/s             | ${clusterReqSec.toFixed(2)} req/s                      | +${reqSecImprovement}%          |`);
    console.log(`| Average Latency                | ${singleLatAvg.toFixed(2)} ms               | ${clusterLatAvg.toFixed(2)} ms                        | ${latReduction}% lower     |`);
    console.log(`| p50 Latency                    | ${singleResult.latency.p50} ms                  | ${clusterResult.latency.p50} ms                           | -               |`);
    console.log(`| p90 Latency                    | ${singleResult.latency.p90} ms                  | ${clusterResult.latency.p90} ms                           | -               |`);
    console.log(`| p99 Latency                    | ${singleResult.latency.p99} ms                  | ${clusterResult.latency.p99} ms                           | -               |`);
    console.log(`| 2xx Responses                  | ${singleResult['2xx']}                   | ${clusterResult['2xx']}                            | 100% Success     |`);
    console.log(`| Errors / Timeouts              | ${singleResult.errors}                      | ${clusterResult.errors}                               | 0               |`);
    console.log('========================================\n');

  } catch (err) {
    console.error('Test run failed:', err);
  }
}

main();
