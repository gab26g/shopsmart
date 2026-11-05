// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../context/CartContext.jsx';
import ProductsPage from './ProductsPage.jsx';

const catalog = [
  { id: 1, name: 'Lamp', description: 'Desk light', category: 'Study', price: 900, stock: 10, emoji: '💡', active: true },
  { id: 2, name: 'Stand', description: 'Laptop support', category: 'Study', price: 1200, stock: 8, emoji: '💻', active: true },
  { id: 3, name: 'Webcam', description: 'Privacy cover', category: 'Video', price: 1500, stock: 5, emoji: '📷', active: true }
];
let root, host, requests;
const names = () => [...host.querySelectorAll('.product-card h2')].map((item) => item.textContent);
const choices = () => [...host.querySelectorAll('select')[0].options].map((item) => item.value);

async function search(value) {
  await act(async () => {
    const input = host.querySelector('input');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function select(index, value) {
  await act(async () => {
    const input = host.querySelectorAll('select')[index];
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function respond(request, products) {
  await act(async () => request.resolve({ ok: true, json: async () => ({ products }) }));
}
async function reject(request) {
  await act(async () => request.reject(new Error('Backend unavailable')));
}
async function mount() {
  await act(async () => root.render(<MemoryRouter><CartProvider><ProductsPage /></CartProvider></MemoryRouter>));
  for (const request of [...requests]) await respond(request, catalog);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  requests = [];
  vi.stubGlobal('fetch', vi.fn((url) => new Promise((resolve, reject) => requests.push({ url, resolve, reject }))));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('live catalog', () => {
  it('still displays successful search results if category initialization fails', async () => {
    await act(async () => root.render(<MemoryRouter><CartProvider><ProductsPage /></CartProvider></MemoryRouter>));
    await respond(requests[0], catalog);
    await reject(requests[1]);
    expect(names()).toEqual(['Lamp', 'Stand', 'Webcam']);
    expect(host.textContent).toContain('Could not load categories');
  });
  it('initializes categories even if the current search request fails', async () => {
    await act(async () => root.render(<MemoryRouter><CartProvider><ProductsPage /></CartProvider></MemoryRouter>));
    await reject(requests[0]);
    await respond(requests[1], catalog);
    expect(choices()).toEqual(['All', 'Study', 'Video']);
    expect(host.textContent).toContain('Backend unavailable');
  });
  it('requests description search, hides old cards while loading, and retains categories', async () => {
    await mount();
    await search('privacy');
    expect(requests.at(-1).url).toMatch(/\/products\?search=privacy$/);
    expect(names()).toEqual([]);
    expect(host.textContent).toContain('Loading products');
    await respond(requests.at(-1), [catalog[2]]);
    expect(names()).toEqual(['Webcam']);
    expect(choices()).toEqual(['All', 'Study', 'Video']);
  });
  it('uses server matching rather than applying another local text search', async () => {
    await mount();
    await search('server-selected');
    await respond(requests.at(-1), [catalog[2]]);
    expect(names()).toEqual(['Webcam']);
  });
  it('preserves category and sort across empty results and clearing search', async () => {
    await mount();
    await select(0, 'Study');
    await select(1, 'price-desc');
    await search('webcam');
    expect(requests.at(-1).url).toMatch(/search=webcam$/);
    await respond(requests.at(-1), [catalog[2]]);
    expect(names()).toEqual([]);
    expect(host.textContent).toContain('No products match');
    expect(choices()).toEqual(['All', 'Study', 'Video']);
    expect(host.querySelector('select').value).toBe('Study');
    await search('');
    await respond(requests.at(-1), catalog);
    expect(names()).toEqual(['Stand', 'Lamp']);
    expect(host.querySelectorAll('select')[1].value).toBe('price-desc');
  });
  it('ignores stale successes and failures after a newer request completes', async () => {
    await mount();
    await search('privacy');
    const old = requests.at(-1);
    await search('missing');
    const oldFailure = requests.at(-1);
    expect(oldFailure.url).toMatch(/search=missing$/);
    await search('');
    await respond(requests.at(-1), catalog);
    await respond(old, [catalog[2]]);
    await reject(oldFailure);
    expect(names()).toEqual(['Lamp', 'Stand', 'Webcam']);
    expect(host.textContent).not.toContain('Backend unavailable');
  });
  it('keeps loading when an obsolete request finishes before the latest one', async () => {
    await mount();
    await search('privacy');
    const old = requests.at(-1);
    await search('lamp');
    const latest = requests.at(-1);
    await respond(old, [catalog[2]]);
    expect(host.textContent).toContain('Loading products');
    expect(names()).toEqual([]);
    await respond(latest, [catalog[0]]);
    expect(names()).toEqual(['Lamp']);
  });
  it('shows server failures and recovers on the next search', async () => {
    await mount();
    await search('privacy');
    await reject(requests.at(-1));
    expect(host.textContent).toContain('Backend unavailable');
    expect(names()).toEqual([]);
    expect(host.textContent).not.toContain('No products match');
    await search('lamp');
    expect(host.textContent).not.toContain('Backend unavailable');
    await respond(requests.at(-1), [catalog[0]]);
    expect(names()).toEqual(['Lamp']);
  });
  it('retries failed category initialization on another search', async () => {
    await act(async () => root.render(<MemoryRouter><CartProvider><ProductsPage /></CartProvider></MemoryRouter>));
    for (const request of [...requests]) await reject(request);
    expect(host.textContent).toContain('Backend unavailable');
    const before = requests.length;
    await search('privacy');
    const retry = requests.slice(before);
    expect(retry.some((request) => request.url.endsWith('/products'))).toBe(true);
    for (const request of retry) await respond(request, request.url.endsWith('/products') ? catalog : [catalog[2]]);
    expect(choices()).toEqual(['All', 'Study', 'Video']);
    expect(names()).toEqual(['Webcam']);
  });
});
