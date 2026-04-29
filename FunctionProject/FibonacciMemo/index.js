var bigInt = require("big-integer");

// Module-level memo cache — persists across warm invocations within the same instance
const memo = new Map();

function fibMemo(n) {
    if (n < 0) throw new Error("must be greater than 0");
    if (n === 0) return bigInt.zero;
    if (n === 1) return bigInt.one;

    if (memo.has(n)) return memo.get(n);

    const result = fibMemo(n - 1).add(fibMemo(n - 2));
    memo.set(n, result);
    return result;
}

module.exports = async function (context, req) {
    context.log("FibonacciMemo HTTP trigger processed a request.");

    const nth = req.body && req.body.nth !== undefined ? req.body.nth : (req.query.nth ? parseInt(req.query.nth) : undefined);

    if (nth === undefined || isNaN(nth)) {
        context.res = { status: 400, body: "Please pass { nth: <number> } in the request body." };
        return;
    }

    const cacheHit = memo.has(nth);
    const cacheSize = memo.size;

    let answer;
    try {
        answer = fibMemo(nth);
    } catch (e) {
        context.res = { status: 400, body: e.message || e };
        return;
    }

    context.res = {
        body: {
            nth: nth,
            fibonacci: answer.toString(),
            cacheHit: cacheHit,
            cachedEntries: cacheSize
        }
    };
};
