// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssistantPage from './AssistantPage.jsx';

const match = {
  answer: 'The Mechanical Keyboard fits your budget.',
  recommendedProducts: [{ id: 2, name: 'Mechanical Keyboard', price: 1800, category: 'Accessories' }],
  sources: [{ type: 'product', id: 2, name: 'Mechanical Keyboard' }]
};
let root, host, requests;
async function ask(question = 'keyboard below 2000') {
  await act(async () => {
    const input = host.querySelector('textarea');
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, question);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  return requests.at(-1);
}
async function respond(request, data = match, status = 200) {
  await act(async () => request.resolve({ ok: status < 400, status, json: async () => data }));
}
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  requests = [];
  vi.stubGlobal('fetch', vi.fn((url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }))));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<MemoryRouter><AssistantPage /></MemoryRouter>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
describe('product assistant', () => {
  it('submits the question and announces catalog lookup while waiting', async () => {
    const request = await ask();
    expect(request.url).toMatch(/\/assistant\/questions$/);
    expect(request.options.method).toBe('POST');
    expect(JSON.parse(request.options.body)).toEqual({ question: 'keyboard below 2000' });
    expect(host.querySelector('[role="status"]').textContent).toMatch(/catalog/i);
    expect(host.textContent).not.toContain('Your answer will appear here.');
    expect(host.querySelector('button').disabled).toBe(true);
    await respond(request);
    expect(host.querySelector('button').disabled).toBe(false);
  });
  it('shows answer, recommendation and named product source links', async () => {
    await respond(await ask());
    expect(host.textContent).toContain(match.answer);
    expect(host.querySelector('.recommendations a').getAttribute('href')).toBe('/products/2');
    const source = host.querySelector('section[aria-label="Product sources"] a');
    expect(source.textContent).toContain('Mechanical Keyboard');
    expect(source.textContent).toContain('2');
    expect(source.getAttribute('href')).toBe('/products/2');
  });
  it('shows no-match guidance without inventing product links', async () => {
    await respond(await ask('a refrigerator'), { answer: 'No catalog products match this request.', recommendedProducts: [], sources: [] });
    expect(host.textContent).toContain('No catalog products match this request.');
    expect(host.textContent).toMatch(/try.*product.*budget/i);
    expect(host.querySelectorAll('.assistant-answer a')).toHaveLength(0);
    expect(host.querySelector('button').disabled).toBe(false);
  });
  it('preserves fallback notices and renders server text safely', async () => {
    const answer = 'AI service unavailable. Catalog fallback: <img src=x onerror=alert(1)>';
    await respond(await ask(), { ...match, answer, sources: [{ type: 'product', id: 2, name: '<script>unsafe</script>' }] });
    expect(host.textContent).toContain(answer);
    expect(host.textContent).toContain('<script>unsafe</script>');
    expect(host.querySelector('img, script')).toBe(null);
  });
  it('ends waiting on server failure and allows retry with question preserved', async () => {
    await respond(await ask(), { error: { message: 'Assistant temporarily unavailable.' } }, 503);
    expect(host.querySelector('[role="alert"]').textContent).toContain('Assistant temporarily unavailable.');
    expect(host.querySelector('[role="alert"]').textContent).toMatch(/try again/i);
    expect(host.querySelector('button').disabled).toBe(false);
    expect(host.querySelector('textarea').value).toBe('keyboard below 2000');
    const retry = await ask();
    expect(host.querySelector('[role="alert"]')).toBe(null);
    await respond(retry);
    expect(host.textContent).toContain(match.answer);
  });
  it('keeps waiting when an obsolete request finishes before the latest', async () => {
    const old = await ask('old question');
    const latest = await ask('latest question');
    await respond(old);
    expect(host.querySelector('button').disabled).toBe(true);
    expect(host.textContent).not.toContain(match.answer);
    await respond(latest, { ...match, answer: 'Latest answer' });
    expect(host.textContent).toContain('Latest answer');
  });
  it('ignores obsolete responses and failures after a newer answer', async () => {
    const old = await ask('old question');
    const failed = await ask('another question');
    await respond(await ask('latest question'), { ...match, answer: 'Latest answer' });
    await respond(old);
    await act(async () => failed.reject(new Error('Old network failure')));
    expect(host.textContent).toContain('Latest answer');
    expect(host.textContent).not.toContain(match.answer);
    expect(host.querySelector('[role="alert"]')).toBe(null);
    expect(host.querySelector('button').disabled).toBe(false);
  });
});
