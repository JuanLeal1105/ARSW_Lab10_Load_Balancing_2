#!/usr/bin/env node
/**
 * ARSW Lab 10 - Newman Concurrent Load Test
 * Envía 10 peticiones CONCURRENTES a la Azure Function Fibonacci
 *
 * Uso:
 *   npm install newman
 *   node run-concurrent.js --url https://<YOUR_APP>.azurewebsites.net
 */

const newman = require("newman");
const path = require("path");

const BASE_URL = process.argv.includes("--url")
    ? process.argv[process.argv.indexOf("--url") + 1]
    : "https://<YOUR_FUNCTION_APP_NAME>.azurewebsites.net";

const CONCURRENT_REQUESTS = 10;
const NTH_VALUES = [1000000, 1000000, 1000000, 1000000, 1000000,
                    1000000, 1000000, 1000000, 1000000, 1000000];

const collectionPath = path.join(__dirname, "fibonacci-collection.json");

console.log(`\n${"=".repeat(60)}`);
console.log(`  ARSW Lab 10 — Fibonacci Concurrent Load Test`);
console.log(`  Target: ${BASE_URL}`);
console.log(`  Concurrent requests: ${CONCURRENT_REQUESTS}`);
console.log(`${"=".repeat(60)}\n`);

const results = [];
const startAll = Date.now();

const runs = NTH_VALUES.map((nth, i) =>
    new Promise((resolve) => {
        const start = Date.now();
        newman.run(
            {
                collection: collectionPath,
                envVar: [{ key: "baseUrl", value: BASE_URL }],
                iterationCount: 1,
                reporters: "cli",
                reporter: { cli: { silent: true } },
                // Override body per request
                globalVar: [{ key: "nthValue", value: nth }],
            },
            (err, summary) => {
                const elapsed = Date.now() - start;
                const run = summary.run;
                const exec = run.executions[0];

                // exec.response.code is the numeric HTTP status (200, 500, etc.)
                // exec.response.status is the text ("OK", "Internal Server Error")
                // responseTime is not on the response object — use wall-clock elapsed
                const statusCode = err ? 0 : (exec && exec.response ? exec.response.code : 0);
                const responseTime = run.timings ? run.timings.completed - run.timings.started : elapsed;

                const result = {
                    request: i + 1,
                    nth,
                    statusCode,
                    statusText: err ? "ERROR" : (exec && exec.response ? exec.response.status : "NO_RESPONSE"),
                    responseTime,
                    wallTime: elapsed,
                    error: err ? err.message : null,
                    responseLength: exec && exec.response && exec.response.stream
                        ? exec.response.stream.length
                        : 0,
                    failed: err || run.failures.length > 0,
                };

                results.push(result);
                process.stdout.write(
                    `  [${i + 1}] nth=${nth} → ${result.statusCode} ${result.statusText} in ${result.responseTime}ms\n`
                );
                resolve(result);
            }
        );
    })
);

Promise.all(runs).then(() => {
    const totalWall = Date.now() - startAll;
    const successful = results.filter((r) => r.statusCode === 200 && !r.failed);
    const failed = results.filter((r) => r.statusCode !== 200 || r.failed);
    const times = successful.map((r) => r.responseTime);
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const min = times.length ? Math.min(...times) : 0;
    const max = times.length ? Math.max(...times) : 0;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  RESULTADOS`);
    console.log(`${"=".repeat(60)}`);
    console.log(`  Total requests:    ${CONCURRENT_REQUESTS}`);
    console.log(`  Successful:        ${successful.length}`);
    console.log(`  Failed:            ${failed.length}`);
    console.log(`  Wall-clock time:   ${totalWall}ms`);
    console.log(`  Avg response time: ${avg}ms`);
    console.log(`  Min response time: ${min}ms`);
    console.log(`  Max response time: ${max}ms`);
    console.log(`${"=".repeat(60)}\n`);
});
