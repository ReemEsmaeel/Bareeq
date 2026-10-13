import assert from "node:assert/strict";
import { safeNext } from "../lib/next-path";

for (const value of [undefined, null, "", "https://example.invalid", "//example.invalid", "/orders\\unsafe", "/unrecognized", "/orders-not-allowed"]) {
  assert.equal(safeNext(value), "/products", "Default sign-in must open Collections without permitting an unsafe return URL.");
  assert.equal(safeNext(value, "/account"), "/account", "Sign-up must preserve its account-page fallback.");
}
for (const value of ["/products", "/products?category=Lujain", "/products/123", "/account", "/cart", "/orders", "/orders/123", "/admin", "/admin/settings"]) {
  assert.equal(safeNext(value), value, "Valid internal return destinations must be preserved.");
  assert.equal(safeNext(value, "/account"), value);
}
console.log("Sign-in destination checks passed: Collections default, unchanged sign-up fallback, protected return links and unsafe URL rejection.");
