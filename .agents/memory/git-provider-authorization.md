---
name: Git provider authorization
description: Integration status alone does not prove workspace Git commands can authenticate.
---

Verify GitHub authorization with an actual Git operation rather than treating an active or healthy integration status as proof that pushing works.

**Why:** The integration reported active/healthy access while workspace Git rejected its credentials and GitHub CLI had no authorization. The connection and reconnection tools also disagreed about whether the integration was attached.

**How to apply:** Preserve local commits and remotes when authentication fails. Follow the integration recovery flow once; if attachment state remains inconsistent, report the blocker and use the documented native Git connection setup rather than repeating connection prompts. Never report a successful push until Git confirms it, and never expose or manually extract credentials.
