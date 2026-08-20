---
name: OpenAPI integer compatibility
description: A code-generation compatibility constraint for this workspace's Orval and Zod versions.
---

When defining numeric IDs, counts, or limits in the OpenAPI contract, use `type: number` plus validation bounds rather than `type: integer`.

**Why:** The installed Orval/Zod combination generates `zod.int()` for OpenAPI `integer`; the installed Zod version does not provide that helper, so the generated API Zod library fails type checking.

**How to apply:** After modifying an API schema, run code generation immediately. If a generated schema contains `zod.int()`, revise the source OpenAPI numeric field to `type: number` and preserve any minimum/maximum constraints.