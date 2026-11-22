// Port of ExerciseSearch.kt: forgiving exercise-name search. A query is split into words and every word must
// be found in the name: inside it, or, for words of four letters or more, as a small typo of the start of a
// name word. Ignores case, accents and extra spaces.

const TYPO_MIN_LETTERS = 4
const LONG_WORD_LETTERS = 8

/** Lowercase, accents removed, anything that is not a letter or digit becomes a single space. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, ' ')
    .trim()
    .replace(/ +/g, ' ')
}

const words = (text: string): string[] => normalize(text).split(' ').filter((w) => w.length > 0)

/** Edit distance where swapping two neighbouring letters counts as one edit. */
export function distance(a: string, b: string): number {
  if (a === b) return 0
  const d: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) d[i][0] = i
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, d[i - 2][j - 2] + 1)
      d[i][j] = best
    }
  }
  return d[a.length][b.length]
}

function isTypoOfStart(word: string, nameWord: string): boolean {
  if (word.length < TYPO_MIN_LETTERS) return false
  const allowed = word.length >= LONG_WORD_LETTERS ? 2 : 1
  return distance(word, nameWord) <= allowed || distance(word, nameWord.slice(0, word.length)) <= allowed
}

/** True when the name matches the query. A blank query matches everything. */
export function matchesSearch(name: string, query: string): boolean {
  const queryWords = words(query)
  if (queryWords.length === 0) return true
  const normalizedName = normalize(name)
  const nameWords = words(name)
  return queryWords.every((w) => normalizedName.includes(w) || nameWords.some((n) => isTypoOfStart(w, n)))
}
