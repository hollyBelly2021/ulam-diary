import type { DailyRestaurantEntry } from './types/restaurant'

export type { DailyRestaurantEntry, Restaurant } from './types/restaurant'

/** How a dish was added to a day's list. */
export type DishSource = 'generated' | 'custom' | 'matched'

/** A single dish saved for a day, with origin for pool restore rules. */
export interface DayDish {
  name: string
  /**
   * - generated: accepted from the random generator
   * - matched: typed manually, matched a dish already in the pool
   * - custom: typed manually, not in the dish pool
   */
  source: DishSource
}

/** All dishes accepted for a single calendar day. */
export interface DailyUlamEntry {
  /** Local calendar date in YYYY-MM-DD form. */
  date: string
  /** Dishes chosen that day (unique by name, in selection order). */
  dishes: DayDish[]
}

/** Everything we persist in localStorage. */
export interface UlamDiaryState {
  /** Completed / saved days (newest first). */
  history: DailyUlamEntry[]
  /** Dish names that should not appear in random suggestions. */
  excludedDishes: string[]
  /** User-added dishes permanently available for random generation. */
  customPool: string[]
  /** Accepted eating-out restaurants by day (newest first). */
  eatingOut: DailyRestaurantEntry[]
  /** Restaurant ids removed from the current generation pool. */
  excludedRestaurantIds: string[]
}

/** Legacy single-dish history shape (pre multi-ulam update). */
export interface LegacySavedUlam {
  id: string
  name: string
  date: string
}

/** Result of trying to add a dish to the permanent generation pool. */
export type PoolAddResult =
  | { status: 'added'; name: string }
  | { status: 'exists'; name: string }
  | { status: 'empty' }
