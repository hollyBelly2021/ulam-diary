import { formatHeaderDate } from '../utils/dates'
import styles from './Header.module.css'

export function Header() {
  const { weekday, fullDate } = formatHeaderDate()

  return (
    <header className={styles.header}>
      <h1 className={styles.brand}>Ulam Diary</h1>
      <div className={styles.dateBlock}>
        <p className={styles.weekday}>{weekday}</p>
        <p className={styles.fullDate}>{fullDate}</p>
      </div>
    </header>
  )
}
