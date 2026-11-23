const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import assert from 'node:assert/strict'
const browser = await chromium.launch({ headless: true, channel: 'chrome' }), context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }), page = await context.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(10000)
const settle = async () => { await page.waitForTimeout(450); await page.getByRole('status').filter({ hasText: 'Saved in this browser' }).waitFor() }
const state = () => page.evaluate(() => new Promise(resolve => { const q = indexedDB.open('kirayana-organizer', 1); q.onsuccess = () => { const db = q.result, r = db.transaction('organizer').objectStore('organizer').get('current'); r.onsuccess = () => { db.close(); resolve(r.result) } } }))
const input = page.getByRole('textbox', { name: 'Ask Kirayana', exact: true })
const ask = async text => { await input.fill(text); await page.getByRole('button', { name: 'Send prompt', exact: true }).click() }
try {
  await page.goto('http://127.0.0.1:5180'); await settle()
  await input.fill('/ent'); await page.getByRole('option', { name: '/entity Create an entity' }).click(); assert.equal(await input.inputValue(), '/entity ')
  await ask('/entity Work'); assert.equal((await state()).nodes.length, 2)
  await page.getByRole('button', { name: 'Cancel action', exact: true }).click(); assert.equal((await state()).nodes.length, 2)
  await ask('/entity Work'); await page.getByRole('button', { name: 'Confirm action', exact: true }).click(); await settle(); assert.ok((await state()).nodes.some(n => n.name === 'Work'))
  await page.getByRole('button', { name: 'Close response', exact: true }).click(); await page.locator('canvas').focus()
  await page.getByRole('button', { name: 'Skills details', exact: true }).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(600); await page.getByRole('button', { name: 'Skills details', exact: true }).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Manage skills', exact: true }).click(); await page.getByRole('button', { name: 'Add skill', exact: true }).click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Quick note'); await page.getByRole('textbox', { name: 'Command', exact: true }).fill('quick-note'); await page.getByRole('textbox', { name: 'Instructions or local slash command', exact: true }).fill('/item Notes'); await page.getByRole('button', { name: 'Save skill', exact: true }).click(); await settle(); assert.equal((await state()).skills.length, 1)
  await page.getByRole('button', { name: 'Close side panel', exact: true }).click(); await ask('/quick-note'); await page.getByRole('button', { name: 'Confirm action', exact: true }).click(); await settle(); assert.ok((await state()).nodes.some(n => n.name === 'Notes'))
  await page.getByLabel('Attach files to prompt', { exact: true }).setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('hello backup') }); await settle()
  await page.getByRole('button', { name: 'Close response', exact: true }).click(); await page.locator('canvas').focus(); await page.getByRole('button', { name: 'Your account', exact: true }).click()
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export backup', exact: true }).click(); const file = await download, path = await file.path(); assert.ok(path)
  await page.getByRole('button', { name: 'Your account', exact: true }).click(); await ask('/entity Extra'); await page.getByRole('button', { name: 'Confirm action', exact: true }).click(); await settle()
  await page.getByLabel('Import organizer backup', { exact: true }).setInputFiles(path); await page.getByRole('button', { name: 'Replace organizer', exact: true }).click(); await settle(); let s = await state(); assert.ok(!s.nodes.some(n => n.name === 'Extra')); assert.equal(s.skills.length, 1); assert.equal(s.attachments[0].size, 12)
  await page.reload(); await settle(); assert.equal((await state()).skills[0].command, 'quick-note')
  await page.screenshot({ path: `${process.cwd()}/artifacts/phase-3.png` }); assert.deepEqual(errors, []); console.log('Phase 3 browser checks passed: typeahead, preview/cancel/confirm, skills, local skill command, full backup/import, reload.')
} finally { await context.close(); await browser.close() }
