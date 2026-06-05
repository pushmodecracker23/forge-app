export interface FoodItem {
  id: string;
  name: string;
  brand: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_g: number;
}

function parseProduct(product: Record<string, unknown>): FoodItem {
  const nutriments = (product.nutriments as Record<string, number>) ?? {};
  return {
    id: (product.id as string) || (product._id as string) || '',
    name: (product.product_name as string) || (product.product_name_en as string) || 'Unknown',
    brand: (product.brands as string) || '',
    kcal: Math.round(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0),
    protein: Math.round((nutriments.proteins_100g ?? 0) * 10) / 10,
    carbs: Math.round((nutriments.carbohydrates_100g ?? 0) * 10) / 10,
    fat: Math.round((nutriments.fat_100g ?? 0) * 10) / 10,
    serving_g: nutriments.serving_size ?? 100,
  };
}

export async function searchFood(query: string): Promise<FoodItem[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Food search failed');
  const data = await res.json();
  return (data.products ?? []).map(parseProduct);
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return parseProduct(data.product);
}
