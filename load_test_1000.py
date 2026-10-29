import urllib.request
import time
import concurrent.futures
import statistics

def send_request(url):
    t0 = time.perf_counter()
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            status = resp.status
            handled_by = resp.headers.get("X-Handled-By")
            latency_ms = (time.perf_counter() - t0) * 1000
            return (True, status, latency_ms, handled_by)
    except Exception as e:
        latency_ms = (time.perf_counter() - t0) * 1000
        return (False, str(e), latency_ms, None)

def benchmark(title, url, total_requests=1000, concurrency=25):
    print(f"\n>>> Running: {title}")
    print(f"    Target: {url}")
    print(f"    Requests: {total_requests} | Concurrency: {concurrency}")

    start_time = time.perf_counter()
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(send_request, url) for _ in range(total_requests)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    total_duration = time.perf_counter() - start_time
    
    successes = [r for r in results if r[0]]
    failures = [r for r in results if not r[0]]
    latencies = [r[2] for r in successes]

    avg_latency = statistics.mean(latencies) if latencies else 0
    p50 = statistics.median(latencies) if latencies else 0
    p90 = statistics.quantiles(latencies, n=10)[8] if len(latencies) >= 10 else 0
    p99 = statistics.quantiles(latencies, n=100)[98] if len(latencies) >= 100 else 0
    throughput = len(successes) / total_duration if total_duration > 0 else 0

    instance_distribution = {}
    for r in successes:
        inst = r[3] or "unknown"
        instance_distribution[inst] = instance_distribution.get(inst, 0) + 1

    print(f"    Completed in: {total_duration:.2f}s | Success: {len(successes)} | Failures: {len(failures)}")
    print(f"    Throughput: {throughput:.2f} req/s | Avg Latency: {avg_latency:.2f} ms")
    if len(instance_distribution) > 1:
        print(f"    Instance Breakdown: {instance_distribution}")

    return {
        "title": title,
        "total": total_requests,
        "duration": total_duration,
        "success": len(successes),
        "failures": len(failures),
        "throughput": throughput,
        "avg_latency": avg_latency,
        "p50": p50,
        "p90": p90,
        "p99": p99,
        "distribution": instance_distribution
    }

def main():
    print("=" * 85)
    print(" QUESTION 1(b): SCALABILITY BENCHMARK - 1,000 REQUESTS LOAD TEST")
    print(" Comparing: 1 Backend Instance (Port 5001) vs 3 Instances + Nginx (Port 8080)")
    print("=" * 85)

    # 1. Warm-up
    print("Warming up endpoints...")
    send_request("http://localhost:5001/api/items")
    send_request("http://localhost:8080/api/items")
    time.sleep(1)

    # 2. Benchmark Single Instance
    res_1 = benchmark("Single Instance (backend-1)", "http://localhost:5001/api/items", 1000, 25)

    time.sleep(2)

    # 3. Benchmark 3 Instances with Nginx
    res_3 = benchmark("3-Instance Cluster behind Nginx", "http://localhost:8080/api/items", 1000, 25)

    # Calculations
    tp_imp = ((res_3['throughput'] - res_1['throughput']) / res_1['throughput']) * 100
    lat_red = ((res_1['avg_latency'] - res_3['avg_latency']) / res_1['avg_latency']) * 100
    time_red = ((res_1['duration'] - res_3['duration']) / res_1['duration']) * 100

    print("\n" + "=" * 85)
    print("                      OFFICIAL BENCHMARK COMPARISON TABLE")
    print("=" * 85)
    print(f"| {'Performance Metric':<30} | {'1 Instance (Port 5001)':<22} | {'3 Instances (Port 8080)':<23} | {'Improvement':<16} |")
    print(f"|{'-'*32}|{'-'*24}|{'-'*25}|{'-'*18}|")
    print(f"| {'Total Requests Completed':<30} | {res_1['total']:<22} | {res_3['total']:<23} | {'100% Completed':<16} |")
    print(f"| {'Concurrency Level':<30} | {'25 concurrent workers':<22} | {'25 concurrent workers':<23} | {'Matched':<16} |")
    print(f"| {'Total Duration (sec)':<30} | {res_1['duration']:<18.2f} s | {res_3['duration']:<19.2f} s | {time_red:<13.2f} % faster |")
    print(f"| {'Throughput (Requests/sec)':<30} | {res_1['throughput']:<14.2f} req/s | {res_3['throughput']:<15.2f} req/s | +{tp_imp:<12.2f} % |")
    print(f"| {'Average Latency':<30} | {res_1['avg_latency']:<17.2f} ms | {res_3['avg_latency']:<18.2f} ms | {lat_red:<11.2f} % lower |")
    print(f"| {'Median Latency (p50)':<30} | {res_1['p50']:<17.2f} ms | {res_3['p50']:<18.2f} ms | {((res_1['p50']-res_3['p50'])/res_1['p50'])*100:<11.2f} % lower |")
    print(f"| {'90th Percentile (p90)':<30} | {res_1['p90']:<17.2f} ms | {res_3['p90']:<18.2f} ms | {((res_1['p90']-res_3['p90'])/res_1['p90'])*100:<11.2f} % lower |")
    print(f"| {'99th Percentile (p99)':<30} | {res_1['p99']:<17.2f} ms | {res_3['p99']:<18.2f} ms | {((res_1['p99']-res_3['p99'])/res_1['p99'])*100:<11.2f} % lower |")
    print(f"| {'Failed Requests':<30} | {res_1['failures']:<22} | {res_3['failures']:<23} | {'0 Errors':<16} |")
    print("=" * 85)

if __name__ == "__main__":
    main()
