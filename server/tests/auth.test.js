import { requirePermission } from '../src/middleware/requirePermission.js';
// Simple mock framework
let passed = 0;
let failed = 0;
function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`✅ ${message}`);
    }
    else {
        failed++;
        console.error(`❌ ${message}`);
    }
}
// Mock express Request/Response
const mockResponse = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};
// Test Permission Middleware
console.log('--- Testing Permission Middleware ---');
const middleware = requirePermission('products.create');
// Test 1: No membership
const req1 = {};
const res1 = mockResponse();
middleware(req1, res1, () => { });
assert(res1.statusCode === 403, 'Should return 403 if no membership context exists');
// Test 2: Missing permission
const req2 = { membership: { permissions: ['products.read'] } };
const res2 = mockResponse();
middleware(req2, res2, () => { });
assert(res2.statusCode === 403, 'Should return 403 if permission is missing');
// Test 3: Has permission
let nextCalled = false;
const req3 = { membership: { permissions: ['products.create'] } };
const res3 = mockResponse();
middleware(req3, res3, () => { nextCalled = true; });
assert(nextCalled === true, 'Should call next() if user has correct permission');
console.log(`\nTests finished: ${passed} passed, ${failed} failed`);
if (failed > 0)
    process.exit(1);
//# sourceMappingURL=auth.test.js.map