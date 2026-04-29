var bigInt = require("big-integer");

// Module-level cache — persists across warm invocations on the same instance
const memo = new Map();

// Seed base cases once
memo.set(0, bigInt.zero);
memo.set(1, bigInt.one);

/**
 * Fills the memo iteratively up to n, then returns memo.get(n).
 * This avoids call stack overflow for large n while still demonstrating
 * memoization: if the cache already covers n, the loop body never runs.
 */
function fibMemo(n) {
    if (n < 0) throw new Error("must be greater than 0");

    // Find the highest value already cached
    let start = memo.size; // memo has 0..size-1 after sequential fills

    // Fill iteratively from where we left off up to n
    for (let i = start; i <= n; i++) {
        if (!memo.has(i)) {
            memo.set(i, memo.get(i - 1).add(memo.get(i - 2)));
        }
    }

    return memo.get(n);
}

module.exports = async function (context, req) {
    context.log("FibonacciMemo HTTP trigger processed a request.");

    const raw = req.body && req.body.nth !== undefined
        ? req.body.nth
        : (req.query.nth ? req.query.nth : undefined);

    const nth = parseInt(raw);

    if (raw === undefined || isNaN(nth)) {
        context.res = { status: 400, body: "Please pass { nth: <number> } in the request body." };
        return;
    }

    const cacheHit  = memo.has(nth);      
    const cacheSizeBefore = memo.size;

    let answer;
    try {
        answer = fibMemo(nth);
    } catch (e) {
        context.res = { status: 400, body: e.message || String(e) };
        return;
    }

    context.res = {
        body: {
            nth,
            fibonacci:      answer.toString(),
            cacheHit,                         
            cachedEntries:  cacheSizeBefore, 
        }
    };
};
