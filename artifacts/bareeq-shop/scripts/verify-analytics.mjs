// Exercise the actual TypeScript success handlers without a database or test accounts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");
const compile = (text) => ts.transpileModule(text, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const analytics = compile(source("lib/analytics.ts"));

function handler(path, name) {
  const text = source(path);
  const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn;
  let eventCalls = 0;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) fn = node;
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "trackEvent") {
      eventCalls++;
      let parent = node.parent;
      while (parent && !ts.isFunctionDeclaration(parent)) parent = parent.parent;
      assert.equal(parent?.name?.text, name, "Events must stay in action handlers, not mount effects");
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(fn);
  assert.equal(eventCalls, 1);
  return compile(`${fn.getText(tree)}\n globalThis.runAction = ${name};`);
}

const handlers = {
  signup: handler("components/auth-form.tsx", "submit"),
  bag: handler("app/products/[id]/product-detail.tsx", "add"),
  order: handler("app/cart/cart-view.tsx", "place"),
};

class ApiError extends Error {
  constructor(status) { super("Rejected"); this.status = status; }
}
const product = { id: "private-product-id", name: "Private piece name", category: "Wahaj", price: 12.35 };
const order = {
  id: "private-order-id", customer: { email: "private@example.invalid" },
  items: [{ name: "Private piece", product: product.id, quantity: 2 }], total: 24.7,
};

function context(tracker = { track() {} }, extra = {}) {
  const calls = [];
  const notices = [];
  const routes = [];
  const sandbox = {
    exports: {}, console, ApiError,
    window: tracker === null ? {} : { umami: tracker },
    mode: "signup", name: "Private Name", email: "private@example.invalid", password: "private-password",
    product, quantity: 2, user: { id: "private-user-id" },
    cart: { quote: "private-quote" }, needsRefresh: false,
    scopeGuard: () => () => true,
    refreshUser: async () => {}, reload: async () => true,
    router: { push: (url) => routes.push(url), replace: (url) => routes.push(url), refresh() {} },
    next: "/account", c: { added: "Added", review: "Review", reloadFailed: "Reload" },
    setBusy() {}, setError() {}, setPlacing() {}, setMessage() {}, setNeedsRefresh() {},
    setNotice: (notice) => notices.push(notice),
    api: async (path) => {
      calls.push(path);
      return path === "/orders" ? order : path === "/cart" ? { items: [{ product, quantity: 2 }] } : {};
    },
    ...extra,
  };
  vm.createContext(sandbox);
  vm.runInContext(analytics, sandbox);
  sandbox.trackEvent = sandbox.exports.trackEvent;
  return { sandbox, calls, notices, routes };
}

async function run(which, tracker, extra) {
  const state = context(tracker, extra);
  vm.runInContext(handlers[which], state.sandbox);
  // Evaluating/mounting the handler source does not emit anything.
  await state.sandbox.runAction({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  return state;
}

let assertions = 0;
for (const which of ["signup", "bag", "order"]) {
  const events = [];
  const tracker = { track: (name, data) => events.push(JSON.parse(JSON.stringify({ name, data }))) };
  const state = context(tracker);
  vm.runInContext(handlers[which], state.sandbox);
  assert.equal(events.length, 0, "Reload/mount must not emit");
  await state.sandbox.runAction({ preventDefault() {} });
  assert.equal(events.length, 1);
  const expected = {
    signup: { name: "account_created" },
    bag: { name: "add_to_bag", data: { collection: "Wahaj", quantity: 2, value_sar: 24.7 } },
    order: { name: "order_recorded", data: { quantity: 2, value_sar: 24.7 } },
  };
  assert.deepEqual(events[0], expected[which]);
  for (const status of [400, 401, 409, 500]) {
    events.length = 0;
    await run(which, tracker, { api: async () => { throw new ApiError(status); } });
    assert.equal(events.length, 0, `No ${which} event for HTTP ${status}`);
  }
  for (const broken of [
    null,
    { track() { throw new Error("Blocked"); } },
    { track: () => Promise.reject(new Error("Offline")) },
    { get track() { throw new Error("Unavailable"); } },
  ]) {
    const completed = await run(which, broken);
    if (which === "bag") assert.equal(completed.notices.at(-1)?.ok, true);
    else assert.equal(completed.routes.length, 1, "Analytics must not block navigation");
  }
  assertions++;
}

const events = [];
const tracker = { track: (name, data) => events.push({ name, data }) };
await run("signup", tracker, { mode: "login" });
await run("bag", tracker, { user: null });
assert.equal(events.length, 0, "Login and guest redirects are not outcomes");
// Signup was recorded even if later session refresh fails.
await run("signup", tracker, { refreshUser: async () => { throw new Error("Offline"); } });
assert.equal(events.length, 1);
events.length = 0;
// Use the saved order response, not stale bag totals; emit even if the account changed.
await run("order", tracker, { cart: { quote: "quote", total: 999 }, scopeGuard: () => () => false });
assert.equal(events[0].data.value_sar, 24.7);
const privacy = context(tracker);
privacy.sandbox.trackEvent("order_recorded", { quantity: 2, value_sar: 24.7, email: "private@example.invalid" });
assert.deepEqual(Object.keys(events.at(-1).data).sort(), ["quantity", "value_sar"]);
const length = events.length;
privacy.sandbox.trackEvent("add_to_bag", { quantity: 1, value_sar: 12, collection: "free-form" });
privacy.sandbox.trackEvent("order_recorded", { quantity: 0, value_sar: NaN });
assert.equal(events.length, length, "Reject invalid dimensions");
delete privacy.sandbox.window;
assert.doesNotThrow(() => privacy.sandbox.trackEvent("account_created", undefined));
console.log(`Analytics verified: ${assertions} success handlers, failure paths, no reload events, safe payloads, and absent/throwing/rejecting trackers.`);
