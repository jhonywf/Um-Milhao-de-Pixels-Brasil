---
name: Connector browser boundary
description: Non-obvious constraint for Replit connector usage in browser applications.
---

Connector calls must stay server-side for this project. The current Replit connectors SDK imports Node-only identity modules when bundled into a Vite browser app, causing a runtime crash before React renders.

**Why:** The browser bundle cannot provide `node:child_process` and `node:util`; the failure is runtime-only and can look like a blank preview.

**How to apply:** Keep the connector SDK in `artifacts/api-server` (or another server boundary) and expose a narrow application endpoint to the web artifact. The frontend should use that endpoint with the user's session token where needed.

The connected Supabase integration exposes PostgREST/Storage REST access, not an administrative SQL executor. DDL, views, triggers, and Storage bucket policies must be applied through the Supabase SQL Editor or another admin-capable path; an anon-key REST request cannot create the bucket.