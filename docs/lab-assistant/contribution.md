# Individual contribution

This individual ShopSmart Grounded Product Assistant activity was completed with Codex and specialized AI subagents assisting backend, provider adapter, interface, tests and review. This is an individual feature submission.

The work added relevant in-stock catalog retrieval, a server-side Gemini structured draft, validation of product IDs/prices/availability/excerpts, safe catalog-backed fallback, visible sources and preserved shopping flows. The private API key was configured locally. Agent-assisted tests, source review, live requests and real browser checks produced the accompanying evidence.

One issue resolved was the original ranking accepting products with no relevant match. Review also found that shared words such as USB could still bring in unrelated product types, and that price comparisons could lose their meaning. Product-type constraints and corrected decimal, k-suffix and minimum/maximum handling were added with regression tests. The service now constructs final answers from verified catalog records rather than trusting free-form model claims.

An external issue observed during verification was Gemini HTTP503 high demand. This was handled through the required deterministic fallback rather than disguising it as a successful model answer. See test-record.md for exact results and limitations.
