import type { Coordinates } from './geolocationService'
import type { Restaurant } from '../types/restaurant'

/** Public Overpass mirrors — tried in order on failure. */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const MILES_PER_METER = 0.000621371

/** Default search radius: ~10 miles. */
export const DEFAULT_RADIUS_METERS = 16000

/** Max search radius: ~25 miles. */
export const MAX_RADIUS_METERS = 40000

export type RestaurantServiceErrorCode =
  | 'EMPTY_QUERY'
  | 'PLACE_NOT_FOUND'
  | 'GEOCODE_FAILED'
  | 'OVERPASS_FAILED'

export class RestaurantServiceError extends Error {
  readonly code: RestaurantServiceErrorCode

  constructor(code: RestaurantServiceErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'RestaurantServiceError'
    this.code = code
  }
}

const CUISINE_DESCRIPTIONS: Record<string, string> = {
  japanese: 'Fresh sushi, ramen, and Japanese comfort food.',
  sushi: 'Fresh sushi, ramen, and Japanese comfort food.',
  filipino: 'Traditional Filipino dishes and local favorites.',
  vietnamese: 'Noodle soups, rice dishes, and fresh spring rolls.',
  italian: 'Pasta, pizza, and classic Italian cuisine.',
  chinese: 'Classic Chinese dishes and local favorites.',
  mexican: 'Tacos, burritos, and Mexican comfort food.',
  thai: 'Curries, noodles, and fragrant Thai dishes.',
  indian: 'Curries, tandoori dishes, and Indian favorites.',
  korean: 'Korean BBQ, rice bowls, and comfort classics.',
  american: 'Comfort food and American classics.',
  mediterranean: 'Fresh Mediterranean plates and grilled favorites.',
  french: 'French bistro fare and classic dishes.',
  pizza: 'Pizza, pasta, and Italian-inspired favorites.',
  burger: 'Burgers, fries, and casual favorites.',
  seafood: 'Fresh seafood and coastal favorites.',
  coffee: 'Coffee, light bites, and café favorites.',
  cafe: 'Coffee, light bites, and café favorites.',
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements?: OverpassElement[]
}

interface NominatimAddress {
  house_number?: string
  road?: string
  city?: string
  town?: string
  village?: string
  hamlet?: string
  suburb?: string
  neighbourhood?: string
  county?: string
  state?: string
  postcode?: string
  country_code?: string
  'ISO3166-2-lvl4'?: string
}

interface NominatimResponse {
  place_id?: number
  osm_type?: string
  osm_id?: number
  display_name?: string
  lat?: string
  lon?: string
  address?: NominatimAddress
}

export interface GeocodedPlace {
  id: string
  coords: Coordinates
  label: string
}

const US_STATE_ABBR: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
}

function abbreviateState(state?: string): string | null {
  if (!state) return null
  const trimmed = state.trim()
  if (/^[A-Z]{2}$/i.test(trimmed)) return trimmed.toUpperCase()
  return US_STATE_ABBR[trimmed.toLowerCase()] ?? trimmed
}

function stateFromIso(iso?: string): string | null {
  if (!iso) return null
  const match = iso.match(/^US-([A-Z]{2})$/i)
  return match ? match[1].toUpperCase() : null
}

/** Short, readable label from Nominatim address fields. */
export function formatPlaceLabel(
  data: NominatimResponse,
  fallbackQuery?: string,
): string {
  const address = data.address
  if (!address) {
    if (data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(',').trim()
    }
    return fallbackQuery?.trim() || 'Near you'
  }

  const street = [address.house_number, address.road].filter(Boolean).join(' ')
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.suburb ||
    address.neighbourhood
  const state =
    stateFromIso(address['ISO3166-2-lvl4']) || abbreviateState(address.state)
  const zip = address.postcode?.split(';')[0]?.trim()

  const locality = [city, state].filter(Boolean).join(', ')
  const localityWithZip = zip
    ? locality
      ? `${locality} ${zip}`
      : zip
    : locality

  if (street && localityWithZip) return `${street}, ${localityWithZip}`
  if (street) return street
  if (localityWithZip) return localityWithZip

  if (data.display_name) {
    return data.display_name.split(',').slice(0, 3).join(',').trim()
  }
  return fallbackQuery?.trim() || 'Near you'
}

function toGeocodedPlace(
  data: NominatimResponse,
  fallbackQuery?: string,
): GeocodedPlace | null {
  const lat = data.lat ? Number.parseFloat(data.lat) : NaN
  const lon = data.lon ? Number.parseFloat(data.lon) : NaN
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null

  const id =
    data.place_id != null
      ? `nominatim-${data.place_id}`
      : `nominatim-${data.osm_type ?? 'x'}-${data.osm_id ?? `${lat},${lon}`}`

  return {
    id,
    coords: { latitude: lat, longitude: lon },
    label: formatPlaceLabel(data, fallbackQuery),
  }
}

/** Haversine distance in miles between two coordinates. */
export function distanceMiles(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(to.latitude - from.latitude)
  const dLon = toRad(to.longitude - from.longitude)
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const meters = 6371000 * c
  return meters * MILES_PER_METER
}

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function primaryCuisine(raw: string | undefined): string {
  if (!raw) return 'Local'
  const first = raw.split(/[;,]/)[0]?.trim()
  return first ? titleCase(first) : 'Local'
}

function amenityType(amenity: string | undefined): string {
  switch (amenity) {
    case 'fast_food':
      return 'Fast Food'
    case 'cafe':
      return 'Café'
    case 'food_court':
      return 'Food Court'
    case 'biergarten':
      return 'Biergarten'
    case 'pub':
      return 'Pub'
    case 'bar':
      return 'Bar'
    default:
      return 'Restaurant'
  }
}

/** Simple cuisine-based description when OSM has none. */
export function descriptionForCuisine(cuisine: string): string {
  const key = cuisine.toLowerCase().trim()
  if (CUISINE_DESCRIPTIONS[key]) return CUISINE_DESCRIPTIONS[key]

  for (const [token, text] of Object.entries(CUISINE_DESCRIPTIONS)) {
    if (key.includes(token)) return text
  }

  if (cuisine && cuisine !== 'Local') {
    return `${cuisine} dishes and local favorites.`
  }

  return 'Local restaurant near your location.'
}

function formatRestaurant(
  element: OverpassElement,
  origin: Coordinates,
): Restaurant | null {
  const tags = element.tags
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  if (typeof lat !== 'number' || typeof lon !== 'number') return null

  const type = amenityType(tags?.amenity)
  const name =
    tags?.name?.trim() ||
    tags?.brand?.trim() ||
    tags?.['name:en']?.trim() ||
    `Local ${type}`

  const cuisine = primaryCuisine(tags?.cuisine)
  const miles = distanceMiles(origin, { latitude: lat, longitude: lon })

  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    cuisine,
    type,
    description: descriptionForCuisine(cuisine),
    distanceMiles: Math.round(miles * 10) / 10,
  }
}

function buildOverpassQuery(
  coords: Coordinates,
  radiusMeters: number,
): string {
  const { latitude: lat, longitude: lon } = coords
  return `
[out:json][timeout:45];
(
  node["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
  way["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
  node["amenity"="fast_food"](around:${radiusMeters},${lat},${lon});
  way["amenity"="fast_food"](around:${radiusMeters},${lat},${lon});
  node["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
  way["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
  node["amenity"="food_court"](around:${radiusMeters},${lat},${lon});
  way["amenity"="food_court"](around:${radiusMeters},${lat},${lon});
  node["amenity"="pub"](around:${radiusMeters},${lat},${lon});
  way["amenity"="pub"](around:${radiusMeters},${lat},${lon});
);
out center tags;
`.trim()
}

async function nominatimFetch(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })
}

/**
 * Reverse-geocode coordinates via Nominatim for a short location label.
 */
export async function reverseGeocodeLabel(
  coords: Coordinates,
  signal?: AbortSignal,
): Promise<string> {
  const params = new URLSearchParams({
    format: 'json',
    lat: String(coords.latitude),
    lon: String(coords.longitude),
    zoom: '14',
    addressdetails: '1',
  })

  const response = await nominatimFetch(
    `${NOMINATIM_REVERSE_URL}?${params}`,
    signal,
  )

  if (!response.ok) {
    throw new RestaurantServiceError(
      'GEOCODE_FAILED',
      'Unable to reverse-geocode location.',
    )
  }

  const data = (await response.json()) as NominatimResponse
  return formatPlaceLabel(data)
}

async function nominatimSearch(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<NominatimResponse[]> {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: String(limit),
    addressdetails: '1',
  })

  let response: Response
  try {
    response = await nominatimFetch(`${NOMINATIM_SEARCH_URL}?${params}`, signal)
  } catch (error) {
    if (signal?.aborted) throw error
    throw new RestaurantServiceError(
      'GEOCODE_FAILED',
      'Location lookup is temporarily unavailable.',
    )
  }

  if (!response.ok) {
    throw new RestaurantServiceError(
      'GEOCODE_FAILED',
      'Location lookup is temporarily unavailable.',
    )
  }

  return (await response.json()) as NominatimResponse[]
}

/**
 * Autocomplete suggestions from Nominatim (debounced by the caller).
 */
export async function searchPlaceSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodedPlace[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const data = await nominatimSearch(trimmed, 5, signal)
  const seen = new Set<string>()
  const results: GeocodedPlace[] = []

  for (const item of data) {
    const place = toGeocodedPlace(item, trimmed)
    if (!place) continue
    if (seen.has(place.label.toLowerCase())) continue
    seen.add(place.label.toLowerCase())
    results.push(place)
  }

  return results
}

/**
 * Forward-geocode a city, neighborhood, address, or ZIP via Nominatim.
 */
export async function geocodePlaceQuery(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodedPlace> {
  const trimmed = query.trim()
  if (!trimmed) {
    throw new RestaurantServiceError('EMPTY_QUERY')
  }

  const data = await nominatimSearch(trimmed, 1, signal)
  const place = data[0] ? toGeocodedPlace(data[0], trimmed) : null

  if (!place) {
    throw new RestaurantServiceError('PLACE_NOT_FOUND')
  }

  return place
}

async function fetchFromOverpassEndpoint(
  endpoint: string,
  query: string,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  const body = new URLSearchParams()
  body.set('data', query)

  const response = await fetch(endpoint, {
    method: 'POST',
    body,
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Overpass HTTP ${response.status}`)
  }

  return (await response.json()) as OverpassResponse
}

/**
 * Fetch nearby restaurants, trying multiple Overpass mirrors on failure.
 */
export async function fetchNearbyRestaurants(
  coords: Coordinates,
  radiusMeters: number = DEFAULT_RADIUS_METERS,
  signal?: AbortSignal,
): Promise<Restaurant[]> {
  const query = buildOverpassQuery(coords, radiusMeters)
  let lastError: unknown

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    try {
      const data = await fetchFromOverpassEndpoint(endpoint, query, signal)
      const seen = new Set<string>()
      const restaurants: Restaurant[] = []

      for (const element of data.elements ?? []) {
        const restaurant = formatRestaurant(element, coords)
        if (!restaurant) continue
        if (seen.has(restaurant.id)) continue
        seen.add(restaurant.id)
        restaurants.push(restaurant)
      }

      restaurants.sort((a, b) => a.distanceMiles - b.distanceMiles)
      return restaurants
    } catch (error) {
      if (signal?.aborted) throw error
      lastError = error
      // Try the next mirror.
    }
  }

  throw new RestaurantServiceError(
    'OVERPASS_FAILED',
    lastError instanceof Error
      ? lastError.message
      : 'Restaurant search is temporarily unavailable.',
  )
}

/**
 * Picks one random restaurant from the available list.
 * Avoids repeating the previous suggestion when other options exist.
 * Rejected restaurants are not permanently removed.
 */
export function pickRandomRestaurant(
  available: Restaurant[],
  previousId: string | null,
): Restaurant | null {
  if (available.length === 0) return null
  if (available.length === 1) return available[0]

  let candidates = available
  if (previousId) {
    const withoutPrevious = available.filter((r) => r.id !== previousId)
    if (withoutPrevious.length > 0) {
      candidates = withoutPrevious
    }
  }

  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index]
}
