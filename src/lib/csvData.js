import Papa from 'papaparse'

async function readResponseText(response, url) {
  if (url.toLowerCase().endsWith('.gz')) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress .gz CSV files because DecompressionStream is unavailable.')
    }

    if (!response.body) {
      throw new Error('The gzipped CSV response body is unavailable.')
    }

    const decompressedStream = response.body.pipeThrough(new DecompressionStream('gzip'))
    return new Response(decompressedStream).text()
  }

  return response.text()
}

function parseCsvText(csvText, parseConfig) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      ...parseConfig,
      complete: ({ data, errors, meta }) => {
        const blockingErrors = errors.filter((error) => error.code !== 'UndetectableDelimiter')

        if (blockingErrors.length > 0) {
          reject(new Error(blockingErrors.map((error) => error.message).join('; ')))
          return
        }

        resolve({
          rows: data,
          fields: meta.fields ?? [],
          errors,
          meta,
        })
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

export async function fetchAndParseCsv(url, parseConfig = {}) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV from ${url}: ${response.status} ${response.statusText}`)
  }

  const csvText = await readResponseText(response, url)
  return parseCsvText(csvText, parseConfig)
}
