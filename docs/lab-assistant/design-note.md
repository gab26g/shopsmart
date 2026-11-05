# ShopSmart grounded product assistant

Individual activity. Implementation branch: `codex/grounded-product-assistant`.

## Request flow

React question form → existing API helper → POST /api/assistant/questions → Express validation and rate limit → Prisma public catalog query → relevance and budget selection → Gemini structured draft → server validation or fallback → JSON answer, recommendations and sources → React answer and product links.

## Five design decisions

1. **Retrieval and public data.** Eligible records are active and in stock. The server selects at most three relevant products, applies the requested budget, and converts decimal prices deliberately. Only id, name, description, category, numeric price and stock are eligible for the provider. Normalized shopping intent replaces arbitrary user text. No customer, order, address, email or credential records are queried or sent. No new account or permission system is introduced.

2. **Provider integration.** Gemini is accessed only through the backend using the official JavaScript SDK. The model is configurable, defaulting to `gemini-3.5-flash-lite`. `GEMINI_API_KEY` stays in ignored `backend/.env`; environment examples contain placeholders only. Requests have a 10-second cancellable timeout and no automatic retries. Free access depends on account quota and eligibility; a personal AI subscription is not an API entitlement.

3. **Verification.** A model response is only a structured draft. Recommendation IDs must be unique members of this request's selected subset; prices and stock must match retrieved facts, and any description excerpt must be supported by the selected record. Malformed, empty or unsupported drafts are rejected. The server constructs final wording and references from catalog records, rather than displaying unchecked provider prose or URLs. AI helps select supporting facts; the application controls the final answer.

4. **No match and failure.** No eligible match produces an honest answer and empty recommendations/sources without calling Gemini. Missing credentials, provider unavailability, rate limits, timeout and invalid drafts use a deterministic catalog-backed fallback with a readable notice. A catalog-query failure remains an API error. The page ends loading and shows a readable result or error. Provider credentials and raw errors are not returned or logged.

5. **Evidence and compatibility.** Preserve the existing endpoint, trimmed 3–300 character validation, HTTP 422 behavior and response fields. Test provider faults with controlled boundaries and verify live integration separately. Use current database facts, zero-stock fixtures, genuine screenshots and project checks. Never reseed to reset evidence; the seed script deletes classroom orders. Exact results and any remaining limitation are recorded in the accompanying test record.

## Official references

- Model: https://aistudio.google.com/docs/models/gemini-3.5-flash-lite
- Structured output: https://aistudio.google.com/docs/structured-output
- SDK: https://googleapis.github.io/js-genai/release_docs/
