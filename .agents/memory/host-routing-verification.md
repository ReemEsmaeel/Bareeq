---
name: Host-routing verification
description: Avoiding false failures when testing hostname-based routing in this workspace.
---

When diagnosing host-specific redirects, confirm that the test client sends the intended HTTP Host before changing a working routing rule.

**Why:** In this workspace, Node fetch ignored a custom Host override, causing a valid redirect to appear to return a normal page. Curl and Node's HTTP request client sent the intended host correctly. Root redirect locations can also omit a trailing slash while representing the same URL.

**How to apply:** Use a client with explicit Host support for virtual-host routing checks, and compare redirect targets as parsed URLs rather than raw strings.
