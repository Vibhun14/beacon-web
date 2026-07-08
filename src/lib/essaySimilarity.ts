import type { Essay } from '@/types'

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','could','should','may','might','that','this','these','those','it',
  'its','you','your','we','our','they','their','what','how','why','when','where',
  'who','which','please','describe','discuss','tell','us','about','i','my','me',
  'can','any','some','one','two','three','more','most','also','just',
])

function extractKeywords(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let inter = 0
  for (const w of a) if (b.has(w)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

const THEMES: { label: string; keywords: string[] }[] = [
  { label: 'Why This School',      keywords: ['community','campus','program','research','professor','opportunity','contribute','specifically','drawn','attracted'] },
  { label: 'Challenge & Growth',   keywords: ['challenge','obstacle','difficult','overcome','failure','struggle','learned','growth','resilience','adversity'] },
  { label: 'Community & Identity', keywords: ['community','diversity','background','culture','identity','experience','perspective','lived','family','heritage'] },
  { label: 'Intellectual Curiosity', keywords: ['intellectual','curious','passion','interest','explore','question','discovery','academic','study','fascinated'] },
  { label: 'Leadership & Impact',  keywords: ['lead','leadership','initiative','impact','change','team','organize','founded','created','responsibility'] },
  { label: 'Service & Values',     keywords: ['service','volunteer','values','society','civic','responsibility','help','give','commitment','mission'] },
  { label: 'Creative & Arts',      keywords: ['creative','artwork','music','write','design','express','imagine','craft','performance','artistic'] },
]

function detectTheme(keywords: Set<string>): string {
  let best = { label: 'Other', score: 0 }
  for (const theme of THEMES) {
    const score = theme.keywords.filter(k => keywords.has(k)).length
    if (score > best.score) best = { label: theme.label, score }
  }
  return best.label
}

export interface EssayCluster {
  id: string
  theme: string
  essays: Essay[]
  keywords: string[]
  suggestion: string
}

export function clusterEssays(essays: Essay[]): EssayCluster[] {
  if (essays.length === 0) return []

  const keywordMap = new Map<string, Set<string>>()
  for (const essay of essays) {
    keywordMap.set(essay.id, extractKeywords(essay.prompt))
  }

  const visited = new Set<string>()
  const clusters: EssayCluster[] = []

  for (const essay of essays) {
    if (visited.has(essay.id)) continue

    const group: Essay[] = [essay]
    visited.add(essay.id)
    const aKw = keywordMap.get(essay.id)!

    for (const other of essays) {
      if (visited.has(other.id)) continue
      if (jaccardSimilarity(aKw, keywordMap.get(other.id)!) >= 0.35) {
        group.push(other)
        visited.add(other.id)
      }
    }

    const allKeywords = new Set<string>()
    group.forEach(e => keywordMap.get(e.id)!.forEach(k => allKeywords.add(k)))
    const theme = detectTheme(allKeywords)

    const shared = [...allKeywords]
      .filter(k => group.every(e => keywordMap.get(e.id)!.has(k)))
      .slice(0, 5)

    clusters.push({
      id: `cluster-${clusters.length}`,
      theme,
      essays: group,
      keywords: shared,
      suggestion: group.length > 1
        ? `Write 1 core essay on "${theme}", adapt for ${group.length} schools`
        : 'Unique prompt — write independently',
    })
  }

  return clusters.sort((a, b) => b.essays.length - a.essays.length)
}

// Legacy export kept for any remaining imports
export type { EssayCluster as EssayGroup }
export const groupSimilarPrompts = (essays: Essay[]) =>
  clusterEssays(essays).map(c => ({ theme: c.theme, essays: c.essays, suggestedWordCount: Math.max(...c.essays.map(e => e.wordLimit ?? 250)) }))
