const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true,channel:'chrome'})
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1})
const page=await context.newPage(), errors=[]
page.on('pageerror',e=>errors.push(e.message))
const settle=async()=>{await page.waitForTimeout(400);await page.getByRole('status').filter({hasText:'Saved in this browser'}).waitFor()}
const state=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('kirayana-organizer',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('organizer').objectStore('organizer').get('current');q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error)}}))
await page.goto('http://127.0.0.1:5180');await settle()
assert.equal((await state()).nodes.length,2)
await page.mouse.click(720,480,{button:'right'});await page.getByRole('menuitem',{name:'Add entity',exact:true}).click()
await page.getByRole('textbox',{name:'Name',exact:true}).fill('Work');await page.getByRole('button',{name:'Create entity',exact:true}).click();await settle()
let s=await state();assert.equal(s.nodes.length,3);const work=s.nodes.find(n=>n.name==='Work'), root=s.rootId
// Edit through keyboard-accessible equivalent controls.
await page.getByRole('button',{name:'Edit Work',exact:true}).focus();await page.keyboard.press('Enter')
await page.getByRole('textbox',{name:'Name',exact:true}).fill('Projects');await page.getByRole('button',{name:'Use #41c7ae',exact:true}).click();await page.getByRole('button',{name:'Save changes',exact:true}).click();await settle()
s=await state();assert.equal(s.nodes.find(n=>n.id===work.id).color,'#41c7ae')
// Canvas drag preserves position through persistence.
const symbol=page.locator(`[data-orb="${work.id}"]`);let box=await symbol.boundingBox();let p={x:box.x+box.width/2,y:box.y+box.height/2}
await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+70,p.y+35,{steps:8});await page.mouse.up();await settle()
assert.ok(Math.abs((await state()).nodes.find(n=>n.id===work.id).position.x-work.position.x-70)<1)
await page.getByRole('button',{name:'Collapse Projects',exact:true}).focus();await page.keyboard.press('Enter');await settle();assert.equal((await state()).nodes.find(n=>n.id===work.id).collapsed,true)
await page.getByRole('button',{name:'Expand Projects',exact:true}).focus();await page.keyboard.press('Enter');await settle()
await page.getByRole('button',{name:'Projects details',exact:true}).focus();await page.keyboard.press('Enter');await settle()
let before=await state(), panelBefore=before.views[root].panels[work.id]
await page.mouse.move(250,350);await page.mouse.wheel(60,100);await settle()
assert.deepEqual((await state()).views[root].panels[work.id],panelBefore)
console.log('Opening flyout');await page.getByRole('button',{name:'Open Projects in side panel',exact:true}).click();await page.getByRole('complementary',{name:'Projects full view'}).waitFor()
await page.screenshot({path:`${process.cwd()}/artifacts/phase-1-entity-details.png`})
await page.getByRole('button',{name:'Close Projects details',exact:true}).click();await page.waitForTimeout(350)
assert.equal(await page.locator('.canvas-floating-flyout').getAttribute('aria-hidden'),'true')
await page.getByRole('button',{name:'Zoom in',exact:true}).click();await settle();assert.equal((await state()).views[root].camera.zoom,1.15)
const saved=await state();await page.reload();await settle();assert.equal((await state()).nodes.find(n=>n.id===work.id).name,'Projects');assert.deepEqual((await state()).views[root].camera,saved.views[root].camera)
// Attachment uses real IndexedDB Blob persistence and no network AI call.
await page.getByLabel('Attach files to prompt',{exact:true}).setInputFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('Private local note')})
await settle();assert.equal((await state()).attachments.length,1)
await page.getByRole('textbox',{name:'Ask Kirayana',exact:true}).fill('Organize my work')
await page.getByRole('button',{name:'Send prompt',exact:true}).click()
await page.getByText('AI is not connected yet.',{exact:false}).waitFor()
await page.screenshot({path:`${process.cwd()}/artifacts/phase-1-prompt-focus.png`})
const blur=await page.locator('.canvas-header').evaluate(el=>getComputedStyle(el).filter);assert.ok(blur.includes('blur('));assert.equal(blur,await page.locator('.canvas-scene').evaluate(el=>getComputedStyle(el).filter))
assert.equal(await page.getByRole('button',{name:'AI model',exact:true}).count(),0)
await page.getByRole('textbox',{name:'Ask Kirayana',exact:true}).blur();await page.reload();await settle();assert.equal((await state()).attachments[0].name,'notes.txt')
// A second tab cannot silently overwrite an organizer loaded before the first tab changed it.
const other=await context.newPage();await other.goto('http://127.0.0.1:5180');await other.getByRole('status').filter({hasText:'Saved in this browser'}).waitFor();await page.getByRole('button',{name:'Zoom out',exact:true}).click();await settle();await other.getByRole('button',{name:'Zoom in',exact:true}).click();await other.getByRole('alert').filter({hasText:'changed in another tab'}).waitFor();await other.close()
assert.deepEqual(errors,[])
console.log('Browser checks passed: create/edit/recolor/drag, collapse, panel world positions, matching flyout close, zoom, reload, attachments, prompt blur, and cross-tab write protection.')
await browser.close()
