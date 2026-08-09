export interface Restaurant {
  id: string
  name: string
  cuisine: string
  type: string
  description: string
  distanceMiles: number
}

/** One accepted restaurant for a calendar day. */
export interface DailyRestaurantEntry {
  date: string
  location: string
  restaurant: Restaurant
}
