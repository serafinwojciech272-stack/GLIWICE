import type { Deal } from '../../domain/deal';

export type MatchMethod = 'product_id' | 'brand_model' | 'title_tokens' | 'none';

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

export function matchProduct(source: Deal, candidate: Deal): ProductMatch {
  if (source.productId === candidate.productId) {
    return { candidateId: candidate.id, confidence: 100, method: 'product_id', reasons: ['identyczny identyfikator produktu'], needsReview: false };
  }

  const brandSame = !!source.brand && !!candidate.brand && normalize(source.brand) === normalize(candidate.brand);
  const modelSame = !!source.model && !!candidate.model && normalize(source.model) === normalize(candidate.model);
  if (brandSame && modelSame) {
    return { candidateId: candidate.id, confidence: 96, method: 'brand_model', reasons: ['zgodna marka', 'zgodny model'], needsReview: false };
  }

  const titleScore = tokenSimilarity(source.title, candidate.title);
  const confidence = Math.round(Math.min(94, titleScore * 100 + (brandSame ? 8 : 0) + (modelSame ? 12 : 0)));
  const reasons = [
    brandSame ? 'zgodna marka' : 'brak pewnej zgodności marki',
    modelSame ? 'zgodny model' : 'brak pewnej zgodności modelu',
    `podobieństwo tytułu ${Math.round(titleScore * 100)}%`,
  ];
  return {
    candidateId: candidate.id,
    confidence,
    method: confidence > 0 ? 'title_tokens' : 'none',
    reasons,
    needsReview: confidence < 95,
  };
}

export function findBestProductMatch(source: Deal, candidates: Deal[]): ProductMatch | null {
  if (!candidates.length) return null;
  return candidates
    .filter(candidate => candidate.id !== source.id)
    .map(candidate => matchProduct(source, candidate))
    .sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}
