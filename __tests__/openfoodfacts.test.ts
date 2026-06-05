import { searchFood, lookupBarcode } from '../lib/openfoodfacts';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

const mockProduct = {
  id: '123',
  product_name: 'Test Chicken',
  brands: 'Test Brand',
  nutriments: {
    'energy-kcal_100g': 165,
    proteins_100g: 31,
    carbohydrates_100g: 0,
    fat_100g: 3.6,
  },
};

describe('searchFood', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns parsed food items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [mockProduct] }),
    });
    const results = await searchFood('chicken');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Test Chicken');
    expect(results[0].kcal).toBe(165);
    expect(results[0].protein).toBe(31);
  });

  it('returns empty array when no products', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [] }),
    });
    const results = await searchFood('xyz123notreal');
    expect(results).toHaveLength(0);
  });

  it('throws on network error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(searchFood('test')).rejects.toThrow('Food search failed');
  });
});

describe('lookupBarcode', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns food item for valid barcode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 1, product: mockProduct }),
    });
    const result = await lookupBarcode('0012345678901');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Test Chicken');
  });

  it('returns null when product not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 0, product: null }),
    });
    const result = await lookupBarcode('0000000000000');
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await lookupBarcode('1234');
    expect(result).toBeNull();
  });
});
