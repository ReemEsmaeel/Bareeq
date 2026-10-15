---
name: Secret confirmation checks
description: Distinguish secret availability from valid or actually updated configuration.
---

A secure-form response saying a secret was added or confirmed proves availability, not that its stored value was replaced or meets application requirements.

**Why:** Confirmation can leave a previously saved value unchanged. Repeating the same form is not evidence that an invalid setting has been corrected.

**How to apply:** Validate safe runtime outcomes or boolean constraints without logging values. If repeated confirmation leaves the same failure, ask the user to edit the existing Secrets entry directly. Restart the service after replacement; never weaken security checks or add a generated fallback.

Replit secret availability does not establish configuration in the shop's separate Vercel deployment.

**Why:** The Replit shop passed its database/session configuration checks while the Vercel site rejected its JWT configuration and could not load database-backed products. Reopening a Replit secret form would target the wrong runtime.

**How to apply:** For Vercel failures, have the user verify the existing values in Vercel's appropriate environment and redeploy. Never request values in chat, assume that a Replit-side update configures Vercel, or treat local readiness as proof that the Vercel deployment is healthy.

Workspace editing safeguards can reject `.env` file creation even when the proposed file is only an empty template.

**Why:** The environment-file editing guard explicitly blocks these filesystem writes to protect secrets.

**How to apply:** Do not bypass the blocked write using another tool or filename. Explain the limitation and provide blank text instructions for the user to fill privately on their device, or direct them to the target platform's secure environment settings. Never export actual secret values.
