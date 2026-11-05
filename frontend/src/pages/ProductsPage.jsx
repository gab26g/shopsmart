import { useEffect, useRef, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

// eslint-disable-next-line react-refresh/only-export-components
export function filterProducts(products, category) {
  return products.filter((product) => category === 'All' || product.category === category);
}

// eslint-disable-next-line react-refresh/only-export-components
export function sortProducts(products, sortOrder) {
  const sorted = [...products];
  if (sortOrder === 'price-asc') sorted.sort((a, b) => Number(a.price) - Number(b.price));
  if (sortOrder === 'price-desc') sorted.sort((a, b) => Number(b.price) - Number(a.price));
  if (sortOrder === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const categoriesLoaded = useRef(false);
  const [sortOrder, setSortOrder] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const { addToCart, cartMessage } = useCart();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api.getProducts(search)
      .then((data) => {
        if (active) setProducts(data.products);
      })
      .catch((caught) => {
        if (active) setError(caught.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Category choices load independently from the full catalog.
    if (!categoriesLoaded.current) {
      setCategoryError('');
      api.getProducts()
        .then((catalog) => {
          if (!active) return;
          setCategories(['All', ...new Set(catalog.products.map((product) => product.category))]);
          categoriesLoaded.current = true;
        })
        .catch((caught) => {
          if (active) setCategoryError(`Could not load categories: ${caught.message} Change the search to retry.`);
        });
    }
    // Obsolete requests cannot update results, messages, or loading state.
    return () => { active = false; };
  }, [search]);

  const visibleProducts = sortProducts(filterProducts(products, category), sortOrder);

  return (
    <section>
      <div className="hero">
        <div>
          <p className="eyebrow">BSIT FULL-STACK PROJECT</p>
          <h1>Technology for study, work and play</h1>
          <p>Browse the starter catalog, build a cart and complete a simulated order.</p>
        </div>
      </div>

      <div className="toolbar">
        <label>
          <span>Search products</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try keyboard" />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="default">Default</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
            <option value="name-asc">Name A to Z</option>
          </select>
        </label>
      </div>

      <StatusMessage>{cartMessage}</StatusMessage>
      {categoryError && <StatusMessage type="error">{categoryError}</StatusMessage>}
      {loading && <StatusMessage>Loading products…</StatusMessage>}
      {error && <StatusMessage type="error">{error} Make sure the backend is running.</StatusMessage>}
      {!loading && !error && visibleProducts.length === 0 && <StatusMessage>No products match your filters.</StatusMessage>}

      <div className="product-grid">
        {!loading && !error && visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </div>
    </section>
  );
}
