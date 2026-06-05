import { calculateBMR, calculateTDEE, calculateMacros } from '../lib/tdee';

describe('calculateBMR', () => {
  it('calculates male BMR correctly', () => {
    const bmr = calculateBMR(80, 180, 25, 'male');
    expect(bmr).toBeCloseTo(1805, 0);
  });

  it('calculates female BMR correctly', () => {
    const bmr = calculateBMR(60, 165, 30, 'female');
    expect(bmr).toBeCloseTo(1320.25, 0);
  });

  it('handles edge case low values', () => {
    const bmr = calculateBMR(40, 150, 18, 'male');
    expect(bmr).toBeGreaterThan(0);
  });
});

describe('calculateTDEE', () => {
  it('returns sedentary TDEE', () => {
    const tdee = calculateTDEE(1800, 'sedentary');
    expect(tdee).toBe(2160);
  });

  it('returns active TDEE', () => {
    const tdee = calculateTDEE(1800, 'active');
    expect(tdee).toBe(3105);
  });

  it('returns very_active TDEE', () => {
    const tdee = calculateTDEE(2000, 'very_active');
    expect(tdee).toBe(3800);
  });
});

describe('calculateMacros', () => {
  it('cut: applies -500 calorie deficit', () => {
    const macros = calculateMacros(2500, 'cut', 80);
    expect(macros.calories).toBe(2000);
  });

  it('bulk: applies +300 calorie surplus', () => {
    const macros = calculateMacros(2500, 'bulk', 80);
    expect(macros.calories).toBe(2800);
  });

  it('maintain: no calorie adjustment', () => {
    const macros = calculateMacros(2500, 'maintain', 80);
    expect(macros.calories).toBe(2500);
  });

  it('protein is higher in cut mode', () => {
    const cut = calculateMacros(2500, 'cut', 80);
    const bulk = calculateMacros(2500, 'bulk', 80);
    expect(cut.protein).toBeGreaterThan(bulk.protein);
  });

  it('carbs are never below 50g', () => {
    const macros = calculateMacros(1000, 'cut', 100);
    expect(macros.carbs).toBeGreaterThanOrEqual(50);
  });

  it('all macro fields are numbers', () => {
    const macros = calculateMacros(2500, 'maintain', 75);
    expect(typeof macros.calories).toBe('number');
    expect(typeof macros.protein).toBe('number');
    expect(typeof macros.carbs).toBe('number');
    expect(typeof macros.fat).toBe('number');
  });
});
