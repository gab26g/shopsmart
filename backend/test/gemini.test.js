import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleGenAI } from '@google/genai';
import { draftRecommendations } from '../src/services/gemini.js';

const products = [{ id: 7, name: 'Desk lamp', description: 'Small reading lamp', category: 'Home', price: 450, stock: 3, internalNote: 'private' }];
const input = { question: 'A reading lamp under 500 pesos', products };
const apiKey = 'test-key-never-send';
const success = (text) => new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
const clientWithFetch = (fetch) => (options) => new GoogleGenAI({ ...options, httpOptions: { ...options.httpOptions, fetch } });

test('requests structured drafts using only public catalog facts', async () => {
  let request;
  const draft = await draftRecommendations(input, {
    apiKey,
    createClient: clientWithFetch(async (url, init) => {
      request = { url: String(url), body: JSON.parse(init.body) };
      return success('{"recommendations":[{"id":7,"price":450,"stock":3,"descriptionExcerpt":"reading lamp"}]}');
    }),
  });
  assert.deepEqual(draft, { recommendations: [{ id: 7, price: 450, stock: 3, descriptionExcerpt: 'reading lamp' }] });
  assert.match(request.url, /gemini-3\.5-flash-lite:generateContent/);
  const config = request.body.generationConfig;
  assert.equal(config.responseMimeType, 'application/json');
  assert.equal(config.responseJsonSchema.additionalProperties, false);
  assert.equal(config.responseJsonSchema.properties.recommendations.items.additionalProperties, false);
  const payload = JSON.parse(request.body.contents[0].parts[0].text);
  assert.deepEqual(payload, { question: input.question, products: [{ id: 7, name: 'Desk lamp', description: 'Small reading lamp', category: 'Home', price: 450, stock: 3 }] });
  assert.equal(JSON.stringify(request.body).includes('private'), false);
  assert.equal(JSON.stringify(request.body).includes(apiKey), false);
});

test('supports an explicitly configured model', async () => {
  let requestedUrl;
  await draftRecommendations(input, { apiKey, model: 'gemini-custom', createClient: clientWithFetch(async (url) => { requestedUrl = String(url); return success('{"recommendations":[]}'); }) });
  assert.match(requestedUrl, /gemini-custom:generateContent/);
});

test('missing key fails safely before creating a provider client', async () => {
  let created = false;
  await assert.rejects(draftRecommendations(input, { apiKey: '  ', createClient: () => { created = true; } }), { code: 'GEMINI_NOT_CONFIGURED' });
  assert.equal(created, false);
});

test('429 is attempted once and provider error details never escape', async () => {
  let calls = 0;
  await assert.rejects(draftRecommendations(input, { apiKey, createClient: clientWithFetch(async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: { code: 429, message: `quota ${apiKey}`, status: 'RESOURCE_EXHAUSTED' } }), { status: 429, headers: { 'content-type': 'application/json' } });
  }) }), (error) => {
    assert.equal(error.code, 'GEMINI_UNAVAILABLE');
    assert.equal(error.cause, undefined);
    assert.equal(String(error).includes(apiKey), false);
    assert.equal(String(error).includes('quota'), false);
    return true;
  });
  assert.equal(calls, 1);
});

test('deadline aborts the actual SDK HTTP request without retrying', async () => {
  let calls = 0;
  let aborted = false;
  await assert.rejects(draftRecommendations(input, { apiKey, timeoutMs: 25, createClient: clientWithFetch(async (_url, init) => {
    calls += 1;
    return new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => { aborted = true; reject(new Error('private transport details')); }, { once: true });
    });
  }) }), { code: 'GEMINI_TIMEOUT' });
  assert.equal(aborted, true);
  assert.equal(calls, 1);
});

test('deadline settles even when a faulty client ignores cancellation', async () => {
  let signal;
  await assert.rejects(draftRecommendations(input, { apiKey, timeoutMs: 10, createClient: () => ({ models: { generateContent: ({ config }) => { signal = config.abortSignal; return new Promise(() => {}); } } }) }), { code: 'GEMINI_TIMEOUT' });
  assert.equal(signal.aborted, true);
});

for (const text of ['not json', '', 'null', '[]', '"unexpected"']) {
  test(`malformed provider draft is rejected safely: ${JSON.stringify(text)}`, async () => {
    await assert.rejects(draftRecommendations(input, { apiKey, createClient: clientWithFetch(async () => success(text)) }), { code: 'GEMINI_INVALID_RESPONSE' });
  });
}

test('client construction failures are sanitized', async () => {
  await assert.rejects(draftRecommendations(input, { apiKey, createClient: () => { throw new Error(apiKey); } }), (error) => error.code === 'GEMINI_UNAVAILABLE' && !String(error).includes(apiKey) && !error.cause);
});

test('semantic draft mistakes remain available for orchestrator validation', async () => {
  const draft = await draftRecommendations(input, { apiKey, createClient: clientWithFetch(async () => success('{"recommendations":[{"id":999,"price":1,"stock":999}]}')) });
  assert.deepEqual(draft, { recommendations: [{ id: 999, price: 1, stock: 999 }] });
});
