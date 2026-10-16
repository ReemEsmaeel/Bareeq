---
name: Independent shop scope
description: Why the new shop must not share the original boutique's source or database.
---

The new shop must remain independent of the existing deployed Bareeq Atelier boutique. Do not modify that site's source or reuse its database.

**Why:** The user explicitly asked to keep the existing project untouched.

**How to apply:** Keep shop work in its independent app. Even if the configured MongoDB URI points at the same Atlas cluster, select an independent database explicitly rather than trusting the URI's database path.

Keep the independent shop's existing authentication and database when changing photo storage; adapt storage guidance to Next.js rather than introducing Express or migrating the database.

**Why:** The user explicitly required photo uploads without Express, database replacement or changes to the original boutique's data.

**How to apply:** Treat generic storage recipes that suggest a different authentication or database stack as examples, not permission to replace this shop's stack.

Keep the independent shop hosted on Vercel when adapting photo storage, and copy existing photos without deleting their Replit originals.

**Why:** The user explicitly chose to keep Vercel and copy the existing photos to compatible storage after the deployed photo routes failed.

**How to apply:** Preserve existing product image links where possible. Do not treat a successful copy as permission to remove source files or change the original boutique.

Store product photo bytes in the shop's existing MongoDB database, not Cloudflare or Cloudinary.

**Why:** The user explicitly said “yes keep it on the database” after asking why photos required another connection.

**How to apply:** Keep photo storage within MongoDB and account for database capacity and Vercel upload limits. Do not activate another storage subscription or move photos to a separate provider without new approval.
