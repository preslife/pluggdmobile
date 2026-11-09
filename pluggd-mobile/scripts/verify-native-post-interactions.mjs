import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url), ts=require('typescript'), React=require('react'), {act}=React;
const {JSDOM}=createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON||'/Users/apple/PLUGGD_NEW/package.json')('jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,ShadowRoot:dom.window.ShadowRoot,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const {createRoot}=require('react-dom/client'),rn=require('react-native-web'),rq=require('@tanstack/react-query');
function load(path,mocks={}){const module={exports:{}};const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');const out=ts.transpileModule(source,{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});assert.equal(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);vm.runInNewContext(out.outputText,{module,exports:module.exports,require:name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),AbortController,URL,console,Error,Map,Set,WeakMap,Promise,setTimeout,clearTimeout,Date});return module.exports;}
const settle=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve};};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const store=load('../src/features/culture/postInteractionState.ts');
const model=load('../src/features/community-feed/communityRelevanceModel.ts');
const ctrl=load('../src/features/community-feed/communityRelevanceController.ts',{'../culture/postInteractionState':store,'./communityRelevanceModel':model,'./communityRelevanceService':{nativeRelevanceApi:()=>({}),relevanceUuid:()=>id(900)}});
const post=(n=1)=>({id:id(n),user_id:id(99),content:'A real post',display_name:'Artist',username:'artist',created_at:'2026-11-09T00:00:00Z',images:[],video:null,audio:null,music:null,poll:null,destinations:[],link_preview:null,liked:false,bookmarked:false,reposted:false,likes_count:10,bookmarks_count:4,reposts_count:2,comments_count:0,is_repost:false,is_quote:false,original_post:null,poll_vote_option_id:null});
const tests=[],test=(name,run)=>tests.push({name,run});
const colors=new Proxy({},{get:()=> '#fff'});
async function cardFixture(input=post()){
 store.bindPostInteractionScope(null,null);
 const f={auth:{user:{id:id(80)},session:{access_token:'actor-a'}},calls:[],alerts:[],mutated:0,post:input,wait:null};
 f.client=new rq.QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity},mutations:{gcTime:Infinity}}});
 const service={toggleSocialLike:async(...args)=>{f.calls.push({action:'like',args});return f.wait?f.wait.promise:{success:true,liked:true};},toggleSocialBookmark:async(...args)=>{f.calls.push({action:'bookmark',args});return f.wait?f.wait.promise:{success:true,bookmarked:true};},toggleSocialRepost:async()=>({success:true,reposted:true}),deleteMobileSocialPost:async()=>({success:true}),voteMobilePoll:async()=>({success:true})};
 const Panel=p=>React.createElement(rn.View,null,p.children);
 const Component=load('../src/features/culture/MobileSocialPostCard.tsx',{
  react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':{...rn,Platform:{OS:'ios'},Alert:{alert:(...args)=>f.alerts.push(args)}},'@expo/vector-icons':{MaterialIcons:p=>React.createElement('span',{'data-icon':p.name})},
  '@tanstack/react-query':{useQueryClient:()=>f.client},'expo-linear-gradient':{LinearGradient:Panel},'expo-router':{useRouter:()=>({push:()=>{}})},
  '../../design/typography':{pluggdFonts:{}},'../../design/usePluggdTheme':{usePluggdTheme:()=>({scheme:'dark',colors})},'../../components/PluggdImage':{PluggdImage:()=>null,Image:{getSize(){}}},'../../context/PlaybackProvider':{usePlayback:()=>({})},'../social-music/PostMusicAttribution':{PostMusicAttribution:()=>null},'../../design/haptics':{impactHaptic(){},selectionHaptic(){}},'../../lib/mobileContent':{contentInitials:()=> 'AR',formatDate:()=> 'Today',formatCompact:n=>String(n)},'../../../components/liquid-glass':{GlassAvatar:Panel,GlassPanel:Panel},
  './mobileSocial':service,'../safety/accountSafety':{blockUser:async()=>({})},'../safety/reportActions':{},'./MobileSocialMediaViewer':{MobileSocialMediaViewer:()=>null},'../../context/AuthProvider':{useAuth:()=>f.auth},'./MobileSocialInlineVideo':{MobileSocialInlineVideo:()=>null},'./useInlineVideoVisibility':{useSuspendInlineVideos(){}},'../community-feed/communityRelevanceController':ctrl,'../community-feed/CommunityReleasePlayer':{CommunityReleasePlayer:()=>null},'../community-feed/releasePostPlayback':{releaseIdForPost:()=>null},'./postInteractionState':store,
 }).MobileSocialPostCard;
 const container=document.createElement('div');document.body.append(container);let root=createRoot(container);
 f.render=()=>act(async()=>{root.render(React.createElement(Component,{post:f.post,onMutated:()=>f.mutated++}));await settle();});
 f.button=label=>[...container.querySelectorAll('[aria-label]')].find(el=>el.getAttribute('aria-label')===label);
 f.click=label=>act(async()=>{const button=f.button(label);assert.ok(button,`Missing ${label}`);button.click();await settle();});
 f.remount=async()=>{await act(async()=>root.unmount());root=createRoot(container);await f.render();};
 f.close=async()=>{await act(async()=>root.unmount());container.remove();f.client.clear();};
 f.container=container;await f.render();return f;
}
test('Like and Save update immediately, one toggle per rapid tap, no mutation refetch, and survive virtualized remount',async()=>{
 const f=await cardFixture();try{f.wait=deferred();const button=f.button('Like');await act(async()=>{button.click();button.click();await settle();});assert.ok(f.button('Unlike'));assert.equal(f.calls.length,1);assert.equal(f.button('Unlike').disabled,true);assert.match(f.container.textContent,/11/);assert.equal(f.mutated,0);
 await f.remount();assert.ok(f.button('Unlike'));await act(async()=>{f.wait.resolve({success:true,liked:true});await settle();});await f.remount();assert.ok(f.button('Unlike'));assert.equal(f.mutated,0);
 f.wait=null;await f.click('Save post');assert.ok(f.button('Remove saved post'));assert.equal(f.calls.at(-1).action,'bookmark');assert.deepEqual(f.calls[0].args,[f.post.id,id(80),'actor-a']);
 }finally{await f.close();}
});
test('deferred Like/Save failures roll back with one alert and never touch a departed actor or new post',async()=>{
 for(const action of ['Like','Save post']){const f=await cardFixture();try{f.wait=deferred();await f.click(action);await act(async()=>{f.wait.resolve({success:false,error:'Try later'});await settle();});assert.ok(f.button(action));assert.equal(f.alerts.length,1);assert.equal(f.mutated,0);}finally{await f.close();}}
 const f=await cardFixture();try{f.wait=deferred();await f.click('Like');f.auth={user:{id:id(81)},session:{access_token:'actor-b'}};f.post=post(2);await f.render();await act(async()=>{f.wait.resolve({success:false,error:'Old failure'});await settle();});assert.ok(f.button('Like'));assert.equal(f.alerts.length,0);}finally{await f.close();}
});
test('same-account token rotation preserves acknowledged actions and rolls back pending work',async()=>{
 const f=await cardFixture();try{await f.click('Like');f.auth={user:{id:id(80)},session:{access_token:'rotated-a'}};await f.render();assert.ok(f.button('Unlike'));f.wait=deferred();await f.click('Save post');f.auth={user:{id:id(80)},session:{access_token:'rotated-again'}};await f.render();assert.ok(f.button('Unlike'));assert.ok(f.button('Save post'));await act(async()=>{f.wait.resolve({success:true,bookmarked:true});await settle();});assert.ok(f.button('Save post'));}finally{await f.close();}
});
test('canonical repost interactions share pending and confirmed state with the original post',()=>{
 const scope=store.bindPostInteractionScope(id(82),'token');const original=post(4),wrapper={...post(5),is_repost:true,original_post_id:original.id,original_post:original};const operation=store.beginPostInteraction(scope,wrapper,'like');assert.ok(operation);assert.equal(store.beginPostInteraction(scope,original,'like'),null);assert.equal(store.postInteractionSnapshot(original).liked,true);store.finishPostInteraction(operation,true,false);assert.equal(store.postInteractionSnapshot(original).liked,false);assert.equal(store.postInteractionSnapshot(wrapper).likes_count,10);
});
test('untouched new server props update normally; old fetch cannot undo acknowledgement, a new fetch can reconcile it',async()=>{
 const f=await cardFixture();try{f.post={...f.post,likes_count:22};await f.render();assert.match(f.container.textContent,/22/);
 const old=deferred();const request=f.client.fetchQuery({queryKey:['culture','post-detail',f.post.id,id(80)],queryFn:()=>old.promise});await settle();await f.click('Like');await act(async()=>{old.resolve({post:{...f.post,liked:false,likes_count:22}});await request;await settle();});assert.ok(f.button('Unlike'));
 await act(async()=>{await f.client.fetchQuery({queryKey:['culture','post-detail',f.post.id,id(80)],queryFn:async()=>({post:{...f.post,liked:false,likes_count:30}})});await settle();});assert.ok(f.button('Like'));assert.match(f.container.textContent,/30/);
 }finally{await f.close();}
});
test('a fetch begun during a pending Like cannot overwrite the later acknowledgement',async()=>{
 const f=await cardFixture();try{
  f.wait=deferred();await f.click('Like');assert.ok(f.button('Unlike'));
  const old=deferred();const key=['culture','post-detail',f.post.id,id(80)];
  const request=f.client.fetchQuery({queryKey:key,queryFn:()=>old.promise});await settle();
  await act(async()=>{f.wait.resolve({success:true,liked:true});await settle();});
  await act(async()=>{old.resolve({post:{...f.post,liked:false,likes_count:22}});await request;await settle();});
  assert.ok(f.button('Unlike'),'pre-acknowledgement server snapshot must not undo the confirmed Like');
  await act(async()=>{await f.client.fetchQuery({queryKey:key,queryFn:async()=>({post:{...f.post,liked:false,likes_count:30}})});await settle();});
  assert.ok(f.button('Like'),'a fetch begun after acknowledgement remains authoritative');
 }finally{await f.close();}
});
function controllerFixture(){
 store.bindPostInteractionScope(id(85),'controller');let pages=0;const seen=[];const context={state:'live',use_v3:true,shadow:false,personalization_enabled:true,legacy_affinity_allowed:true,epoch:id(500),algorithm_version:'community-v3.1'};
 const api={context:async()=>context,page:async(_context,request,cursor)=>{seen.push({request,cursor});const n=pages++;const rows=Array.from({length:10},(_,i)=>post(n*10+i+1));return{posts:rows,metadata:Object.fromEntries(rows.map(p=>[p.id,{requestId:id(600),reason:'music',authorId:p.user_id}])),requestId:id(600),cursor:{request_id:id(600),position:(n+1)*10,score:'12.3',created_at:'2026-11-09',post_id:rows.at(-1).id},hasMore:true};},baseline:async()=>[],events:async()=>{},suppress:async()=>id(700),undo:async()=>true};
 const controller=new ctrl.NativeRelevanceController({id:id(85),token:'controller'},api,'for-you');controller.setActive(true);return{controller,seen,api};
}
test('several loaded pages, exact cursor, order and Undo survive optimistic actions; hide/Undo stay in place',async()=>{
 const f=controllerFixture();await settle();await f.controller.more();await f.controller.more();try{const initial=f.controller.state.posts.map(p=>p.id);await f.controller.suppress(id(12),'post');const undo=f.controller.state.undo;const rows=f.controller.state.posts;const scope=store.bindPostInteractionScope(id(85),'controller');const operation=store.beginPostInteraction(scope,rows[20],'like');store.finishPostInteraction(operation,true,true);assert.equal(f.controller.state.posts,rows);assert.equal(f.controller.state.undo,undo);assert.equal(f.seen.length,3);await f.controller.undo();assert.deepEqual(f.controller.state.posts.map(p=>p.id),initial);await f.controller.more();assert.equal(f.seen.at(-1).request,id(600));assert.equal(f.seen.at(-1).cursor.position,30);}finally{f.controller.dispose();}
});
test('confirmed removal retires late pages, redacts embedded originals and cannot be resurrected by Undo',async()=>{
 const f=controllerFixture();await settle();await f.controller.more();try{f.controller.state.posts[3]={...f.controller.state.posts[3],is_quote:true,original_post:{...post(90),user_id:id(777)}};f.controller.state.posts[5]={...f.controller.state.posts[5],user_id:id(777)};await f.controller.suppress(f.controller.state.posts[5].id,'post');const wait=deferred();f.api.page=()=>wait.promise;const more=f.controller.more();await settle();f.controller.removeLoadedPosts({authorId:id(777)});wait.resolve({posts:[{...post(91),user_id:id(777)}],metadata:{},requestId:id(600),cursor:null,hasMore:false});await more;assert.equal(f.controller.state.posts[3].original_post,null);assert.ok(!f.controller.state.posts.some(p=>p.user_id===id(777)));await f.controller.undo();assert.ok(!f.controller.state.posts.some(p=>p.user_id===id(777)));}finally{f.controller.dispose();}
});
test('query pruning updates loaded rows without permanent tombstones; later fresh unblock data renders',async()=>{
 const client=new rq.QueryClient();const scope=store.bindPostInteractionScope(id(86),'query');const row=post(7);client.setQueryData(['culture','community-board','board'],{posts:[row,{...post(8),original_post:row}],cursor:'keep'});await store.removePostQuerySnapshots(client,scope,{authorId:row.user_id});assert.equal(client.getQueryData(['culture','community-board','board']).posts.length,0);client.setQueryData(['culture','community-board','board'],{posts:[row],cursor:'fresh'});assert.equal(store.postInteractionSnapshot(row).liked,false);assert.equal(client.getQueryData(['culture','community-board','board']).posts.length,1);client.clear();
});
test('Like/Save service pins initiating bearer, rejects stale auth/read preparation, and keeps legacy calls compatible',async()=>{
 for(const name of ['toggleSocialLike','toggleSocialBookmark']){
  const f={actor:id(80),token:'service-a',calls:[],authWait:null,readWait:null};
  const db={auth:{getSession:async()=>({data:{session:{user:{id:f.actor},access_token:f.token}},error:null}),getUser:async()=>{if(f.authWait){const wait=f.authWait;f.authWait=null;return wait.promise;}return{data:{user:{id:f.actor}}};}},from:table=>{const call={table,headers:{},write:false,payload:null};const builder={select(){return builder;},eq(){return builder;},maybeSingle(){return builder;},insert(payload){call.write=true;call.payload=payload;return builder;},delete(){call.write=true;return builder;},setHeader(key,value){call.headers[key]=value;return builder;},then(resolve,reject){f.calls.push(call);return Promise.resolve(!call.write&&f.readWait?f.readWait.promise:null).then(()=>({data:null,error:null})).then(resolve,reject);}};return builder;}};
  const api=load('../src/features/culture/mobileSocial.ts',{'../../lib/supabase':{supabase:db},'../social-music/service':{},'../social-music/model':{},'../../lib/publicAudienceFilters':{},'../safety/accountSafety':{},'./publicCreatorIdentity':{}});
  f.authWait=deferred();const staleAuth=f.authWait;const pending=api[name](id(1),id(80),'service-a');await settle();f.actor=id(81);f.token='service-b';staleAuth.resolve({data:{user:{id:id(80)}}});assert.equal((await pending).success,false);assert.equal(f.calls.length,0);
  f.actor=id(80);f.token='service-a';f.readWait=deferred();const reading=api[name](id(1),id(80),'service-a');await settle();f.actor=id(81);f.token='service-b';f.readWait.resolve();assert.equal((await reading).success,false);assert.equal(f.calls.length,1);assert.equal(f.calls[0].headers.Authorization,'Bearer service-a');assert.ok(!f.calls[0].write);
  f.readWait=null;f.calls=[];f.actor=id(80);f.token='service-a';assert.equal((await api[name](id(1),id(80),'service-a')).success,true);assert.equal(f.calls.length,2);assert.ok(f.calls.every(call=>call.headers.Authorization==='Bearer service-a'));assert.equal(f.calls[1].payload.user_id,id(80));
  f.calls=[];assert.equal((await api[name](id(1))).success,true);assert.ok(f.calls.every(call=>!call.headers.Authorization));
 }
});
test('actual Community pull spinner stays off for background/loading-more and runs only for one real pull',async()=>{
 const f={controls:[],fetches:0,refreshes:0,wait:deferred()};
 const state={posts:[post()],mode:'latest',metadata:{},loading:true,loadingMore:true,hasMore:true,context:null,error:null,undo:null,notice:null,busy:false};
 const query={data:{boards:[],communities:[]},isLoading:false,isFetching:true,refetch:async()=>{f.fetches++;await f.wait.promise;}};
 const FlatList=p=>React.createElement(rn.View,null,p.refreshControl);
 const Component=load('../src/features/community-feed/CommunityFeedScreen.tsx',{
  react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':{...rn,FlatList,RefreshControl:p=>{f.controls.push(p);return null;}},'@tanstack/react-query':{useQuery:()=>query},'expo-router':{useLocalSearchParams:()=>({}),useRouter:()=>({push(){}})},'../../design/useBottomChromeInset':{useBottomChromeInset:()=>100},'../culture/MobileSocialPostCard':{MobileSocialPostCard:()=>null},'../culture/MobileStoriesRail':{MobileStoriesRail:()=>null},'./CommunityFeedInterstitials':{},'./CommunityInternalSwitcher':{CommunityInternalSwitcher:()=>null,CommunityBottomDockControls:()=>null},'./communityFeedTypes':{FEED_FILTERS:[]},'./communityFeedService':{filterCommunityPosts:posts=>posts},'../../design/typography':{pluggdFonts:{}},'@expo/vector-icons':{MaterialIcons:()=>null},'expo-linear-gradient':{LinearGradient:rn.View},'../../components/PluggdImage':{},'../discovery/DiscoveryHeader':{DiscoveryHeader:()=>null},'../../design/haptics':{selectionHaptic(){}},'../../design/usePluggdTheme':{usePluggdTheme:()=>({scheme:'dark',colors})},'../../context/AuthProvider':{useAuth:()=>({user:{id:id(80)}})},'./useNativeRelevance':{useNativeRelevance:()=>({state,selectMode(){},controller:{refresh:async()=>{f.refreshes++;await f.wait.promise;}}})},'./communityRelevanceModel':model,'./communityRelevanceControls':{recommendationTabProps:()=>({}),RecommendationModes:()=>null,RecommendationMore:()=>null,RecommendationPost:()=>null,RecommendationStatus:()=>null},
 }).CommunityFeedScreen;
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);try{
 await act(async()=>root.render(React.createElement(Component)));assert.equal(f.controls.at(-1).refreshing,false);
 const onRefresh=f.controls.at(-1).onRefresh;await act(async()=>{onRefresh();onRefresh();await settle();});assert.equal(f.controls.at(-1).refreshing,true);assert.equal(f.fetches,1);assert.equal(f.refreshes,1);
 await act(async()=>{f.wait.resolve();await settle();});assert.equal(f.controls.at(-1).refreshing,false);assert.equal(state.loading,true);assert.equal(state.loadingMore,true);
 }finally{await act(async()=>root.unmount());container.remove();}
});

let failures=0;for(const {name,run}of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
dom.window.close();assert.equal(failures,0);console.log('PASS '+tests.length+' focused actual-source stable-post cases; native/network boundaries mocked.');
