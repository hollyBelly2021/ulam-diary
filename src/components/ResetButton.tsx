import { useState } from 'react'
import styles from './ResetButton.module.css'

interface ResetButtonProps {
  onReset: () => void
}

/**
 * Restores all dishes to the available list.
 * Asks for confirmation first so progress is not erased by accident.
 * History is kept unless the user confirms the warning below.
 */
export function ResetButton({ onReset }: ResetButtonProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.dialog} role="alertdialog" aria-labelledby="reset-title">
          <p id="reset-title" className={styles.message}>
            Reset the available dish list? Previously accepted dishes will be
            choosable again. Your diary history will stay.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.confirm}
              onClick={() => {
                onReset()
                setConfirming(false)
              }}
            >
              Reset list
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.resetButton}
        onClick={() => setConfirming(true)}
      >
        Reset Dish List
      </button>
    </div>
  )
}
