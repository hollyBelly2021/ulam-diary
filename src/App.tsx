import { useEffect, useMemo, useState } from 'react'
import { type GeneratorMode } from './components/ActionArea'
import { CurrentUlamToday } from './components/CurrentUlamToday'
import { DayToolbar } from './components/DayToolbar'
import { EatingOutToday } from './components/EatingOutToday'
import { Header } from './components/Header'
import {
  type PastPickItem,
  type PastPicksDay,
  UlamHistory,
} from './components/UlamHistory'
import { ResetButton } from './components/ResetButton'
import type {
  DailyUlamEntry,
  DayDish,
  PoolAddResult,
  Restaurant,
  UlamDiaryState,
} from './types'
import { getTodayKey } from './utils/dates'
import {
  createDayDish,
  dayHasDish,
  findInDishPool,
  getFullDishPool,
  isExcluded,
  normalizeDishInput,
  restoresToPool,
  sameDishName,
} from './utils/dishes'
import { pickRandomDish } from './utils/random'
import { loadState, saveState } from './utils/storage'

function appendDishToToday(
  history: DailyUlamEntry[],
  todayKey: string,
  dish: DayDish,
): DailyUlamEntry[] {
  const existing = history.find((entry) => entry.date === todayKey)

  if (existing) {
    if (dayHasDish(existing.dishes, dish.name)) return history
    return history.map((entry) =>
      entry.date === todayKey
        ? { ...entry, dishes: [...entry.dishes, dish] }
        : entry,
    )
  }

  return [{ date: todayKey, dishes: [dish] }, ...history]
}

function removeDishFromHistory(
  history: DailyUlamEntry[],
  date: string,
  dishName: string,
): { history: DailyUlamEntry[]; removed: DayDish | null } {
  let removed: DayDish | null = null

  const next = history
    .map((entry) => {
      if (entry.date !== date) return entry
      const target = entry.dishes.find((dish) =>
        sameDishName(dish.name, dishName),
      )
      if (target) removed = target
      return {
        ...entry,
        dishes: entry.dishes.filter(
          (dish) => !sameDishName(dish.name, dishName),
        ),
      }
    })
    .filter((entry) => entry.dishes.length > 0)

  return { history: next, removed }
}

function stillSavedElsewhere(
  history: DailyUlamEntry[],
  dishName: string,
): boolean {
  return history.some((entry) => dayHasDish(entry.dishes, dishName))
}

/**
 * Pool dishes (built-in or custom) should return to random generation
 * when removed from a day's list and not saved on another day.
 */
function shouldReturnToPool(
  dishName: string,
  customPool: string[],
  history: DailyUlamEntry[],
): boolean {
  const inPool = Boolean(
    findInDishPool(dishName, getFullDishPool(customPool)),
  )
  return inPool && !stillSavedElsewhere(history, dishName)
}

export default function App() {
  // localStorage is the source of truth for Current Ulam / history / pool.
  const [state, setState] = useState<UlamDiaryState>(() => loadState())
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [previousSuggestion, setPreviousSuggestion] = useState<string | null>(
    null,
  )
  /** One shared center slot: idle, ulam generator, or eating out. */
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode>('idle')
  /** Plate menu — mutually exclusive with write form and generators. */
  const [menuOpen, setMenuOpen] = useState(false)
  /** Write Your Own Ulam — mutually exclusive with plate menu and generators. */
  const [writeOpen, setWriteOpen] = useState(false)

  // Keep a backup sync in case any update path misses an immediate write.
  useEffect(() => {
    saveState(state)
  }, [state])

  /**
   * Update React state and write localStorage in the same turn
   * so Current Ulam never drifts after refresh.
   */
  function commitState(
    updater: (prev: UlamDiaryState) => UlamDiaryState,
  ): UlamDiaryState {
    let nextState = state
    setState((prev) => {
      const next = updater(prev)
      nextState = next
      if (next !== prev) {
        saveState(next)
      }
      return next
    })
    return nextState
  }

  const todayKey = getTodayKey()

  const todaysEntry = useMemo(
    () => state.history.find((entry) => entry.date === todayKey) ?? null,
    [state.history, todayKey],
  )

  const todaysDishes = useMemo(
    () => todaysEntry?.dishes ?? [],
    [todaysEntry],
  )
  const todaysDishNames = useMemo(
    () => todaysDishes.map((dish) => dish.name),
    [todaysDishes],
  )

  const dishPool = useMemo(
    () => getFullDishPool(state.customPool),
    [state.customPool],
  )

  const availableDishes = useMemo(() => {
    const todayLower = new Set(
      todaysDishes.map((dish) => dish.name.toLowerCase()),
    )

    return dishPool.filter(
      (dish) =>
        !isExcluded(state.excludedDishes, dish) &&
        !todayLower.has(dish.toLowerCase()),
    )
  }, [state.excludedDishes, dishPool, todaysDishes])

  const todaysRestaurant = useMemo(
    () => state.eatingOut.find((entry) => entry.date === todayKey) ?? null,
    [state.eatingOut, todayKey],
  )

  /** Previous days only — dishes and restaurants, names only. */
  const pastPicks = useMemo((): PastPicksDay[] => {
    const dates = new Set<string>()
    for (const entry of state.history) {
      if (entry.date !== todayKey) dates.add(entry.date)
    }
    for (const entry of state.eatingOut) {
      if (entry.date !== todayKey) dates.add(entry.date)
    }

    return Array.from(dates)
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
      .map((date) => {
        const dishes = state.history.find((entry) => entry.date === date)?.dishes ?? []
        const restaurantEntry = state.eatingOut.find(
          (entry) => entry.date === date,
        )
        const items: PastPickItem[] = [
          ...dishes.map((dish) => ({
            kind: 'dish' as const,
            name: dish.name,
            id: dish.name,
            restoresToPool: restoresToPool(dish),
          })),
          ...(restaurantEntry
            ? [
                {
                  kind: 'restaurant' as const,
                  name: restaurantEntry.restaurant.name,
                  id: restaurantEntry.restaurant.id,
                  restoresToPool: true,
                },
              ]
            : []),
        ]
        return { date, items }
      })
      .filter((day) => day.items.length > 0)
  }, [state.history, state.eatingOut, todayKey])

  const allTried = availableDishes.length === 0

  function generateSuggestion(avoid: string | null = previousSuggestion) {
    const next = pickRandomDish(availableDishes, avoid)
    setSuggestion(next)
    if (next) {
      setPreviousSuggestion(next)
      setGeneratorMode('ulam')
    } else {
      setGeneratorMode('idle')
    }
  }

  /** Exit generator/menu without accept or reject — suggestion is discarded. */
  function clearInteraction() {
    setSuggestion(null)
    setGeneratorMode('idle')
    setMenuOpen(false)
  }

  function handleGenerate() {
    setWriteOpen(false)
    setMenuOpen(false)
    generateSuggestion(null)
  }

  function handleDismissSuggestion() {
    clearInteraction()
    setWriteOpen(false)
  }

  function handleOpenEatingOut() {
    setWriteOpen(false)
    setSuggestion(null)
    setMenuOpen(false)
    setGeneratorMode('eating-out')
  }

  function handleCloseEatingOut() {
    setGeneratorMode('idle')
    setMenuOpen(false)
    setWriteOpen(false)
  }

  /** Close write, plate menu, and generators — default home state. */
  function handleGoHome() {
    setWriteOpen(false)
    clearInteraction()
  }

  function handleToggleWrite() {
    if (writeOpen) {
      setWriteOpen(false)
      return
    }
    // Close plate menu / generator without saving or rejecting.
    clearInteraction()
    setWriteOpen(true)
  }

  function handleCloseWrite() {
    setWriteOpen(false)
  }

  function handleTogglePlate() {
    setWriteOpen(false)

    const generating =
      generatorMode === 'eating-out' ||
      (generatorMode === 'ulam' && Boolean(suggestion))

    if (generating) {
      // Exit generator quietly, then show plate options.
      setSuggestion(null)
      setGeneratorMode('idle')
      setMenuOpen(true)
      return
    }

    setMenuOpen((open) => !open)
  }

  function handleReject() {
    if (!suggestion) return
    generateSuggestion(suggestion)
  }

  // Accept → append to today's Current Ulam and persist immediately.
  function handleAccept() {
    if (!suggestion) return
    const dishName = suggestion

    commitState((prev) => {
      const existing = prev.history.find((entry) => entry.date === todayKey)
      if (existing && dayHasDish(existing.dishes, dishName)) return prev

      const dish = createDayDish(dishName, 'generated')
      return {
        ...prev,
        history: appendDishToToday(prev.history, todayKey, dish),
        excludedDishes: isExcluded(prev.excludedDishes, dishName)
          ? prev.excludedDishes
          : [...prev.excludedDishes, dishName],
      }
    })

    setSuggestion(null)
    setGeneratorMode('idle')
    setMenuOpen(false)
    setWriteOpen(false)
  }

  /**
   * Adds a typed ulam to today's list and persists immediately.
   * If it matches the pool, exclude it from generation.
   */
  function handleAddCustomUlam(rawName: string): boolean {
    const trimmed = normalizeDishInput(rawName)
    if (!trimmed) return false

    let added = false
    let displayName = trimmed

    commitState((prev) => {
      const poolMatch = findInDishPool(
        trimmed,
        getFullDishPool(prev.customPool),
      )
      displayName = poolMatch ?? trimmed
      const source = poolMatch ? 'matched' : 'custom'

      const existing = prev.history.find((entry) => entry.date === todayKey)
      if (existing && dayHasDish(existing.dishes, displayName)) {
        return prev
      }

      added = true
      const dish = createDayDish(displayName, source)
      const history = appendDishToToday(prev.history, todayKey, dish)

      if (poolMatch && !isExcluded(prev.excludedDishes, poolMatch)) {
        return {
          ...prev,
          history,
          excludedDishes: [...prev.excludedDishes, poolMatch],
        }
      }

      return { ...prev, history }
    })

    if (added) {
      setSuggestion((current) =>
        current && sameDishName(current, displayName) ? null : current,
      )
    }

    return added
  }

  function handleAddToPool(rawName: string): PoolAddResult {
    const trimmed = normalizeDishInput(rawName)
    if (!trimmed) return { status: 'empty' }

    let result: PoolAddResult = { status: 'empty' }

    commitState((prev) => {
      const pool = getFullDishPool(prev.customPool)
      const existing = findInDishPool(trimmed, pool)

      if (existing) {
        result = { status: 'exists', name: existing }
        return prev
      }

      result = { status: 'added', name: trimmed }
      return {
        ...prev,
        customPool: [...prev.customPool, trimmed],
      }
    })

    return result
  }

  function handleResetList() {
    commitState((prev) => ({
      ...prev,
      excludedDishes: [],
    }))
    setSuggestion(null)
    setPreviousSuggestion(null)
    setGeneratorMode('idle')
    setMenuOpen(false)
    setWriteOpen(false)
  }

  function handleDeleteDish(date: string, dishName: string) {
    if (date === todayKey) return

    commitState((prev) => {
      const { history, removed } = removeDishFromHistory(
        prev.history,
        date,
        dishName,
      )
      if (!removed) return { ...prev, history }

      if (!shouldReturnToPool(removed.name, prev.customPool, history)) {
        return { ...prev, history }
      }

      return {
        ...prev,
        history,
        excludedDishes: prev.excludedDishes.filter(
          (name) => !sameDishName(name, removed.name),
        ),
      }
    })
  }

  function handleDeletePastRestaurant(date: string, restaurantId: string) {
    if (date === todayKey) return

    commitState((prev) => {
      const eatingOut = prev.eatingOut.filter((entry) => entry.date !== date)
      const stillElsewhere = eatingOut.some(
        (entry) => entry.restaurant.id === restaurantId,
      )

      return {
        ...prev,
        eatingOut,
        excludedRestaurantIds: stillElsewhere
          ? prev.excludedRestaurantIds
          : prev.excludedRestaurantIds.filter((id) => id !== restaurantId),
      }
    })
  }

  function handleDeletePastPick(date: string, item: PastPickItem) {
    if (item.kind === 'dish') {
      handleDeleteDish(date, item.id)
      return
    }
    handleDeletePastRestaurant(date, item.id)
  }

  /**
   * Swipe-remove from Current Ulam of the Day:
   * update UI + localStorage immediately so a refresh cannot restore it.
   */
  function handleRemoveTodayDish(dishName: string) {
    commitState((prev) => {
      const { history, removed } = removeDishFromHistory(
        prev.history,
        todayKey,
        dishName,
      )
      if (!removed) return { ...prev, history }

      if (!shouldReturnToPool(removed.name, prev.customPool, history)) {
        return { ...prev, history }
      }

      return {
        ...prev,
        history,
        excludedDishes: prev.excludedDishes.filter(
          (name) => !sameDishName(name, removed.name),
        ),
      }
    })

    setSuggestion((current) =>
      current && sameDishName(current, dishName) ? null : current,
    )
  }

  function handleAcceptRestaurant(restaurant: Restaurant, location: string) {
    commitState((prev) => {
      const entry = {
        date: todayKey,
        location,
        restaurant,
      }

      return {
        ...prev,
        eatingOut: [
          entry,
          ...prev.eatingOut.filter((item) => item.date !== todayKey),
        ],
        excludedRestaurantIds: prev.excludedRestaurantIds.includes(
          restaurant.id,
        )
          ? prev.excludedRestaurantIds
          : [...prev.excludedRestaurantIds, restaurant.id],
      }
    })
  }

  /**
   * Swipe-remove Eating Out Today:
   * clear today, persist immediately, and return restaurant to the pool.
   */
  function handleRemoveTodayRestaurant() {
    commitState((prev) => {
      const entry = prev.eatingOut.find((item) => item.date === todayKey)
      if (!entry) return prev

      const restaurantId = entry.restaurant.id
      const eatingOut = prev.eatingOut.filter((item) => item.date !== todayKey)
      const stillElsewhere = eatingOut.some(
        (item) => item.restaurant.id === restaurantId,
      )

      return {
        ...prev,
        eatingOut,
        excludedRestaurantIds: stillElsewhere
          ? prev.excludedRestaurantIds
          : prev.excludedRestaurantIds.filter((id) => id !== restaurantId),
      }
    })
  }

  return (
    <div className="app">
      <Header />
      <DayToolbar
        writeOpen={writeOpen}
        menuOpen={menuOpen}
        mode={generatorMode}
        suggestion={suggestion}
        allTried={allTried}
        dishPool={dishPool}
        todaysDishes={todaysDishNames}
        todaysRestaurant={todaysRestaurant}
        excludedRestaurantIds={state.excludedRestaurantIds}
        onGoHome={handleGoHome}
        onToggleWrite={handleToggleWrite}
        onCloseWrite={handleCloseWrite}
        onTogglePlate={handleTogglePlate}
        onAddCustomUlam={handleAddCustomUlam}
        onAddToPool={handleAddToPool}
        onGenerate={handleGenerate}
        onOpenEatingOut={handleOpenEatingOut}
        onReject={handleReject}
        onAccept={handleAccept}
        onDismissSuggestion={handleDismissSuggestion}
        onCloseEatingOut={handleCloseEatingOut}
        onAcceptRestaurant={handleAcceptRestaurant}
      />
      <CurrentUlamToday
        dishes={todaysDishNames}
        onRemove={handleRemoveTodayDish}
      />
      <EatingOutToday
        entry={todaysRestaurant}
        onRemove={handleRemoveTodayRestaurant}
      />
      <UlamHistory days={pastPicks} onDeleteItem={handleDeletePastPick} />
      <ResetButton onReset={handleResetList} />
    </div>
  )
}
