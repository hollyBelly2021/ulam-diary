import type { Restaurant } from '../types/restaurant'
import styles from './EatingOut.module.css'

interface RestaurantResultProps {
  restaurant: Restaurant
  onReject: () => void
  onAccept: () => void
  onClose: () => void
}

/** One generated restaurant with exit / reject / accept actions. */
export function RestaurantResult({
  restaurant,
  onReject,
  onAccept,
  onClose,
}: RestaurantResultProps) {
  return (
    <div className={styles.result} key={restaurant.id}>
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close restaurant generator"
      >
        <svg className={styles.closeIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <h2 className={styles.resultName}>{restaurant.name}</h2>
      <p className={styles.resultMeta}>
        {restaurant.cuisine} • {restaurant.type}
      </p>
      <p className={styles.resultDescription}>{restaurant.description}</p>
      <p className={styles.resultDistance}>
        {restaurant.distanceMiles.toFixed(1)} miles away
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.reject}`}
          onClick={onReject}
          aria-label={`Reject ${restaurant.name}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.accept}`}
          onClick={onAccept}
          aria-label={`Choose ${restaurant.name}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
