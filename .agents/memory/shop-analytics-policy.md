---
name: Shop analytics policy
description: Product meaning and privacy constraints for the independent shop's outcome measurements.
---

Treat recorded orders as atelier requests, never as paid purchases or collected revenue, even when reporting their SAR value.

**Why:** The user explicitly specified that this milestone never charges payment and requested `order_recorded`, not a paid-purchase event.

**How to apply:** Preserve this distinction in future instrumentation and reports; do not infer payment from an order submission.

Keep funnel measurements privacy-minimal: no customer or order identifiers, personal details, secrets, or free-form content in custom events.

**Why:** The user requested only safe scalar dimensions for understanding the independent storefront-to-order funnel.

**How to apply:** Extend analytics with aggregate dimensions rather than introducing identity-based attribution or replay.
