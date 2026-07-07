export async function callGemini(body: object, retries = 2): Promise<string> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  console.log('Gemini key present:', !!key, 'starts with:', key?.slice(0, 8))
  
  if (!key) throw new Error('VITE_GEMINI_API_KEY not set in .env')
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
  console.log('Calling Gemini:', url.replace(key, 'KEY_HIDDEN'))
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  console.log('Gemini response status:', res.status)
  
  if (res.status === 429 && retries > 0) {
    console.log('Rate limited, retrying in 2s...')
    await new Promise(r => setTimeout(r, 2000))
    return callGemini(body, retries - 1)
  }
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('Gemini error body:', errorText)
    throw new Error(`Gemini error: ${res.status} — ${errorText}`)
  }
  
  const data = await res.json()
  console.log('Gemini success, response:', JSON.stringify(data).slice(0, 200))
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}