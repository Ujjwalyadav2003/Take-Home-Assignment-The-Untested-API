# Bug Report — Task Manager API

## Bug 1 (FIXED): `getByStatus` matches on substring, not exact status

**File:** `src/services/taskService.js`

**Expected behavior:** `GET /tasks?status=todo` should return only tasks whose
status is exactly `"todo"`.

**Actual behavior:** It also returns tasks with unrelated statuses whenever
the status string happens to be a substring match. The original code was:

```js
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

Since `status` is a string, `.includes()` does a substring check, not
equality. For example, `"done".includes("do")` is `true`, and so is
`"todo".includes("do")` — so filtering by a partial value like `do` silently
returns tasks from both statuses. Even with exact enum values this is a
correctness landmine (it works today only because none of the three status
strings — `todo`, `in_progress`, `done` — happen to be substrings of another;
adding any future status like `on_hold` next to `hold` would break it).

**How I found it:** Writing a test that filters by `todo` and asserting every
returned task's status field. When I checked with a partial value (`do`) to
understand the matching logic, both `todo` and `done` tasks came back.

**Fix:** Use exact equality: `tasks.filter((t) => t.status === status)`.
This is the fix I implemented. See `taskService.test.js` /
`tasks.routes.test.js` for the regression tests.

---

## Bug 2 (NOT FIXED): Pagination offset is off by one page

**File:** `src/services/taskService.js`

**Expected behavior:** `GET /tasks?page=1&limit=10` should return the first
10 tasks (offset 0).

**Actual behavior:** It returns tasks 11–20 instead, because:

```js
const offset = page * limit;
```

The route layer defaults `page` to `1` (1-indexed), so page 1 computes
`offset = 1 * 10 = 10` — the first page of results is silently skipped.
Page 2 shows what should be page 3's data, and so on.

**How I found it:** Created 5 tasks and requested `?page=1&limit=2`,
expecting the first two tasks back; got tasks 3 and 4 instead.

**What a fix looks like:**
```js
const offset = (page - 1) * limit;
```

---

## Bug 3 (NOT FIXED): Completing a task resets its priority

**File:** `src/services/taskService.js`, `completeTask`

**Expected behavior:** `PATCH /tasks/:id/complete` should only change
`status` and `completedAt` — priority is unrelated to completion and
shouldn't change.

**Actual behavior:**
```js
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};
```
Every completed task has its priority forced to `'medium'`, even if it was
originally `high` or `low`. This looks like a copy-paste artifact rather
than intentional behavior — there's nothing in the spec suggesting
completion should touch priority.

**How I found it:** Created a `high` priority task, completed it, and
noticed the returned task's `priority` had silently changed to `medium`.

**What a fix looks like:** Drop the `priority: 'medium'` line entirely so
the spread preserves the task's existing priority:
```js
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Minor / worth a second look (not full bugs, flagged for follow-up)

- `validateCreateTask` / `validateUpdateTask` skip status/priority
  validation when the value is falsy (`if (body.status && ...)`), so an
  explicit `status: ""` silently passes and produces a task with an
  invalid empty status string that `getStats()` won't count anywhere.
- `update()` (used by `PUT /tasks/:id`) merges the raw request body
  directly onto the existing task with no field whitelist, so a client
  could overwrite `id`, `createdAt`, or `completedAt` by including them
  in the request body.
