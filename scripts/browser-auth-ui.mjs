import assert from 'node:assert/strict'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1000,height:1000}}),errors=[]
page.on('pageerror',error=>errors.push(error.message))
try{
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5180')
 const create=page.getByRole('tab',{name:'Create account',exact:true}),signin=page.getByRole('tab',{name:'Sign in',exact:true}),password=page.getByLabel('Password',{exact:true}),rules=page.getByRole('list',{name:'Password requirements'})
 await create.waitFor();assert.deepEqual(await create.evaluate(el=>{const css=getComputedStyle(el);return {radius:css.borderRadius,background:css.backgroundColor,border:css.borderBottomWidth}}),{radius:'0px',background:'rgba(0, 0, 0, 0)',border:'2px'});assert.equal(await create.getAttribute('aria-selected'),'true');assert.equal(await rules.getByRole('listitem').count(),5)
 const logo=await page.locator('.hosted-brand svg.lucide-lens').boundingBox(),heading=await page.getByRole('heading',{name:'Kirayana',exact:true}).boundingBox();assert.ok(Math.abs(logo.y+logo.height/2-heading.y-heading.height/2)<3)
 await password.fill('test');assert.equal(await rules.locator('.is-passed').count(),1)
 await password.fill('Test123');assert.equal(await rules.locator('.is-passed').count(),3)
 await password.fill('Test123!');assert.equal(await rules.locator('.is-passed').count(),5)
 await page.getByRole('button',{name:'Show password',exact:true}).click();assert.equal(await password.getAttribute('type'),'text');await page.getByRole('button',{name:'Hide password',exact:true}).click();assert.equal(await password.getAttribute('type'),'password')
 await create.focus();await page.keyboard.press('ArrowRight');assert.equal(await signin.getAttribute('aria-selected'),'true');assert.equal(await rules.count(),0);assert.equal(await password.getAttribute('minlength'),null)
 await page.getByRole('link',{name:'Forgot password?',exact:true}).click();await page.getByRole('heading',{name:'Reset password',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Forgot password?',exact:true}).count(),0)
 await create.click();await page.getByLabel('Full name',{exact:true}).fill('New User');await page.getByLabel('Email',{exact:true}).fill('preview@example.net');await password.fill('OnlyLetters');let requests=0
 await page.route('**/auth/v1/signup**',async route=>{requests++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:crypto.randomUUID(),email:'preview@example.net',identities:[],app_metadata:{},user_metadata:{}},session:null})})})
 await page.locator('form').getByRole('button',{name:'Create account',exact:true}).click();assert.match(await page.getByRole('alert').innerText(),/all five/);assert.equal(requests,0)
 await password.fill('Test123!');await page.locator('form').getByRole('button',{name:'Create account',exact:true}).click();await page.getByRole('status').filter({hasText:'Check your email'}).waitFor();assert.equal(requests,1)
 assert.equal(await page.getByRole('link',{name:'Resend confirmation',exact:true}).count(),1)
 await page.screenshot({path:'/tmp/kirayana-auth-ui.png'})
 assert.deepEqual(errors,[]);console.log('Auth UI passed: inline Lens brand, tabs/keyboard, links, live rules, visibility toggle, signup validation, no rules or strength limits on sign-in.')
}finally{await browser.close()}
