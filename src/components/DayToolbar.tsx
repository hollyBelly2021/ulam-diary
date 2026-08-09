import type { PoolAddResult } from '../types'
import type { DailyRestaurantEntry, Restaurant } from '../types/restaurant'
import { type GeneratorMode } from './ActionArea'
import { EatingOut } from './EatingOut'
import {
  type PastPickItem,
  type PastPicksDay,
  UlamHistory,
} from './UlamHistory'
import { UlamResult } from './UlamResult'
import { WriteOwnUlam } from './WriteOwnUlam'
import styles from './ActionArea.module.css'

interface DayToolbarProps {
  writeOpen: boolean
  menuOpen: boolean
  pastPicksOpen: boolean
  pastPicks: PastPicksDay[]
  mode: GeneratorMode
  suggestion: string | null
  allTried: boolean
  dishPool: string[]
  todaysDishes: string[]
  todaysRestaurant: DailyRestaurantEntry | null
  excludedRestaurantIds: string[]
  onGoHome: () => void
  onToggleWrite: () => void
  onCloseWrite: () => void
  onTogglePlate: () => void
  onTogglePastPicks: () => void
  onDeletePastPick: (date: string, item: PastPickItem) => void
  onAddCustomUlam: (rawName: string) => boolean
  onAddToPool: (rawName: string) => PoolAddResult
  onGenerate: () => void
  onOpenEatingOut: () => void
  onReject: () => void
  onAccept: () => void
  onDismissSuggestion: () => void
  onCloseEatingOut: () => void
  onAcceptRestaurant: (restaurant: Restaurant, location: string) => void
}

/**
 * Centered home / write / plate / past-picks nav and one active content panel.
 */
export function DayToolbar({
  writeOpen,
  menuOpen,
  pastPicksOpen,
  pastPicks,
  mode,
  suggestion,
  allTried,
  dishPool,
  todaysDishes,
  todaysRestaurant,
  excludedRestaurantIds,
  onGoHome,
  onToggleWrite,
  onCloseWrite,
  onTogglePlate,
  onTogglePastPicks,
  onDeletePastPick,
  onAddCustomUlam,
  onAddToPool,
  onGenerate,
  onOpenEatingOut,
  onReject,
  onAccept,
  onDismissSuggestion,
  onCloseEatingOut,
  onAcceptRestaurant,
}: DayToolbarProps) {
  const generating =
    (mode === 'ulam' && Boolean(suggestion)) || mode === 'eating-out'
  const showPlateMenu =
    menuOpen && !writeOpen && !pastPicksOpen && !generating
  const atHome = !writeOpen && !menuOpen && !pastPicksOpen && !generating

  return (
    <div className={styles.area} aria-live="polite">
      <div className={styles.iconRow} role="toolbar" aria-label="Day actions">
        <button
          type="button"
          className={`${styles.navIcon}${atHome ? ` ${styles.iconActive}` : ''}`}
          aria-label="Home"
          onClick={onGoHome}
        >
          <svg className={styles.navGlyph} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 11.5L12 5l7.5 6.5" />
            <path d="M7 10.75V19h10v-8.25" />
          </svg>
        </button>

        <button
          type="button"
          className={`${styles.navIcon}${
            writeOpen ? ` ${styles.iconActive}` : ''
          }`}
          aria-label="Write your own dish"
          aria-expanded={writeOpen}
          onClick={onToggleWrite}
        >
          <svg className={styles.navGlyph} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-2.1-2.1L5.9 17.9 4 20z" />
            <path d="M13.5 6.5l2.1 2.1" />
          </svg>
        </button>

        <button
          type="button"
          className={`${styles.navIcon}${
            menuOpen || generating ? ` ${styles.iconActive}` : ''
          }`}
          onClick={onTogglePlate}
          aria-expanded={menuOpen || generating}
          aria-label={
            menuOpen || generating
              ? 'Hide generate options'
              : 'Generate options'
          }
        >
          <svg className={styles.navGlyph} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5.75" />
          </svg>
        </button>

        <button
          type="button"
          className={`${styles.navIcon}${
            pastPicksOpen ? ` ${styles.iconActive}` : ''
          }`}
          aria-label="Past Picks"
          aria-expanded={pastPicksOpen}
          onClick={onTogglePastPicks}
        >
          <svg className={styles.navGlyph} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5v5l3 2" />
          </svg>
        </button>
      </div>

      {!pastPicksOpen && (
        <WriteOwnUlam
          open={writeOpen}
          onClose={onCloseWrite}
          dishPool={dishPool}
          todaysDishes={todaysDishes}
          onAddToToday={onAddCustomUlam}
          onAddToPool={onAddToPool}
        />
      )}

      <div
        className={`${styles.menu}${showPlateMenu ? ` ${styles.menuOpen}` : ''}`}
        aria-hidden={!showPlateMenu}
      >
        <div className={styles.menuInner}>
          <div className={styles.buttonStack}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onGenerate}
              disabled={allTried}
              tabIndex={showPlateMenu ? 0 : -1}
            >
              Cook at Home
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onOpenEatingOut}
              tabIndex={showPlateMenu ? 0 : -1}
            >
              Dine Out
            </button>
            {allTried && (
              <p className={styles.hint}>
                You&apos;ve tried every ulam in the diary!
              </p>
            )}
          </div>
        </div>
      </div>

      {pastPicksOpen && (
        <UlamHistory days={pastPicks} onDeleteItem={onDeletePastPick} />
      )}

      {!writeOpen && !pastPicksOpen && mode === 'ulam' && suggestion && (
        <div className={styles.generatorSlot}>
          <UlamResult
            dishName={suggestion}
            onReject={onReject}
            onAccept={onAccept}
            onClose={onDismissSuggestion}
          />
        </div>
      )}

      {!writeOpen && !pastPicksOpen && mode === 'eating-out' && (
        <div className={styles.generatorSlot}>
          <EatingOut
            todaysEntry={todaysRestaurant}
            excludedRestaurantIds={excludedRestaurantIds}
            onClose={onCloseEatingOut}
            onAccept={onAcceptRestaurant}
          />
        </div>
      )}
    </div>
  )
}
