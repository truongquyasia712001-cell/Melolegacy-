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
  await page.getByRole('button', { name: /Phòng Thu Âm/ }).click()
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
