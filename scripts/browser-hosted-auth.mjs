import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
// Private, single-use links generated with Auth admin generateLink; no mail is sent.
const links=JSON.parse(readFileSync(process.env.HOSTED_AUTH_LINKS_FILE,'utf8'))
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext(),page=await context.newPage(),errors=[]
page.on('pageerror',error=>errors.push(error.message))
try{
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5180')
 let redirect=''
 await page.route('**/auth/v1/signup**',async route=>{redirect=new URL(route.request().url()).searchParams.get('redirect_to');await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:crypto.randomUUID(),email:'signup-preview@example.net',identities:[],app_metadata:{},user_metadata:{}},session:null})})})
 await page.getByLabel('Full name',{exact:true}).fill('New User');await page.getByLabel('Email',{exact:true}).fill('signup-preview@example.net');await page.getByLabel('Password',{exact:true}).fill('ExamplePass123!');await page.locator('form').getByRole('button',{name:'Create account',exact:true}).click()
 await page.getByRole('status').filter({hasText:'Check your email'}).waitFor();assert.equal(redirect,'http://127.0.0.1:5180/')
 await page.unroute('**/auth/v1/signup**')
 await page.goto(links.signup);await page.getByRole('heading',{name:'Your new canvas',exact:true}).waitFor();assert.equal(new URL(page.url()).origin,'http://127.0.0.1:5180')
 await page.evaluate(async()=>{const {supabase}=await import('/src/hosted/client.ts');await supabase.auth.signOut()})
 await page.goto(links.recovery);await page.getByRole('heading',{name:'Set a new password',exact:true}).waitFor();await page.getByLabel('Password',{exact:true}).fill(links.password);await page.getByRole('button',{name:'Save password',exact:true}).click();await page.locator('.canvas-workspace').waitFor()
 const {data}=await page.evaluate(async password=>{const {supabase}=await import('/src/hosted/client.ts');const {data}=await supabase.auth.getUser();const email=data.user.email;await supabase.auth.signOut();const result=await supabase.auth.signInWithPassword({email,password});return {data:{authenticated:!!result.data.session,error:result.error?.message}}},links.password)
 assert.equal(data.authenticated,true);assert.equal(data.error,undefined);assert.deepEqual(errors,[])
 console.log('Auth checks passed: signup confirmation notice/redirect, real email verification callback, real recovery callback, password update and sign-in; no emails sent.')
}finally{await context.close();await browser.close()}
