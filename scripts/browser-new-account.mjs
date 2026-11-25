import assert from 'node:assert/strict'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),owner=crypto.randomUUID(),errors=[]
page.on('pageerror',error=>errors.push(error.message))
const user={id:owner,email:'preview@example.net',role:'authenticated',aud:'authenticated',created_at:new Date().toISOString(),user_metadata:{full_name:'Jane Example'},app_metadata:{provider:'email',providers:['email']}}
const token=[{alg:'HS256',typ:'JWT'},{sub:owner,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'test'].map(part=>Buffer.from(typeof part==='string'?part:JSON.stringify(part)).toString('base64url')).join('.')
let saved=null,saves=0
await page.route('**.supabase.co/**',async route=>{
 const url=new URL(route.request().url());let body
 if(url.pathname==='/auth/v1/token')body={access_token:token,refresh_token:'preview-refresh-token',expires_in:3600,token_type:'bearer',user}
 else if(url.pathname==='/auth/v1/user')body=user
 else if(url.pathname==='/rest/v1/profiles')body=[{id:owner,full_name:'Jane Example'}]
 else if(url.pathname==='/rest/v1/organizers')body=saved?[saved]:[]
 else if(url.pathname==='/rest/v1/rpc/save_organizer'){
  const request=route.request().postDataJSON();assert.equal(request.p_owner,owner);assert.equal(request.p_expected_version,0)
  saved={content:request.p_content,layout:request.p_layout,version:1,client_revision:request.p_revision};saves++;body=1
 }else throw new Error(`Unexpected request: ${url.pathname}`)
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
})
try{
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5180')
 await page.evaluate(async()=>{const {initialOrganizer,addNode}=await import('/src/organizer/model.ts'),{createLocalRepository}=await import('/src/storage/indexedDb.ts');let local=initialOrganizer();local=addNode(local,local.rootId,'entity','Old browser space','#41c7ae',{x:20,y:30});const repo=createLocalRepository();await repo.save(local);repo.close()})
 await page.getByRole('tab',{name:'Sign in',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('Example123!');await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click()
 await page.locator('.canvas-workspace').waitFor();assert.equal(saves,1);assert.equal(saved.content.nodes.length,2)
 const root=saved.content.nodes.find(node=>node.id===saved.content.rootId);assert.equal(root.name,'Jane Example');assert.equal(root.kind,'user');assert.deepEqual(saved.layout.nodes[root.id].position,{x:0,y:0})
 assert.equal(await page.getByRole('button',{name:'Start a blank canvas',exact:true}).count(),0)
 const rootId=root.id;await page.reload();await page.locator('.canvas-workspace').waitFor();assert.equal(saves,1);assert.equal(saved.content.rootId,rootId)
 const localNames=await page.evaluate(async()=>{const {createLocalRepository}=await import('/src/storage/indexedDb.ts');const repo=createLocalRepository(),state=await repo.load();repo.close();return state.nodes.map(node=>node.name)})
 assert.ok(localNames.includes('Old browser space'));assert.deepEqual(errors,[])
 console.log('New-account browser check passed: automatic centered canvas, saved once, stable after reload, no start screen, browser source untouched.')
}finally{await browser.close()}
