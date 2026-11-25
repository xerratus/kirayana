// Optional PostgreSQL harness, no Docker. PGLITE_MODULE points to an installed PGlite entry.
import {readFileSync,readdirSync} from 'node:fs'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite')
const db=new PGlite()
await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to anon,authenticated;
grant select,insert,update,delete on storage.objects to authenticated;
grant execute on function auth.uid() to anon,authenticated;`)
for(const file of readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
const a=randomUUID(),b=randomUUID(),root=randomUUID(),operation=randomUUID(),file=randomUUID()
await db.query('insert into auth.users values ($1),($2)',[a,b])
const content={schemaVersion:3,rootId:root,nodes:[{id:root,parentId:null,kind:'user',name:'You',color:'#4c9df4',createdAt:new Date().toISOString()}],fields:[],records:[],skills:[],items:{},attachments:[]}
const layout={viewId:root,nodes:{[root]:{position:{x:0,y:0},collapsed:false,updatedAt:new Date().toISOString()}},views:{[root]:{camera:{zoom:1,pan:{x:0,y:0}},panels:{},openPanels:[]}}}
async function user(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
async function save(owner,version,op,c=content,l=layout,rev=0){return (await db.query('select public.save_organizer($1,$2,$3,$4,$5,$6) as version',[owner,version,op,c,l,rev])).rows[0].version}
const collection=randomUUID(),field=randomUUID(),tasks=randomUUID(),group=randomUUID(),space=randomUUID(),item=randomUUID();
for(const [id,kind,parentId]of [[collection,'collection',root],[tasks,'tasks',root],[group,'subset',root],[space,'entity',group],[item,'item',space]]){
 content.nodes.push({id,kind,parentId,name:kind,color:'#41c7ae',createdAt:new Date().toISOString(),...(kind==='tasks'?{tasks:[{id:randomUUID(),title:'Ship',completed:true,createdAt:new Date().toISOString()}]}:{})});layout.nodes[id]={position:{x:100,y:100},collapsed:false,updatedAt:new Date().toISOString()}
}
content.fields=[{id:field,collectionId:collection,name:'Name',type:'text',required:false,options:[]}];content.records=[{id:randomUUID(),collectionId:collection,revision:1,values:{[field]:'Example'}}];content.items[item]='Notes';content.skills=[{id:randomUUID(),name:'Weekly',command:'weekly',description:'',instructions:'Plan the week',enabled:true,version:1,scope:space}];
await user(a)
assert.equal(await save(a,0,operation),1)
assert.equal(await save(a,0,operation),1,'lost response retry returns original result')
await assert.rejects(()=>save(a,0,operation,{...content,items:{invalid:'x'}}),/reused/)
await assert.rejects(()=>save(a,0,randomUUID()),/another tab/)
await assert.rejects(()=>db.query('update public.organizers set version=99'),/permission denied/)
await assert.rejects(()=>db.query('insert into public.organizers(owner_id,content,layout,client_revision) values ($1,$2,$3,0)',[a,content,layout]),/permission denied/)
const moved=structuredClone(layout);moved.nodes[root].position.x=20
assert.equal(await save(a,1,randomUUID(),null,moved,1),2)
assert.deepEqual((await db.query('select content_version,layout_version from public.organizers')).rows,[{content_version:1,layout_version:2}])
await assert.rejects(()=>save(a,2,randomUUID(),{...content,nodes:[{...content.nodes[0],parentId:root}]}),/root|Circular/)
const path=`${a}/${file}/${'a'.repeat(64)}`
await db.query("insert into storage.objects(bucket_id,name,metadata) values ('attachments',$1,'{\"size\":3}')",[path])
await save(a,2,randomUUID(),{...content,attachments:[{id:file,name:'a.txt',type:'text/plain',size:3,path}]},null,2)
await user(b)
assert.equal((await db.query('select * from public.organizers')).rows.length,0)
assert.equal((await db.query('select * from public.organizer_operations')).rows.length,0)
assert.equal((await db.query('select * from storage.objects')).rows.length,0)
await assert.rejects(()=>save(a,3,randomUUID()),/ownership mismatch/)
await assert.rejects(()=>db.query('insert into public.profiles(id,full_name) values ($1,$2)',[a,'Spoof']),/row-level security/)
await assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values ('attachments',$1)",[`${a}/${randomUUID()}/${'b'.repeat(64)}`]),/row-level security/)
await assert.rejects(()=>save(b,0,randomUUID(),{...content,attachments:[{id:file,name:'a.txt',type:'text/plain',size:3,path}]}),/attachment/)
await user(a)
await db.query('delete from storage.objects where name=$1',[path])
assert.equal((await db.query('select * from storage.objects')).rows.length,1,'clients cannot delete immutable files')
assert.equal((await db.query('select version from public.organizers')).rows[0].version,3,'invalid saves remain atomic')
await db.exec('reset role;set role anon')
await assert.rejects(()=>db.query('select * from public.organizers'),/permission denied/)
await assert.rejects(()=>save(a,0,randomUUID()),/permission denied/)
await db.close()
console.log('Database checks passed: owner isolation, immutable files, owner spoofing, CAS, idempotency, layout-only updates, validation, rollback, anon denial.')
