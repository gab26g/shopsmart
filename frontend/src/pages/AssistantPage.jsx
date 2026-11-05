import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => () => { requestSequence.current += 1; }, []);

  async function ask(event) {
    event.preventDefault();
    const sequence = ++requestSequence.current;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const answer = await api.askAssistant(question);
      if (sequence === requestSequence.current) setResult(answer);
    } catch (caught) {
      if (sequence === requestSequence.current) {
        setError(`Could not get a product answer. ${caught.message || 'The request failed.'} Please try again.`);
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }

  return (
    <section className="assistant-layout">
      <div>
        <p className="eyebrow">PRODUCT ASSISTANT</p>
        <h1>Find a product</h1>
        <p>Ask about ShopSmart products, features, or your budget. Answers use the current catalog, with product sources you can check.</p>
        <form onSubmit={ask}>
          <label>Your question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength="3" maxLength="300" placeholder="Which keyboard is below ₱2,000?" required /></label>
          <button disabled={loading}>{loading ? 'Searching…' : 'Ask ShopSmart'}</button>
        </form>
      </div>
      <div className="assistant-answer" aria-busy={loading} aria-live="polite">
        <h2>Assistant response</h2>
        <StatusMessage type="error">{error}</StatusMessage>
        {loading && <StatusMessage>Searching the current product catalog…</StatusMessage>}
        {!loading && !result && !error && <p>Your answer and product sources will appear here.</p>}
        {result && <>
          <p>{result.answer}</p>
          {result.recommendedProducts.length > 0 ? (
            <div className="recommendations">
              {result.recommendedProducts.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>{product.name} — ₱{Number(product.price).toLocaleString('en-PH')}</Link>
              ))}
            </div>
          ) : <p>Try a different product name, feature, or budget to find a match.</p>}
          {result.sources.length > 0 && (
            <section aria-label="Product sources">
              <h3>Product sources</h3>
              <ul>
                {result.sources.map((source) => (
                  <li key={source.id}><Link to={`/products/${source.id}`}>{source.name} (Product ID: {source.id})</Link></li>
                ))}
              </ul>
            </section>
          )}
        </>}
      </div>
    </section>
  );
}
