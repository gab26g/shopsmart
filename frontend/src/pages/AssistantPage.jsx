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
  const questionInput = useRef(null);
  const examples = [
    ['Keyboard under ₱2,000', 'Which keyboard is below ₱2,000?'],
    ['Something for studying', 'Recommend a study product below ₱1,500'],
    ['Audio essentials', 'Recommend a headset below ₱2,000']
  ];

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
    <section className="assistant-desk" aria-label="Product shopping desk">
      <header className="assistant-intro">
        <div>
          <h1>Build your <em>shortlist.</em></h1>
          <p>A little help choosing. Tell us what you need and what you want to spend.</p>
        </div>
        <Link className="assistant-browse" to="/">Explore the catalog <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 18 18 6M6 6h12v12" /></svg></Link>
      </header>

      <div className="assistant-composer">
        <form onSubmit={ask}>
          <label htmlFor="shopping-question">Your question</label>
          <textarea id="shopping-question" ref={questionInput} aria-label="Your question" value={question} onChange={(event) => setQuestion(event.target.value)} minLength="3" maxLength="300" placeholder="A keyboard for my desk, below ₱2,000…" required />
          <div className="assistant-compose-actions">
            <span>Start with a product and a budget.</span>
            <button type="submit" disabled={loading}>{loading ? 'Finding matches…' : 'Find my match'}<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
          </div>
        </form>
        <div className="assistant-examples" aria-label="Example questions">
          <span>Try asking</span>
          {examples.map(([label, value]) => <button type="button" key={label} disabled={loading} onClick={() => { setQuestion(value); questionInput.current?.focus(); }}>{label}</button>)}
        </div>
      </div>

      <div className="assistant-answer desk-result" aria-busy={loading} aria-live="polite">
        <div className="assistant-result-heading">
          <h2>{result ? (result.recommendedProducts.length ? 'Your shortlist' : 'No match this time') : 'From the catalog, for you'}</h2>
          {result && result.recommendedProducts.length > 0 && <span>{result.recommendedProducts.length} {result.recommendedProducts.length === 1 ? 'product' : 'products'}</span>}
        </div>
        <StatusMessage type="error">{error}</StatusMessage>
        {loading && <StatusMessage>Searching the current product catalog…</StatusMessage>}
        {!loading && !result && !error && <p className="assistant-idle">Your next find starts above. We’ll look through available products and show the catalog facts behind each suggestion.</p>}
        {result && <>
          <p className="assistant-result-copy">{result.answer}</p>
          {result.recommendedProducts.length > 0 ? (
            <div className="recommendations">
              {result.recommendedProducts.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  <span className="assistant-product-name"><small>{product.category}</small><strong>{product.name}</strong></span>
                  <span className="assistant-product-price">₱{Number(product.price).toLocaleString('en-PH')}<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 18 18 6M6 6h12v12" /></svg></span>
                </Link>
              ))}
            </div>
          ) : <p>Try a different product name, feature, or budget to find a match.</p>}
          {result.sources.length > 0 && (
            <section className="assistant-sources" aria-label="Product sources">
              <h3>Check the details</h3>
              <p>Every suggestion links back to a current catalog record.</p>
              <ul>
                {result.sources.map((source) => (
                  <li key={source.id}><Link to={`/products/${source.id}`}>{source.name} (Product ID: {source.id})</Link></li>
                ))}
              </ul>
            </section>
          )}
        </>}
      </div>
      <p className="assistant-footnote">Catalog facts first. If the AI service is unavailable, you’ll still get a clearly labeled catalog-based answer.</p>
    </section>
  );
}
