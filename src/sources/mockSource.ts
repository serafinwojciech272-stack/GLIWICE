import type { Deal } from '../domain/deal';
import type { ScanResult, SourceAdapter } from '../domain/source';

const now = new Date().toISOString();
const deals: Deal[] = [
  { id: 'sony-xm5', productId: 'sony-wh1000xm5', title: 'Sony WH-1000XM5', brand: 'Sony', model: 'WH-1000XM5', store: 'Amazon', category: 'Audio', price: 899, previousPrice: 1499, marketMedian: 1099, historicalMedian90d: 1199, estimatedResalePrice: 1049, shippingIn: 0, condition: 'new', availability: 'in_stock', sellerRating: 4.8, sourceUrl: '#', observedAt: now },
  { id: 'legion-5', productId: 'lenovo-legion-5', title: 'Lenovo Legion 5', brand: 'Lenovo', model: 'Legion 5', store: 'Media Expert', category: 'Laptopy', price: 3499, previousPrice: 4299, marketMedian: 3799, historicalMedian90d: 3999, estimatedResalePrice: 3799, shippingIn: 0, condition: 'new', availability: 'in_stock', sellerRating: 4.7, sourceUrl: '#', observedAt: now },
  { id: 'galaxy-s25', productId: 'samsung-galaxy-s25', title: 'Samsung Galaxy S25', brand: 'Samsung', model: 'S25', store: 'RTV Euro AGD', category: 'Smartfony', price: 2899, previousPrice: 3499, marketMedian: 3099, historicalMedian90d: 3199, estimatedResalePrice: 3050, shippingIn: 0, condition: 'new', availability: 'limited', sellerRating: 4.7, sourceUrl: '#', observedAt: now },
  { id: 'lego-ferrari', productId: 'lego-ferrari', title: 'LEGO Technic Ferrari', brand: 'LEGO', model: '42205', store: 'Allegro', category: 'Hobby', price: 499, previousPrice: 899, marketMedian: 599, historicalMedian90d: 649, estimatedResalePrice: 620, shippingIn: 12, condition: 'new', availability: 'in_stock', sellerRating: 4.9, sourceUrl: '#', observedAt: now },
];

export const mockSource: SourceAdapter = {
  source: { id: 'mock-market', name: 'Demo Market Feed', type: 'MOCK', health: 'healthy' },
  async scan(): Promise<ScanResult> {
    const started = performance.now();
    return { source: this.source, deals, durationMs: Math.round(performance.now() - started), errors: [] };
  },
};
