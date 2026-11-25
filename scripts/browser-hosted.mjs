// Run against Vite dev with a disposable Supabase project / two disposable confirmed users.
// HOSTED_TEST_USERS_FILE: {users:[{id,email,password},{id,email,password}]} (keep outside repo).
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
const {users}=JSON.parse(readFileSync(process.env.HOSTED_TEST_USERS_FILE,'utf8'))
const browser=await chromium.launch({channel:'chrome',headless:true})
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[]
page.on('console',message=>{if(message.text().startsWith('repo:'))console.log(message.text())})
page.on('pageerror',error=>errors.push(error.message))
page.on('response',async response=>{if(response.url().includes('/rpc/save_organizer')&&!response.ok())console.error('Save error:',await response.text())})
let stage='setup';const deadline=setTimeout(()=>{console.error(`Hosted test timed out at ${stage}`);process.exit(1)},90000)
const step=name=>{stage=name;console.log(`Hosted: ${name}`)}
const origin=process.env.APP_URL||'http://127.0.0.1:5180'
async function signIn(user){await page.getByRole('button',{name:'Sign in',exact:true}).first().click();await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click()}
async function logout(){await page.getByRole('button',{name:'Your account',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('heading',{name:'Create your account',exact:true}).waitFor()}
try{
 await page.goto(origin);await page.getByRole('heading',{name:'Create your account',exact:true}).waitFor()
 const original=await page.evaluate(async()=>{
  const {initialOrganizer,addNode,addField,saveRecord}=await import('/src/organizer/model.ts')
  const {createLocalRepository}=await import('/src/storage/indexedDb.ts')
  let state=initialOrganizer();state=addNode(state,state.rootId,'subset','Websites','#41c7ae',{x:300,y:20});const group=state.nodes.at(-1)
  state=addField(state,group.id,{name:'URL',type:'text',required:false,options:[]});const urlField=state.fields.at(-1)
  state=addNode(state,group.id,'entity','Example','#41c7ae',{x:400,y:40});const space=state.nodes.at(-1);space.values={[urlField.id]:'https://example.com'};space.fanAnchor={angle:1,radius:148,orbRadius:23};space.fanPositioned=true
  state=addNode(state,space.id,'collection','Bookmarks','#41c7ae',{x:600,y:40});const collection=state.nodes.at(-1);state=addField(state,collection.id,{name:'Name',type:'text',required:false,options:[]});state=saveRecord(state,collection.id,{[state.fields.at(-1).id]:'Hello'})
  state=addNode(state,space.id,'tasks','Tasks','#41c7ae',{x:500,y:200});state.nodes.at(-1).tasks=[{id:crypto.randomUUID(),title:'Ship',completed:true,createdAt:new Date().toISOString()}]
  state.views[state.rootId].expandedEntities=[space.id];state.views[state.rootId].subPositions={[space.id]:{x:400,y:40}}
  state.attachments=[{id:crypto.randomUUID(),name:'notes.txt',size:5,blob:new Blob(['hello'],{type:'text/plain'})}]
  const repo=createLocalRepository();await repo.save(state);repo.close();return {...state,attachments:state.attachments.map(({blob,...file})=>file)}
 })
 step('import');await signIn(users[0]);await page.getByRole('button',{name:/Import browser data/}).waitFor();await page.getByRole('button',{name:/Import browser data/}).click();await Promise.race([page.locator('.canvas-workspace').waitFor(),page.getByRole('alert').waitFor().then(async()=>{throw new Error(await page.getByRole('alert').innerText())})])
 assert.equal(await page.locator('.canvas-error').count(),0)
 step('round trip');const loaded=await page.evaluate(async owner=>{
  const {supabase}=await import('/src/hosted/client.ts'),{createHostedRepository}=await import('/src/hosted/repository.ts');const repo=createHostedRepository(supabase,owner),state=await repo.load();repo.close()
  return {...state,attachments:await Promise.all(state.attachments.map(async({blob,...file})=>({...file,text:await blob.text()})))}
 },users[0].id)
 assert.deepEqual({...loaded,attachments:[]},{...original,attachments:[]});assert.equal(loaded.attachments[0].text,'hello')
 step('save/reload');await page.getByRole('textbox',{name:'Ask Kirayana',exact:true}).fill('/space Cloud Space');await page.getByRole('button',{name:'Send prompt',exact:true}).click();await page.getByRole('button',{name:'Confirm action',exact:true}).click()
 await page.waitForFunction(async()=>{const {supabase}=await import('/src/hosted/client.ts');const {data}=await supabase.from('organizers').select('content').single();return data?.content.nodes.some(n=>n.name==='Cloud Space')})
 await page.getByRole('status').filter({hasText:'Saved to your account'}).waitFor();await page.waitForFunction(()=>new Promise(resolve=>{const r=indexedDB.open('kirayana-hosted-recovery',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('snapshots').objectStore('snapshots').getAll();q.onsuccess=()=>{db.close();resolve(q.result.length===0)}}}));await page.reload();await page.locator('.canvas-workspace').waitFor();assert.equal(await page.getByRole('heading',{name:'Recover unsaved work'}).count(),0)
 step('profile');await page.getByRole('button',{name:'Your account',exact:true}).click();await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByLabel('Full name',{exact:true}).fill('Hosted Profile');await page.getByRole('button',{name:'Save profile',exact:true}).click()
 step('account switch');await logout();await signIn(users[1]);await page.getByRole('heading',{name:'Your new canvas',exact:true}).waitFor();assert.equal(await page.locator('.canvas-workspace').count(),0)
 const isolation=await page.evaluate(async owner=>{const {supabase}=await import('/src/hosted/client.ts');const read=await supabase.from('organizers').select('*').eq('owner_id',owner);const spoof=await supabase.rpc('save_organizer',{p_owner:owner,p_expected_version:0,p_operation:crypto.randomUUID(),p_content:{},p_layout:{},p_revision:0});return {rows:read.data?.length,error:spoof.error?.message}},users[0].id)
 assert.equal(isolation.rows,0);assert.match(isolation.error,/ownership/)
 await page.getByRole('button',{name:'Start a blank canvas',exact:true}).click();await page.locator('.canvas-workspace').waitFor();await logout();await signIn(users[0]);await page.locator('.canvas-workspace').waitFor()
 step('repository conflicts and retries');const checks=await page.evaluate(async({owner,other})=>{
  const {supabase}=await import('/src/hosted/client.ts'),{createHostedRepository}=await import('/src/hosted/repository.ts')
  console.log('repo: load two snapshots');const first=createHostedRepository(supabase,owner),second=createHostedRepository(supabase,owner),a=await first.load(),b=await second.load();console.log('repo: save first');a.nodes[0].color='#41c7ae';a.revision++;await first.save(a)
  console.log('repo: stale save');b.nodes[0].color='#f2ad58';b.revision++;let conflict='';try{await second.save(b)}catch(error){conflict=error.message}
  first.close();second.close()
  let dropped=false;const proxy=new Proxy(supabase,{get(target,key){if(key==='rpc')return async(...args)=>{const response=await target.rpc(...args);if(!dropped&&!response.error){dropped=true;throw new Error('Lost acknowledgement')}return response};return Reflect.get(target,key)}})
  console.log('repo: lost ack load');const retry=createHostedRepository(proxy,owner),state=await retry.load();console.log('repo: lost ack save');state.nodes[0].color='#a68cff';state.revision++;let lost=false;try{await retry.save(state)}catch{lost=true}console.log('repo: retry');await retry.save(state);retry.close();console.log('repo: direct denial')
  const direct=await supabase.from('organizers').update({version:99}).eq('owner_id',owner)
  const doc=await supabase.from('organizers').select('content,layout,version,content_version,layout_version').single()
  const file=doc.data.content.attachments[0]
  const forbidden=await supabase.storage.from('attachments').download(`${other}/${file.id}/${file.path.split('/').at(-1)}`)
  const immutable=await supabase.storage.from('attachments').remove([file.path]);const stillThere=await supabase.storage.from('attachments').download(file.path)
  console.log('repo: layout');const layoutRepo=createHostedRepository(supabase,owner),layoutState=await layoutRepo.load();layoutState.views[layoutState.rootId].camera.pan.x+=10;layoutState.revision++;await layoutRepo.save(layoutState);layoutRepo.close()
  const after=await supabase.from('organizers').select('content_version,layout_version').single()
  return {conflict,lost,directDenied:!!direct.error,otherFileDenied:!!forbidden.error,referencedFileRetained:!!stillThere.data,contentUnchanged:doc.data.content_version===after.data.content_version,layoutChanged:after.data.layout_version===doc.data.layout_version+1}
 },{owner:users[0].id,other:users[1].id})
 assert.match(checks.conflict,/another tab/);for(const [key,value]of Object.entries(checks))if(key!=='conflict')assert.equal(value,true,key)
 step('recovery');
 // Recover an interrupted session explicitly; never replace cloud data on load.
 await page.evaluate(async()=>{const {supabase}=await import('/src/hosted/client.ts'),{createHostedRepository}=await import('/src/hosted/repository.ts'),{createRecoveryStore}=await import('/src/hosted/recovery.ts');const {data}=await supabase.auth.getSession();const owner=data.session.user.id,repo=createHostedRepository(supabase,owner),state=await repo.load();state.nodes[0].color='#cfca6f';const recovery=createRecoveryStore(owner);await recovery.save(state);await recovery.close();repo.close()})
 await page.reload();await page.getByRole('heading',{name:'Recover unsaved work',exact:true}).waitFor();await page.getByRole('button',{name:'Restore this copy',exact:true}).click();await page.getByRole('button',{name:'Restore copy',exact:true}).click();await page.locator('.canvas-workspace').waitFor()
 assert.deepEqual(errors,[])
 console.log('Hosted browser checks passed: Auth, explicit local import, nested data/files, save/reload, profile, account switch, RLS, CAS, retry idempotency, layout-only save, browser recovery.')
}catch(error){console.error((await page.locator('body').innerText()).slice(0,3000));throw error}finally{await context.close();await browser.close();clearTimeout(deadline)}
