import type { Essay } from '@/types'

export interface EssayGroup {
  theme: string
  essays: Essay[]
  suggestedWordCount: number
}

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
  'you','your','is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','this','that','these','those','what',
  'which','who','how','when','where','why','i','we','it','he','she','they','their',
  'our','its','if','as','so','not','more','than','been','about','can','also','some',
])

const THEMES = [
  {
    theme: 'Why This School',
    keywords: ['campus','professor','program','community','research','opportunity','contribute','attracted','drawn','fit','university','college','attend','academic','culture'],
  },
  {
    theme: 'Challenge & Growth',
    keywords: ['challenge','obstacle','overcome','difficult','failure','learned','growth','struggle','adversity','resilience','setback','mistake','experience','persevered'],
  },
  {
    theme: 'Community & Identity',
    keywords: ['community','identity','background','culture','family','diversity','belonging','heritage','perspective','lived','impact','inclusion','race','gender'],
  },
  {
    theme: 'Intellectual Curiosity',
    keywords: ['curious','intellectual','discover','explore','question','passion','major','field','topic','theory','learn','understand','study','knowledge','thinking'],
  },
  {
    theme: 'Leadership & Impact',
    keywords: ['leader','leadership','impact','initiative','team','organization','start','found','change','improve','inspire','responsibility','manage','direct','build'],
  },
  {
    theme: 'Creativity & Arts',
    keywords: ['creative','art','music','write','design','express','perform','create','craft','story','visual','film','poetry','imagine','innovative'],
  },
  {
    theme: 'Short Answer',
    keywords: ['briefly','short','describe','list','word','favorite','three','one','name','quick'],
  },
]

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  )
}

function jaccardSim(a: Set<string>, b: Set<string>): number {
  let inter = 0
  for (const w of a) if (b.has(w)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

function classifyTheme(prompt: string): string {
  const tokens = tokenize(prompt)
  let best = 'Other'
  let bestScore = 0
  for (const { theme, keywords } of THEMES) {
    const kw = new Set(keywords)
    const score = jaccardSim(tokens, kw)
    if (score > bestScore) { bestScore = score; best = theme }
  }
  return best
}

export function groupSimilarPrompts(essays: Essay[]): EssayGroup[] {
  const groups = new Map<string, Essay[]>()

  for (const essay of essays) {
    const theme = classifyTheme(essay.prompt)
    if (!groups.has(theme)) groups.set(theme, [])
    groups.get(theme)!.push(essay)
  }

  return [...groups.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([theme, list]) => ({
      theme,
      essays: list,
      suggestedWordCount: Math.max(...list.map(e => e.wordLimit ?? 250)),
    }))
    .sort((a, b) => b.essays.length - a.essays.length)
}
