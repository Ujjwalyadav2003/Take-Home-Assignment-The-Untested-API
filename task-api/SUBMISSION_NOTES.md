# Submission Notes

## What I'd test next with more time
- Concurrent-write behavior on the in-memory store (no locking — two
  simultaneous requests updating the same task could race).
- Boundary values for pagination (`limit=0`, negative `page`, non-numeric
  `page`/`limit` that `parseInt` silently coerces).
- `dueDate` edge cases — timezone handling, and whether a `dueDate` in the
  past should be rejected on creation vs. just surfaced later via `/stats`.
- Whether `assignee` should be validated against a real user list rather
  than accepting any string.

## What surprised me in the codebase
- `getByStatus`'s substring match (Bug 1) — a subtle correctness bug that
  passes casual manual testing (curling with real status values) but fails
  the moment you test with adjacent/partial values.
- `completeTask` quietly resetting `priority` — easy to miss unless you
  specifically assert on fields you didn't touch.
- There's no single-resource `GET /tasks/:id` endpoint — only list/filter
  endpoints. Not a bug per the spec, but worth confirming it's intentional
  before shipping.

## Questions I'd ask before shipping this to production
- Should the in-memory store be replaced with persistent storage before
  this goes live, or is that explicitly out of scope for now?
- Is `assignee` meant to reference a real user ID/account, or is a free-text
  name acceptable long-term?
- Should reassigning an already-assigned task require extra confirmation,
  or is silent overwrite (what I implemented) the desired behavior?
- Is there an auth/authorization layer planned — right now anyone can
  create, edit, delete, or assign any task.

## Design decisions on `PATCH /tasks/:id/assign`
- `assignee` is required and must be a non-empty string after trimming —
  matches the validation style already used elsewhere in `validators.js`.
- Reassigning a task that already has an assignee is allowed (last write
  wins) rather than blocked, since nothing in the spec suggests assignment
  should be one-time-only, and blocking it would need a separate
  "unassign" endpoint that wasn't asked for.
- 404 returned before validation errors are checked against the DB (i.e.
  validation runs first via `validateAssignTask`, then existence is
  checked) — consistent with how `PUT /tasks/:id` already does it.
