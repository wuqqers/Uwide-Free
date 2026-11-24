const defaults=UwideSettings.defaults;
document.getElementById('version').textContent=`v${chrome.runtime.getManifest().version}`;
const fields=['enabled','showPlayerButton','playerWheelZoom','mode','autoPicture','zoom','panX','panY','stretch','edgeStretch','ratio','cropAspect','customAspect','autoBars','frameTrim','brightness','contrast','hdr','shadowLift','saturation','vibrance','sharpen'];
let tabId=null,values={...defaults},currentScope=null,queue=Promise.resolve();
function task(work){queue=queue.then(work).catch(error=>{document.getElementById('scope-help').textContent=error.message;});return queue;}
function render(){
 UwideProfiles.renderFullFrame(document.getElementById('fullFrame'),values);
 for(const id of fields){const el=document.getElementById(id);el.type==='checkbox'?el.checked=values[id]:el.value=values[id];}
 for(const id of ['zoom','panX','panY','stretch','cropAspect','frameTrim']){const input=document.getElementById(id);input.disabled=values.mode!=='manual';input.closest('label').hidden=values.mode!=='manual';}
 document.getElementById('customAspect').closest('label').hidden=values.mode!=='manual'||values.cropAspect!=='custom';
 for(const id of ['brightness','contrast','hdr','shadowLift','saturation','vibrance','sharpen']){const input=document.getElementById(id);input.disabled=!values.autoPicture;input.closest('label').hidden=input.disabled;}
 document.body.dataset.theme=values.theme||'dark';
 for(const id of fields){
  const output=document.getElementById(id+'-out');
  if(output)output.value=(['zoom','stretch'].includes(id)?Math.round(values[id]*100):values[id])+'%';
 }
 if(currentScope){
  UwideClient.renderScope(document,currentScope);
  const limited=currentScope.sitePolicy?.mode==='list';
  document.getElementById('site-policy-status').textContent=limited?(currentScope.siteAllowed?'Bu site izinli listede.':'Bu site izinli listede değil; video işleme durdu.'):'Tüm uygun sitelerde etkin.';
  document.getElementById('site-allow').hidden=!limited||currentScope.siteAllowed||!currentScope.host;
 }
}
async function persist(changes){currentScope=await UwideClient.request(tabId,'uwf-settings-write',{changes});values=currentScope.values;render();}
task(async()=>{const tabs=await chrome.tabs.query({active:true,lastFocusedWindow:true});if(/^https?:/.test(tabs[0]?.url||''))tabId=tabs[0].id;currentScope=await UwideClient.request(tabId);values=currentScope.values;render();});
for(const id of fields){const el=document.getElementById(id);el.addEventListener('change',()=>{const value=el.type==='checkbox'?el.checked:['range','number'].includes(el.type)?Number(el.value):el.value;const changes={ [id]:value };task(()=>persist(changes));});
 if(el.type==='range')el.addEventListener('input',()=>{const out=document.getElementById(id+'-out');if(out)out.value=`${['zoom','stretch'].includes(id)?Math.round(el.value*100):Number(el.value)}%`;});}
document.getElementById('scope').addEventListener('change',event=>{const scope=event.target.value;task(async()=>{currentScope=await UwideClient.request(tabId,'uwf-settings-scope',{scope});values=currentScope.values;render();});});
document.getElementById('scope-clear').onclick=()=>task(async()=>{currentScope=await UwideClient.request(tabId,'uwf-settings-clear');values=currentScope.values;render();});
document.getElementById('site-allow').onclick=()=>task(async()=>{currentScope=await UwideClient.request(tabId,'uwf-sites-update',{change:{action:'add'}});values=currentScope.values;render();});
document.getElementById('reset').onclick=()=>task(()=>persist({...defaults}));
document.getElementById('fullFrame').addEventListener('click',()=>task(async()=>{await persist(UwideProfiles.fullFrameChanges(values));document.getElementById('full-frame-status').textContent=currentScope.siteAllowed===false?'Tam kare ayarları kaydedildi; bu site izinli listede olmadığı için uygulanmadı.':values.enabled?'Tam kare ayarları seçili kapsamda uygulandı.':'Tam kare ayarları kaydedildi; kullanmak için eklentiyi etkinleştirin.';}));
function openSettings(){task(async()=>{await chrome.storage.local.set({optionsTabId:tabId});await chrome.runtime.openOptionsPage();});}
document.getElementById('settings').onclick=openSettings;document.getElementById('more').onclick=openSettings;
function activateCurrentTab(){const status=document.getElementById('activate-status'),reload=document.getElementById('reload-tab'),button=document.getElementById('activate');status.textContent='Etkin sekme hazırlanıyor…';reload.hidden=true;button.disabled=true;chrome.tabs.query({active:true,lastFocusedWindow:true},tabs=>{const tab=tabs[0];if(!tab?.id){status.textContent='Etkin sekme bulunamadı.';button.disabled=false;return;}chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},files:['profiles.js','frame-gen.js','content.js']},()=>{if(chrome.runtime.lastError){status.textContent=`Bu sayfada etkinleştirilemedi: ${chrome.runtime.lastError.message}`;button.disabled=false;return;}chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func:()=>{const roots=[document];for(let i=0;i<roots.length;i++)for(const element of roots[i].querySelectorAll('*'))if(element.shadowRoot&&!roots.includes(element.shadowRoot))roots.push(element.shadowRoot);const videos=roots.flatMap(root=>[...root.querySelectorAll('video')]);return {upgrade:window.__uwideFreeUpgradeRequired===true,hasVideo:videos.length>0,readyVideo:videos.some(video=>video.videoWidth>0)};}},results=>{button.disabled=false;if(chrome.runtime.lastError){status.textContent=`Sekme denetlenemedi: ${chrome.runtime.lastError.message}`;return;}if(results?.some(item=>item.result?.upgrade)){status.textContent='Uwide güncellendi. Yeni sürümü uygulamak için sekmeyi yenileyin.';reload.hidden=false;}else if(results?.some(item=>item.result?.readyVideo))status.textContent='Uwide etkin; video bulundu. Ayar dişlisi oynatıcı kontrollerinde görünmeli.';else if(results?.some(item=>item.result?.hasVideo))status.textContent='Uwide etkin; video hazır olduğunda oynatıcı ayarları görünecek.';else status.textContent='Uwide sekmede etkin. Video oynatılınca ayar düğmesi görünür; bazı korumalı oynatıcılar video öğesini gizleyebilir.';});});});}
document.getElementById('activate').addEventListener('click',activateCurrentTab);
activateCurrentTab();
document.getElementById('reload-tab').addEventListener('click',()=>chrome.tabs.query({active:true,lastFocusedWindow:true},tabs=>{if(tabs[0]?.id)chrome.tabs.reload(tabs[0].id);}));

chrome.runtime.onMessage.addListener(message=>{if(message?.type==='uwf-ui-refresh'||(message?.type==='uwf-target-media-changed'&&message.tabId===tabId))task(async()=>{currentScope=await UwideClient.request(tabId);values=currentScope.values;render();});});
