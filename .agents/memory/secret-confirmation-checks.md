---
name: Secret confirmation checks
description: Distinguish secret availability from valid or actually updated configuration.
---

A secure-form response saying a secret was added or confirmed proves availability, not that its stored value was replaced or meets application requirements.

**Why:** Confirmation can leave a previously saved value unchanged. Repeating the same form is not evidence that an invalid setting has been corrected.

**How to apply:** Validate safe runtime outcomes or boolean constraints without logging values. If repeated confirmation leaves the same failure, ask the user to edit the existing Secrets entry directly. Restart the service after replacement; never weaken security checks or add a generated fallback.
