# ShopSmart grounded assistant test record

Date: November 5, 2026, Asia/Manila. Individual activity. Branch: `codex/grounded-product-assistant`. Exact submitted commit is recorded in SUBMISSION.txt in the submission ZIP.

## Required six cases

| Case | Actual action and observation | Result |
| --- | --- | --- |
| Catalog match | Asked for a keyboard below PHP 2,000. Current database product 2 is Compact Mechanical Keyboard, price 1850, stock 4. First live provider-backed response returned only that keyboard, with the matching source. Later high-demand requests used the safe fallback with the same verified facts. | Pass; live provider availability is intermittent |
| No match | Requested a refrigerator below PHP 2,000. HTTP 200, honest no-match answer, empty recommendations and sources. Service tests verify provider is not called. | Pass |
| Invalid input | POSTed question `x`. HTTP 422, code INVALID_QUESTION, established validation message. Route tests also cover whitespace-only and overlong input. | Pass |
| Availability | Asked for mouse against the current catalog: product 1 has stock 0 and was not recommended. Inactive and zero-stock fixture tests also pass. No live stock was changed. | Pass |
| Provider failure | SDK boundary tests force HTTP 429, abort deadline, invalid JSON and ignored cancellation. Browser also encountered an actual provider failure; a key-redacted diagnostic identified HTTP 503 high demand. Loading ended and the page showed a catalog-backed fallback with valid source/link. | Pass |
| Source check | Returned recommendation and source IDs were checked against the selected subset and current catalog. Opened source link `/products/2`; details showed PHP 1850 and 4 units. Tests reject unknown/duplicate IDs, wrong price/stock, unsupported excerpts and extra claims. | Pass |

## Project checks and regression evidence

`npm run check` passed: 34 frontend tests, 40 backend tests (including nested cases), both lint checks, and frontend production build. Actual output is in check-output.txt. Tests isolate provider transport and catalog persistence; automated checks do not place orders or change live stock.

Browser checks: catalog browsing worked; `privacy` returned the webcam; Study with ascending price showed lamp PHP900 before stand PHP1200. Added keyboard temporarily, increased quantity to 2, and checked checkout review total PHP3700. Did not submit an order. Removed only that temporary cart item afterward.

Initial test evidence: seven frontend regressions failed before implementation. Backend regressions demonstrated decimal truncation, unrelated products, inactive/zero-stock selection, missing provider invocation/validation/fallback. Review regressions separately failed for partial USB matches, `2k` parsing, and minimum-price direction; all passed after correction. A route-test mocking setup issue with Prisma's proxy was corrected by explicitly saving, replacing and restoring findMany.

## Screenshot register

- 00-baseline.png: original rule-based page returning unrelated lamp and stand for keyboard.
- 01-catalog-match.png: final successful Gemini-backed keyboard result and product/source links. Live service recovered after the observed high-demand failure.
- 02-no-match.png: refrigerator request with no invented recommendations.
- 03-provider-failure.png: real failed-provider fallback, not a mocked screenshot.
- 04-source-product.png: actual linked keyboard detail page supporting price and availability.

## Limitations and safeguards

Gemini 3.5 Flash-Lite succeeded initially but later returned HTTP503 during high demand. The submission does not claim every request succeeds, nor that a model response proves a fact. Fallback and source validation are essential behaviors. No automatic application retry is performed; users may submit a new question.

Retrieval is deterministic keyword/type matching for the small classroom catalog, not unrestricted natural-language understanding. The answer is generated from verified catalog facts; unchecked model prose is never displayed. Catalog facts are a request-time snapshot and may change afterward. SDK cancellation stops the client wait; it does not guarantee provider-side processing or usage stops.

The dependency tree reports pre-existing advisories; no automatic audit fix or unrelated dependency upgrade was performed. Private backend/.env and frontend/.env, API keys, databases, node_modules and Git metadata are excluded from the submission. No reseeding, migrations, orders or stock writes were performed for evidence. No collaborator branch or main was modified by this implementation.
