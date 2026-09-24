import { describe, expect, it } from 'vitest';
import { filterProducts } from './ProductsPage.jsx';

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

describe('product filtering', () => {
  it('finds products by words in their description', () => {
    expect(filterProducts(products, 'privacy cover', 'All').map((product) => product.name))
      .toEqual(['1080p Webcam']);
  });

  it('continues to find products by name', () => {
    expect(filterProducts(products, 'keyboard', 'All').map((product) => product.name))
      .toEqual(['Mechanical Keyboard', 'Keyboard Cleaning Kit']);
  });

  it('applies the category filter together with the search query', () => {
    expect(filterProducts(products, 'keyboard', 'Accessories').map((product) => product.name))
      .toEqual(['Mechanical Keyboard']);
  });

  it('shows every product in the selected category for an empty search', () => {
    expect(filterProducts(products, '   ', 'Cleaning').map((product) => product.name))
      .toEqual(['Keyboard Cleaning Kit']);
  });
});
