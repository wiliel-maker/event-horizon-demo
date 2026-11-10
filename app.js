'use strict';
const $=id=>document.getElementById(id);
const canvas=$('game');
let unity=null,loading=false;
window.demoSignals=[];
window.demoStatus='idle';
function status(text){$('state').textContent=text;}
function fail(error){
  loading=false;window.demoStatus='error';
  $('load-panel').hidden=false;$('load-title').textContent='Не удалось открыть игру';
  $('load-copy').textContent='Проверьте соединение и повторите загрузку в современном Chrome, Edge или Firefox с поддержкой WebGL 2.';
  $('launch-actions').hidden=true;$('loading').hidden=true;$('retry').hidden=false;
  canvas.hidden=true;$('poster').hidden=false;$('stage').dataset.playing='false';
  $('menu').disabled=true;$('fullscreen').disabled=true;
  status('Не удалось загрузить игру. Повторите попытку.');
  console.error('[Demo]',error);
}
function addScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Не удалось загрузить Unity loader'));document.head.appendChild(script);});}
async function load(mode='story'){
  if(loading||unity)return;
  if(!window.WebAssembly){fail(new Error('WebAssembly недоступен'));return;}
  loading=true;window.demoStatus='loading';
  if(matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&!$('stage').classList.contains('immersive'))void toggleFullscreen();
  $('launch-actions').hidden=true;$('loading').hidden=false;
  $('load-title').textContent='Загружаем станцию';
  $('load-copy').textContent='Первый запуск загружает игровые файлы. Оставьте эту вкладку открытой.';
  try{
    const response=await fetch('game/manifest.json?v=20261110-mobile1');
    if(!response.ok)throw new Error('Конфигурация игры недоступна: '+response.status);
    const manifest=await response.json();
    await addScript(manifest.loader);
    canvas.hidden=false;
    const original=console.log;
    console.log=function(...args){const line=args.map(String).join(' ');if(line.includes('[DEMO]'))window.demoSignals.push({line,time:performance.now()});original.apply(console,args);};
    unity=await createUnityInstance(canvas,{
      dataUrl:manifest.dataUrl,frameworkUrl:manifest.frameworkUrl,codeUrl:manifest.codeUrl,
      streamingAssetsUrl:'game/StreamingAssets',companyName:manifest.companyName,
      productName:'Горизонт событий',productVersion:manifest.productVersion,
      devicePixelRatio:1,
      showBanner:(message,type)=>{if(type==='error')fail(message);else console.warn(message);}
    },value=>{const progress=Math.max(0,Math.min(1,value));$('progress').value=progress;$('load-status').textContent=progress<.9?'Загрузка игровых файлов… '+Math.round(progress*100)+'%':'Подготавливаем игру…';});
    if(window.demoStatus==='error')return;
    window.unityInstance=unity;window.demoStatus='ready';
    $('load-panel').hidden=true;$('poster').hidden=true;
    $('stage').dataset.playing='true';
    $('menu').disabled=false;$('fullscreen').disabled=false;
    status('Клавиатура или экранные кнопки. Прогресс в демоверсии не сохраняется.');
    window.dispatchEvent(new CustomEvent('eh-demo-ready',{detail:{instance:unity,mode}}));
    canvas.focus({preventScroll:true});
    if(mode==='explore')unity.SendMessage('WebDemo','StartFreeRoam');
    if(mode==='story')unity.SendMessage('WebDemo','StartStory');
  }catch(error){fail(error);}
}
$('play').addEventListener('click',()=>load('story'));
$('explore').addEventListener('click',()=>load('explore'));
$('retry').addEventListener('click',()=>location.reload());
async function toggleFullscreen(){
  const stage=$('stage');
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(stage.classList.contains('immersive')){stage.classList.remove('immersive');document.body.classList.remove('game-immersive');}
    else {try{if(!stage.requestFullscreen)throw new Error('native fullscreen unavailable');await stage.requestFullscreen();}catch(error){stage.classList.add('immersive');document.body.classList.add('game-immersive');}}
    $('stage-exit').hidden=!(document.fullscreenElement||stage.classList.contains('immersive'));
    canvas.focus({preventScroll:true});
  }catch(error){status('Полный экран недоступен. Можно продолжить играть в окне.');}
}
$('fullscreen').addEventListener('click',toggleFullscreen);
$('stage-exit').addEventListener('click',toggleFullscreen);
document.addEventListener('fullscreenchange',()=>{$('stage-exit').hidden=!(document.fullscreenElement||$('stage').classList.contains('immersive'));if(window.demoReleaseTouch)window.demoReleaseTouch();});
$('menu').addEventListener('click',()=>{window.dispatchEvent(new Event('eh-demo-reset'));if(unity)unity.SendMessage('WebDemo','OpenMenu');canvas.focus({preventScroll:true});});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
window.addEventListener('keydown',event=>{if(document.activeElement===canvas&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key))event.preventDefault();});
