import { useEffect, useRef, useState } from 'react'
import styles from './SplashScreen.module.css'

type SplashPhase = 'enter' | 'hold' | 'leave'

interface SplashScreenProps {
  onComplete: () => void
}

const ENTER_MS = 600
const HOLD_MS = 800
const LEAVE_MS = 800

/**
 * One-time load splash: calm rice-bowl fade in, pause, then fade into the app.
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<SplashPhase>('enter')
  const [leaving, setLeaving] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const holdTimer = window.setTimeout(() => setPhase('hold'), ENTER_MS)
    const leaveTimer = window.setTimeout(() => {
      setPhase('leave')
      setLeaving(true)
    }, ENTER_MS + HOLD_MS)
    const doneTimer = window.setTimeout(
      () => onCompleteRef.current(),
      ENTER_MS + HOLD_MS + LEAVE_MS,
    )

    return () => {
      window.clearTimeout(holdTimer)
      window.clearTimeout(leaveTimer)
      window.clearTimeout(doneTimer)
    }
  }, [])

  const logoClass =
    phase === 'enter'
      ? styles.logoEntering
      : phase === 'hold'
        ? styles.logoHolding
        : styles.logoLeaving

  return (
    <div
      className={`${styles.splash}${leaving ? ` ${styles.splashOut}` : ''}`}
      aria-hidden="true"
    >
      <div className={`${styles.logoWrap} ${logoClass}`}>
        <img
          className={styles.logo}
          src={`${import.meta.env.BASE_URL}rice-bowl.png`}
          alt=""
          width={160}
          height={107}
          decoding="async"
        />
      </div>
    </div>
  )
}
