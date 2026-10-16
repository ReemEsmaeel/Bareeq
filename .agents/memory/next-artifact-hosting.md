---
name: Next.js artifact hosting
description: Non-obvious hosting and scaffold constraints encountered when setting up Next.js.
---

Keep direct image delivery enabled for the current routed Vercel deployment unless the optimizer route is independently verified.

**Why:** MongoDB photo URLs returned valid images in production while `/_next/image` returned 404 even for bundled assets, leaving homepage `next/image` content missing despite a successful database migration.

**How to apply:** Check both raw photo URLs and browser-generated optimizer URLs when diagnosing photos. Do not assume a working photo API proves homepage image rendering works, or re-enable optimization without testing the published route.

For a dynamic Next.js artifact, use a structured production run command. A command string assigned to the static template's production `serve` field is rejected by artifact schema validation.

**Why:** The static artifact configuration does not represent a Next.js server with API routes.

**How to apply:** Preserve artifact registration and update hosting through validated temporary metadata, not direct edits to the manifest.

Next.js detects an empty `src/pages` directory. Removing its last file does not resolve an app/pages parent-directory mismatch; the empty directory must also be removed, or both routers must be placed under the same parent.

**Why:** This caused the preview to start listening and then exit despite a passing type check.

**How to apply:** Check leftover scaffold directories when Next.js reports that app and pages must be under the same folder.

Keep Next.js production output out of Git, but include it in the published runtime image. Do not exclude the entire `.next` folder in `.replitignore`; exclude only its development and cache directories.

**Why:** A publishing build compiled successfully, then failed during startup because the image exclusion rules removed the compiled production build. `next start` requires that output even though it is generated.

**How to apply:** Treat Git exclusions and publishing exclusions separately. Confirm the packaged output retains `BUILD_ID`, server and static files, and verify the production start command before suggesting another publish attempt.

For Vercel, keep the customer shop deployment isolated from the workspace's internal design-preview tooling. Vercel's Services model supports the Next.js app as a single service, but services are private unless exposed through top-level rewrites.

**Why:** A recursive workspace build includes development-only tooling that requires Replit runtime variables. Supplying dummy variables on Vercel would conceal the wrong deployment scope rather than fix it.

**How to apply:** Scope the build to the shop package and route public paths to that service. Keep the Vercel project root at the repository root when service roots are repository-relative. Verify portability without Replit-specific port/base-path variables; do not remove the sandbox's preview safeguards.
