import { test, expect } from '@playwright/test'

const musicXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<score-partwise version="4.0">',
  '  <work><work-title>OMR Fixture Sonata</work-title></work>',
  '  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>',
  '  <part id="P1"><measure number="1">',
  '    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>',
  '    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>',
  '    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>',
  '    <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>',
  '  </measure></part>',
  '</score-partwise>',
].join('\n')

test('PDF OMR result imports MusicXML into the editable score', async ({ page }) => {
  await page.route('**/api/omr/jobs', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'playwright-omr-fixture' }),
    })
  })
  await page.route('**/api/omr/jobs/playwright-omr-fixture', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'playwright-omr-fixture', status: 'completed' }),
    })
  })
  await page.route('**/api/omr/jobs/playwright-omr-fixture/musicxml', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.recordare.musicxml+xml',
      body: musicXml,
    })
  })

  await page.goto('/')
  await page.locator('input[type="file"][accept*="pdf"]').setInputFiles({
    name: 'omr-fixture.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7'),
  })

  await expect(page.getByText('Đã nạp 3 ký hiệu từ 1 bè. Anh có thể kiểm tra và chỉnh sửa trên khuông nhạc.')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('.paper h1')).toHaveText('OMR Fixture Sonata')
  await expect(page.locator('.notation-host [data-note-id]')).toHaveCount(3)
  await expect(page.getByText('Đã nhập bản nhạc từ MusicXML')).toBeVisible()
})
