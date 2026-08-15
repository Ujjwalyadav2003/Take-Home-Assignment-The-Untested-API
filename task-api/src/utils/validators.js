const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

const validateCreateTask = (body) => {
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

const validateUpdateTask = (body) => {
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

// NEW: Part C — validation for PATCH /tasks/:id/assign
// Design decision: `assignee` is required and must be a non-empty string
// after trimming. An empty string ("" or whitespace-only) is rejected
// with a 400 rather than silently accepted or treated as "unassign" —
// unassigning isn't in scope per the brief, so we keep this endpoint's
// job narrow: assign to a named person, nothing else.
const validateAssignTask = (body) => {
  if (
    body.assignee === undefined ||
    typeof body.assignee !== 'string' ||
    body.assignee.trim() === ''
  ) {
    return 'assignee is required and must be a non-empty string';
  }
  return null;
};

module.exports = { validateCreateTask, validateUpdateTask, validateAssignTask };
