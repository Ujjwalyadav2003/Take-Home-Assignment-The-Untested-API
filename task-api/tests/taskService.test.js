const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('create', () => {
  test('creates a task with defaults applied', () => {
    const task = taskService.create({ title: 'Write tests' });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Write tests');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  test('creates a task with explicit fields', () => {
    const task = taskService.create({
      title: 'Ship feature',
      description: 'important',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-01-01T00:00:00.000Z',
    });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
  });
});

describe('findById', () => {
  test('finds an existing task', () => {
    const created = taskService.create({ title: 'Find me' });
    expect(taskService.findById(created.id)).toEqual(created);
  });

  test('returns undefined for unknown id', () => {
    expect(taskService.findById('nope')).toBeUndefined();
  });
});

describe('getByStatus', () => {
  test('returns only exact status matches (regression test for substring bug)', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    taskService.create({ title: 'C', status: 'todo' });

    const todoTasks = taskService.getByStatus('todo');
    expect(todoTasks).toHaveLength(2);
    expect(todoTasks.every((t) => t.status === 'todo')).toBe(true);
  });

  test('does not match a status that is merely a substring of another', () => {
    // "done" contains "do", and "todo" contains "do" too — this is
    // exactly the case the old `.includes()` implementation got wrong.
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });

    const result = taskService.getByStatus('do');
    expect(result).toHaveLength(0);
  });

  test('returns empty array when no tasks match', () => {
    taskService.create({ title: 'A', status: 'todo' });
    expect(taskService.getByStatus('done')).toHaveLength(0);
  });
});

describe('getPaginated', () => {
  test('slices tasks using the given page and limit', () => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
    // Documents current (buggy) behavior: page * limit offset.
    // See BUGS.md #2 for why this is wrong and how it should behave.
    const result = taskService.getPaginated(0, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 1');
  });

  test('returns an empty array past the end of the list', () => {
    taskService.create({ title: 'Only task' });
    const result = taskService.getPaginated(5, 10);
    expect(result).toHaveLength(0);
  });
});

describe('getStats', () => {
  test('counts tasks by status and overdue tasks', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    taskService.create({
      title: 'C',
      status: 'todo',
      dueDate: '2000-01-01T00:00:00.000Z', // in the past
    });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.done).toBe(1);
    expect(stats.in_progress).toBe(0);
    expect(stats.overdue).toBe(1);
  });

  test('does not count a done task as overdue even with a past dueDate', () => {
    taskService.create({
      title: 'A',
      status: 'done',
      dueDate: '2000-01-01T00:00:00.000Z',
    });
    expect(taskService.getStats().overdue).toBe(0);
  });
});

describe('update', () => {
  test('merges fields into an existing task', () => {
    const created = taskService.create({ title: 'Original' });
    const updated = taskService.update(created.id, { title: 'Updated', priority: 'high' });
    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
    expect(updated.id).toBe(created.id);
  });

  test('returns null for unknown id', () => {
    expect(taskService.update('nope', { title: 'x' })).toBeNull();
  });
});

describe('remove', () => {
  test('deletes an existing task and returns true', () => {
    const created = taskService.create({ title: 'To delete' });
    expect(taskService.remove(created.id)).toBe(true);
    expect(taskService.findById(created.id)).toBeUndefined();
  });

  test('returns false for unknown id', () => {
    expect(taskService.remove('nope')).toBe(false);
  });
});

describe('completeTask', () => {
  test('marks a task done and sets completedAt', () => {
    const created = taskService.create({ title: 'Finish me', priority: 'high' });
    const completed = taskService.completeTask(created.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
  });

  test('returns null for unknown id', () => {
    expect(taskService.completeTask('nope')).toBeNull();
  });

  test('documents current behavior: priority is reset to medium (see BUGS.md #3)', () => {
    const created = taskService.create({ title: 'High priority task', priority: 'high' });
    const completed = taskService.completeTask(created.id);
    // This assertion documents the existing bug rather than endorsing it —
    // see the bug report for why this is unexpected and how to fix it.
    expect(completed.priority).toBe('medium');
  });
});

describe('assignTask', () => {
  test('sets the assignee on an existing task', () => {
    const created = taskService.create({ title: 'Assign me' });
    const assigned = taskService.assignTask(created.id, 'Priya');
    expect(assigned.assignee).toBe('Priya');
  });

  test('returns null for unknown id', () => {
    expect(taskService.assignTask('nope', 'Priya')).toBeNull();
  });

  test('overwrites an existing assignee on reassignment', () => {
    const created = taskService.create({ title: 'Reassign me' });
    taskService.assignTask(created.id, 'Priya');
    const reassigned = taskService.assignTask(created.id, 'Sam');
    expect(reassigned.assignee).toBe('Sam');
  });
});
