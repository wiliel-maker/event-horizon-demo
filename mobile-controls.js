'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const stage=$('stage'),hud=$('touch-ui');
  if(!stage||!hud)return;
  let game=null,enabled=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
  let complete=false,lastState=null,choiceSignature='',run=false;
  const pointers=new Map(),timers=new Set(),keys=new Set();
  const send=(method,value)=>{if(game)game.SendMessage('WebDemo',method,value===undefined?'':value);};
  const down=key=>{if(!complete&&!keys.has(key)){keys.add(key);send('TouchDown',key);}};
  const up=key=>{if(keys.delete(key))send('TouchUp',key);};
  function releaseAll(){for(const timer of timers)clearTimeout(timer);timers.clear();pointers.clear();keys.clear();run=false;hud.querySelectorAll('[data-toggle]').forEach(b=>b.setAttribute('aria-pressed','false'));hud.querySelectorAll('.is-held').forEach(b=>b.classList.remove('is-held'));send('ReleaseTouch');}
  function pulse(key){down(key);const timer=setTimeout(()=>{timers.delete(timer);up(key);},110);timers.add(timer);}
  function bind(button){
    const key=button.dataset.key;
    button.addEventListener('pointerdown',event=>{
      if(!game||complete||event.button>0)return;
      event.preventDefault();event.stopPropagation();
      if(button.dataset.toggle){run=!run;button.setAttribute('aria-pressed',String(run));if(run)down(key);else up(key);return;}
      pointers.set(event.pointerId,key);button.setPointerCapture(event.pointerId);button.classList.add('is-held');down(key);
    });
    const release=event=>{const owned=pointers.get(event.pointerId);pointers.delete(event.pointerId);if(owned&&!Array.from(pointers.values()).includes(owned))up(owned);button.classList.remove('is-held');};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
    button.addEventListener('click',event=>{if(event.detail===0&&game&&!complete){if(button.dataset.toggle){run=!run;button.setAttribute('aria-pressed',String(run));if(run)down(key);else up(key);}else pulse(key);}});
  }
  hud.querySelectorAll('[data-key]').forEach(bind);
  function paint(state){
    const oldView=lastState?.view;lastState=state;
    window.demoGameState=state;
    if(oldView&&oldView!==state.view)releaseAll();
    hud.hidden=!game||!enabled||complete;
    if(hud.hidden)return;
    const play=state.view==='gameplay',dialogue=['dialogue','choice','reading'].includes(state.view),menu=state.view==='menu';
    $('touch-dpad').hidden=!play;$('touch-actions').hidden=!play;$('touch-slots').hidden=!play;
    $('mobile-dialogue').hidden=!dialogue;$('mobile-menu').hidden=!menu;
    $('mobile-resume').hidden=!state.session;
    $('mobile-restart').textContent=state.session?'Начать заново':'Начать первую главу';
    $('mobile-speaker').textContent=state.speaker||'';$('mobile-text').textContent=state.text||'';
    $('mobile-next').hidden=state.view==='choice';$('mobile-close').hidden=state.view!=='reading';
    const signature=JSON.stringify(state.choices||[]);
    if(signature!==choiceSignature){choiceSignature=signature;$('mobile-choices').replaceChildren();(state.choices||[]).forEach((text,i)=>{const b=document.createElement('button');b.type='button';b.className='quiet';b.textContent=text;b.addEventListener('click',()=>pulse(String(i+1)));$('mobile-choices').append(b);});}
    $('touch-feedback').textContent=play?(state.toast||state.task||state.item||''):'';
    $('touch-progress').hidden=!play||state.progress<0;$('touch-progress').value=Math.max(0,state.progress);
  }
  function setTouch(value){enabled=value;stage.dataset.touch=String(value);$('touch-toggle').setAttribute('aria-pressed',String(value));releaseAll();send('SetTouchMode',value?'1':'0');if(lastState)paint(lastState);}
  function restart(){releaseAll();complete=false;if($('demo-end').open)$('demo-end').close();$('stage-exit').hidden=!(document.fullscreenElement||stage.classList.contains('immersive'));window.demoStatus='ready';lastState=null;choiceSignature='';send('StartStory');}
  window.addEventListener('eh-demo-ready',event=>{game=event.detail.instance;$('touch-toggle').disabled=false;setTouch(enabled);});
  window.addEventListener('eh-demo-state',event=>paint(event.detail));
  window.addEventListener('eh-demo-complete',()=>{releaseAll();complete=true;window.demoStatus='completed';hud.hidden=true;$('stage-exit').hidden=true;const dialog=$('demo-end');if(!dialog.open)dialog.showModal();});
  $('touch-toggle').addEventListener('click',()=>setTouch(!enabled));
  $('mobile-resume').addEventListener('click',()=>{releaseAll();send('ResumeDemo');});
  $('mobile-restart').addEventListener('click',restart);$('demo-restart').addEventListener('click',restart);
  $('demo-end').addEventListener('cancel',event=>event.preventDefault());
  window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
  window.addEventListener('pagehide',releaseAll);
  window.addEventListener('eh-demo-reset',()=>{releaseAll();complete=false;if($('demo-end').open)$('demo-end').close();});
  window.demoReleaseTouch=releaseAll;
})();
