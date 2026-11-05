import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

test('catalog route preserves its response and searches both fields on active products', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/products`;
  let query;
  const webcam = { id: 6, name: '1080p Webcam', description: 'Sliding privacy cover', category: 'Video', price: '1500.00', stock: 4, active: true };
  const originalFindMany = prisma.product.findMany;
  t.after(() => { prisma.product.findMany = originalFindMany; });
  prisma.product.findMany = async (options) => {
    query = options;
    return options.where.OR ? [webcam] : [];
  };

  await t.test('description query returns numeric prices in the existing envelope', async () => {
    const response = await fetch(`${base}?search=%20PrIvAcY%20`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { products: [{ ...webcam, price: 1500 }] });
    assert.deepEqual(query, {
      where: { active: true, OR: [
        { name: { contains: 'PrIvAcY', mode: 'insensitive' } },
        { description: { contains: 'PrIvAcY', mode: 'insensitive' } }
      ] },
      orderBy: { id: 'asc' }
    });
  });
  for (const suffix of ['', '?search=%20%20']) {
    await t.test(`empty query returns the active catalog: ${suffix}`, async () => {
      const response = await fetch(`${base}${suffix}`);
      assert.equal(response.status, 200);
      assert.deepEqual(query, { where: { active: true }, orderBy: { id: 'asc' } });
    });
  }
  await t.test('no matches return an empty products array', async () => {
    prisma.product.findMany = async () => [];
    const response = await fetch(`${base}?search=notfoundword`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { products: [] });
  });
});
