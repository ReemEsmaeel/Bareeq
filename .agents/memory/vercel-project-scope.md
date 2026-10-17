---
name: Vercel project-scoped access
description: Handling Vercel connector permissions without unnecessary token replacement.
---

A Vercel connection can successfully list and manage the shop project even when listing teams returns a permission error.

**Why:** The connected token allowed project and environment-variable requests but denied the teams directory. A denied directory request alone did not mean the connection was unusable.

**How to apply:** Resolve the shop through the projects endpoint, then use its returned account ID as the team scope for project-specific requests. Do not request a broader token or reconnect solely to list teams when all required project operations already work. Never request decrypted environment values for configuration checks.
