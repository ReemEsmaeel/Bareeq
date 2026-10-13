---
name: Session revision safety
description: Why session invalidation must be atomic with account-sensitive changes.
---

Update JWT session-revocation revisions atomically with the sensitive account change. When a change depends on previously validated state, use compare-and-swap; do not independently read, increment, and save the revision.

**Why:** Concurrent password or account-state changes can otherwise lose an increment, leaving an earlier token valid after a later sensitive change.

**How to apply:** Preserve this rule for password changes/resets, account activation changes, and private role promotion. Reject stale-state updates instead of silently overwriting newer security state.
