const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' })
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })

// Local calendar date as YYYY-MM-DD.
export function today() {
  return new Date().toLocaleDateString('en-CA')
}

export function formatDay(iso: string) {
  return iso === today() ? 'today' : day.format(new Date(`${iso}T00:00`))
}

export function longDate(date = new Date()) {
  return `${weekday.format(date)}, ${day.format(date)}`
}
