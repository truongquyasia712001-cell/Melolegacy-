import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputDirectory = path.resolve('public/audio/meta-piano')
const sourceBase = 'https://raw.githubusercontent.com/facebookincubator/Meta-open-sound/main/systems/instruments/meta-piano/ogg'
const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']
const notes = Array.from({ length: 88 }, (_, index) => index + 21)
const batchSize = 4
const maxAttempts = 4
const retryableStatuses = new Set([408, 429, 500, 502, 503, 504])

async function fetchSample(filename) {
  const url = `${sourceBase}/${filename}`

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    } catch (error) {
      if (attempt === maxAttempts) {
        const detail = error instanceof Error ? error.message : 'network error'
        throw new Error(`Meta Piano download failed for ${filename}: ${detail}`)
      }
      await new Promise(resolve => setTimeout(resolve, 500 * (2 ** (attempt - 1))))
      continue
    }

    if (response.ok) return response
    if (!retryableStatuses.has(response.status) || attempt === maxAttempts) {
      throw new Error(`Meta Piano download failed for ${filename}: HTTP ${response.status}`)
    }
    await new Promise(resolve => setTimeout(resolve, 500 * (2 ** (attempt - 1))))
  }

  throw new Error(`Meta Piano download failed for ${filename}: retry limit reached`)
}

await mkdir(outputDirectory, { recursive: true })

for (let offset = 0; offset < notes.length; offset += batchSize) {
  const batch = notes.slice(offset, offset + batchSize)
  await Promise.all(batch.map(async midi => {
    const pitch = noteNames[midi % 12] + (Math.floor(midi / 12) - 1)
    const filename = `INSPiano_Vel03_${pitch}_01.ogg`
    const response = await fetchSample(filename)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.subarray(0, 4).toString() !== 'OggS') throw new Error(`Invalid OGG sample received for ${filename}`)
    await writeFile(path.join(outputDirectory, filename), bytes)
  }))
  console.log(`Prepared Meta Piano assets: ${Math.min(offset + batch.length, notes.length)}/88`)
}

await writeFile(
  path.join(outputDirectory, 'SOURCE.txt'),
  [
    'MeloLegacy piano samples',
    'Source: Meta Open Sound — Meta Piano',
    'Source repository: https://github.com/facebookincubator/Meta-open-sound',
    'Collection: meta-piano v1.0.0',
    'License: CC0 1.0 Universal',
    'Included files: one mf (Vel03) OGG sample for each of the 88 piano keys, A0–C8.',
    'Original sample recordings remain part of the Meta Open Sound collection.',
    '',
  ].join('\n'),
)
console.log('Meta Piano asset preparation complete.')
