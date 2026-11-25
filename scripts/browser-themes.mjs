const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const browser=await chromium.launch({channel:'chrome',headless:true})
const output=process.env.THEME_SCREENSHOT_DIR
if(output)await mkdir(output,{recursive:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 const saved=()=>page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.open('kirayana-organizer',1);request.onsuccess=()=>{const db=request.result,read=db.transaction('organizer').objectStore('organizer').get('current');read.onsuccess=()=>{db.close();resolve(JSON.stringify(read.result))}}}))
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5180');await page.waitForTimeout(900)
 await page.getByRole('button',{name:'Help',exact:true}).click();await page.waitForTimeout(400)
 const before=await saved(),orb=page.locator('[data-orb]').first(),position=await orb.boundingBox(),backgrounds=new Set()
 for(const [id,name]of [['original','Midnight'],['linen','Linen'],['garden','Garden'],['seaside','Seaside'],['lavender','Lavender'],['fireside','Fireside']]) {
  await page.getByRole('button',{name:'Choose theme',exact:true}).click()
  assert.equal(await page.getByRole('menuitemradio').count(),6)
  assert.equal(await page.getByRole('menuitemradio').first().evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),true,'Theme menu must stay above the left flyout')
  await page.getByRole('menuitemradio',{name:new RegExp(`^${name}`)}).click();await page.waitForTimeout(200)
  assert.equal(await page.locator('html').getAttribute('data-kirayana-theme'),id)
  backgrounds.add(await page.locator('.canvas-workspace').evaluate(el=>getComputedStyle(el).backgroundColor))
  const now=await orb.boundingBox();assert.ok(Math.abs(now.x-position.x)<1 && Math.abs(now.y-position.y)<1)
  assert.equal(await saved(),before,'Changing theme must not modify organizer content or layout')
  if(output)await page.screenshot({path:`${output}/${id}.png`})
 }
 assert.equal(backgrounds.size,6)
 await page.reload();await page.waitForTimeout(700)
 assert.equal(await page.locator('html').getAttribute('data-kirayana-theme'),'fireside')
 await page.getByRole('button',{name:'Choose theme',exact:true}).click();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter')
 assert.equal(await page.locator('html').getAttribute('data-kirayana-theme'),'linen')
 await page.getByRole('button',{name:'Choose theme',exact:true}).click();await page.keyboard.press('Escape')
 assert.equal(await page.getByRole('button',{name:'Choose theme',exact:true}).getAttribute('aria-expanded'),'false')
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Choose theme',exact:true}).click()
 const menu=await page.getByRole('menu',{name:'Canvas themes',exact:true}).boundingBox()
 assert.ok(menu.x>=0 && menu.x+menu.width<=390)
 assert.deepEqual(errors,[])
 console.log('Themes passed: six distinct palettes, unchanged content/layout, persistence, keyboard selection/Escape, mobile menu bounds, and no runtime errors.')
}finally{await browser.close()}
