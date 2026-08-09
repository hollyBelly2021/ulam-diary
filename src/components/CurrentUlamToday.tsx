import { SwipeableDishItem } from './SwipeableDishItem'
import styles from './EatingOut.module.css'
import generatorStyles from './UlamGenerator.module.css'

interface CurrentUlamTodayProps {
  dishes: string[]
  onRemove: (dish: string) => void
}

/** Always-visible today's dishes with swipe-to-delete (or empty state). */
export function CurrentUlamToday({ dishes, onRemove }: CurrentUlamTodayProps) {
  return (
    <section className={styles.homeSummary} aria-label="Today's table">
      <p className={styles.homeSummaryLabel}>Today&apos;s Table</p>
      {dishes.length > 0 ? (
        <ul className={generatorStyles.currentList}>
          {dishes.map((dish, index) => (
            <SwipeableDishItem
              key={dish}
              dish={dish}
              index={index}
              onDelete={onRemove}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.homeSummaryEmpty}>No dish selected yet.</p>
      )}
    </section>
  )
}
