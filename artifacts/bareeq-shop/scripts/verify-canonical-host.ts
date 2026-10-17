import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const base = process.argv[2] ?? "http://localhost:23542";
const canonical = "https://bareeq-wkla.vercel.app";
const aliases = [
  "bareeq-wkla-reem-396b.vercel.app",
  "bareeq-wkla-git-main-reem-396b.vercel.app",
];

function probe(host: string, path: string) {
  return new Promise<{ status: number | undefined; location: string | undefined }>((resolve, reject) => {
    const url = new URL(path, base);
    const request = url.protocol === "https:" ? httpsRequest : httpRequest;
    // Node fetch does not reliably forward a custom Host header.
    const req = request(url, { headers: { Host: host } }, (response) => {
      response.resume();
      resolve({ status: response.statusCode, location: response.headers.location });
    });
    req.on("error", reject);
    req.end();
  });
}

async function verify() {
  for (const host of aliases) {
    for (const path of ["/", "/products?category=Lujain", "/login?next=%2Forders"]) {
      const response = await probe(host, path);
      assert.equal(response.status, 308, `${host}${path} must redirect permanently.`);
      assert.equal(
        new URL(response.location!).href,
        new URL(path, canonical).href,
        "Redirect must preserve the path and query on the fixed canonical host.",
      );
    }
  }

  // The canonical site must not loop, and arbitrary hosts must not match
  // either alias's host expression (including regex-like near matches).
  for (const host of [
    "bareeq-wkla.vercel.app",
    "unrelated.example.invalid",
    "bareeq-wkla-reem-396bXvercelYapp",
  ]) {
    const response = await probe(host, "/login");
    assert.equal(response.status, 200, `${host} must not match the alias redirect.`);
    assert.equal(response.location, undefined);
  }
  console.log("Canonical-host checks passed: both aliases redirect, paths and queries survive, and unrelated hosts do not match.");
}

verify().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
