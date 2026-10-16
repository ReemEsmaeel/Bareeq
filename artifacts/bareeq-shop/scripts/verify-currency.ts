import assert from "node:assert/strict";
import { formatPrice } from "../lib/format";
import { toMinorUnits } from "../lib/money";
import { productInput } from "../lib/validation";

assert.equal(toMinorUnits(50, "KWD"), 50_000);
assert.equal(toMinorUnits(0.125, "KWD"), 125);
assert.equal(toMinorUnits(50, "SAR"), 5_000);
assert.match(formatPrice(50, "en"), /50(?:[,.]000)/);
assert.match(formatPrice(680, "en", "SAR"), /680(?:[,.]00)/);

const product = {
  name: "Test piece",
  nameAr: "قطعة تجريبية",
  description: "Test",
  descriptionAr: "تجربة",
  image: "https://example.com/image.jpg",
  category: "Lujain",
};
assert.equal(productInput.safeParse({ ...product, price: 50.125 }).success, true);
assert.equal(productInput.safeParse({ ...product, price: 50.1255 }).success, false);

console.log("KWD formatting, three-decimal Stripe amounts, SAR history, and price validation passed.");
