import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=readFileSync(new URL('../src/features/listeningRoom/useMixCreator.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('creator.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let query;
function visit(n){if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='queryFn')query=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(query);
const transpile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({publicMix=true,guest=false,wrongOwner=false,retireAt=null,profileError=false}={}){
 let valid=true;const calls=[];
 const ctx={scope:{actor:guest?null:'viewer'},mixId:'mix',ownerId:'owner',publicMix,Promise,Error,encodeURIComponent,
 mixAccessSession:{assertCurrent:()=>{if(!valid)throw Error('actor changed');}},coverImageUrl:u=>u,
 supabase:{from:table=>{const call={table,filters:[]};calls.push(call);return{select(){return this;},eq(k,v){call.filters.push([k,v]);return this;},maybeSingle(){return Promise.resolve().then(()=>{if(table===retireAt)valid=false;return table==='mixes'?{data:{owner_user_id:wrongOwner?'other':'owner'}}:table==='profiles'?{data:{full_name:'Actual Creator',username:'real-creator',avatar_url:'https://example.org/image.jpg'},error:profileError?Error('offline'):null}:{data:{id:'follow'}};});}};}}};
 const fn=vm.runInNewContext(transpile(`const query=${query};query;`),ctx);return{run:fn,calls};
}
let f=fixture({publicMix:false});await assert.rejects(f.run);assert.equal(f.calls.length,0,'private identity must never make a public profile lookup');
f=fixture();const creator=await f.run();assert.equal(creator.name,'Actual Creator');assert.equal(creator.route,'/creator/real-creator');assert.equal(creator.following,true);assert.deepEqual(f.calls[0].filters,[['id','mix'],['status','published'],['visibility','public']]);assert.deepEqual(f.calls.find(c=>c.table==='user_follows').filters,[['follower_id','viewer'],['following_id','owner']]);
f=fixture({wrongOwner:true});await assert.rejects(f.run);assert.equal(f.calls.length,1);
f=fixture({retireAt:'mixes'});await assert.rejects(f.run,/actor changed/);assert.equal(f.calls.length,1);
f=fixture({retireAt:'profiles'});await assert.rejects(f.run,/actor changed/);
f=fixture({guest:true});assert.equal((await f.run()).following,false);assert.ok(!f.calls.some(c=>c.table==='user_follows'));
f=fixture({profileError:true});await assert.rejects(f.run,'unavailable profile cannot be reported as a creator');
const service=readFileSync(new URL('../src/features/culture/mobileServices.ts',import.meta.url),'utf8');
const serviceAst=ts.createSourceFile('service.ts',service,ts.ScriptTarget.Latest,true);let follow;
for(const n of serviceAst.statements)if(ts.isFunctionDeclaration(n)&&n.name?.text==='toggleProfileFollow')follow=n.getText(serviceAst);assert.ok(follow);
function followFixture({retireAt=null,existing=false,user='viewer'}={}){
 let valid=true;const writes=[];const reads=[];
 const ctx={exports:{},getCurrentUserId:async()=>{if(retireAt==='user')valid=false;return user;},safeMaybe:async q=>{const result=await q;if(retireAt==='lookup')valid=false;return result;},supabase:{from:table=>{
 const filters=[];const b={select(){reads.push(table);return this;},eq(k,v){filters.push([k,v]);return this;},maybeSingle:async()=>existing?{id:'edge'}:null,
 delete(){writes.push({kind:'delete',filters});return this;},insert(payload){writes.push({kind:'insert',payload});return this;},then(resolve,reject){return Promise.resolve({error:null}).then(resolve,reject);}};return b;}}};
 vm.runInNewContext(transpile(follow),ctx);return{run:(guarded=true,expectedUserId)=>ctx.exports.toggleProfileFollow('owner',guarded?()=>{if(!valid)throw Error('actor changed');}:undefined,expectedUserId),writes,reads};
}
let g=followFixture();assert.equal((await g.run(false)).saved,true);assert.equal(g.writes[0].payload.follower_id,'viewer');assert.equal(g.writes[0].payload.following_id,'owner');
g=followFixture({existing:true});assert.equal((await g.run()).saved,false);assert.equal(g.writes[0].kind,'delete');
g=followFixture({retireAt:'user'});await assert.rejects(g.run,/actor changed/);assert.equal(g.reads.length,0);assert.equal(g.writes.length,0);
g=followFixture({retireAt:'lookup'});await assert.rejects(g.run,/actor changed/);assert.equal(g.writes.length,0);
g=followFixture({user:null});assert.equal((await g.run()).success,false);assert.equal(g.writes.length,0);
g=followFixture({user:'owner'});assert.equal((await g.run()).success,false);assert.equal(g.writes.length,0);
g=followFixture({user:'next-actor'});await assert.rejects(()=>g.run(true,'viewer'),/account_changed/);assert.equal(g.reads.length,0);assert.equal(g.writes.length,0);
console.log('PASS public creator ownership/publication gating, actor retirement, guest/error handling and existing Follow API guard/default behavior. No network or production writes.');
