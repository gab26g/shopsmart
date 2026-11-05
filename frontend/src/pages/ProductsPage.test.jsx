import { describe, expect, it } from 'vitest';
import { filterProducts, sortProducts } from './ProductsPage.jsx';

const products = [
  {
    id: 1,
    name: '1080p Webcam',
    description: 'Includes a sliding privacy cover for video calls.',
    category: 'Cameras'
  },
  {
    id: 2,
    name: 'Mechanical Keyboard',
    description: 'Tactile switches for comfortable typing.',
    category: 'Accessories'
  },
  {
    id: 3,
    name: 'Keyboard Cleaning Kit',
    description: 'Brushes and cloths for computer accessories.',
    category: 'Cleaning'
  }
];

describe('category filtering of server results', () => {
  it('keeps every server result when All is selected', () => {
    expect(filterProducts(products, 'All').map((product) => product.id)).toEqual([1, 2, 3]);
  });
  it('keeps only the selected category', () => {
    expect(filterProducts(products, 'Accessories').map((product) => product.id)).toEqual([2]);
  });
  it('returns no results for a category absent from the current response', () => {
    expect(filterProducts([products[0]], 'Accessories')).toEqual([]);
  });
  it('handles an empty server response', () => {
    expect(filterProducts([], 'All')).toEqual([]);
  });
});

describe('product sorting', () => {
  const catalog = Object.freeze([
    Object.freeze({ id: 1, name: 'Zebra Lamp', price: '100', description: 'desk light', category: 'Study' }),
    Object.freeze({ id: 2, name: 'Alpha Stand', price: 20, description: 'desk support', category: 'Study' }),
    Object.freeze({ id: 3, name: 'Beta Mouse', price: '3', description: 'wireless', category: 'Accessories' }),
    Object.freeze({ id: 4, name: 'Alpha Stand', price: '20', description: 'desk support', category: 'Study' })
  ]);
  it.each([
    ['default', [1, 2, 3, 4]],
    ['price-asc', [3, 2, 4, 1]],
    ['price-desc', [1, 2, 4, 3]],
    ['name-asc', [2, 4, 3, 1]]
  ])('orders products with %s and preserves ties', (mode, expected) => {
    expect(sortProducts(catalog, mode).map((product) => product.id)).toEqual(expected);
  });
  it('never reorders the source or changes product data', () => {
    sortProducts(catalog, 'price-asc');
    sortProducts(catalog, 'name-asc');
    expect(catalog.map((product) => product.id)).toEqual([1, 2, 3, 4]);
    expect(sortProducts(catalog, 'default')).not.toBe(catalog);
    expect(catalog[0].price).toBe('100');
  });
  it('sorts only the selected category from server results', () => {
    const filtered = filterProducts(catalog, 'Study');
    expect(sortProducts(filtered, 'price-asc').map((product) => product.id)).toEqual([2, 4, 1]);
    expect(sortProducts(filterProducts(catalog, 'All'), 'default').map((product) => product.id))
      .toEqual([1, 2, 3, 4]);
  });
  it.each(['default', 'price-asc', 'price-desc', 'name-asc'])('handles empty results with %s', (mode) => {
    expect(sortProducts(filterProducts([], 'All'), mode)).toEqual([]);
  });
});
