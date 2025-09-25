import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../app.js';

describe('App Tests', () => {
  const app = createApp();

  it('health check endpoint should return ok', async () => {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    assert.strictEqual(data.ok, true);
  });

  it('static files should be served', async () => {
    const response = await fetch('http://localhost:3000');
    assert.strictEqual(response.status, 200);
  });
});
