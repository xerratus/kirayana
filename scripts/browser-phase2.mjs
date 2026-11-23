const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true,channel:'chrome'}), context=await browser.newContext({viewport:{width:1440,height:1000}}), page=await context.newPage(), errors=[]
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000)
const settle=async()=>{await page.waitForTimeout(850);await page.getByRole('status').filter({hasText:'Saved in this browser'}).waitFor()}
const state=()=>page.evaluate(()=>new Promise(resolve=>{const q=indexedDB.open('kirayana-organizer',1);q.onsuccess=()=>{const d=q.result,r=d.transaction('organizer').objectStore('organizer').get('current');r.onsuccess=()=>{d.close();resolve(r.result)}}}))
const keyClick=async(name)=>{await page.getByRole('button',{name,exact:true}).focus();await page.keyboard.press('Enter')}
const create=async(type,name,parent='You')=>{let label=type;if(type==='entity'){const owner=(await state()).nodes.find(n=>n.name===parent);if(owner?.kind==='subset')label=owner.itemLabel||owner.name.toLowerCase().replace(/ies$/,'y').replace(/s$/,'')}await keyClick(`Add ${label} to ${parent}`);await page.getByRole('textbox',{name:'Name',exact:true}).fill(name);await page.getByRole('button',{name:`Create ${label}`,exact:true}).click();await settle()}
await page.goto('http://127.0.0.1:5180');await settle()
await create('Collection','Contacts');console.log('Collection created')
await keyClick('Contacts details');await settle();await page.getByRole('button',{name:'Edit Contacts fields',exact:true}).click();await page.getByRole('button',{name:'Edit Name field',exact:true}).click()
await page.getByRole('textbox',{name:'Field name',exact:true}).fill('Full name');await page.getByRole('checkbox',{name:'Required',exact:true}).check();await page.getByRole('button',{name:'Save field',exact:true}).click();await settle()
await page.getByRole('button',{name:'Add field',exact:true}).click();await page.getByRole('textbox',{name:'Field name',exact:true}).fill('Status');await page.getByRole('combobox',{name:'Field type',exact:true}).selectOption('select');await page.getByRole('textbox',{name:'Options (comma-separated)',exact:true}).fill('Active, Inactive');await page.getByRole('button',{name:'Save field',exact:true}).click();await settle()
await page.getByRole('complementary',{name:'Contacts full view'}).getByRole('button',{name:'Add record',exact:true}).click()
await page.getByRole('textbox',{name:'Full name *',exact:true}).fill('Jane Doe');await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('Active');await page.getByRole('button',{name:'Save record',exact:true}).click();await settle()
let s=await state();assert.equal(s.records.length,1);assert.equal(s.records[0].values[s.fields[0].id],'Jane Doe');console.log('Custom fields and record saved')
await page.getByRole('button',{name:'Close side panel',exact:true}).click();await page.locator('.canvas-detail-row').filter({hasText:'Jane Doe'}).click();await page.waitForTimeout(350)
assert.equal(await page.getByRole('definition').filter({hasText:'Jane Doe'}).count(),1)
await page.getByRole('button',{name:'Open Jane Doe in side panel',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(400)
await page.getByRole('button',{name:'Close Jane Doe details',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(400);assert.equal(await page.locator('.canvas-floating-flyout').getAttribute('aria-hidden'),'true')
// Rename a field; values stay attached to its ID.
await page.getByRole('button',{name:'Edit Contacts fields',exact:true}).click();await page.getByRole('button',{name:'Edit Full name field',exact:true}).click();await page.getByRole('textbox',{name:'Field name',exact:true}).fill('Name');await page.getByRole('button',{name:'Save field',exact:true}).click();await settle();s=await state();assert.equal(s.records[0].values[s.fields[0].id],'Jane Doe')
await page.getByRole('button',{name:'Close side panel',exact:true}).click();await page.getByRole('button',{name:'Close Contacts details',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Reset canvas view',exact:true}).click();await settle()
await create('Item','Notes');await keyClick('Notes details');await settle();await page.getByRole('button',{name:'Edit item',exact:true}).click();await page.getByRole('textbox',{name:'Notes',exact:true}).fill('A personal note');await page.getByRole('button',{name:'Save item',exact:true}).click();await settle();s=await state();const item=s.nodes.find(n=>n.name==='Notes');assert.equal(s.items[item.id],'A personal note')
await page.getByRole('textbox',{name:'Notes',exact:true}).fill('Unsaved draft');await page.getByRole('button',{name:'Close side panel',exact:true}).click();await page.getByRole('dialog',{name:'Discard changes?',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.getByRole('textbox',{name:'Notes',exact:true}).inputValue(),'Unsaved draft');await page.getByRole('button',{name:'Close side panel',exact:true}).click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();assert.equal((await state()).items[item.id],'A personal note');await page.getByRole('button',{name:'Close Notes details',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Reset canvas view',exact:true}).click();await settle()
await create('Group','Projects');await create('entity','Alpha','Projects');await create('entity','Beta','Projects');await page.getByRole('button',{name:'Reset canvas view',exact:true}).click();await settle();s=await state();const subset=s.nodes.find(n=>n.name==='Projects'),alpha=s.nodes.find(n=>n.name==='Alpha');assert.equal(alpha.parentId,subset.id)
await page.locator('canvas').focus();await page.screenshot({path:`${process.cwd()}/artifacts/phase-2-subset.png`})
console.log('Group and fan entities created')
// Capture fan child width, collapse radially, preserve angular span through geometry unit tests.
let fan=page.locator(`[data-fan-orb="${alpha.id}"]`), before=await fan.boundingBox();assert.ok(before.width>20)
await keyClick('Collapse Projects fan');await settle();let after=await fan.boundingBox();assert.ok(!after||after.width<1)
await keyClick('Expand Projects fan');await settle();assert.ok((await fan.boundingBox()).width>20)
// Drag the rounded arc; target entity positions stay fixed while anchor angle changes.
s=await state();const root=s.nodes.find(n=>n.id===s.rootId), camera=s.views[root.id].camera, center={x:720+camera.pan.x,y:480+camera.pan.y}, depth=1.079;const radius=117*depth;const angle=subset.anchorAngle
await page.locator('canvas').focus();await page.mouse.move(center.x+Math.cos(angle)*radius,center.y+Math.sin(angle)*radius);await page.mouse.down();await page.mouse.move(center.x+Math.cos(angle+.5)*radius,center.y+Math.sin(angle+.5)*radius,{steps:12});await page.mouse.up();await settle();assert.ok(Math.abs((await state()).nodes.find(n=>n.id===subset.id).anchorAngle-angle)>.2)
assert.deepEqual((await state()).nodes.find(n=>n.id===subset.id).position,subset.position)
await keyClick('Enter Alpha canvas');await settle();assert.equal((await state()).viewId,alpha.id)
await create('Collection','Tasks','Alpha');await create('Group','Phases','Alpha');await create('entity','Plan','Phases');await settle()
await page.locator('canvas').focus();await page.screenshot({path:`${process.cwd()}/artifacts/phase-2-nested.png`})
await page.reload();await settle();s=await state();assert.equal(s.viewId,alpha.id);assert.equal(s.records.length,1);assert.equal(s.items[item.id],'A personal note');assert.ok(s.nodes.some(n=>n.name==='Plan'))
assert.deepEqual(errors,[]);console.log('Phase 2 browser checks passed: custom schemas, record detail/flyout matching, stable field IDs, item notes, fan shrink/expand, draggable arc, nested entities, and refresh persistence.')
await context.close();await browser.close()
