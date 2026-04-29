#!/usr/bin/env node
/**
 * ARSW Lab 10 - Newman Concurrent Load Test
 * Envía 10 peticiones CONCURRENTES a la Azure Function Fibonacci
 *
 * Uso:
 *   node run-concurrent.js --url https://<YOUR_APP>.azurewebsites.net [--nth 1000000]
 *
 * El valor nth se pasa como variable a la colección de Postman,
 * reemplazando {{nthValue}} en el body del request.
 */

const newman = require("newman");
const path   = require("path");

const BASE_URL = process.argv.includes("--url")
    ? process.argv[process.argv.indexOf("--url") + 1]
    : "https://<YOUR_FUNCTION_APP_NAME>.azurewebsites.net";

const NTH = process.argv.includes("--nth")
    ? parseInt(process.argv[process.argv.indexOf("--nth") + 1])
    : 1000000;

const CONCURRENT_REQUESTS = 10;
const collectionPath = path.join(__dirname, "fibonacci-collection.json");

console.log(`\n${"=".repeat(60)}`);
console.log(`  ARSW Lab 10 — Fibonacci Concurrent Load Test`);
console.log(`  Target: ${BASE_URL}`);
console.log(`  Concurrent requests: ${CONCURRENT_REQUESTS}  (nth=${NTH})`);
console.log(`${"=".repeat(60)}\n`);

const results  = [];
const startAll = Date.now();

const runs = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
    new Promise((resolve) => {
        newman.run(
            {
                collection:    collectionPath,
                // Pass BOTH baseUrl and nthValue so the collection body uses the right nth
                envVar: [
                    { key: "baseUrl",   value: BASE_URL },
                    { key: "nthValue",  value: NTH      }
                ],
                iterationCount: 1,
                reporters:     "cli",
                reporter:      { cli: { silent: true } },
                // No timeoutRequest — let Azure's own timeout govern (up to 10 min Consumption)
            },
            (err, summary) => {
                const wallTime = Date.now() - startAll;
                const run      = summary.run;
                const exec     = run.executions && run.executions[0];
                const response = exec && exec.response;

                const statusCode   = err ? 0 : (response ? response.code   : 0);
                const statusText   = err ? "ERROR" : (response ? response.status : "NO_RESPONSE");
                const responseTime = run.timings
                    ? run.timings.completed - run.timings.started
                    : wallTime;
                const testsFailed  = run.failures ? run.failures.length : 0;
                const isSuccessful = !err && statusCode === 200 && testsFailed === 0;

                const result = {
                    request: i + 1,
                    statusCode,
                    statusText,
                    responseTime,
                    isSuccessful,
                    testsFailed,
                    error: err ? err.message : null,
                };

                results.push(result);
                const mark = isSuccessful ? "✓" : "✗";
                process.stdout.write(
                    `  ${mark} [${String(i + 1).padStart(2)}] → ${statusCode} ${statusText} in ${responseTime}ms\n`
                );
                resolve(result);
            }
        );
    })
);

Promise.all(runs).then(() => {
    const totalWall  = Date.now() - startAll;
    const successful = results.filter((r) => r.isSuccessful);
    const failed     = results.filter((r) => !r.isSuccessful);
    const times      = successful.map((r) => r.responseTime);
    const avg  = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const min  = times.length ? Math.min(...times) : 0;
    const max  = times.length ? Math.max(...times) : 0;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  RESULTADOS`);
    console.log(`${"=".repeat(60)}`);
    console.log(`  Total requests:    ${CONCURRENT_REQUESTS}`);
    console.log(`  Successful (200):  ${successful.length}`);
    console.log(`  Failed:            ${failed.length}`);
    console.log(`  Wall-clock time:   ${totalWall}ms`);
    console.log(`  Avg response time: ${avg}ms`);
    console.log(`  Min response time: ${min}ms`);
    console.log(`  Max response time: ${max}ms`);

    if (failed.length > 0) {
        console.log(`\n  Failed requests:`);
        failed.forEach((r) => {
            console.log(`    [${r.request}] HTTP ${r.statusCode} | testsFailed=${r.testsFailed} | err=${r.error || "none"}`);
        });
    }

    console.log(`${"=".repeat(60)}\n`);
});
