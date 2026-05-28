import { onMounted, ref } from 'vue'

const SITE_DATA_URL = '/site-data.json'
const GAME_SCRIPT_ID = 'tower-defense-script'
const GAME_SCRIPT_SRC = '/game.js'

const fetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.json()
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
      siteData.value = await fetchJson(SITE_DATA_URL)
      await loadGameScript()
    } catch (error) {
      console.error('Initialization failed:', error)
    }
  })

  return {
    siteData,
  }
}
