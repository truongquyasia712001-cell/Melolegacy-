import { test, expect } from '@playwright/test'

test('MeloLegacy loads and opens ecosystem map', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Bản đồ Melo' })).toBeVisible()
  await page.getByRole('button', { name: 'Bản đồ Melo' }).click()
  await expect(page.getByRole('heading', { name: 'Bản đồ hệ sinh thái MeloLegacy' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Chế độ sơ đồ' })).toBeVisible()
})

test('Neuron room selection and branch expansion work with touch-sized controls', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bản đồ Melo' }).click()
  await expect(page.getByRole('heading', { name: 'Phòng Soạn Nhạc' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nhận dạng PDF/ })).toBeVisible()
  await page.getByRole('button', { name: 'Thu gọn −' }).click()
  await expect(page.getByRole('button', { name: /Nhận dạng PDF/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Mở rộng +' }).click()
  await expect(page.getByRole('button', { name: /Nhận dạng PDF/ })).toBeVisible()
  await page.getByRole('button', { name: /Thu Âm/ }).click()
  await expect(page.getByRole('heading', { name: 'Phòng Thu Âm' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Thu âm/ })).toBeVisible()
})

test('map remains within viewport without horizontal page overflow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bản đồ Melo' }).click()
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1)
})

test('Lyre view can be selected and switched back to Neuron', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bản đồ Melo' }).click()
  await page.getByRole('button', { name: /Bản đồ Đàn Thiên Thần/ }).click()
  await expect(page.getByText('Khung Đàn Thiên Thần')).toBeVisible()
  await page.getByRole('button', { name: /Sơ đồ Neuron/ }).click()
  await expect(page.locator('.neuron-stage')).toBeVisible()
})


test('selected branch details update and reset when changing rooms', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bản đồ Melo' }).click()
  await page.getByRole('button', { name: /Nhận dạng PDF/ }).click()
  await expect(page.getByRole('heading', { name: 'Nhận dạng PDF' })).toBeVisible()
  await expect(page.getByText(/Đưa bản nhạc PDF qua Audiveris/)).toBeVisible()
  await page.getByRole('button', { name: /Thu Âm/ }).click()
  await expect(page.getByRole('heading', { name: 'Phòng Thu Âm' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nhận dạng PDF' })).toHaveCount(0)
})

test('room nodes have touch targets of at least 44 by 44 CSS pixels', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bản đồ Melo' }).click()
  const roomNodes = page.locator('.melo-map-stage button[aria-pressed]')
  await expect(roomNodes).toHaveCount(13)
  const sizes = await roomNodes.evaluateAll(nodes =>
    nodes.map(node => {
      const rect = node.getBoundingClientRect()
      return { label: node.textContent?.trim(), width: rect.width, height: rect.height }
    })
  )
  expect(sizes.length).toBeGreaterThanOrEqual(10)
  for (const node of sizes) {
    expect(node.width, `${node.label} width`).toBeGreaterThanOrEqual(44)
    expect(node.height, `${node.label} height`).toBeGreaterThanOrEqual(44)
  }
})

test('room nodes do not overlap in either map view', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bản đồ Melo' }).click()
  for (const viewName of ['Sơ đồ Neuron', 'Bản đồ Đàn Thiên Thần']) {
    await page.getByRole('button', { name: new RegExp(viewName) }).click()
    const roomNodes = page.locator('.melo-map-stage button[aria-pressed]')
    await expect(roomNodes).toHaveCount(13)
    const overlaps = await roomNodes.evaluateAll(nodes => {
      const rects = nodes.map(node => {
        const r = node.getBoundingClientRect()
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, label: node.textContent?.trim() }
      })
      const collisions: string[] = []
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j]
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
            collisions.push(`${a.label} overlaps ${b.label}`)
          }
        }
      }
      return collisions
    })
    expect(overlaps, `${viewName} node collisions`).toEqual([])
  }
})

test('Lyre placeholder is explicit and does not claim the original asset is present', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Bản đồ Melo' }).click()
  await page.getByRole('button', { name: /Bản đồ Đàn Thiên Thần/ }).click()
  await expect(page.getByText(/Đang chờ ảnh Lyre vàng kim gốc/)).toBeVisible()
  await expect(page.locator('.lyre-asset-required')).toBeVisible()
})


test('piano reading controls support slow playback and stop on iPad browsers', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('melo-composer-notes-v2', JSON.stringify([
      { id: 91001, staff: 0, measure: 0, beat: 0, key: 'c/4', duration: 'q', dotted: false, accidental: '', rest: false },
      { id: 91002, staff: 0, measure: 0, beat: 1, key: 'e/4', duration: 'q', dotted: false, accidental: '', rest: false },
    ]))
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Nghe piano & đọc nốt/ })).toBeEnabled()
  await page.getByLabel('Tốc độ đọc').selectOption('0.75')
  await expect(page.getByLabel('Tốc độ đọc')).toHaveValue('0.75')
  await page.getByRole('button', { name: /Nghe piano & đọc nốt/ }).click()
  await expect(page.getByRole('button', { name: /Dừng đọc/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nghe piano & đọc nốt/ })).toBeVisible({ timeout: 5000 })
})

test('piano recording import extracts and stores chromatic samples locally', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('THƯ VIỆN SAMPLE PIANO')).toBeVisible()
  const sampleRate = 16000
  const sections = [
    { frequency: 82.41, seconds: 0.32 },
    { frequency: 87.31, seconds: 0.32 },
    { frequency: 92.5, seconds: 0.32 },
  ]
  const pcm: number[] = []
  for (const section of sections) {
    const count = Math.floor(sampleRate * section.seconds)
    for (let i = 0; i < count; i++) pcm.push(Math.round(Math.sin(2 * Math.PI * section.frequency * i / sampleRate) * 5000))
    for (let i = 0; i < sampleRate * 0.2; i++) pcm.push(0)
  }
  const dataSize = pcm.length * 2
  const wav = Buffer.alloc(44 + dataSize)
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataSize, 4); wav.write('WAVE', 8)
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34)
  wav.write('data', 36); wav.writeUInt32LE(dataSize, 40)
  pcm.forEach((value, index) => wav.writeInt16LE(value, 44 + index * 2))
  await page.locator('input[accept*="audio/"]').setInputFiles({ name: 'piano-test.wav', mimeType: 'audio/wav', buffer: wav })
  await expect(page.getByText('3/45 nốt')).toBeVisible()
  await expect(page.getByText('E2')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu bộ sample trên thiết bị' }).click()
  await expect(page.getByRole('status')).toContainText('Đã lưu 3 sample piano')
})
