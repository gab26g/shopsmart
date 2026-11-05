import { z } from 'zod';
import { draftRecommendations } from './gemini.js';

const stopWords = new Set('a an the i me my we our you your it its is are was be for to of and or with that this please recommend recommendations suggest suggestions find show need want looking buy product products something some below under less than above over more least up at most within budget php peso pesos cost price only can could would should have has do does best good'.split(' '));

function budgetConstraint(question) {
  const text = question.replaceAll(',', '');
  const amount = '(\\d{1,6}(?:\\.\\d{1,2})?)(k)?(?![\\da-z.])';
  const match = text.match(new RegExp(`(?:\\b(below|under|less than|above|over|more than|at least|up to|at most|within|budget(?: of| is)?)\\s*(?:₱|php\\s*)?|(?:₱|\\bphp\\s*))${amount}`, 'i'));
  if (!match) return null;
  return {
    amount: Number(match[2]) * (match[3] ? 1000 : 1),
    minimum: /^(above|over|more than|at least)$/i.test(match[1] || ''),
    exclusive: /^(below|under|less than|above|over|more than)$/i.test(match[1] || '')
  };
}

export function parseBudget(question) {
  return budgetConstraint(question)?.amount ?? null;
}

function tokens(text) {
  return text.toLowerCase().match(/[a-z]+/g) || [];
}

function searchTerms(question) {
  // Only words can become search terms; user numbers and punctuation never travel to the provider.
  return [...new Set(tokens(question).filter((term) => term.length > 2 && !stopWords.has(term)))];
}

function catalogTerms(product) {
  return new Set(tokens(`${product.name} ${product.category} ${product.description}`));
}

function publicProduct({ id, name, description, category, price, stock }) {
  return { id, name, description, category, price: Number(price), stock };
}

export function rankProducts(products, question) {
  const terms = searchTerms(question);
  const budget = budgetConstraint(question);
  // Keep the current catalog's product types recognizable even when a type is out of stock.
  const types = new Set(['mouse', 'keyboard', 'lamp', 'webcam', 'stand', 'headset', ...products.map((product) => tokens(product.name).at(-1))]);
  const requestedTypes = terms.filter((term) => types.has(term));
  return products
    .filter((product) => product.active !== false && Number.isInteger(product.stock) && product.stock > 0)
    .map(publicProduct)
    .filter((product) => requestedTypes.length === 0 || requestedTypes.some((type) => tokens(product.name).includes(type)))
    .filter((product) => Number.isFinite(product.price) && product.price >= 0 && (!budget || (
      budget.minimum
        ? (budget.exclusive ? product.price > budget.amount : product.price >= budget.amount)
        : (budget.exclusive ? product.price < budget.amount : product.price <= budget.amount)
    )))
    .map((product) => ({ product, score: terms.filter((term) => catalogTerms(product).has(term)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price || a.product.id - b.product.id)
    .slice(0, 3)
    .map(({ product }) => product);
}

const draftSchema = z.object({
  recommendations: z.array(z.object({
    id: z.number().int().positive(),
    price: z.number().finite().nonnegative(),
    stock: z.number().int().positive(),
    descriptionExcerpt: z.string().min(1).optional()
  }).strict()).min(1).max(3)
}).strict();

function validateDraft(draft, products) {
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) return null;
  const ids = new Set();
  const selected = [];
  for (const recommendation of parsed.data.recommendations) {
    const product = products.find(({ id }) => id === recommendation.id);
    if (!product || ids.has(product.id) || product.price !== recommendation.price || product.stock !== recommendation.stock) return null;
    if (recommendation.descriptionExcerpt && !product.description.includes(recommendation.descriptionExcerpt)) return null;
    ids.add(product.id);
    selected.push(product);
  }
  return selected;
}

function normalizedQuestion(question, products) {
  const vocabulary = new Set(products.flatMap((product) => [...catalogTerms(product)]));
  const terms = searchTerms(question).filter((term) => vocabulary.has(term));
  const budget = budgetConstraint(question);
  const comparator = budget?.minimum ? (budget.exclusive ? 'above' : 'at least') : (budget?.exclusive ? 'below' : 'up to');
  return `${terms.join(' ')}${budget ? ` ${comparator} PHP ${budget.amount}` : ''}`;
}

function renderResponse(products, fallback) {
  const facts = products.map(({ name, price, stock, description }) => `${name} — PHP ${price.toFixed(2)}; ${stock} in stock. ${description}`).join('\n');
  return {
    answer: `${fallback ? 'AI recommendations are temporarily unavailable. Here are matching products from the current catalog.\n' : 'Based on the current ShopSmart catalog:\n'}${facts}`,
    recommendedProducts: products.map(({ id, name, price, category }) => ({ id, name, price, category })),
    sources: products.map(({ id, name }) => ({ type: 'product', id, name }))
  };
}

export async function buildAssistantResponse(products, question, { draft = draftRecommendations } = {}) {
  const ranked = rankProducts(products, question);
  if (ranked.length === 0) {
    return { answer: 'I could not find an in-stock product matching that request. Try another product type or a higher budget.', recommendedProducts: [], sources: [] };
  }
  try {
    const result = await draft({ question: normalizedQuestion(question, ranked), products: ranked });
    const selected = validateDraft(result, ranked);
    if (selected) return renderResponse(selected, false);
  } catch {
    // Provider details and unchecked text must never reach responses or logs.
  }
  return renderResponse(ranked, true);
}
