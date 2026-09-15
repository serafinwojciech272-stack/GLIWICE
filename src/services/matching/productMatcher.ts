import type { Deal, ProductCondition } from '../../domain/deal';

export type MatchMethod = 'ean_exact' | 'sku_exact' | 'brand_model' | 'title_attributes' | 'title_only' | 'none';

export type ProductMatch = {
  candidateId: string;
  confidence: number;
  method: MatchMethod;
  reasons: string[];
  needsReview: boolean;
};

const normalize = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const tokens = (value: string) => new Set(normalize(value).split(/\s+/).filter(Boolean));

function tokenSimilarity(a: string, b: string): number {
  const left = tokens(a); const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let common = 0;
  left.forEach(token => { if (right.has(token)) common += 1; });
  return common / Math.max(left.size, right.size);
}

function attributesCompatible(a?: Record<string, string | number | boolean>, b?: Record<string, string | number | boolean>): boolean {
  if (!a || !b) return true;
  for (const key of ['storage', 'ram', 'color', 'capacity', 'variant', 'outlet']) {
    if (key in a && key in b && String(a[key]).toLowerCase() !== String(b[key]).toLowerCase()) return false;
  }
  return true;
}

function conditionCompatible(a: ProductCondition, b: ProductCondition): boolean {
  if (a === 'unknown' || b === 'unknown') return true;
  return a === b;
}

export function matchProduct(source: Deal, candidate: Deal): ProductMatch {
  if (source.id === candidate.id) return { candidateId: candidate.id, confidence: 0, method: 'none', reasons: ['ta sama oferta'], needsReview: true };

  const sameEan = !!source.ean && !!candidate.ean && normalize(source.ean) === normalize(candidate.ean);
  if (sameEan) {
    const safe = attributesCompatible(source.attributes, candidate.attributes) && conditionCompatible(source.condition, candidate.condition);
    return {
      candidateId: candidate.id,
      confidence: safe ? 99 : 45,
      method: 'ean_exact',
      reasons: safe ? ['identyczny EAN/GTIN', 'zgodna konfiguracja'] : ['identyczny EAN, ale konflikt wariantu lub stanu'],
      needsReview: !safe,
    };
  }

  const sameSku = !!source.sku && !!candidate.sku && normalize(source.sku) === normalize(candidate.sku);
  if (sameSku) {
    const safe = attributesCompatible(source.attributes, candidate.attributes) && conditionCompatible(source.condition, candidate.condition);
    return {
      candidateId: candidate.id,
      confidence: safe ? 96 : 48,
      method: 'sku_exact',
      reasons: safe ? ['identyczne SKU', 'zgodna konfiguracja'] : ['identyczne SKU, ale konflikt wariantu lub stanu'],
      needsReview: !safe,
    };
  }

  const brandSame = !!source.brand && !!candidate.brand && normalize(source.brand) === normalize(candidate.brand);
  const modelSame = !!source.model && !!candidate.model && normalize(source.model) === normalize(candidate.model);
  const compatible = attributesCompatible(source.attributes, candidate.attributes) && conditionCompatible(source.condition, candidate.condition);
  if (brandSame && modelSame && compatible) {
    return { candidateId: candidate.id, confidence: 94, method: 'brand_model', reasons: ['zgodna marka', 'zgodny model', 'brak konfliktu wariantu/stanu'], needsReview: true };
  }

  const titleScore = tokenSimilarity(source.title, candidate.title);
  let confidence = titleScore * 72 + (brandSame ? 10 : 0) + (modelSame ? 18 : 0);
  if (!compatible) confidence -= 30;
  confidence = Math.round(Math.max(0, Math.min(93, confidence)));
  const method: MatchMethod = confidence >= 65 && (brandSame || modelSame) ? 'title_attributes' : confidence >= 55 ? 'title_only' : 'none';
  return {
    candidateId: candidate.id,
    confidence,
    method,
    reasons: [
      brandSame ? 'zgodna marka' : 'brak zgodności marki',
      modelSame ? 'zgodny model' : 'brak pewnej zgodności modelu',
      `podobieństwo tytułu ${Math.round(titleScore * 100)}%`,
      compatible ? 'brak wykrytego konfliktu wariantu/stanu' : 'wykryty konflikt wariantu lub stanu',
    ],
    needsReview: confidence < 95,
  };
}

export function findBestProductMatch(source: Deal, candidates: Deal[]): ProductMatch | null {
  return candidates
    .filter(candidate => candidate.id !== source.id)
    .map(candidate => matchProduct(source, candidate))
    .sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}
