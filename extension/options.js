const defaults=UwideSettings.defaults;
const $=id=>document.getElementById(id);
let host='',tabId=null,currentScope=null,values={...defaults},profiles=[],deleted=null,queue=Promise.resolve(),profileSyncEnabled=false,profileSyncWrite=false;
const profileSyncIndexKey='uwideProfilesIndex',profileSyncReadyKey='uwideProfilesInitialized',profileSyncPrefix='uwideProfile:';
const shortcutActions=['toggleFit','resetFraming','zoomIn','zoomOut','toggleBars','togglePicture','cycleAspect','toggleTheater'];
const defaultShortcutBindings={toggleFit:{code:'KeyF',alt:true,shift:true},resetFraming:{code:'Digit0',alt:true,shift:true}};
let keyboardShortcutConfig={enabled:false,bindings:structuredClone(defaultShortcutBindings)},capturingShortcut=null;
const status=message=>{$('status').textContent=message;};
function task(work){queue=queue.then(work).catch(error=>status(`Kaydedilemedi: ${error.message}`));return queue;}
function validShortcut(binding){return Boolean(binding&&typeof binding.code==='string'&&(/^Key[A-Z]$|^Digit[0-9]$|^Arrow(Up|Down|Left|Right)$|^F(?:[1-9]|1[0-2])$/).test(binding.code)&&(binding.ctrl===true||binding.alt===true||binding.meta===true));}
function normalizeShortcutConfig(input){
 if(!input)return {enabled:false,bindings:structuredClone(defaultShortcutBindings)};
 const bindings={},used=new Set();for(const action of shortcutActions){const value=input.bindings?.[action];if(!validShortcut(value))continue;const item={code:value.code,ctrl:value.ctrl===true,alt:value.alt===true,shift:value.shift===true,meta:value.meta===true},key=[item.code,item.ctrl,item.alt,item.shift,item.meta].join(':');if(used.has(key))continue;used.add(key);bindings[action]=item;}
 return {enabled:input.enabled===true,bindings};
}
function shortcutLabel(binding){if(!binding)return 'Atanmamış';const parts=[];if(binding.ctrl)parts.push('Ctrl');if(binding.alt)parts.push('Alt');if(binding.shift)parts.push('Shift');if(binding.meta)parts.push('Meta');const key=binding.code.startsWith('Key')?binding.code.slice(3):binding.code.startsWith('Digit')?binding.code.slice(5):binding.code.replace('Arrow','');parts.push(({Up:'↑',Down:'↓',Left:'←',Right:'→'})[key]||key);return parts.join(' + ');}
function drawKeyboardShortcuts(){
 $('keyboard-shortcuts-enabled').checked=keyboardShortcutConfig.enabled;
 for(const button of document.querySelectorAll('[data-shortcut-capture]')){const action=button.dataset.shortcutCapture;button.textContent=capturingShortcut===action?'Kombinasyonu girin…':shortcutLabel(keyboardShortcutConfig.bindings[action]);button.setAttribute('aria-label',`${button.closest('.shortcut-row').querySelector('span').textContent}: ${button.textContent}`);button.setAttribute('aria-pressed',String(capturingShortcut===action));}
}
async function saveKeyboardShortcuts(next,message){await chrome.storage.sync.set({keyboardShortcutConfig:next});keyboardShortcutConfig=next;capturingShortcut=null;drawKeyboardShortcuts();$('shortcut-status').textContent=message;}
const sectionLinks=[...document.querySelectorAll('nav a[href^="#"]')].filter(link=>typeof link.hash==='string'&&link.hash.startsWith('#'));
const sections=sectionLinks.map(link=>$(link.hash.slice(1))).filter(Boolean);
if(typeof window!=='undefined'&&'IntersectionObserver' in window&&sections.length){
 const observer=new IntersectionObserver(()=>{
  const current=sections.filter(section=>section.getBoundingClientRect().top<=innerHeight*.4).at(-1)||sections[0];
  for(const link of sectionLinks){const active=link.hash===`#${current.id}`;if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');link.classList.toggle('target-current',active);}
 },{rootMargin:'-10% 0px -75% 0px',threshold:0});
 sections.forEach(section=>observer.observe(section));
}
function drawSites(){
 if(!currentScope)return;
 const {mode,sites}=currentScope.sitePolicy||{mode:'all',sites:[]},list=$('site-list'),selected=list.value;
 $('site-mode').value=mode;list.replaceChildren();
 for(const site of sites){const option=document.createElement('option');option.value=site;option.textContent=site;list.append(option);}
 if(!sites.length){const option=document.createElement('option');option.value='';option.textContent='Liste boş';list.append(option);}
 if(sites.includes(selected))list.value=selected;else if(sites.length)list.value=sites[0];
 $('site-current').textContent=currentScope.host?`Açık site: ${currentScope.host}${currentScope.siteAllowed?' · etkin':' · listede değil'}`:'Hedef web sekmesi yok. Bir video sekmesinden açarsanız o siteyi ekleyebilirsiniz.';
 $('site-add').disabled=!currentScope.host||sites.includes(currentScope.host);
 $('site-remove').disabled=!sites.length;
}
function display(){
 for(const id of Object.keys(defaults)){const el=$(id);if(el)el.type==='checkbox'?el.checked=Boolean(values[id]):el.value=values[id];const out=$(id+'-out');if(out)out.value=['zoom','stretch'].includes(id)?`${Math.round(values[id]*100)}%`:`${values[id]}%`;}
 for(const button of document.querySelectorAll('[data-profile="fullFrame"]'))if(button.dataset.profile==='fullFrame')UwideProfiles.renderFullFrame(button,values);
 document.documentElement.dataset.theme=values.theme;
 $('manual-controls').disabled=values.mode!=='manual';
 $('manual-controls').hidden=values.mode!=='manual';
 $('customAspectField').hidden=values.cropAspect!=='custom';
 $('picture-controls').disabled=!values.autoPicture;
 $('picture-controls').hidden=!values.autoPicture;
 $('syncCustomProfiles').checked=profileSyncEnabled;
 $('profile-sync-help').textContent=profileSyncEnabled?'Açıksa profiller tarayıcı eşitlemesi açık olan profillerinizde görünür. Kapalıyken yalnızca bu cihazda saklanır. Eşitleme hatasında yerel profil değişiklikleri korunur.':'Açıksa profiller tarayıcınızın eşitleme alanına yazılır. En fazla 30 profil; tarayıcı eşitlemesi kapalıysa cihazlar arasında aktarılmaz.';
 if(currentScope)UwideClient.renderScope(document,currentScope);
 drawSites();
}
async function persist(changes){
 currentScope=await UwideClient.request(tabId,'uwf-settings-write',{changes});values=currentScope.values;display();status('Ayarlar kaydedildi.');
}
function drawProfiles(selected=''){
 $('saved-profiles').replaceChildren();
 for(const preset of profiles){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.name;$('saved-profiles').append(option);}
 if(!profiles.length){const option=document.createElement('option');option.textContent='Henüz kayıtlı profil yok';option.value='';$('saved-profiles').append(option);}
 if(profiles.some(p=>p.id===selected))$('saved-profiles').value=selected;
 for(const id of ['apply-profile','delete-profile','saved-profiles'])$(id).disabled=!profiles.length;
 $('undo-delete').hidden=!deleted;
}
function normalizeProfile(record){
 if(!record||typeof record.id!=='string'||!/^[-\w]{1,80}$/.test(record.id)||typeof record.name!=='string'||!record.settings||typeof record.settings!=='object'||Array.isArray(record.settings))return null;
 try{return UwideProfiles.make(record.name,record.settings,record.id);}catch{return null;}
}
function remoteProfiles(syncData){
 const ids=Array.isArray(syncData[profileSyncIndexKey])?syncData[profileSyncIndexKey]:[];
 if(ids.length>30||ids.some(id=>typeof id!=='string'||!/^[-\w]{1,80}$/.test(id))||new Set(ids).size!==ids.length)throw new Error('Eşitlenmiş profil listesi eksik veya geçersiz; yerel kayıtlar korunuyor.');
 const records=ids.map(id=>normalizeProfile(syncData[profileSyncPrefix+id]));
 if(records.some(record=>!record))throw new Error('Eşitlenmiş profil verileri henüz tam gelmedi; yerel kayıtlar korunuyor.');
 return records;
}
function mergeProfiles(remote,local){
 const byId=new Map();for(const record of [...remote,...local]){const clean=normalizeProfile(record);if(clean)byId.set(clean.id,clean);}
 const merged=[...byId.values()];if(merged.length>30)throw new Error('Eşitleme açılmadı: cihazlardaki toplam profil sayısı 30’u aşıyor. Önce profilleri birleştirip azaltın.');
 const used=new Set();for(const profile of merged){const base=profile.name;let name=base,suffix=2;while(used.has(name.toLocaleLowerCase('tr'))){const tail=` (${suffix++})`;name=base.slice(0,48-tail.length)+tail;}profile.name=name;used.add(name.toLocaleLowerCase('tr'));}
 return merged;
}
async function writeRemoteProfiles(next,enable=true){
 const syncData=await chrome.storage.sync.get(null),clean=next.map(normalizeProfile).filter(Boolean);
 if(clean.length!==next.length)throw new Error('Profil verilerinden biri geçersiz; eşitleme yapılmadı.');
 const entries={};for(const preset of clean){const key=profileSyncPrefix+preset.id,value={id:preset.id,name:preset.name,settings:preset.settings};
  if(new TextEncoder().encode(JSON.stringify(value)).length>6000)throw new Error('Bir profil tarayıcı eşitleme sınırını aşıyor; profil değişikliği uygulanmadı.');entries[key]=value;
 }
 entries[profileSyncIndexKey]=clean.map(p=>p.id);entries[profileSyncReadyKey]=true;if(enable)entries.syncCustomProfiles=true;
 profileSyncWrite=true;
 try{
  await chrome.storage.sync.set(entries);
  const keep=new Set(clean.map(p=>profileSyncPrefix+p.id));const stale=Object.keys(syncData).filter(key=>key.startsWith(profileSyncPrefix)&&!keep.has(key));
  if(stale.length)try{await chrome.storage.sync.remove(stale);}catch{/* The index remains authoritative; stale records are ignored and retried later. */}
 }finally{profileSyncWrite=false;}
}
async function saveProfiles(next){
 if(profileSyncEnabled)await writeRemoteProfiles(next);
 await chrome.storage.local.set({customProfiles:next});profiles=next;
}
async function loadSyncedProfiles(){
 const syncData=await chrome.storage.sync.get(null),syncReady=syncData[profileSyncReadyKey]===true,hasIndex=Array.isArray(syncData[profileSyncIndexKey]);
 if(syncReady&&hasIndex){profiles=remoteProfiles(syncData);await chrome.storage.local.set({customProfiles:profiles});return;}
 const local=await chrome.storage.local.get({customProfiles:[]}),localProfiles=Array.isArray(local.customProfiles)?local.customProfiles.map(normalizeProfile).filter(Boolean).slice(0,30):[];
 profiles=mergeProfiles(remoteProfiles(syncData),localProfiles);
 await chrome.storage.local.set({customProfiles:profiles});
 try{await writeRemoteProfiles(profiles);}catch(error){status(`Chrome eşitlemesi başlatılamadı; profiller bu cihazda saklandı. ${error.message}`);}
}
async function commitProfiles(next){
 if(profileSyncEnabled){await writeRemoteProfiles(next);}
 await chrome.storage.local.set({customProfiles:next});profiles=next;
}
async function load(){
 const [local,syncOptions,shortcutStorage]=await Promise.all([chrome.storage.local.get({optionsTabId:null,customProfiles:[]}),chrome.storage.sync.get({syncCustomProfiles:false}),chrome.storage.sync.get({keyboardShortcutConfig:null})]);
 tabId=local.optionsTabId;
 if(Number.isInteger(tabId)){try{const tab=await chrome.tabs.get(tabId);if(!/^https?:/.test(tab.url||''))tabId=null;}catch{tabId=null;}}
 currentScope=await UwideClient.request(tabId);host=currentScope.host;values=currentScope.values;
 profileSyncEnabled=syncOptions.syncCustomProfiles===true;
 keyboardShortcutConfig=normalizeShortcutConfig(shortcutStorage.keyboardShortcutConfig);
 profiles=Array.isArray(local.customProfiles)?local.customProfiles.map(normalizeProfile).filter(Boolean).slice(0,30):[];
 if(profileSyncEnabled)try{await loadSyncedProfiles();}catch(error){status(`Chrome eşitlemesi yüklenemedi; bu cihazdaki profiller korundu. ${error.message}`);}
 display();drawProfiles();drawKeyboardShortcuts();
}
for(const id of Object.keys(defaults)){const el=$(id);if(el)el.addEventListener('change',()=>{const value=el.type==='checkbox'?el.checked:['range','number'].includes(el.type)?Number(el.value):el.value;const changes={ [id]:value,profile:'custom' };task(()=>persist(changes));});if(el?.type==='range')el.addEventListener('input',()=>{const out=$(id+'-out');if(out)out.value=['zoom','stretch'].includes(id)?`${Math.round(el.value*100)}%`:`${el.value}%`;});}
$('syncCustomProfiles').addEventListener('change',event=>{
 const enabled=event.target.checked;
 task(async()=>{
  try{
   if(enabled){const syncData=await chrome.storage.sync.get(null),remote=remoteProfiles(syncData),merged=mergeProfiles(remote,profiles);await writeRemoteProfiles(merged,true);await chrome.storage.local.set({customProfiles:merged});profiles=merged;profileSyncEnabled=true;drawProfiles();status('Özel profiller Tarayıcı eşitlemesiyle eşitleniyor.');}
   else{const syncData=await chrome.storage.sync.get(null),remoteKeys=Object.keys(syncData).filter(key=>key.startsWith(profileSyncPrefix));profileSyncWrite=true;try{await chrome.storage.sync.set({syncCustomProfiles:false,[profileSyncIndexKey]:[],[profileSyncReadyKey]:true});if(remoteKeys.length)await chrome.storage.sync.remove(remoteKeys);}finally{profileSyncWrite=false;}profileSyncEnabled=false;status('Profil eşitlemesi kapatıldı ve eşitlenmiş kopyalar kaldırıldı. Bu cihazdaki profiller korundu.');}
   display();
  }catch(error){event.target.checked=profileSyncEnabled;display();status(`Eşitleme ayarı değişmedi; profiller korundu. ${error.message}`);}
 });
});
$('keyboard-shortcuts-enabled').addEventListener('change',event=>task(async()=>{
 const next={...keyboardShortcutConfig,enabled:event.target.checked};
 try{await saveKeyboardShortcuts(next,next.enabled?'Klavye kısayolları açıldı. Atanmamış eylemler çalışmaz.':'Klavye kısayolları kapatıldı.');}
 catch(error){event.target.checked=keyboardShortcutConfig.enabled;$('shortcut-status').textContent=`Kısayol tercihi kaydedilemedi: ${error.message}`;}
}));
for(const button of document.querySelectorAll('[data-shortcut-capture]')){
 const action=button.dataset.shortcutCapture;
 button.addEventListener('click',()=>{capturingShortcut=capturingShortcut===action?null:action;drawKeyboardShortcuts();$('shortcut-status').textContent=capturingShortcut?'Şimdi Ctrl, Alt veya Meta ile birlikte kullanılacak bir tuş girin. Esc vazgeçer.':'';});
 button.addEventListener('blur',()=>{
  if(capturingShortcut===action){capturingShortcut=null;drawKeyboardShortcuts();$('shortcut-status').textContent='Kısayol ataması iptal edildi.';}
 });
 button.addEventListener('keydown',event=>{
  if(capturingShortcut!==action||event.isComposing)return;
  if(event.key==='Tab')return;
  event.preventDefault();event.stopPropagation();
  if(event.code==='Escape'){capturingShortcut=null;drawKeyboardShortcuts();$('shortcut-status').textContent='Kısayol ataması iptal edildi.';return;}
  const binding={code:event.code,ctrl:event.ctrlKey,alt:event.altKey,shift:event.shiftKey,meta:event.metaKey};
  if(!validShortcut(binding)){$('shortcut-status').textContent='Bir harf, rakam, yön veya F tuşuyla Ctrl, Alt ya da Meta kullanın.';return;}
  const signature=[binding.code,binding.ctrl,binding.alt,binding.shift,binding.meta].join(':');
  if(shortcutActions.some(name=>name!==action&&keyboardShortcutConfig.bindings[name]&&[keyboardShortcutConfig.bindings[name].code,keyboardShortcutConfig.bindings[name].ctrl===true,keyboardShortcutConfig.bindings[name].alt===true,keyboardShortcutConfig.bindings[name].shift===true,keyboardShortcutConfig.bindings[name].meta===true].join(':')===signature)){$('shortcut-status').textContent='Bu kombinasyon başka bir eyleme atanmış.';return;}
  const reserved=['F5','F11','F12'].includes(binding.code)||(binding.alt&&binding.code==='F4')||(binding.ctrl&&['KeyW','KeyT','KeyN','KeyR','KeyL','KeyP','KeyJ','KeyH','KeyD','KeyS','KeyF','KeyO','KeyU','KeyG','KeyK'].includes(binding.code))||(binding.ctrl&&binding.shift&&['KeyT','KeyN','KeyW','KeyJ','KeyI'].includes(binding.code))||(binding.alt&&['ArrowLeft','ArrowRight'].includes(binding.code));
  if(reserved){$('shortcut-status').textContent='Bu kombinasyon tarayıcı tarafından kullanılıyor; başka bir tuş seçin.';return;}
  task(async()=>{const next={...keyboardShortcutConfig,bindings:{...keyboardShortcutConfig.bindings,[action]:binding}};try{await saveKeyboardShortcuts(next,`${shortcutLabel(binding)} atandı.`);}catch(error){capturingShortcut=null;drawKeyboardShortcuts();$('shortcut-status').textContent=`Kısayol kaydedilemedi: ${error.message}`;}});
 });
}
for(const button of document.querySelectorAll('[data-shortcut-clear]'))button.addEventListener('click',()=>task(async()=>{
 const action=button.dataset.shortcutClear,bindings={...keyboardShortcutConfig.bindings};delete bindings[action];
 try{await saveKeyboardShortcuts({...keyboardShortcutConfig,bindings},'Kısayol temizlendi.');}catch(error){$('shortcut-status').textContent=`Kısayol temizlenemedi: ${error.message}`;}
}));
$('scope').addEventListener('change',event=>{const scope=event.target.value;task(async()=>{
 currentScope=await UwideClient.request(tabId,'uwf-settings-scope',{scope});values=currentScope.values;display();status('Kayıt kapsamı değiştirildi.');
});});
$('scope-clear').addEventListener('click',()=>task(async()=>{
 currentScope=await UwideClient.request(tabId,'uwf-settings-clear');values=currentScope.values;display();status('Bu kapsamın özel ayarları kaldırıldı.');
}));
for(const category of ['framing','bars','picture'])$(`${category}-scope`).addEventListener('change',event=>{const scope=event.target.value;task(async()=>{
 currentScope=await UwideClient.request(tabId,'uwf-settings-scope',{scope,category});values=currentScope.values;display();status(scope==='inherit'?'Bölüm ortak kayıt kapsamını kullanıyor.':`${{framing:'Kadraj',bars:'Siyah bant algılama',picture:'Görüntü'}[category]} ayarlarının kayıt kapsamı değiştirildi.`);
});});
for(const category of ['framing','bars','picture'])$(`${category}-scope-clear`).addEventListener('click',()=>task(async()=>{
 currentScope=await UwideClient.request(tabId,'uwf-settings-clear',{category});values=currentScope.values;display();status(`${{framing:'Kadraj',bars:'Siyah bant algılama',picture:'Görüntü'}[category]} için ayrı kapsam kaldırıldı.`);
}));
async function changeSites(change,message){currentScope=await UwideClient.request(tabId,'uwf-sites-update',{change});values=currentScope.values;display();$('site-status').textContent=message;}
$('site-mode').addEventListener('change',event=>task(()=>changeSites({mode:event.target.value},'Site kuralı güncellendi.')));
$('site-add').addEventListener('click',()=>task(()=>changeSites({action:'add'},'Açık site listeye eklendi.')));
$('site-remove').addEventListener('click',()=>{const site=$('site-list').value;if(site)task(()=>changeSites({action:'remove',site},`${site} listeden kaldırıldı.`));});
document.querySelectorAll('[data-profile]').forEach(button=>button.addEventListener('click',()=>task(async()=>{
  const id=button.dataset.profile;
  const changes=id==='fullFrame'?UwideProfiles.fullFrameChanges(values):{shadowLift:0,hdr:0,sharpen:0,...UwideProfiles.builtins[id],profile:id};
  await persist(changes);
  status(id==='fullFrame'?button.textContent:'Renk profili uygulandı.');
})));
$('profile-form').addEventListener('submit',event=>{event.preventDefault();task(async()=>{
 if(profiles.length>=30){status('En fazla 30 profil saklanabilir. Önce bir profili silin.');return;}
 const preset=UwideProfiles.make($('profile-name').value,values);
 if(profiles.some(p=>p.name.toLocaleLowerCase('tr')===preset.name.toLocaleLowerCase('tr'))){status('Bu ad zaten kullanılıyor. Farklı bir ad girin.');$('profile-name').focus();return;}
  const next=[...profiles,preset];await commitProfiles(next);drawProfiles(preset.id);$('profile-name').value='';status(profileSyncEnabled?'Profil Tarayıcı eşitlemesiyle eşitlendi.':'Profil bu cihazda kaydedildi.');
});});
$('apply-profile').addEventListener('click',()=>{const id=$('saved-profiles').value;task(async()=>{const preset=profiles.find(p=>p.id===id);if(!preset)return;await persist({...UwideProfiles.snapshot(preset.settings),profile:preset.id});status('Profil uygulandı. Renk etkinleştirme tercihiniz korundu.');});});
$('delete-profile').addEventListener('click',()=>{const id=$('saved-profiles').value;task(async()=>{const preset=profiles.find(p=>p.id===id);if(!preset)return;const next=profiles.filter(p=>p.id!==id);await commitProfiles(next);deleted=preset;drawProfiles();status(profileSyncEnabled?'Profil eşitlendi ve silindi. Silmeyi geri alabilirsiniz.':'Profil silindi. Silmeyi geri alabilirsiniz.');});});
$('undo-delete').addEventListener('click',()=>task(async()=>{if(!deleted)return;if(profiles.length>=30){status('Geri almak için bir profil alanı boşaltın.');return;}const next=[...profiles,deleted];await commitProfiles(next);const id=deleted.id;deleted=null;drawProfiles(id);status(profileSyncEnabled?'Profil geri yüklendi ve eşitlendi.':'Profil geri yüklendi.');}));
$('reset').addEventListener('click',()=>task(()=>persist({...defaults})));
$('export-profiles').addEventListener('click',()=>task(async()=>{
 if(!profiles.length){$('transfer-status').textContent='Dışa aktarmak için önce bir profil kaydedin.';return;}
 const blob=new Blob([UwideProfiles.exportBundle(profiles)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='uwide-free-profiles.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 $('transfer-status').textContent=`${profiles.length} profil için indirme başlatıldı.`;
}));
$('import-file').addEventListener('change',()=>{$('import-file').setCustomValidity('');$('import-file').removeAttribute('aria-invalid');$('transfer-status').textContent='';});
$('transfer-form').addEventListener('submit',event=>{
 event.preventDefault();const file=$('import-file').files[0];
 task(async()=>{
  const input=$('import-file');
  try{
   if(!file)throw new Error('Bir JSON profil dosyası seçin.');
   if(file.size>UwideProfiles.maxBytes)throw new Error('Dosya en fazla 128 KB olmalı.');
   const result=UwideProfiles.importBundle(await file.text(),profiles);
   await commitProfiles(result.profiles);drawProfiles(result.added[0].id);input.value='';input.setCustomValidity('');input.removeAttribute('aria-invalid');
   $('transfer-status').textContent=`${result.added.length} profil eklendi. Video ayarları değiştirilmedi.`;
  }catch(error){input.setCustomValidity(error.message);input.setAttribute('aria-invalid','true');$('transfer-status').textContent=error.message;input.reportValidity();input.focus();}
 });
});
chrome.runtime.onMessage.addListener(message=>{if(message?.type==='uwf-ui-refresh'||(message?.type==='uwf-target-media-changed'&&message.tabId===tabId))task(async()=>{currentScope=await UwideClient.request(tabId);values=currentScope.values;display();});});
chrome.storage.onChanged.addListener((changes,areaName)=>{
 if(areaName==='local'&&changes.optionsTabId){
  const nextTab=changes.optionsTabId.newValue??null;
  task(async()=>{
   const nextScope=await UwideClient.request(nextTab);
   tabId=nextTab;currentScope=nextScope;host=nextScope.host;values=nextScope.values;display();
  });
 }
 if(areaName!=='sync'||profileSyncWrite)return;
 const changedPreference=Object.hasOwn(changes,'syncCustomProfiles'),changedProfiles=Object.keys(changes).some(key=>key===profileSyncIndexKey||key===profileSyncReadyKey||key.startsWith(profileSyncPrefix));
 const changedShortcuts=Object.hasOwn(changes,'keyboardShortcutConfig');if(changedShortcuts){chrome.storage.sync.get({keyboardShortcutConfig:null}).then(result=>{keyboardShortcutConfig=normalizeShortcutConfig(result.keyboardShortcutConfig);drawKeyboardShortcuts();});}
 if(!changedPreference&&!changedProfiles)return;
 task(async()=>{
  const syncOptions=await chrome.storage.sync.get({syncCustomProfiles:false}),wasEnabled=profileSyncEnabled;profileSyncEnabled=syncOptions.syncCustomProfiles===true;
  if(profileSyncEnabled&&changedProfiles){await loadSyncedProfiles();drawProfiles();status('Tarayıcı eşitlemesiyle gelen profiller güncellendi.');}
  else if(wasEnabled&&!profileSyncEnabled){status('Bu tarayıcıda profil eşitlemesi kapatıldı. Yerel profilleriniz korundu.');}
  display();
 });
});
task(load);
