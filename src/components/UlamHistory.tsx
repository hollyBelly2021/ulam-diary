import { useState } from 'react'
import { formatHistoryDate } from '../utils/dates'
import styles from './UlamHistory.module.css'

export type PastPickKind = 'dish' | 'restaurant'

export interface PastPickItem {
  kind: PastPickKind
  name: string
  /** Dish name or restaurant id — used for delete / pool restore. */
  id: string
  /** When true, removal returns the item to the generation pool. */
  restoresToPool: boolean
}

export interface PastPicksDay {
  date: string
  items: PastPickItem[]
}

interface PendingDelete {
  date: string
  item: PastPickItem
}

interface UlamHistoryProps {
  /** Previous days only (excludes today). */
  days: PastPicksDay[]
  onDeleteItem: (date: string, item: PastPickItem) => void
}

/** Universal history of past ulam dishes and restaurants (names only). */
export function UlamHistory({ days, onDeleteItem }: UlamHistoryProps) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  return (
    <section className={styles.section} aria-labelledby="past-picks-heading">
      <h2 id="past-picks-heading" className={styles.title}>
        Past Picks
      </h2>

      {days.length === 0 ? (
        <p className={styles.empty}>No past picks yet.</p>
      ) : (
        <ul className={styles.list}>
          {days.map((day) => (
            <li key={day.date} className={styles.item}>
              <p className={styles.date}>{formatHistoryDate(day.date)}</p>
              <ul className={styles.dishList}>
                {day.items.map((item) => (
                  <li
                    key={`${day.date}-${item.kind}-${item.id}`}
                    className={styles.dishRow}
                  >
                    <span className={styles.name}>{item.name}</span>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      aria-label={`Remove ${item.name} from diary`}
                      onClick={() => setPendingDelete({ date: day.date, item })}
                    >
                      <svg
                        className={styles.deleteIcon}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && (
        <div
          className={styles.dialog}
          role="alertdialog"
          aria-labelledby="delete-pick-title"
          aria-modal="true"
        >
          <p id="delete-pick-title" className={styles.message}>
            {pendingDelete.item.restoresToPool
              ? `Remove ${pendingDelete.item.name} from your diary? It will be available again in future suggestions.`
              : `Remove ${pendingDelete.item.name} from your diary?`}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.confirm}
              onClick={() => {
                onDeleteItem(pendingDelete.date, pendingDelete.item)
                setPendingDelete(null)
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
