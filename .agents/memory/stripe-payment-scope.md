---
name: Stripe payment scope
description: User-approved direct Stripe integration while preserving MongoDB and Vercel.
---

Use the user's own Stripe account through a direct API integration, while keeping the existing Next.js, MongoDB, and Vercel setup.

**Why:** The user explicitly approved this approach after the managed Replit Stripe setup was explained as incompatible with the project's no-PostgreSQL and external-hosting requirements.

**How to apply:** Do not provision PostgreSQL or depend on Replit-managed runtime credentials for checkout on Vercel. Keep secrets server-side and configure the target deployment separately. Use Stripe-hosted payment entry rather than collecting card details in the shop.
