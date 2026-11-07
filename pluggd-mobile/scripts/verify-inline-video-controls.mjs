import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const req=createRequire(process.env.PLUGGD_NATIVE_PACKAGE_JSON || import.meta.url);
const React=req('react'),{act}=React,ts=req('typescript'),assert=req('node:assert/strict');
let JSDOM;
try { ({JSDOM}=req('jsdom')); } catch { ({JSDOM}=createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON || new URL('../../package.json', import.meta.url))('jsdom')); }
const dom=new JSDOM('<!doctype html><html><body></body></html>');
global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
const {createRoot}=req('react-dom/client');
const source=process.argv[2]||new URL('../src/features/culture/MobileSocialInlineVideo.tsx', import.meta.url);
async function fixture({music=false,reader=false,reduce=false,deferSource=false,external=false,storedMuted=false,storageFails=false,buffering=false,ambientFails=false}={}){
 let now=0,id=0;const timers=new Map(),listeners=new Map();
 const f={music,reader,reduce,external,buffering,ambientFails,storedMuted,alerts:[],calls:[],active:true,screenListeners:new Map(),track:null};
 if(deferSource)f.sourceWait=new Promise(resolve=>{f.resolveSource=resolve});
 const emit=(type,event)=>{for(const listener of listeners.get(type)||[])listener(event)};
 const player={duration:16,currentTime:0,_muted:true,_mix:'mixWithOthers',
  get muted(){return this._muted},set muted(v){const old=this._muted;this._muted=v;f.calls.push('muted:'+v);if(old!==v)emit('mutedChange',{muted:v})},
  get audioMixingMode(){return this._mix},set audioMixingMode(v){this._mix=v;f.calls.push('mix:'+v)},
  addListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);return{remove(){listeners.get(type).delete(fn)}}},
  playAutomaticPreview:async()=>{f.calls.push('ambientPreflight');if(f.preflightWait)await f.preflightWait;const allowed=!f.external&&!f.ambientFails;player.muted=!allowed;player.play();return allowed},
  replaceAsync:async()=>{f.calls.push('replace');if(f.sourceWait)await f.sourceWait;emit('statusChange',{status:'readyToPlay'})},
  play(){f.calls.push('videoPlay:'+player.muted);emit('playingChange',{isPlaying:true})},
  pause(){f.calls.push('videoPause');emit('playingChange',{isPlaying:false})}
 }; f.player=player;
 f.pause=async()=>{f.calls.push('musicPause');if(f.pauseWait)await f.pauseWait;f.music=false;if(!f.closed)f.render()};
 const Host=(tag)=>(p)=>React.createElement(tag,{...(tag==='button'?{type:'button','aria-label':p.accessibilityLabel,disabled:p.disabled,onClick:p.onPress}:{}),...(p.accessibilityRole==='alert'?{role:'alert'}:{})},p.children);
 const storage=new Map(storedMuted ? [['pluggd:community-video-muted:v1','true']] : []);
 const native={Platform:{OS:'ios'},Alert:{alert:(...args)=>f.alerts.push(args)}};
 const load=(url,mocks)=>{
  const result=ts.transpileModule(fs.readFileSync(url,'utf8'),{fileName:String(url),compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
  assert.equal(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  const mod={exports:{}};
  vm.runInNewContext(result.outputText,{module:mod,exports:mod.exports,Promise,console,require:name=>{if(name==='zustand')return req(name);assert.ok(Object.hasOwn(mocks,name),name);return mocks[name]}});
  return mod.exports;
 };
 const preference=load(new URL('../src/features/culture/inlineVideoSoundPreference.ts',import.meta.url),{
  'react-native':native,'@react-native-async-storage/async-storage':{default:{getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>{if(storageFails)throw Error('Local storage fixture denied');storage.set(key,value)}}}
 });
 const audio=load(new URL('../src/features/culture/inlineVideoAudio.ts',import.meta.url),{
  'react-native':native,'expo-modules-core':{requireNativeModule:()=>({isOtherAudioPlaying:()=>f.external})}
 });
 f.preference=preference;f.storage=storage;
 const mocks={
  '@expo/vector-icons':{MaterialIcons:()=>null},
  'expo-video':{VideoView:()=>React.createElement('div',{'data-video':true}),useVideoPlayer:(_src,setup)=>React.useMemo(()=>{setup(player);return player},[])},
  'react-native':{AccessibilityInfo:{isReduceMotionEnabled:async()=>f.reduce,isScreenReaderEnabled:async()=>f.reader,addEventListener:(name,fn)=>{f.screenListeners.set(name,fn);return{remove:()=>f.screenListeners.delete(name)}}},ActivityIndicator:()=>React.createElement('span',null,'Loading'),Pressable:Host('button'),StyleSheet:{create:x=>x,absoluteFill:{},absoluteFillObject:{}},Text:Host('span'),View:Host('div')},
  '../../context/AuthProvider':{useAuth:()=>({user:{id:'fixture'},session:null})},
  '../../context/PlaybackProvider':{usePlayback:()=>({pause:f.pause,isPlaying:f.music,isBuffering:f.buffering,currentTrack:f.track})},
  '../../design/usePluggdTheme':{usePluggdTheme:()=>({colors:{artworkBase:'#000',text:'#fff'}})},
  '../../design/typography':{pluggdFonts:{}},
  '../social-music/model':{musicPostId:()=>null},'../social-music/service':{musicPlayback:()=>{throw Error('unexpected private resolver')}},
  './inlineVideoSoundPreference':preference,'./inlineVideoAudio':audio,
  './useInlineVideoVisibility':{useInlineVideoVisibility:()=>({view:{current:null},active:f.active,requestPlay:()=>{f.active=true;f.render()}})}
 };
 const result=ts.transpileModule(fs.readFileSync(source,'utf8'),{fileName:String(source),compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 assert.equal(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 const module={exports:{}};
 vm.runInNewContext(result.outputText,{module,exports:module.exports,AbortController,Promise,console,setTimeout:(fn,delay)=>{const n=++id;timers.set(n,{fn,at:now+delay});return n},clearTimeout:n=>timers.delete(n),require:name=>{if(name==='react'||name==='react/jsx-runtime')return req(name);assert.ok(Object.hasOwn(mocks,name),name);return mocks[name]}});
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 f.render=()=>root.render(React.createElement(module.exports.MobileSocialInlineVideo,{uri:'https://local.test/video.mp4',blocked:false,onFullscreen:()=>f.calls.push('fullscreen')}));
 f.button=label=>[...container.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label);
 f.click=async label=>{const b=f.button(label);assert.ok(b,`Missing ${label}`);await act(async()=>b.click())};
 f.advance=async ms=>{now+=ms;const due=[...timers].filter(([,x])=>x.at<=now);await act(async()=>{for(const [n,x]of due){timers.delete(n);x.fn()}})};
 f.emit=async(type,event)=>act(async()=>emit(type,event));f.close=async()=>{f.closed=true;await act(async()=>root.unmount());container.remove()};
 await act(async()=>f.render()); return f;
}
const cases=[];const test=(name,run)=>cases.push({name,run});
const withFixture=(options,run)=>async()=>{const f=await fixture(options);try{await run(f)}finally{await f.close()}};
test('ordinary autoplay has sound and unobstructed video; tap reveals controls then hides them',withFixture({},async f=>{assert.equal(f.player.muted,false);assert.ok(!f.button('Pause video'));await f.click('Show video controls');assert.ok(f.button('Pause video'));await f.advance(3000);assert.ok(!f.button('Pause video'));assert.ok(f.button('Show video controls'))}));
test('existing PLUGGD music is preserved until video tap requests sound',withFixture({music:true},async f=>{assert.equal(f.player.muted,true);assert.ok(!f.calls.includes('musicPause'));await f.click('Show video controls');assert.equal(f.calls.filter(x=>x==='musicPause').length,1);assert.equal(f.player.muted,false);assert.ok(f.button('Mute video'))}));
test('user mute persists through hiding and revealing controls',withFixture({},async f=>{await f.click('Show video controls');await f.click('Mute video');assert.equal(f.player.muted,true);await f.click('Hide video controls');await f.click('Show video controls');assert.equal(f.player.muted,true)}));
test('paused controls remain available and playing restores auto hide',withFixture({},async f=>{await f.click('Show video controls');await f.click('Pause video');await f.advance(10000);assert.ok(f.button('Play video'));await f.click('Play video');await f.advance(3000);assert.ok(!f.button('Pause video'))}));
test('VoiceOver suppresses autoplay and retains manual playback controls',withFixture({reader:true},async f=>{assert.ok(!f.calls.some(x=>x.startsWith('videoPlay')));await f.click('Play video in this post');assert.ok(f.button('Pause video'));await f.advance(10000);assert.ok(f.button('Pause video'))}));
test('manual playback with Reduce Motion pauses existing music before audible playback',withFixture({music:true,reduce:true},async f=>{await f.click('Play video in this post');assert.equal(f.player.muted,false);assert.ok(f.calls.indexOf('musicPause')<f.calls.indexOf('videoPlay:false'))}));
test('muted preference survives retry after a video error',withFixture({},async f=>{await f.click('Show video controls');await f.click('Mute video');await f.emit('statusChange',{status:'error'});await f.click('Retry video playback');assert.equal(f.player.muted,true)}));
test('starting PLUGGD music remutes the video without pausing the song',withFixture({},async f=>{f.calls.length=0;f.music=true;await act(async()=>f.render());assert.equal(f.player.muted,true);assert.ok(!f.calls.includes('musicPause'))}));
test('unmount during requested audio takeover never unmutes or starts the departed video',async()=>{const f=await fixture({music:true,reduce:true});let resolve;f.pauseWait=new Promise(yes=>{resolve=yes});await f.click('Play video in this post');assert.ok(f.calls.includes('musicPause'));await f.close();const count=f.calls.length;await act(async()=>resolve());assert.deepEqual(f.calls.slice(count),[])});
test('delayed music pause still completes an explicit audible manual handoff',async()=>{const f=await fixture({music:true,reduce:true});try{let resolve;f.pauseWait=new Promise(yes=>{resolve=yes});await f.click('Play video in this post');assert.equal(f.player.muted,true);await act(async()=>resolve());assert.equal(f.player.muted,false);assert.ok(f.calls.includes('videoPlay:false'))}finally{await f.close()}});
test('returning to a previously requested card never takes over newly started music',withFixture({music:true,reduce:true},async f=>{await f.click('Play video in this post');f.active=false;await act(async()=>f.render());f.music=true;f.calls.length=0;f.active=true;await act(async()=>f.render());assert.ok(!f.calls.includes('musicPause'));assert.ok(f.button('Play video in this post'))}));
test('a newer song started during delayed video loading keeps audio ownership',async()=>{const f=await fixture({reduce:true,deferSource:true});try{await f.click('Play video in this post');f.music=true;f.track={id:'new-song',url:'https://local.test/new.mp3'};await act(async()=>f.render());await act(async()=>f.resolveSource());assert.ok(!f.calls.includes('musicPause'));assert.equal(f.player.muted,true)}finally{await f.close()}});
test('switching an existing song during delayed video loading cancels the earlier takeover',async()=>{const f=await fixture({music:true,reduce:true,deferSource:true});try{await f.click('Play video in this post');f.track={id:'another-song',url:'https://local.test/another.mp3'};await act(async()=>f.render());await act(async()=>f.resolveSource());assert.ok(!f.calls.includes('musicPause'));assert.equal(f.player.muted,true)}finally{await f.close()}});
test('another app audio is preserved until explicit video sound',withFixture({external:true},async f=>{assert.equal(f.player.muted,true);assert.ok(!f.calls.includes('mix:doNotMix'));assert.ok(f.button('Turn video sound on'));await f.click('Turn video sound on');assert.equal(f.player.muted,false);assert.equal(f.player.usesAmbientAudio,false)}));
test('automatic audio uses the Silent-mode-respecting ambient path',withFixture({},async f=>{assert.equal(f.player.usesAmbientAudio,true);assert.equal(f.player.audioMixingMode,'mixWithOthers');assert.ok(f.button('Mute video'));await f.click('Show video controls');assert.equal(f.player.usesAmbientAudio,false)}));
test('a saved mute blocks sound on later video activations until explicit unmute',withFixture({storedMuted:true},async f=>{assert.equal(f.player.muted,true);await f.click('Show video controls');assert.equal(f.player.muted,true);await f.click('Turn video sound on');assert.equal(f.player.muted,false);assert.equal(f.storage.get('pluggd:community-video-muted:v1'),'false');await f.click('Mute video');f.active=false;await act(async()=>f.render());f.active=true;await act(async()=>f.render());assert.equal(f.player.muted,true);assert.equal(f.storage.get('pluggd:community-video-muted:v1'),'true')}));
test('storage write failure keeps the current mute and explains persistence failure',withFixture({storageFails:true},async f=>{await f.click('Mute video');assert.equal(f.player.muted,true);assert.equal(f.alerts.length,1);assert.equal(f.alerts[0][0],'Sound preference not saved')}));
test('a buffering PLUGGD song retains its session until explicit video sound',withFixture({buffering:true},async f=>{assert.equal(f.player.muted,true);assert.ok(!f.calls.includes('mix:doNotMix'));await f.click('Turn video sound on');assert.ok(f.calls.includes('musicPause'));assert.equal(f.player.muted,false)}));
test('failed native ambient preparation never unmutes automatic playback',withFixture({ambientFails:true},async f=>{assert.equal(f.player.muted,true);assert.ok(!f.calls.includes('videoPlay:false'));assert.ok(f.calls.includes('ambientPreflight'))}));
(async()=>{let failed=0;for(const c of cases){try{await c.run();console.log('PASS '+c.name)}catch(e){failed++;console.error('FAIL '+c.name+'\n'+e.stack)}}dom.window.close();assert.equal(failed,0);console.log('PASS '+cases.length+' actual-component video controls/audio cases; native boundaries mocked, device verification still required.')})().catch(e=>{console.error(e);process.exitCode=1});
