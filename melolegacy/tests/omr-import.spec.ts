import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

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
  await page.route('**/api/omr/jobs**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'POST' && path === '/api/omr/jobs') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'playwright-omr-fixture' }),
      })
      return
    }
    if (path === '/api/omr/jobs/playwright-omr-fixture') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'playwright-omr-fixture', status: 'completed' }),
      })
      return
    }
    if (path === '/api/omr/jobs/playwright-omr-fixture/musicxml') {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.recordare.musicxml+xml',
        body: musicXml,
      })
      return
    }
    await route.fulfill({ status: 404, body: 'Unexpected OMR route: ' + request.method() + ' ' + path })
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
  await expect(page.locator('.omr-copy span')).toContainText('Đã nạp 3 ký hiệu từ 1 bè.')
})


test('MusicXML keeps notated values for tuplets, rests, and dotted notes', async ({ page }) => {
  const semanticXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<score-partwise version="4.0">',
    '  <work><work-title>Notation Semantics Fixture</work-title></work>',
    '  <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>',
    '  <part id="P1"><measure number="1">',
    '    <attributes><divisions>28</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>',
    '    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>16th</type><time-modification><actual-notes>7</actual-notes><normal-notes>4</normal-notes></time-modification></note>',
    '    <note><rest/><duration>14</duration><type>eighth</type></note>',
    '    <note><pitch><step>E</step><octave>4</octave></pitch><duration>42</duration><type>quarter</type><dot/></note>',
    '  </measure></part>',
    '</score-partwise>',
  ].join('\n')

  await page.route('**/api/omr/jobs**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'POST' && path === '/api/omr/jobs') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'notation-semantics-fixture' }) })
      return
    }
    if (path === '/api/omr/jobs/notation-semantics-fixture') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'notation-semantics-fixture', status: 'completed' }) })
      return
    }
    if (path === '/api/omr/jobs/notation-semantics-fixture/musicxml') {
      await route.fulfill({ status: 200, contentType: 'application/vnd.recordare.musicxml+xml', body: semanticXml })
      return
    }
    await route.fulfill({ status: 404, body: 'Unexpected OMR route: ' + request.method() + ' ' + path })
  })

  await page.goto('/')
  await page.locator('input[type="file"][accept*="pdf"]').setInputFiles({
    name: 'notation-semantics.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7'),
  })

  await expect(page.getByText('Đã nạp 3 ký hiệu từ 1 bè. Anh có thể kiểm tra và chỉnh sửa trên khuông nhạc.')).toBeVisible({ timeout: 10000 })
  await page.waitForFunction(() => {
    try {
      const notes = JSON.parse(localStorage.getItem('melo-composer-notes-v2') || '[]')
      return notes.length === 3
    } catch {
      return false
    }
  })
  const imported = await page.evaluate(() => JSON.parse(localStorage.getItem('melo-composer-notes-v2') || '[]'))
  expect(imported.map((note: { duration: string; dotted: boolean; rest: boolean }) => ({
    duration: note.duration,
    dotted: note.dotted,
    rest: note.rest,
  }))).toEqual([
    { duration: '16', dotted: false, rest: false },
    { duration: '8', dotted: false, rest: true },
    { duration: 'q', dotted: true, rest: false },
  ])
})
