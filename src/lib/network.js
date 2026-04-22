export function buildNoCacheUrl(url) {
  if (!url) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_ts=${Date.now()}`
}

export async function fetchJsonNoCache(url, options = {}) {
  const response = await fetch(buildNoCacheUrl(url), {
    ...options,
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...(options.headers ?? {}),
    },
  })

  return response
}
