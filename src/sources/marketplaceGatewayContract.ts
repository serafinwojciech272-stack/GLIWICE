import type { Deal, DealAvailability, ProductCondition } from '../domain/deal';

export type ContractErrorKind = 'schema' | 'deal';

export class MarketplaceContractError extends Error {
  readonly kind: ContractErrorKind;

  constructor(kind: ContractErrorKind, message: string) {
    super(message);
    this.name = 'MarketplaceContractError';
    this.kind = kind;
  }
}

export type MarketplaceGatewayResponse = {
  query: string;
  results: Deal[];
  sources?: unknown[];
  selectedProvider?: string;
  message?: string;
  generatedAt?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const AVAILABILITY: readonly DealAvailability[] = ['in_stock', 'limited', 'out_of_stock', 'unknown'];
const CONDITIONS: readonly ProductCondition[] = ['new', 'used', 'refurbished', 'open_box', 'unknown'];

const OPTIONAL_NUMBER_FIELDS = [
  'previousPrice',
  'marketMedian',
  'historicalMedian90d',
  'estimatedResalePrice',
  'shippingIn',
  'sellerRating',
] as const;

const OPTIONAL_STRING_FIELDS = ['ean', 'sku', 'brand', 'model', 'sourceId'] as const;

function parseDeal(raw: unknown, index: number): Deal {
  function fail(detail: string): never {
    throw new MarketplaceContractError('deal', `results[${index}] ${detail}`);
  }

  if (!isObject(raw)) fail('is not an object');

  if (!isNonEmptyString(raw.id)) fail('missing valid "id"');
  if (!isNonEmptyString(raw.productId)) fail('missing valid "productId"');
  if (!isNonEmptyString(raw.title)) fail('missing valid "title"');
  if (!isNonEmptyString(raw.store)) fail('missing valid "store"');
  if (!isNonEmptyString(raw.category)) fail('missing valid "category"');
  if (!isNonEmptyString(raw.sourceUrl)) fail('missing valid "sourceUrl"');
  if (!isNonEmptyString(raw.observedAt)) fail('missing valid "observedAt"');
  if (!isFiniteNumber(raw.price) || raw.price < 0) fail('invalid "price"');

  if (!AVAILABILITY.includes(raw.availability as DealAvailability)) fail('invalid "availability"');
  if (!CONDITIONS.includes(raw.condition as ProductCondition)) fail('invalid "condition"');

  for (const field of OPTIONAL_NUMBER_FIELDS) {
    if (raw[field] !== undefined && !isFiniteNumber(raw[field])) fail(`invalid "${field}"`);
  }
  for (const field of OPTIONAL_STRING_FIELDS) {
    if (raw[field] !== undefined && typeof raw[field] !== 'string') fail(`invalid "${field}"`);
  }
  if (raw.attributes !== undefined) {
    if (!isObject(raw.attributes)) fail('invalid "attributes"');
    const valuesOk = Object.values(raw.attributes).every(
      value => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
    );
    if (!valuesOk) fail('invalid "attributes" values');
  }

  return {
    id: raw.id,
    productId: raw.productId,
    title: raw.title,
    store: raw.store,
    category: raw.category,
    sourceUrl: raw.sourceUrl,
    observedAt: raw.observedAt,
    price: raw.price,
    availability: raw.availability as DealAvailability,
    condition: raw.condition as ProductCondition,
    ...(raw.ean !== undefined ? { ean: raw.ean as string } : {}),
    ...(raw.sku !== undefined ? { sku: raw.sku as string } : {}),
    ...(raw.brand !== undefined ? { brand: raw.brand as string } : {}),
    ...(raw.model !== undefined ? { model: raw.model as string } : {}),
    ...(raw.attributes !== undefined
      ? { attributes: raw.attributes as Record<string, string | number | boolean> }
      : {}),
    ...(raw.previousPrice !== undefined ? { previousPrice: raw.previousPrice as number } : {}),
    ...(raw.marketMedian !== undefined ? { marketMedian: raw.marketMedian as number } : {}),
    ...(raw.historicalMedian90d !== undefined ? { historicalMedian90d: raw.historicalMedian90d as number } : {}),
    ...(raw.estimatedResalePrice !== undefined
      ? { estimatedResalePrice: raw.estimatedResalePrice as number }
      : {}),
    ...(raw.shippingIn !== undefined ? { shippingIn: raw.shippingIn as number } : {}),
    ...(raw.sellerRating !== undefined ? { sellerRating: raw.sellerRating as number } : {}),
    ...(raw.sourceId !== undefined ? { sourceId: raw.sourceId as string } : {}),
  };
}

export function parseMarketplaceSearchResponse(payload: unknown): MarketplaceGatewayResponse {
  if (!isObject(payload)) {
    throw new MarketplaceContractError('schema', 'Gateway response is not an object.');
  }
  if (!('results' in payload)) {
    throw new MarketplaceContractError('schema', 'Gateway response is missing "results".');
  }
  if (!Array.isArray(payload.results)) {
    throw new MarketplaceContractError('schema', 'Gateway response "results" is not an array.');
  }
  if (payload.message !== undefined && typeof payload.message !== 'string') {
    throw new MarketplaceContractError('schema', 'Gateway response "message" is not a string.');
  }
  if (payload.sources !== undefined && !Array.isArray(payload.sources)) {
    throw new MarketplaceContractError('schema', 'Gateway response "sources" is not an array.');
  }

  const results = payload.results.map((entry, index) => parseDeal(entry, index));
  return {
    query: typeof payload.query === 'string' ? payload.query : '',
    results,
    ...(payload.sources !== undefined ? { sources: payload.sources } : {}),
    ...(typeof payload.selectedProvider === 'string' ? { selectedProvider: payload.selectedProvider } : {}),
    ...(typeof payload.message === 'string' ? { message: payload.message } : {}),
    ...(typeof payload.generatedAt === 'string' ? { generatedAt: payload.generatedAt } : {}),
  };
}
