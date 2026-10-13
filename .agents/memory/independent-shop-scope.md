---
name: Independent shop scope
description: Why the new shop must not share the original boutique's source or database.
---

The new shop must remain independent of the existing deployed Bareeq Atelier boutique. Do not modify that site's source or reuse its database.

**Why:** The user explicitly asked to keep the existing project untouched.

**How to apply:** Keep shop work in its independent app. Even if the configured MongoDB URI points at the same Atlas cluster, select an independent database explicitly rather than trusting the URI's database path.
