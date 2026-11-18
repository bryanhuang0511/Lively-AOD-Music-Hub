const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const htmlPath = path.resolve(__dirname, 'benchmark.html').replace(/\\/g, '/');
  const tempDir = path.join(process.env.TEMP, 'edge_perf_' + Date.now());

  const port = 9334;
  const proc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    `file:///${htmlPath}`
  ]);

  const cleanup = () => {
    try { proc.kill(); } catch (e) {}
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  };

  // Wait for Edge CDP to become available
  let connected = false;
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const pageTarget = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pageTarget) {
        wsUrl = pageTarget.webSocketDebuggerUrl;
        connected = true;
        break;
      }
    } catch (e) {}
  }

  if (!connected) {
    cleanup();
    console.error('Failed to connect to Edge CDP within 6s');
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => ws.addEventListener('open', resolve));

  await send('Runtime.enable');
  await send('Log.enable');

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Log.entryAdded') {
      console.log('[BROWSER LOG]:', data.params.entry);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]:', data.params.args);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.log('[BROWSER EXCEPTION]:', data.params.exceptionDetails);
    }
  });

  const loc = await send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('Initial location:', loc && loc.result && loc.result.value);

  // Poll until benchmark is ready in the DOM
  let ready = false;
  for (let i = 0; i < 40; i++) {
    const res = await send('Runtime.evaluate', { expression: 'typeof window.runBenchmark' });
    if (res && res.result && res.result.value === 'function') {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  if (!ready) {
    const finalLoc = await send('Runtime.evaluate', { expression: 'window.location.href' });
    console.error('window.runBenchmark was not found within 4s. Final loc:', finalLoc && finalLoc.result && finalLoc.result.value);
    cleanup();
    process.exit(1);
  }

  // Run benchmark
  const evalResult = await send('Runtime.evaluate', {
    expression: 'window.runBenchmark()',
    awaitPromise: true,
    returnByValue: true
  });

  if (!evalResult || !evalResult.result || !evalResult.result.value) {
    console.error('evalResult error:', JSON.stringify(evalResult, null, 2));
    cleanup();
    process.exit(1);
  }
  const benchmarkResult = evalResult.result.value;

  console.log('=== BENCHMARK EXECUTION RESULTS ===');
  console.log('Active Mode:', JSON.stringify(benchmarkResult.active, null, 2));
  console.log('Idle Mode:  ', JSON.stringify(benchmarkResult.idle, null, 2));
  console.log('Passed:     ', benchmarkResult.passed);

  if (!benchmarkResult.passed) {
    console.error('FAILURES:');
    benchmarkResult.fails.forEach(f => console.error('  - [RED]: ' + f));
  } else {
    console.log('ALL CPU BENCHMARKS PASSED [GREEN]');
  }

  ws.close();
  cleanup();

  if (!benchmarkResult.passed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
