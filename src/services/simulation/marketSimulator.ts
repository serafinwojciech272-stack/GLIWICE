import type { Deal, ProductCondition, DealAvailability } from '../../domain/deal';

const STORES = ['Amazon', 'Media Expert', 'RTV Euro AGD', 'Allegro', 'x-kom', 'Morele', 'Komputronik', 'Empik', 'MediaMarkt', 'Neonet'];
const CATEGORIES = ['Audio', 'Laptopy', 'Smartfony', 'Hobby', 'Gaming', 'TV', 'AGD'];

type ProductSeed = {
  id: string;
  brand: string;
  model: string;
  title: string;
  category: string;
  basePrice: number;
  resale: number;
};

const PRODUCTS: ProductSeed[] = [
  { id: 'sony-xm5', brand: 'Sony', model: 'WH-1000XM5', title: 'Sony WH-1000XM5 słuchawki bezprzewodowe', category: 'Audio', basePrice: 1399, resale: 1099 },
  { id: 'lenovo-legion5', brand: 'Lenovo', model: 'Legion 5', title: 'Lenovo Legion 5 16IRX9', category: 'Laptopy', basePrice: 4799, resale: 3899 },
  { id: 'samsung-s25', brand: 'Samsung', model: 'Galaxy S25', title: 'Samsung Galaxy S25 256GB', category: 'Smartfony', basePrice: 3699, resale: 3099 },
  { id: 'iphone15', brand: 'Apple', model: 'iPhone 15', title: 'Apple iPhone 15 128GB', category: 'Smartfony', basePrice: 2999, resale: 2499 },
  { id: 'ps5-slim', brand: 'Sony', model: 'PlayStation 5 Slim', title: 'Sony PlayStation 5 Slim 1TB', category: 'Gaming', basePrice: 2399, resale: 2049 },
  { id: 'lego-ferrari', brand: 'LEGO', model: 'Technic Ferrari Daytona SP3', title: 'LEGO Technic Ferrari Daytona SP3', category: 'Hobby', basePrice: 899, resale: 649 },
  { id: 'lg-oled', brand: 'LG', model: 'OLED C4 55', title: 'LG OLED C4 55 cal', category: 'TV', basePrice: 4999, resale: 3999 },
  { id: 'dyson-v15', brand: 'Dyson', model: 'V15 Detect', title: 'Dyson V15 Detect Absolute', category: 'AGD', basePrice: 3199, resale: 2599 },
  { id: 'jbl-bar', brand: 'JBL', model: 'Bar 500', title: 'JBL Bar 500 soundbar', category: 'Audio', basePrice: 1999, resale: 1499 },
  { id: 'asus-rog', brand: 'ASUS', model: 'ROG Zephyrus G16', title: 'ASUS ROG Zephyrus G16', category: 'Laptopy', basePrice: 7499, resale: 6199 },
];

const seeded = (seed: number) => {
  let x = Math.sin(seed * 999.91) * 10000;
  return x - Math.floor(x);
};

const round = (value: number) => Math.round(value);

export function generateMarketSimulation(count = 250, seed = 20260915): Deal[] {
  const deals: Deal[] = [];
  for (let i = 0; i < count; i += 1) {
    const product = PRODUCTS[i % PRODUCTS.length];
    const wave = seeded(seed + i * 13);
    const sourceIndex = Math.floor(seeded(seed + i * 17) * STORES.length);
    const store = STORES[sourceIndex];
    const category = product.category;
    const isPlantedOpportunity = i % 37 === 0 || i % 61 === 0;
    const isBadDiscount = i % 29 === 0;
    const isVariantTrap = i % 43 === 0;
    const isRefurbished = i % 47 === 0;
    const isStale = i % 53 === 0;
    const isOutOfStock = i % 71 === 0;

    let priceFactor = 0.91 + wave * 0.25;
    if (isPlantedOpportunity) priceFactor = 0.62 + wave * 0.05;
    if (isBadDiscount) priceFactor = 0.84 + wave * 0.08;

    const condition: ProductCondition = isRefurbished ? 'refurbished' : 'new';
    const availability: DealAvailability = isOutOfStock ? 'out_of_stock' : wave < 0.08 ? 'limited' : 'in_stock';
    const variant = isVariantTrap ? ' 64GB / wersja outlet' : '';
    const shippingIn = wave > 0.75 ? round(8 + wave * 22) : 0;
    const observedAt = new Date(Date.now() - (isStale ? 12 : wave * 2) * 86400000).toISOString();
    const price = round(product.basePrice * priceFactor);
    const marketMedian = round(product.basePrice * (0.95 + seeded(seed + i * 19) * 0.12));
    const historicalMedian90d = round(product.basePrice * (0.94 + seeded(seed + i * 23) * 0.1));
    const estimatedResalePrice = round(product.resale * (0.96 + seeded(seed + i * 29) * 0.08));

    deals.push({
      id: `sim-${seed}-${i}`,
      productId: `${product.id}${isVariantTrap ? '-variant' : ''}`,
      ean: isVariantTrap ? undefined : `590${String(100000000 + PRODUCTS.indexOf(product) * 997).slice(-9)}`,
      sku: `${product.brand.slice(0, 3).toUpperCase()}-${product.model.replace(/\W/g, '').slice(0, 8)}-${i % 5}`,
      title: `${product.title}${variant}`,
      brand: product.brand,
      model: product.model,
      attributes: isVariantTrap ? { storage: '64GB', outlet: true } : { storage: 'standard', outlet: false },
      store,
      category,
      price,
      previousPrice: round(product.basePrice * (isBadDiscount ? 1.02 : 1.08 + seeded(seed + i * 31) * 0.14)),
      marketMedian,
      historicalMedian90d,
      estimatedResalePrice,
      shippingIn,
      condition,
      availability,
      sellerRating: round((4.1 + seeded(seed + i * 37) * 0.9) * 10) / 10,
      sourceId: `sim-source-${sourceIndex}`,
      sourceUrl: `https://example.invalid/simulation/${product.id}/${i}`,
      observedAt,
    });
  }
  return deals;
}

export function simulationTruth(deal: Deal): 'opportunity' | 'normal' | 'trap' {
  const index = Number(deal.id.split('-').pop() ?? -1);
  if (index < 0) return 'normal';
  if (index % 37 === 0 || index % 61 === 0) return 'opportunity';
  if (index % 29 === 0 || index % 43 === 0 || index % 47 === 0 || index % 71 === 0 || index % 53 === 0) return 'trap';
  return 'normal';
}
