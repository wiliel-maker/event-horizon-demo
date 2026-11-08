'use strict';
const $=id=>document.getElementById(id);
const canvas=$('game');
let unity=null,loading=false;
const params=new URLSearchParams(location.search);
window.demoSignals=[];
window.demoStatus='idle';
function status(text){$('state').textContent=text;}
function fail(error){
  loading=false;window.demoStatus='error';
  $('load-panel').hidden=false;$('load-title').textContent='Не удалось открыть игру';
  $('load-copy').textContent='Обновите страницу в актуальном Chrome, Edge или Firefox. Если WebGL недоступен, скачайте GIF для презентации.';
  $('launch-actions').hidden=true;$('loading').hidden=true;$('retry').hidden=false;
  status('Игра не загрузилась. Доступна запись движения.');
  console.error('[Demo]',error);
}
function addScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Не удалось загрузить Unity loader'));document.head.appendChild(script);});}
async function load(mode='story'){
  if(loading||unity)return;
  if(!window.WebAssembly){fail(new Error('WebAssembly недоступен'));return;}
  loading=true;window.demoStatus='loading';
  $('launch-actions').hidden=true;$('loading').hidden=false;
  $('load-title').textContent='Загружаем станцию';
  $('load-copy').textContent='Первый запуск загружает игровые файлы. Оставьте эту вкладку открытой.';
  try{
    const response=await fetch('game/manifest.json');
    if(!response.ok)throw new Error('Конфигурация игры недоступна: '+response.status);
    const manifest=await response.json();
    await addScript(manifest.loader);
    canvas.hidden=false;
    const original=console.log;
    console.log=function(...args){const line=args.map(String).join(' ');if(line.includes('[DEMO]'))window.demoSignals.push({line,time:performance.now()});original.apply(console,args);};
    unity=await createUnityInstance(canvas,{
      dataUrl:manifest.dataUrl,frameworkUrl:manifest.frameworkUrl,codeUrl:manifest.codeUrl,
      streamingAssetsUrl:'game/StreamingAssets',companyName:manifest.companyName,
      productName:'Event Horizon',productVersion:manifest.productVersion,
      devicePixelRatio:1,
      showBanner:(message,type)=>{if(type==='error')fail(message);else console.warn(message);}
    },value=>{const progress=Math.max(0,Math.min(1,value));$('progress').value=progress;$('load-status').textContent=progress<.9?'Загрузка игровых файлов… '+Math.round(progress*100)+'%':'Подготавливаем игру…';});
    if(window.demoStatus==='error')return;
    window.unityInstance=unity;window.demoStatus='ready';
    $('load-panel').hidden=true;$('poster').hidden=true;
    $('menu').disabled=false;$('fullscreen').disabled=false;
    status('Нажмите на игровое окно · Esc — пауза · Прогресс не сохраняется');
    canvas.focus({preventScroll:true});
    if(mode==='explore')unity.SendMessage('WebDemo','StartFreeRoam');
    if(mode==='capture')unity.SendMessage('WebDemo','StartWalkPreview');
  }catch(error){fail(error);}
}
$('play').addEventListener('click',()=>load('story'));
$('explore').addEventListener('click',()=>load('explore'));
$('retry').addEventListener('click',()=>location.reload());
$('fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await $('stage').requestFullscreen();else await document.exitFullscreen();canvas.focus({preventScroll:true});}catch(error){status('Браузер не разрешил полный экран. Продолжайте играть в окне.');}});
$('menu').addEventListener('click',()=>{if(unity)unity.SendMessage('WebDemo','OpenMenu');canvas.focus({preventScroll:true});});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
window.addEventListener('keydown',event=>{if(document.activeElement===canvas&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key))event.preventDefault();});
if(params.get('capture')==='walk')load('capture');
