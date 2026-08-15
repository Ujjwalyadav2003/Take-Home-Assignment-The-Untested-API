const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

// BUG FIX: was `t.status.includes(status)`, which does a SUBSTRING match
// (e.g. "done".includes("do") === true), so filtering by ?status=do
// incorrectly returned both "todo" and "done" tasks. Status is an enum,
// so this should always be an exact match.
const getByStatus = (status) => tasks.filter((t) => t.status === status);

const getPaginated = (page, limit) => {
  // NOTE: page is 1-indexed by the route layer (defaults to 1).
  // Known bug NOT fixed here (see BUGS.md #2): offset should be
  // (page - 1) * limit, not page * limit. Left as-is intentionally —
  // see bug report for why and how to fix it.
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;
  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });
  return { ...counts, overdue };
};

const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null }) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
};

const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;
  // Known bug NOT fixed here (see BUGS.md #3): this resets priority to
  // 'medium' on every completion, clobbering the task's real priority.
  const updated = {
    ...task,
    priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

// NEW: Part C — assign a task to a user.
const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updated = { ...tasks[index], assignee };
  tasks[index] = updated;
  return updated;
};

const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};
