---
name: Next.js artifact hosting
description: Non-obvious hosting and scaffold constraints encountered when setting up Next.js.
---

For a dynamic Next.js artifact, use a structured production run command. A command string assigned to the static template's production `serve` field is rejected by artifact schema validation.

**Why:** The static artifact configuration does not represent a Next.js server with API routes.

**How to apply:** Preserve artifact registration and update hosting through validated temporary metadata, not direct edits to the manifest.

Next.js detects an empty `src/pages` directory. Removing its last file does not resolve an app/pages parent-directory mismatch; the empty directory must also be removed, or both routers must be placed under the same parent.

**Why:** This caused the preview to start listening and then exit despite a passing type check.

**How to apply:** Check leftover scaffold directories when Next.js reports that app and pages must be under the same folder.
