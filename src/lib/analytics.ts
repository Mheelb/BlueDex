export function initAnalytics() {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
  if (!websiteId) return

  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://cloud.umami.is/script.js'
  script.setAttribute('data-website-id', websiteId)
  document.head.appendChild(script)
}
