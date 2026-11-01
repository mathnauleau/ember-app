const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' })
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })

const pad = (n: number) => String(n).padStart(2, '0')

// Local calendar date as YYYY-MM-DD, built by hand: streaks can't depend on a locale's format.
const iso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const today = () => iso(new Date())

export function formatDay(date: string) {
  return date === today() ? 'today' : day.format(new Date(`${date}T00:00`))
}

export function nextDay(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return iso(new Date(y, m - 1, d + 1))
}

export const weekdayOf = (date: string) => weekday.format(new Date(`${date}T00:00`))

export function longDate(date = new Date()) {
  return `${weekday.format(date)}, ${day.format(date)}`
}
