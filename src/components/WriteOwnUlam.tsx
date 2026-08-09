import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { PoolAddResult } from '../types'
import styles from './WriteOwnUlam.module.css'

const MAX_SUGGESTIONS = 6

interface WriteOwnUlamProps {
  open: boolean
  onClose: () => void
  /** Built-in + custom dishes available for suggestions. */
  dishPool: string[]
  /** Dish names already saved for today (excluded from suggestions). */
  todaysDishes: string[]
  onAddToToday: (rawName: string) => boolean
  onAddToPool: (rawName: string) => PoolAddResult
}

function getSuggestions(
  query: string,
  dishPool: string[],
  todaysDishes: string[],
): string[] {
  const key = query.trim().toLowerCase()
  if (!key) return []

  const todayLower = new Set(todaysDishes.map((dish) => dish.toLowerCase()))

  return dishPool
    .filter(
      (dish) =>
        !todayLower.has(dish.toLowerCase()) &&
        dish.toLowerCase().includes(key),
    )
    .slice(0, MAX_SUGGESTIONS)
}

/**
 * Write Your Own Dish form. Open state is owned by the parent toolbar.
 */
export function WriteOwnUlam({
  open,
  onClose,
  dishPool,
  todaysDishes,
  onAddToToday,
  onAddToPool,
}: WriteOwnUlamProps) {
  const [value, setValue] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [plusPulse, setPlusPulse] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const inputId = useId()
  const listId = useId()

  const suggestions = useMemo(
    () => getSuggestions(value, dishPool, todaysDishes),
    [value, dishPool, todaysDishes],
  )

  const dropdownOpen = showSuggestions && suggestions.length > 0

  useEffect(() => {
    if (!open) {
      setValue('')
      setMessage(null)
      setPlusPulse(false)
      setShowSuggestions(true)
      return
    }
    inputRef.current?.focus()
  }, [open])

  if (!open) return null

  function selectSuggestion(dish: string) {
    setValue(dish)
    setShowSuggestions(false)
    setMessage(null)
    inputRef.current?.focus()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return

    const added = onAddToToday(trimmed)
    if (added) onClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && dropdownOpen) {
      event.preventDefault()
      setShowSuggestions(false)
      return
    }

    if (event.key === 'Enter' && dropdownOpen) {
      event.preventDefault()
      selectSuggestion(suggestions[0])
    }
  }

  function handleAddToPool() {
    const trimmed = value.trim()
    if (!trimmed) return

    const result = onAddToPool(trimmed)
    if (result.status === 'empty') return

    if (result.status === 'added') {
      setMessage(`✓ Added "${result.name}" to your dish list.`)
      setPlusPulse(true)
      window.setTimeout(() => setPlusPulse(false), 420)
    } else {
      setMessage(`"${result.name}" is already in your dish list.`)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-labelledby={titleId}
    >
      <label id={titleId} className={styles.label} htmlFor={inputId}>
        Write your own dish
      </label>

      <div className={styles.inputRow}>
        <div className={styles.inputWrap}>
          <input
            id={inputId}
            ref={inputRef}
            className={styles.input}
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setShowSuggestions(true)
              if (message) setMessage(null)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="e.g. Chicken Adobo"
            autoComplete="off"
            maxLength={80}
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-controls={listId}
            aria-autocomplete="list"
          />

          {dropdownOpen && (
            <ul
              id={listId}
              className={styles.suggestions}
              role="listbox"
              aria-label="Dish suggestions"
            >
              {suggestions.map((dish, index) => (
                <li key={dish} role="option" aria-selected={index === 0}>
                  <button
                    type="button"
                    className={styles.suggestionItem}
                    onMouseDown={(event) => {
                      event.preventDefault()
                    }}
                    onClick={() => selectSuggestion(dish)}
                  >
                    {dish}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          className={`${styles.plusButton}${
            plusPulse ? ` ${styles.plusPulse}` : ''
          }`}
          onClick={handleAddToPool}
          disabled={!value.trim()}
          aria-label="Add to dish list"
          title="Add to dish list"
        >
          <svg
            className={styles.plusIcon}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {message && (
        <p className={styles.message} role="status" aria-live="polite">
          {message}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className={styles.add}
          disabled={!value.trim()}
        >
          Add to Today
        </button>
      </div>
    </form>
  )
}
