importScripts('settings-store.js');
const store=UwideSettings.createStore(chrome.storage);
let operation=Promise.resolve();
function serial(work){const next=operation.then(work);operation=next.catch(()=>{});return next;}
function siteFromUrl(url){try{const parsed=new URL(url);return /^https?:$/.test(parsed.protocol)?canonicalSite(parsed.hostname):'';}catch{return '';}}
async function contextFor(message,sender){
  const extensionPage=sender.url?.startsWith(chrome.runtime.getURL(''));
  if(!extensionPage&&sender.tab?.id!==undefined)return {tabId:sender.tab.id,host:siteFromUrl(sender.tab.url||sender.url),videoToken:typeof message.videoToken==='string'?message.videoToken.slice(0,160):null};
  if(Number.isInteger(message.tabId)){
    try{const tab=await chrome.tabs.get(message.tabId);const host=siteFromUrl(tab.url);if(host){let videoToken=null;try{const media=await chrome.tabs.sendMessage(tab.id,{type:'uwf-video-context'});videoToken=media?.videoToken||null;}catch{}return {tabId:tab.id,host,videoToken};}}catch{}
    throw new Error('Hedef sekme kapalı veya erişilemiyor. Ayarları video sekmesinden yeniden açın.');
  }
  return {tabId:null,host:''};
}
async function notifySettings(){
  chrome.runtime.sendMessage({type:'uwf-ui-refresh'}).catch(()=>{});
  const tabs=await chrome.tabs.query({});
  await Promise.all(tabs.filter(tab=>Number.isInteger(tab.id)).map(tab=>chrome.tabs.sendMessage(tab.id,{type:'uwf-settings-changed'}).catch(()=>{})));
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type==='uwf-open-options'&&Number.isInteger(sender.tab?.id)){
    chrome.storage.local.set({optionsTabId:sender.tab.id}).then(()=>chrome.runtime.openOptionsPage()).then(
      ()=>sendResponse({ok:true}),error=>sendResponse({ok:false,error:error.message})
    );
    return true;
  }
  if(message?.type==='uwf-media-updated'&&sender.tab?.id!==undefined){chrome.runtime.sendMessage({type:'uwf-target-media-changed',tabId:sender.tab.id}).catch(()=>{});return;}
  if(message?.type==='uwf-site-host'){sendResponse({host:siteFromUrl(sender.tab?.url||sender.url)});return;}
  if(!['uwf-settings-read','uwf-settings-write','uwf-settings-scope','uwf-settings-clear','uwf-sites-update'].includes(message?.type))return;
  serial(async()=>{
    const ctx=await contextFor(message,sender);
    let result;
    if(message.type==='uwf-settings-read')result=await store.read(ctx);
    if(message.type==='uwf-settings-write')result=await store.write(ctx,message.changes);
    if(message.type==='uwf-settings-scope')result=await store.select(ctx,message.scope,message.category||null);
    if(message.type==='uwf-settings-clear')result=await store.clear(ctx,message.category||null);
    if(message.type==='uwf-sites-update')result=await store.updateSites(ctx,message.change);
    if(message.type!=='uwf-settings-read')notifySettings().catch(()=>{});
    return result;
  }).then(result=>sendResponse({ok:true,...result}),error=>sendResponse({ok:false,error:error.message}));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{serial(()=>store.removeTab(tabId)).catch(()=>{});});
chrome.tabs.onReplaced.addListener((added,removed)=>{serial(()=>store.replaceTab(added,removed)).catch(()=>{});});
function canonicalSite(host){
  host=host.toLowerCase().replace(/^www\./,'');const parts=host.split('.');
  if(parts.length<3||/^\d+$/.test(parts.at(-1)))return host;
  const compound=new Set(['co.uk','org.uk','ac.uk','com.au','net.au','org.au','co.nz','co.jp','com.br','com.tr','com.mx','co.in','github.io','pages.dev','vercel.app','netlify.app','blogspot.com','appspot.com','workers.dev','azurewebsites.net']);
  const suffix=parts.slice(-2).join('.');return parts.slice(-(compound.has(suffix)?3:2)).join('.');
}
