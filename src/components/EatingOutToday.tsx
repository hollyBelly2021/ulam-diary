import type { DailyRestaurantEntry } from '../types/restaurant'
import { SwipeableDishItem } from './SwipeableDishItem'
import styles from './EatingOut.module.css'
import generatorStyles from './UlamGenerator.module.css'

interface EatingOutTodayProps {
  entry: DailyRestaurantEntry | null
  onRemove: () => void
}

/** Today's accepted restaurant — swipe left to remove (same as Today's Table). */
export function EatingOutToday({ entry, onRemove }: EatingOutTodayProps) {
  return (
    <section className={styles.homeSummary} aria-label="Restaurant pick">
      <p className={styles.homeSummaryLabel}>Restaurant Pick</p>
      {entry ? (
        <ul className={generatorStyles.currentList}>
          <SwipeableDishItem
            dish={entry.restaurant.name}
            index={0}
            onDelete={() => onRemove()}
          />
        </ul>
      ) : (
        <p className={styles.homeSummaryEmpty}>No restaurant selected yet.</p>
      )}
    </section>
  )
}
