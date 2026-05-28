import { onMounted, ref } from 'vue'

const SITE_DATA_URL = `${import.meta.env.BASE_URL}site-data.json`
const GAME_SCRIPT_ID = 'tower-defense-script'
const GAME_SCRIPT_SRC = `${import.meta.env.BASE_URL}game.js`
const BASE_URL = import.meta.env.BASE_URL

const fetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.json()
}

const withBase = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return value
  }

  return `${BASE_URL}${value.slice(1)}`
}

const normalizeSiteData = (input) => {
  if (Array.isArray(input)) {
    return input.map(normalizeSiteData)
  }

  if (!input || typeof input !== 'object') {
    return input
  }

  const output = {}

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' && ['avatar', 'image', 'href', 'url'].includes(key)) {
      output[key] = withBase(value)
    } else {
      output[key] = normalizeSiteData(value)
    }
  }

  return output
}

const loadGameScript = () => {
  const existingScript = document.getElementById(GAME_SCRIPT_ID)
  if (existingScript) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GAME_SCRIPT_ID
    script.src = GAME_SCRIPT_SRC
    script.async = true

    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('Failed to load game.js')))

    document.body.appendChild(script)
  })
}

export const useAppData = () => {
  const siteData = ref(null)

  onMounted(async () => {
    try {
      const rawSiteData = await fetchJson(SITE_DATA_URL)
      siteData.value = normalizeSiteData(rawSiteData)
      await loadGameScript()
    } catch (error) {
      console.error('Initialization failed:', error)
    }
  })

  return {
    siteData,
  }
}
