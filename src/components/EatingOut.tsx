import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { Coordinates } from '../services/geolocationService'
import {
  DEFAULT_RADIUS_METERS,
  MAX_RADIUS_METERS,
  RestaurantServiceError,
  type GeocodedPlace,
  fetchNearbyRestaurants,
  geocodePlaceQuery,
  pickRandomRestaurant,
  searchPlaceSuggestions,
} from '../services/restaurantService'
import type { DailyRestaurantEntry, Restaurant } from '../types/restaurant'
import { RestaurantResult } from './RestaurantResult'
import styles from './EatingOut.module.css'

type ViewState = 'form' | 'searching' | 'empty' | 'ready'

interface EatingOutProps {
  todaysEntry: DailyRestaurantEntry | null
  excludedRestaurantIds: string[]
  /** Exit dine-out mode and return to the default home state. */
  onClose: () => void
  onAccept: (restaurant: Restaurant, location: string) => void
}

const AUTOCOMPLETE_DEBOUNCE_MS = 400

function messageForSearchError(error: unknown): string {
  if (error instanceof RestaurantServiceError) {
    switch (error.code) {
      case 'PLACE_NOT_FOUND':
        return "We couldn't find that location.\nTry another address, city, or ZIP."
      case 'GEOCODE_FAILED':
        return 'Location lookup is busy right now. Please try again in a moment.'
      case 'OVERPASS_FAILED':
        return 'Restaurant search is temporarily unavailable. Please try again.'
      default:
        break
    }
  }
  return 'Unable to search that location. Please try again.'
}

/**
 * Dine Out: manual location input + autocomplete, then existing restaurant generator.
 */
export function EatingOut({
  excludedRestaurantIds,
  onClose,
  onAccept,
}: EatingOutProps) {
  const [view, setView] = useState<ViewState>('form')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [savedCoords, setSavedCoords] = useState<Coordinates | null>(null)
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([])
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [pool, setPool] = useState<Restaurant[]>([])
  const [locationLabel, setLocationLabel] = useState('Near you')
  const [suggestion, setSuggestion] = useState<Restaurant | null>(null)
  const [previousId, setPreviousId] = useState<string | null>(null)
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS)

  const coordsRef = useRef<Coordinates | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const suggestAbortRef = useRef<AbortController | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const excludedRef = useRef(excludedRestaurantIds)
  excludedRef.current = excludedRestaurantIds

  const listId = useId()
  const inputId = useId()

  const available = useMemo(
    () => pool.filter((r) => !excludedRestaurantIds.includes(r.id)),
    [pool, excludedRestaurantIds],
  )

  const isLoading = view === 'searching'
  const showSuggestions =
    dropdownOpen && suggestions.length > 0 && !isLoading && view === 'form'

  // Debounced Nominatim autocomplete.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3 || savedCoords) {
      setSuggestions([])
      setHighlightIndex(-1)
      return
    }

    const timer = window.setTimeout(() => {
      suggestAbortRef.current?.abort()
      const controller = new AbortController()
      suggestAbortRef.current = controller

      void searchPlaceSuggestions(trimmed, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return
          setSuggestions(results)
          setHighlightIndex(results.length > 0 ? 0 : -1)
          setDropdownOpen(true)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setSuggestions([])
          setHighlightIndex(-1)
        })
    }, AUTOCOMPLETE_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      suggestAbortRef.current?.abort()
    }
  }, [query, savedCoords])

  // Close dropdown on outside click.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (formRef.current && !formRef.current.contains(target)) {
        setDropdownOpen(false)
        setHighlightIndex(-1)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  function beginRequest() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return controller
  }

  async function searchNearby(
    coords: Coordinates,
    radius: number,
    signal: AbortSignal,
    label: string,
  ) {
    setView('searching')
    setSuggestion(null)
    setPreviousId(null)
    setDropdownOpen(false)
    setSuggestions([])

    const restaurants = await fetchNearbyRestaurants(coords, radius, signal)
    if (signal.aborted) return

    setLocationLabel(label)
    setPool(restaurants)

    const open = restaurants.filter(
      (r) => !excludedRef.current.includes(r.id),
    )

    if (open.length === 0) {
      setView(restaurants.length === 0 ? 'empty' : 'ready')
      setSuggestion(null)
      return
    }

    const next = pickRandomRestaurant(open, null)
    setSuggestion(next)
    if (next) setPreviousId(next.id)
    setView('ready')
  }

  function selectPlace(place: GeocodedPlace) {
    setQuery(place.label)
    setSavedCoords(place.coords)
    setSuggestions([])
    setDropdownOpen(false)
    setHighlightIndex(-1)
    setErrorMessage(null)
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setSavedCoords(null)
    setErrorMessage(null)
    if (value.trim().length < 3) {
      setSuggestions([])
      setDropdownOpen(false)
      setHighlightIndex(-1)
    } else {
      setDropdownOpen(true)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setDropdownOpen(false)
      setHighlightIndex(-1)
      return
    }

    if (!showSuggestions) {
      if (event.key === 'Enter' && highlightIndex < 0) return
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((index) =>
        index < suggestions.length - 1 ? index + 1 : 0,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex((index) =>
        index > 0 ? index - 1 : suggestions.length - 1,
      )
      return
    }

    if (event.key === 'Enter' && highlightIndex >= 0) {
      event.preventDefault()
      const place = suggestions[highlightIndex]
      if (place) selectPlace(place)
    }
  }

  async function handleFindRestaurant(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || isLoading) return

    const controller = beginRequest()
    setErrorMessage(null)
    setDropdownOpen(false)
    setSuggestions([])
    setView('searching')

    try {
      let coords = savedCoords
      let label = trimmed

      if (!coords) {
        const place = await geocodePlaceQuery(trimmed, controller.signal)
        if (controller.signal.aborted) return
        coords = place.coords
        label = place.label
        setQuery(place.label)
        setSavedCoords(place.coords)
      }

      coordsRef.current = coords
      setRadiusMeters(DEFAULT_RADIUS_METERS)
      await searchNearby(coords, DEFAULT_RADIUS_METERS, controller.signal, label)
    } catch (error) {
      if (controller.signal.aborted) return
      setView('form')
      setErrorMessage(messageForSearchError(error))
    }
  }

  function generate(avoidId: string | null = previousId) {
    const next = pickRandomRestaurant(available, avoidId)
    setSuggestion(next)
    if (next) setPreviousId(next.id)
  }

  function handleReject() {
    if (!suggestion || isLoading) return
    generate(suggestion.id)
  }

  function handleAccept() {
    if (!suggestion || isLoading) return
    onAccept(suggestion, locationLabel)
    setSuggestion(null)
    onClose()
  }

  async function handleIncreaseRadius() {
    if (isLoading || !coordsRef.current) return
    const nextRadius = Math.min(
      radiusMeters + DEFAULT_RADIUS_METERS,
      MAX_RADIUS_METERS,
    )
    if (nextRadius === radiusMeters) return

    setRadiusMeters(nextRadius)
    setErrorMessage(null)
    const controller = beginRequest()

    try {
      await searchNearby(
        coordsRef.current,
        nextRadius,
        controller.signal,
        locationLabel,
      )
    } catch (error) {
      if (controller.signal.aborted) return
      setView('form')
      setErrorMessage(messageForSearchError(error))
    }
  }

  if (suggestion && view === 'ready') {
    return (
      <RestaurantResult
        restaurant={suggestion}
        onReject={handleReject}
        onAccept={handleAccept}
        onClose={onClose}
      />
    )
  }

  return (
    <div className={styles.inlinePanel}>
      <button
        type="button"
        className={styles.panelClose}
        onClick={onClose}
        aria-label="Close Dine Out"
      >
        <svg className={styles.closeIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {isLoading && (
        <div className={styles.statusBlock} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.statusMessage}>Finding a restaurant nearby...</p>
        </div>
      )}

      {view === 'form' && (
        <form
          ref={formRef}
          className={styles.locationForm}
          onSubmit={handleFindRestaurant}
        >
          <label className={styles.locationLabel} htmlFor={inputId}>
            Where are you eating?
          </label>

          <div className={styles.locationField}>
            <input
              id={inputId}
              className={styles.locationInput}
              type="text"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0 && !savedCoords) {
                  setDropdownOpen(true)
                }
              }}
              placeholder="Address, city, or ZIP"
              aria-label="Address, city, or ZIP"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={showSuggestions}
              role="combobox"
              autoComplete="off"
              disabled={isLoading}
            />

            {showSuggestions && (
              <ul
                id={listId}
                className={styles.suggestionList}
                role="listbox"
                aria-label="Location suggestions"
              >
                {suggestions.map((place, index) => (
                  <li key={place.id} role="option" aria-selected={index === highlightIndex}>
                    <button
                      type="button"
                      className={`${styles.suggestionItem}${
                        index === highlightIndex
                          ? ` ${styles.suggestionItemActive}`
                          : ''
                      }`}
                      onMouseDown={(event) => {
                        // Keep focus / avoid blur before click applies.
                        event.preventDefault()
                      }}
                      onClick={() => selectPlace(place)}
                      onMouseEnter={() => setHighlightIndex(index)}
                    >
                      {place.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            className={styles.findButton}
            disabled={!query.trim() || isLoading}
          >
            Find a Restaurant
          </button>

          {errorMessage && (
            <p className={styles.locationError} role="alert">
              {errorMessage.split('\n').map((line, index) => (
                <span key={`${line}-${index}`}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          )}
        </form>
      )}

      {view === 'empty' && (
        <div className={styles.statusBlock}>
          <p className={styles.statusMessage}>
            No nearby restaurants found in OpenStreetMap for this area.
            {radiusMeters < MAX_RADIUS_METERS ? (
              <>
                <br />
                Try increasing the search radius.
              </>
            ) : (
              <>
                <br />
                Try a different address, city, or ZIP.
              </>
            )}
          </p>
          {radiusMeters < MAX_RADIUS_METERS ? (
            <button
              type="button"
              className={styles.statusButton}
              onClick={() => void handleIncreaseRadius()}
            >
              Increase Radius
            </button>
          ) : null}
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              setView('form')
              setErrorMessage(null)
            }}
          >
            Edit location
          </button>
        </div>
      )}

      {view === 'ready' && available.length === 0 && (
        <p className={styles.statusMessage}>
          You&apos;ve tried every nearby restaurant for today!
        </p>
      )}
    </div>
  )
}
