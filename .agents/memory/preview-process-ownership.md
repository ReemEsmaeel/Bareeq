---
name: Preview process ownership
description: A failed managed workflow may coexist with an older live preview process.
---

Do not assume a failed preview workflow means its listening server has stopped. Diagnose the process actually holding the configured port before changing code, ports, or launching another server.

**Why:** In this workspace, earlier preview process groups remained alive after workflow reconciliation. Replacement servers failed with `EADDRINUSE`, while a replacement Vite process silently chose another port. This was a process-ownership conflict rather than an application-code exception.

**How to apply:** For port-in-use failures, verify the listener's command and working directory against the affected artifact. Remove only confirmed stale preview processes, then restart the existing managed workflow and confirm its configured port and rendered preview. Preserve injected `PORT` and do not create duplicate workflows as a workaround.
