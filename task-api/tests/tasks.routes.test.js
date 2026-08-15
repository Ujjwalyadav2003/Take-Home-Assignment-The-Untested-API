const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('POST /tasks', () => {
  test('creates a task (happy path)', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Write tests' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.status).toBe('todo');
  });

  test('400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('400 when status is invalid', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', status: 'bogus' });
    expect(res.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  test('lists all tasks (happy path)', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by status using exact match (regression test)', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('A');
  });

  test('returns empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /tasks/stats', () => {
  test('returns counts by status plus overdue', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.done).toBe(1);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates an existing task (happy path)', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Original' });
    const res = await request(app).put(`/tasks/${created.body.id}`).send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  test('404 for unknown id', async () => {
    const res = await request(app).put('/tasks/does-not-exist').send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  test('400 when title is set to an empty string', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Original' });
    const res = await request(app).put(`/tasks/${created.body.id}`).send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes an existing task (happy path)', async () => {
    const created = await request(app).post('/tasks').send({ title: 'To delete' });
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  test('404 for unknown id', async () => {
    const res = await request(app).delete('/tasks/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks a task complete (happy path)', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Finish me' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('404 for unknown id', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/complete');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a task to a user (happy path)', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Priya' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Priya');
  });

  test('404 when the task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/does-not-exist/assign')
      .send({ assignee: 'Priya' });
    expect(res.status).toBe(404);
  });

  test('400 when assignee is missing', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });
    const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({});
    expect(res.status).toBe(400);
  });

  test('400 when assignee is an empty string', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  test('allows reassigning a task that already has an assignee', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });
    await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'Priya' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Sam' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Sam');
  });
});
