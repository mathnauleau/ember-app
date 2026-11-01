const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

export const words = (n: number) => WORDS[n] ?? String(n)
export const capitalized = (s: string) => s[0].toUpperCase() + s.slice(1)
export const count = (n: number) => capitalized(words(n))
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
