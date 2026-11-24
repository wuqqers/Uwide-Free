(() => {
  let contentVersion;
  try{contentVersion=globalThis.chrome?.runtime?.getManifest?.().version;}catch{return;}
  if(!contentVersion)return;
  if(window.__uwideFreeInstalled===contentVersion)return;
  if(window.__uwideFreeInstalled){window.__uwideFreeUpgradeRequired=true;return;}
  window.__uwideFreeInstalled=contentVersion;
  const defaults = { enabled:true, mode:'automatic',autoPicture:false, zoom:1, wheelScale:1,shortcutScale:1, panX:0, panY:0, ratio:'auto',cropAspect:'source',customAspect:2.39, stretch:1, edgeStretch:0, autoBars:false, frameTrim:0, brightness:100, contrast:100, shadowLift:0, saturation:100, vibrance:0, sharpen:0, hdr:0, ambience:false, glow:24, blur:32, smoothing:75, audioPulse:false, profile:'custom', theme:'dark', showPlayerButton:true, playerWheelZoom:false };
  // Wait for persisted settings before changing a video, avoiding a brief
  // default-mode render when a different site or global setting is saved.
  let settings={...defaults,enabled:false},globalSettings={...defaults},siteHost=location.hostname, applying=false, layoutFrame=0, resizeObservedVideo=null,lastPlayerWheelAt=0,comparisonVideo=null;
  const managed=new Map();
  const pictureFilters=new WeakMap();
  const monitoredAnimations=new WeakSet();
  const roots=new Set([document]), rootObservers=new Map();
  const playerPanels=new Set();
  let siteAllowed=true;
  const reportedRuntimeErrors=new Set();
  const playbackSnapshots=new WeakMap();
  function safeRun(task){try{task();}catch(error){const message=String(error?.message||error);if(!reportedRuntimeErrors.has(message)){reportedRuntimeErrors.add(message);console.warn('[Uwide Free] Player update skipped:',error);}}}
  const layoutObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>safeRun(scheduleLayout)):null;
  let lastRootScan=0;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
  const panelPositionsKey='uwfPanelPositions';let panelPositionsCache=null,panelPositionsLoad=null,panelPositionWriteQueue=Promise.resolve(),panelPositionsReady=false,panelPositionsLoading=false;
  function sanitizePanelPositions(input){const out={};if(!input||typeof input!=='object'||Array.isArray(input))return out;for(const [host,point] of Object.entries(input)){if(!/^(?:[a-z0-9.-]{1,253}|\[[0-9a-f:]{2,45}\])$/.test(host)||!point||typeof point!=='object')continue;if(!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;out[host]={x:clamp(point.x,0,1),y:clamp(point.y,0,1),height:clamp(point.height||240,48,2000)};}return Object.fromEntries(Object.entries(out).slice(-100));}
  function readPanelPositions(){if(panelPositionsCache)return Promise.resolve(panelPositionsCache);if(!panelPositionsLoad)panelPositionsLoad=chrome.storage.local.get({[panelPositionsKey]:{}}).then(data=>panelPositionsCache=sanitizePanelPositions(data[panelPositionsKey])).catch(error=>{panelPositionsCache={};throw error;});return panelPositionsLoad;}
  function writePanelPosition(host,point){panelPositionWriteQueue=panelPositionWriteQueue.catch(()=>{}).then(async()=>{const data=await chrome.storage.local.get({[panelPositionsKey]:{}}),positions=sanitizePanelPositions(data[panelPositionsKey]);if(point)positions[host]=point;else delete positions[host];const keys=Object.keys(positions);while(keys.length>100)delete positions[keys.shift()];await chrome.storage.local.set({[panelPositionsKey]:positions});panelPositionsCache=positions;});return panelPositionWriteQueue;}
  const originalProps=['transform','transform-origin','filter','object-fit','clip-path','will-change','box-shadow','object-position','transition'];
  function visible(v){const r=v.getBoundingClientRect(),s=getComputedStyle(v);return r.width>80&&r.height>60&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0;}
  function visibleControl(v){const r=v.getBoundingClientRect(),s=getComputedStyle(v);return r.width>12&&r.height>12&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0;}
  function scanOpenRoots(){
    const now=performance.now();if(now-lastRootScan<3000)return;lastRootScan=now;
    for(const root of [...roots])for(const element of root.querySelectorAll('*'))if(element.shadowRoot&&!roots.has(element.shadowRoot)){
      const shadow=element.shadowRoot;roots.add(shadow);const observer=new MutationObserver(()=>safeRun(()=>{scanOpenRoots();requestAnimationFrame(()=>safeRun(apply))}));observer.observe(shadow,{childList:true,subtree:true});rootObservers.set(shadow,observer);
    }
  }
  function candidates(){scanOpenRoots();const found=new Set();for(const root of roots)for(const v of root.querySelectorAll('video'))if(v.isConnected&&v.videoWidth>0&&visible(v))found.add(v);return [...found];}
  function rank(v){const playing=!v.paused&&!v.ended;const area=Math.min(v.offsetWidth*v.offsetHeight,1e9);return area*(playing?1.25:1)+(v.currentTime>0?1e5:0);}
  let selectedVideo=null,selectionMissingSince=null,selectionPage='';
  let seekHold=false,seekReturnUntil=0,seekVideo=null,seekSource='',seekPage='',seekObject=null;
  function holdsSeekFrame(){return !!(seekVideo?.isConnected&&seekVideo===selectedVideo&&seekPage===location.href&&seekSource===seekVideo.currentSrc&&seekObject===seekVideo.srcObject&&(seekHold||performance.now()<seekReturnUntil));}
  let focusHold=false,focusReturnUntil=0,focusRepairs=0,focusMedia='',focusObject=null;
  function holdsFocusFrame(){return holdsSeekFrame()||!!(selectedVideo?.isConnected&&selectionPage===location.href&&selectedVideo.currentSrc===focusMedia&&selectedVideo.srcObject===focusObject&&(focusHold||performance.now()<focusReturnUntil));}
  function lockFocusFrame(){focusHold=true;focusMedia=selectedVideo?.currentSrc||'';focusObject=selectedVideo?.srcObject||null;focusRepairs=0;focusReturnUntil=0;if(fullscreenSettleTimer){clearTimeout(fullscreenSettleTimer);fullscreenSettleTimer=0;}const state=selectedVideo&&managed.get(selectedVideo);if(state)set(selectedVideo,'transition','none');}
  function resumeFocusFrame(){if(!focusHold){focusMedia=selectedVideo?.currentSrc||'';focusObject=selectedVideo?.srcObject||null;}focusHold=false;focusReturnUntil=performance.now()+3000;focusRepairs=0;scheduleLayout();}
  function activeVideo(){
    // Browsers and players can temporarily hide the same video during app/mode
    // switches. Keep its identity and locked crop through that short gap.
    if(selectedVideo?.isConnected&&selectionPage===location.href&&(document.hidden||holdsFocusFrame()))return selectedVideo;
    const available=candidates().sort((a,b)=>rank(b)-rank(a)),best=available[0]||null;
    if(!best){
      if(selectedVideo?.isConnected&&selectionPage===location.href){
        selectionMissingSince??=performance.now();
        if(performance.now()-selectionMissingSince<1200)return selectedVideo;
      }
      selectedVideo=null;selectionMissingSince=null;return null;
    }
    selectionMissingSince=null;
    if(selectedVideo&&available.includes(selectedVideo)&&rank(best)<rank(selectedVideo)*1.4)return selectedVideo;
    selectedVideo=best;selectionPage=location.href;return best;
  }
  function isYouTubeShorts(){return /(^|\.)youtube\.com$/i.test(location.hostname)&&/^\/shorts(?:\/|$)/i.test(location.pathname);}
  function remember(v){if(managed.has(v))return managed.get(v);const props={};for(const p of originalProps)props[p]={value:v.style.getPropertyValue(p),priority:v.style.getPropertyPriority(p)};const computed=getComputedStyle(v),origin=computed.transformOrigin.split(/\s+/),width=Math.max(1,v.offsetWidth),height=Math.max(1,v.offsetHeight);const originPercent=origin.slice(0,2).map((part,index)=>{const value=parseFloat(part),size=index?height:width;return Number.isFinite(value)?`${value/size*100}%`:part;}).join(' ');const m={props,expected:{},baseTransform:computed.transform,baseFilter:computed.filter,baseObjectPosition:computed.objectPosition,baseTransformOrigin:originPercent,clipFailed:false,mediaObject:v.srcObject,mediaSignature:location.href+'\n'+v.currentSrc};managed.set(v,m);return m;}
  function reconcileMedia(video){
    const state=managed.get(video);if(!state)return;
    // Empty metadata during buffering is not evidence of a new source.
    if(!video.videoWidth)return;
    const signature=location.href+'\n'+video.currentSrc;
    if(state.mediaSignature===signature&&state.mediaObject===video.srcObject)return;
    state.mediaSignature=signature;state.mediaObject=video.srcObject;state.rescanning=false;
    state.clipFailed=false;state.barLocked=false;state.detectedBars=null;state.barCandidate=null;state.barCount=0;state.lastBarSample=0;
    videoIdentities.delete(video);
  }
  function sameInline(v,p,entry){return v.style.getPropertyValue(p)===entry.value&&v.style.getPropertyPriority(p)===entry.priority;}
  const frameTiming={duration:480,easing:'ease-in-out'};
  const frameTransition=`transform ${frameTiming.duration}ms ${frameTiming.easing}`;
  const returningFrames=new WeakMap();
  function smoothFrameAllowed(){
    return !document.hidden&&!holdsFocusFrame()&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function restore(v,animate=false){
    const m=managed.get(v);if(!m)return;
    const from=animate&&smoothFrameAllowed()&&m.expected.transform&&sameInline(v,'transform',m.expected.transform)&&!m.styleConflict&&!m.animationConflict?getComputedStyle(v).transform:null;
    // Restore only values still owned by us; preserve later author changes.
    for(const [p,expected] of Object.entries(m.expected)){
      if(!sameInline(v,p,expected))continue;
      const original=m.props[p];if(original.value)v.style.setProperty(p,original.value,original.priority);else v.style.removeProperty(p);
    }
    managed.delete(v);updateCompatibilityStatus(v,null);
    if(from){
      const to=getComputedStyle(v).transform;
      if(from!==to){
        const motion=v.animate([{transform:from},{transform:to}],frameTiming);
        returningFrames.set(v,motion);
        const cleanup=()=>{if(returningFrames.get(v)===motion)returningFrames.delete(v);};
        motion.finished.then(cleanup,cleanup);
      }
    }
  }
  function set(v,p,value){
    if(v.style.getPropertyValue(p)!==value||v.style.getPropertyPriority(p)!=='important')v.style.setProperty(p,value,'important');
    const m=managed.get(v);if(m)m.expected[p]={value:v.style.getPropertyValue(p),priority:v.style.getPropertyPriority(p)};
  }
  function updateCompatibilityStatus(video,state){
    const conflict=state?.styleConflict||state?.animationConflict;
    const message=settingsConnectionIssue||(!siteAllowed?'Bu site izinli siteler listesinde değil. Eklemek için eklenti seçeneklerindeki Siteler bölümünü açın.':conflict?`Video görünümünde stil çakışması algılandı (${conflict}). Karşılıklı yazmayı ve olası görüntü bozulmasını önlemek için Uwide bu videoda bekliyor.`:'');
    for(const host of playerPanels){if(host.__uwfVideo!==video)continue;const node=host.shadowRoot?.querySelector('.compat-status');if(node){if(node.textContent!==message)node.textContent=message;node.hidden=!message;}}
  }
  function isOwnedTransformTransition(video,animation){
    const state=managed.get(video);
    return animation.transitionProperty==='transform'&&state?.expected.transform&&state.expected.transition&&video.style.transitionProperty==='transform'&&sameInline(video,'transform',state.expected.transform)&&sameInline(video,'transition',state.expected.transition);
  }
  function rebasePresentationStyles(video,state){
    const changed=Object.entries(state.expected).filter(([property,expected])=>!sameInline(video,property,expected)).map(([property])=>property);
    if(!changed.length)return;
    // Do not restore the other owned properties: their baselines and crop remain
    // valid. Cancel only our transition before reading a changed author transform.
    for(const animation of video.getAnimations?.()||[]){
      if(state.expected.transition&&animation.transitionProperty==='transform'&&video.style.transitionProperty==='transform'&&sameInline(video,'transition',state.expected.transition))animation.cancel();
    }
    for(const property of changed){state.props[property]={value:video.style.getPropertyValue(property),priority:video.style.getPropertyPriority(property)};delete state.expected[property];}
    const computed=getComputedStyle(video);
    if(changed.includes('transform'))state.baseTransform=computed.transform;
    if(changed.includes('filter'))state.baseFilter=computed.filter;
    if(changed.includes('object-position'))state.baseObjectPosition=computed.objectPosition;
    if(changed.includes('transform-origin'))state.baseTransformOrigin=computed.transformOrigin.split(/\s+/).slice(0,2).map((part,index)=>`${parseFloat(part)/Math.max(1,index?video.offsetHeight:video.offsetWidth)*100}%`).join(' ');
    state.styleConflict=null;state.animationConflict=null;
  }
  function animatedStyleProperties(video){
    const propertyNames={transform:'transform','transform-origin':'transformOrigin',filter:'filter','clip-path':'clipPath','object-fit':'objectFit','object-position':'objectPosition',opacity:'opacity'};
    const active=new Set();
    try{for(const animation of video.getAnimations?.()||[]){
      const effect=animation.effect;if(!effect||animation.playState==='idle'||isOwnedTransformTransition(video,animation))continue;
      if(animation.playState==='finished'&&!['forwards','both'].includes(effect.getTiming?.().fill))continue;
      if(!monitoredAnimations.has(animation)&&typeof animation.addEventListener==='function'){
        monitoredAnimations.add(animation);
        const retry=()=>requestAnimationFrame(()=>safeRun(apply));
        animation.addEventListener('finish',retry,{once:true});animation.addEventListener('cancel',retry,{once:true});
      }
      const frames=effect.getKeyframes?.()||[];
      for(const [cssName,frameName] of Object.entries(propertyNames))if(frames.some(frame=>Object.hasOwn(frame,cssName)||Object.hasOwn(frame,frameName)))active.add(cssName);
    }}catch{}
    return [...active];
  }
  function hasStyleConflict(video,state){
    const hadAnimationConflict=Boolean(state.animationConflict);
    if(!state.styleConflict)for(const [property,expected] of Object.entries(state.expected)){if(!sameInline(video,property,expected)){state.styleConflict=property;break;}}
    const animated=animatedStyleProperties(video);state.animationConflict=animated.length?`CSS animasyonu: ${animated.join(', ')}`:null;
    if(state.styleConflict||state.animationConflict){updateCompatibilityStatus(video,state);return true;}
    if(hadAnimationConflict)updateCompatibilityStatus(video,state);
    return false;
  }
  function renderGlow(v){set(v,'box-shadow','none');}
  function createEdgeStretchMap(video,strength,fit,targetWidth=video.offsetWidth,scaleX=1){
    const width=Math.max(1,Math.round(video.offsetWidth)),height=Math.max(1,Math.round(video.offsetHeight)),videoWidth=video.videoWidth,videoHeight=video.videoHeight;
    const signature=[width,height,videoWidth,videoHeight,fit,strength,Math.round(targetWidth),Math.round(scaleX*1000)].join(':');
    if(strength<=0||videoWidth<1||videoHeight<1)return {signature,width,height,scale:0,data:null};
    const containScale=Math.min(width/videoWidth,height/videoHeight);
    const sourceWidth=fit==='contain'?videoWidth*containScale:width;
    const sourceLeft=(width-sourceWidth)/2;
    const outerGap=Math.max(0,(targetWidth/Math.max(.01,scaleX)-width)/2);
    const available=sourceLeft+outerGap;
    if(sourceWidth<1)return {signature,width,height,scale:0,data:null};
    // A monotonic tanh map keeps the middle close to 1:1 and spends more
    // distortion near the edges. The overall width is capped at 1.6×.
    const extension=Math.min(available,sourceWidth*.3)*strength/100;

    const destinationLeft=sourceLeft-extension,destinationWidth=sourceWidth+2*extension,stretchRatio=destinationWidth/sourceWidth;
    let low=0,high=20,k=0;
    if(stretchRatio>1.00001){for(let iteration=0;iteration<24;iteration++){k=(low+high)/2;const ratio=k/(2*Math.tanh(k/2));if(ratio<stretchRatio)low=k;else high=k;}}
    const mapWidth=Math.min(4096,Math.max(64,Math.ceil(destinationWidth))),canvas=document.createElement('canvas');canvas.width=mapWidth;canvas.height=1;
    const context=canvas.getContext('2d');if(!context)return {signature,width,height,scale:0,data:null};
    const image=context.createImageData(mapWidth,1),redistribution=sourceWidth*.09*strength/100;
    // Keep the endpoints and centre anchored even when cover already fills
    // the player. The cubic term redistributes width towards the edges.
    const scale=2*(extension+redistribution);
    for(let index=0;index<mapWidth;index++){
      const x=destinationLeft+(index+.5)/mapWidth*destinationWidth,t=(x-destinationLeft)/destinationWidth-.5;
      const sourceFraction=k>0?.5+.5*Math.tanh(k*t)/Math.tanh(k/2):t+.5;
      const u=2*t;
      const displacement=sourceLeft+sourceFraction*sourceWidth-x+redistribution*u*(1-u*u),offset=index*4;
      image.data[offset]=Math.round(clamp(127.5+displacement/scale*255,0,255));image.data[offset+1]=128;image.data[offset+2]=0;image.data[offset+3]=255;
    }
    try{context.putImageData(image,0,0);return {signature,width,height,scale,data:canvas.toDataURL('image/png'),destinationLeft,destinationWidth};}
    catch{return {signature,width,height,scale:0,data:null};}
  }
  function staticPictureFilter(video,shadowValue,sharpValue,vibranceValue=0,highlightValue=0,edgeStrength=0,edgeFit='contain',targetWidth=video.offsetWidth,scaleX=1){
    const lift=clamp(shadowValue,0,30),sharp=clamp(sharpValue,0,100),vibrance=clamp(vibranceValue,0,100),highlights=clamp(highlightValue,0,100),edge=clamp(edgeStrength,0,100);if(lift===0&&sharp===0&&vibrance===0&&highlights===0&&edge===0)return '';
    const root=video.getRootNode();let entry=pictureFilters.get(root);
    if(!entry){
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.cssText='position:fixed;left:-10000px;top:-10000px;width:0;height:0;overflow:hidden;pointer-events:none';
      const filter=document.createElementNS('http://www.w3.org/2000/svg','filter'),toYcc=document.createElementNS('http://www.w3.org/2000/svg','feColorMatrix'),vibranceTransfer=document.createElementNS('http://www.w3.org/2000/svg','feComponentTransfer'),fromYcc=document.createElementNS('http://www.w3.org/2000/svg','feColorMatrix'),transfer=document.createElementNS('http://www.w3.org/2000/svg','feComponentTransfer'),highlightTransfer=document.createElementNS('http://www.w3.org/2000/svg','feComponentTransfer'),kernel=document.createElementNS('http://www.w3.org/2000/svg','feConvolveMatrix'),edgeImage=document.createElementNS('http://www.w3.org/2000/svg','feImage'),edgeDisplacement=document.createElementNS('http://www.w3.org/2000/svg','feDisplacementMap'),edgeNormalize=document.createElementNS('http://www.w3.org/2000/svg','feComponentTransfer');
      const neutralY=document.createElementNS('http://www.w3.org/2000/svg','feFuncG');neutralY.setAttribute('type','linear');neutralY.setAttribute('slope','0');neutralY.setAttribute('intercept','.5');edgeNormalize.setAttribute('in','uwfEdgeMap');edgeNormalize.setAttribute('result','uwfNeutralEdgeMap');edgeNormalize.append(neutralY);
      const vibranceFunctions=Object.fromEntries(['R','G','B'].map(channel=>{const node=document.createElementNS('http://www.w3.org/2000/svg',`feFunc${channel}`);vibranceTransfer.append(node);return[channel,node];}));
      const functions=Object.fromEntries(['R','G','B'].map(channel=>{const node=document.createElementNS('http://www.w3.org/2000/svg',`feFunc${channel}`);transfer.append(node);return[channel,node];}));
      const highlightFunctions=Object.fromEntries(['R','G','B'].map(channel=>{const node=document.createElementNS('http://www.w3.org/2000/svg',`feFunc${channel}`);highlightTransfer.append(node);return[channel,node];}));
      const alpha=document.createElementNS('http://www.w3.org/2000/svg','feFuncA');alpha.setAttribute('type','identity');transfer.append(alpha);
      const highlightAlpha=document.createElementNS('http://www.w3.org/2000/svg','feFuncA');highlightAlpha.setAttribute('type','identity');highlightTransfer.append(highlightAlpha);
      const vibranceAlpha=document.createElementNS('http://www.w3.org/2000/svg','feFuncA');vibranceAlpha.setAttribute('type','identity');vibranceTransfer.append(vibranceAlpha);
      const identity='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0',toYccMatrix='0.2126 0.7152 0.0722 0 0 -0.114572 -0.385428 0.5 0 0.5 0.5 -0.454153 -0.045847 0 0.5 0 0 0 1 0',fromYccMatrix='1 0 1.5748 0 -0.7874 1 -0.187324 -0.468124 0 0.327724 1 1.8556 0 0 -0.9278 0 0 0 1 0';
      const id=`uwf-picture-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;filter.id=id;filter.setAttribute('x','-8%');filter.setAttribute('y','-8%');filter.setAttribute('width','116%');filter.setAttribute('height','116%');filter.setAttribute('color-interpolation-filters','sRGB');filter.setAttribute('primitiveUnits','userSpaceOnUse');toYcc.setAttribute('type','matrix');fromYcc.setAttribute('type','matrix');kernel.setAttribute('order','3');kernel.setAttribute('preserveAlpha','true');kernel.setAttribute('edgeMode','duplicate');kernel.setAttribute('result','uwfProcessed');edgeImage.setAttribute('preserveAspectRatio','none');edgeImage.setAttribute('x','0');edgeImage.setAttribute('y','0');edgeImage.setAttribute('width','100%');edgeImage.setAttribute('height','100%');edgeDisplacement.setAttribute('in','uwfProcessed');edgeDisplacement.setAttribute('in2','uwfNeutralEdgeMap');edgeDisplacement.setAttribute('xChannelSelector','R');edgeDisplacement.setAttribute('yChannelSelector','G');edgeDisplacement.setAttribute('scale','0');edgeDisplacement.setAttribute('color-interpolation-filters','sRGB');edgeImage.setAttribute('result','uwfEdgeMap');filter.append(toYcc,vibranceTransfer,fromYcc,transfer,highlightTransfer,kernel);svg.append(filter);(root===document?document.documentElement:root).append(svg);entry={svg,filter,toYcc,fromYcc,vibranceTransfer,vibranceFunctions,transfer,functions,highlightTransfer,highlightFunctions,kernel,edgeImage,edgeNormalize,edgeDisplacement,id,lift:null,sharp:null,vibrance:null,highlights:null,edgeSignature:null};entry.identityMatrix=identity;entry.toYccMatrix=toYccMatrix;entry.fromYccMatrix=fromYccMatrix;pictureFilters.set(root,entry);
    }
    if(entry.vibrance!==vibrance){const enabled=vibrance>0;entry.toYcc.setAttribute('values',enabled?entry.toYccMatrix:entry.identityMatrix);entry.fromYcc.setAttribute('values',enabled?entry.fromYccMatrix:entry.identityMatrix);for(const [channel,node] of Object.entries(entry.vibranceFunctions)){if(channel==='R'){node.setAttribute('type','identity');node.removeAttribute('tableValues');continue;}node.setAttribute('type',enabled?'table':'identity');if(enabled){const strength=vibrance/100*.75;const values=Array.from({length:65},(_,index)=>{const x=index/64,y=x+strength*x*(1-x)*(2*x-1);return clamp(y,0,1).toFixed(5);}).join(' ');node.setAttribute('tableValues',values);}else node.removeAttribute('tableValues');}entry.vibrance=vibrance;}
    if(entry.lift!==lift){const strength=lift/30*.075,values=Array.from({length:17},(_,index)=>{const x=index/16;return Math.min(1,x+strength*(1-x)**3).toFixed(4);}).join(' ');for(const node of Object.values(entry.functions)){node.setAttribute('type',lift?'table':'identity');if(lift)node.setAttribute('tableValues',values);else node.removeAttribute('tableValues');}entry.lift=lift;}
    if(entry.highlights!==highlights){const strength=highlights/100*.8;for(const node of Object.values(entry.highlightFunctions)){node.setAttribute('type',highlights?'table':'identity');if(highlights){const values=Array.from({length:33},(_,index)=>{const x=index/32;return clamp(x+strength*x**4*(1-x),0,1).toFixed(5);}).join(' ');node.setAttribute('tableValues',values);}else node.removeAttribute('tableValues');}entry.highlights=highlights;}
    if(entry.sharp!==sharp){const strength=sharp/100*.65,side=-strength,center=1+strength*4;entry.kernel.setAttribute('kernelMatrix',`0 ${side} 0 ${side} ${center} ${side} 0 ${side} 0`);entry.sharp=sharp;}
    if(edge>0){const signature=[Math.max(1,Math.round(video.offsetWidth)),Math.max(1,Math.round(video.offsetHeight)),video.videoWidth,video.videoHeight,edgeFit,edge,Math.round(targetWidth),Math.round(scaleX*1000)].join(':');if(entry.edgeSignature!==signature){const map=createEdgeStretchMap(video,edge,edgeFit,targetWidth,scaleX);entry.edgeSignature=map.signature;if(map.data&&map.scale>0){if(entry.edgeImage.parentNode!==entry.filter)entry.filter.append(entry.edgeImage,entry.edgeNormalize,entry.edgeDisplacement);entry.filter.setAttribute('x',`${map.destinationLeft/video.offsetWidth*100}%`);entry.filter.setAttribute('width',`${map.destinationWidth/video.offsetWidth*100}%`);entry.edgeImage.setAttribute('x',String(map.destinationLeft));entry.edgeImage.setAttribute('y','0');entry.edgeImage.setAttribute('width',String(map.destinationWidth));entry.edgeImage.setAttribute('height',String(map.height));entry.edgeDisplacement.setAttribute('x',String(map.destinationLeft));entry.edgeDisplacement.setAttribute('y','0');entry.edgeDisplacement.setAttribute('width',String(map.destinationWidth));entry.edgeDisplacement.setAttribute('height',String(map.height));entry.edgeImage.setAttribute('href',map.data);entry.edgeImage.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',map.data);}else{entry.filter.setAttribute('x','-8%');entry.filter.setAttribute('width','116%');entry.edgeImage.remove();entry.edgeNormalize.remove();entry.edgeDisplacement.remove();}if(entry.edgeScale!==map.scale){entry.edgeDisplacement.setAttribute('scale',String(map.scale));entry.edgeScale=map.scale;}}}
    else{entry.edgeSignature=null;entry.filter.setAttribute('x','-8%');entry.filter.setAttribute('width','116%');if(entry.edgeScale!==0){entry.edgeDisplacement.setAttribute('scale','0');entry.edgeScale=0;}entry.edgeImage.remove();entry.edgeNormalize.remove();entry.edgeDisplacement.remove();}
    return `url(#${entry.id})`;
  }
  function applyCrop(v,autoTop=0,autoBottom=0,autoLeft=0,autoRight=0){const trim=clamp(settings.frameTrim,0,25),top=clamp(trim+(settings.autoBars?autoTop:0),0,45),bottom=clamp(trim+(settings.autoBars?autoBottom:0),0,45),left=clamp(settings.autoBars?autoLeft:0,0,45),right=clamp(settings.autoBars?autoRight:0,0,45);set(v,'clip-path',top>0||bottom>0||left>0||right>0?`inset(${top}% ${right}% ${bottom}% ${left}%)`:'none');}
  function targetBox(v){
    // offsetWidth/Height exclude our CSS transform, so recalculating does not
    // feed the previous zoom back into the next scale decision.
    const own={width:v.offsetWidth,height:v.offsetHeight};
    const viewportWidth=Math.max(1,window.visualViewport?.width||innerWidth),viewportHeight=Math.max(1,window.visualViewport?.height||innerHeight);
    const viewportArea=viewportWidth*viewportHeight,viewportRatio=viewportWidth/viewportHeight;
    // Use the browser's fullscreen element as the authoritative target. This
    // avoids guessing from the screen's physical pixel resolution (which can
    // differ from CSS pixels under display scaling and browser zoom).
    const fullscreen=v.getRootNode?.().fullscreenElement||document.fullscreenElement||document.webkitFullscreenElement;
    if(fullscreen&&composedContains(fullscreen,v)){
      const r=fullscreen.getBoundingClientRect();
      // clientWidth/clientHeight describe the layout box before transforms.
      // getBoundingClientRect() includes Uwide's own scale when the video (or
      // a transformed player surface) is the fullscreen element, feeding the
      // previous result back into the next fit calculation on re-entry.
      const width=fullscreen.clientWidth||r.width,height=fullscreen.clientHeight||r.height;
      if(width>0&&height>0)return {width,height};
    }
    const ownRatio=own.width/Math.max(1,own.height),ownArea=own.width*own.height;
    // A theater player can occupy most of a page without filling its height.
    // Keep it inside its player surface instead of stretching across the page.
    // In windowed and theater modes, target the nearest player surface whose
    // shape differs from the video element. Do not require the player to fill
    // most of the monitor: theater and ordinary embedded players are smaller.
    let playerNode=v.parentElement||v.getRootNode?.().host||null,playerDepth=0;
    while(playerNode&&playerNode!==document.body&&playerNode!==document.documentElement&&playerDepth++<12){
      const r=playerNode.getBoundingClientRect(),ratio=r.width/Math.max(1,r.height),area=r.width*r.height,ownArea=Math.max(1,own.width*own.height);
      const withinViewport=r.width<=viewportWidth*1.05&&r.height<=viewportHeight*1.05;
      if(r.width>=own.width*.9&&r.height>=own.height*.9&&area>ownArea*1.02&&withinViewport&&Math.abs(ratio-ownRatio)>ownRatio*.025)return {width:r.width,height:r.height};
      playerNode=playerNode.parentElement||playerNode.getRootNode?.().host||null;
    }
    const fillsViewport=ownArea>viewportArea*.72;
    let best={width:own.width,height:own.height}, node=v.parentElement||v.getRootNode?.().host||null, depth=0;
    while(node&&node!==document.documentElement&&depth++<12){const r=node.getBoundingClientRect(),area=r.width*r.height;
      const fillsPlayerViewport=fillsViewport&&area>viewportArea*.70&&r.width>=own.width*.85&&r.height>=own.height*.85;
      if(fillsPlayerViewport&&Math.abs(r.width/Math.max(1,r.height)-viewportRatio)<Math.abs(best.width/Math.max(1,best.height)-viewportRatio))best={width:r.width,height:r.height};
      node=node.parentElement||node.getRootNode?.().host||null;
    }
    return best;
  }
  function aspectFrameGeometry(input){
    const ratios={'16:9':16/9,'16:10':16/10,'18:9':2,'21:9':21/9,'32:9':32/9,'4:3':4/3,'1:1':1};
    const aspect=input.cropAspect==='custom'?clamp(input.customAspect,.5,4):ratios[input.cropAspect];
    if(!aspect)return null;
    const {width,height,videoWidth,videoHeight,targetWidth,targetHeight}=input;
    if(![width,height,videoWidth,videoHeight,targetWidth,targetHeight].every(n=>Number.isFinite(n)&&n>0))return null;
    // Measure the source picture inside an object-fit:contain element, not the
    // element's potentially letterboxed rectangle. All cropping is symmetric.
    const fit=Math.min(width/videoWidth,height/videoHeight);
    const pictureWidth=videoWidth*fit,pictureHeight=videoHeight*fit;
    const cropWidth=Math.min(pictureWidth,pictureHeight*aspect);
    const cropHeight=Math.min(pictureHeight,pictureWidth/aspect);
    const trim=Math.min(25,Math.max(0,Number(input.trim)||0))/100;
    const visibleHeight=cropHeight*(1-2*trim);
    const x=targetWidth/cropWidth,y=targetHeight/visibleHeight;
    const uniform=input.layout==='contain'?Math.min(x,y):Math.max(x,y);
    const zoom=Math.min(2.5,Math.max(1,Number(input.zoom)||1));
    const stretch=Math.min(1.6,Math.max(1,Number(input.stretch)||1));
    return {scaleX:(input.layout==='fill'?x:uniform)*zoom*stretch,
      scaleY:(input.layout==='fill'?y:uniform)*zoom,
      top:(height-visibleHeight)/2/height*100,
      left:(width-cropWidth)/2/width*100};
  }
  const edgePreview=new WeakMap();
  function render(v){
    if(!v)return;returningFrames.get(v)?.cancel();const remembered=remember(v);if(hasStyleConflict(v,remembered))return;
    if(settings.mode!=='manual'){
      const box=targetBox(v),w=Math.max(1,v.offsetWidth),h=Math.max(1,v.offsetHeight),state=managed.get(v);
      const base=state.baseTransform&&state.baseTransform!=='none'?state.baseTransform+' ':'';
      const bars=settings.ratio!=='contain'&&settings.autoBars?state.detectedBars:null;
      const intrinsicWidth=v.videoWidth||w,intrinsicHeight=v.videoHeight||h;
      const intrinsicFit=Math.min(w/intrinsicWidth,h/intrinsicHeight);
      const imageWidth=intrinsicWidth*intrinsicFit,imageHeight=intrinsicHeight*intrinsicFit;
      const visibleWidth=imageWidth*(1-((bars?.left||0)+(bars?.right||0))/100);
      const visibleHeight=imageHeight*(1-((bars?.top||0)+(bars?.bottom||0))/100);
      // Avoid style churn from tiny fractional ResizeObserver noise while
      // retaining sub-pixel sizing accuracy on large players.
      const fitX=box.width/visibleWidth,fitY=box.height/visibleHeight;
      const uniform=settings.ratio==='contain'?Math.min(fitX,fitY):Math.max(fitX,fitY);
      const zoom=(settings.playerWheelZoom?clamp(settings.wheelScale,1,2.5):1)*clamp(settings.shortcutScale,1,2.5);
      const scaled=value=>Math.round(Math.min(2.5,value*zoom)*10000)/10000;
      const scale=scaled(settings.ratio==='fill'?fitX:uniform);
      const verticalScale=scaled(settings.ratio==='fill'?fitY:uniform);
      if(![scale,verticalScale].every(value=>Number.isFinite(value)&&value>0))return;
      const smooth=smoothFrameAllowed();
      set(v,'transition',smooth?frameTransition:'none');
      set(v,'transform',base+(scale===verticalScale?`scale(${scale})`:`scale(${scale},${verticalScale})`));
      set(v,'object-position',state.baseObjectPosition||'50% 50%');set(v,'transform-origin','center center');set(v,'object-fit','contain');
      const clipTop=bars?((h-imageHeight)/2+imageHeight*bars.top/100)/h*100:0;
      const clipRight=bars?((w-imageWidth)/2+imageWidth*bars.right/100)/w*100:0;
      const clipBottom=bars?((h-imageHeight)/2+imageHeight*bars.bottom/100)/h*100:0;
      const clipLeft=bars?((w-imageWidth)/2+imageWidth*bars.left/100)/w*100:0;
      set(v,'clip-path',bars?`inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}%)`:'none');
      const baseFilter=state.baseFilter&&state.baseFilter!=='none'?state.baseFilter:'';const pictureFilter=staticPictureFilter(v,settings.autoPicture?settings.shadowLift:0,settings.autoPicture?settings.sharpen:0,settings.autoPicture?settings.vibrance:0,settings.autoPicture?settings.hdr:0,edgePreview.get(v)??settings.edgeStretch,'contain',box.width,scale);const picture=settings.autoPicture?`brightness(${clamp(settings.brightness,0,200)}%) contrast(${clamp(settings.contrast,0,200)}%) saturate(${clamp(settings.saturation,0,250)}%)`:'';set(v,'filter',[baseFilter,picture,pictureFilter].filter(Boolean).join(' ')||'none');set(v,'box-shadow','none');set(v,'will-change','auto');return;
    }
    const box=targetBox(v), elementWidth=Math.max(1,v.offsetWidth),elementHeight=Math.max(1,v.offsetHeight);
    // In fill mode, cover the rendered player box. This removes the outer bars
    // created when a 16:9 video is contained in a 16:10 (1920x1200) display.
    const state=managed.get(v),trim=clamp(settings.frameTrim,0,25),bars=settings.autoBars&&settings.cropAspect==='source'?state.detectedBars:null;
    const remainingWidth=Math.max(.1,1-((bars?.left||0)+(bars?.right||0))/100);
    const remainingHeight=Math.max(.1,1-(2*trim+(bars?.top||0)+(bars?.bottom||0))/100);
    const sourceWidth=v.videoWidth||elementWidth,sourceHeight=v.videoHeight||elementHeight;
    const fit=Math.min(elementWidth/sourceWidth,elementHeight/sourceHeight);
    const targetX=box.width/(sourceWidth*fit),targetY=box.height/(sourceHeight*fit);
    const cover=Math.max(targetX/remainingWidth,targetY/remainingHeight);
    const uniform=settings.ratio==='contain'?Math.min(targetX,targetY):cover;
    const pictureX=settings.ratio==='fill'?targetX:uniform;
    const pictureY=settings.ratio==='fill'?targetY:uniform;
    const wheelScale=settings.playerWheelZoom?clamp(settings.wheelScale,1,2.5):1,zoom=clamp(settings.zoom*wheelScale,1,2.5), sx=clamp(settings.stretch,1,2);
    const tx=clamp(settings.panX,-50,50),ty=clamp(settings.panY,-50,50);
    const baseTransform=state?.baseTransform&&state.baseTransform!=='none'?`${state.baseTransform} `:'';
    const aspectFrame=aspectFrameGeometry({width:elementWidth,height:elementHeight,videoWidth:v.videoWidth,videoHeight:v.videoHeight,targetWidth:box.width,targetHeight:box.height,cropAspect:settings.cropAspect,customAspect:settings.customAspect,trim:settings.frameTrim,layout:settings.ratio,zoom,stretch:settings.stretch});
    const edgeFit='contain';
    const pictureFilter=staticPictureFilter(v,settings.autoPicture?settings.shadowLift:0,settings.autoPicture?settings.sharpen:0,settings.autoPicture?settings.vibrance:0,settings.autoPicture?settings.hdr:0,edgePreview.get(v)??settings.edgeStretch,edgeFit,box.width,aspectFrame?.scaleX??pictureX*zoom*sx);
    // Color processing remains opt-in; edge geometry is an independent framing control.
    const filters=settings.autoPicture?[`brightness(${clamp(settings.brightness,0,200)}%)`,`contrast(${clamp(settings.contrast,0,200)}%)`,`saturate(${clamp(settings.saturation,0,250)}%)`].join(' '):'';
    const smooth=smoothFrameAllowed();
    set(v,'transition',smooth?frameTransition:'none');
    if(aspectFrame){
      set(v,'object-fit','contain');set(v,'object-position','50% 50%');set(v,'transform-origin','center center');
      set(v,'transform',`${baseTransform}scale(${aspectFrame.scaleX},${aspectFrame.scaleY}) translate(${tx}%,${ty}%)`);
      set(v,'clip-path',`inset(${aspectFrame.top}% ${aspectFrame.left}% ${aspectFrame.top}% ${aspectFrame.left}%)`);
      set(v,'filter',[state.baseFilter&&state.baseFilter!=='none'?state.baseFilter:'',filters,pictureFilter].filter(Boolean).join(' ')||'none');
      set(v,'will-change','auto');renderGlow(v);return;
    }
    set(v,'object-position',state.baseObjectPosition||'50% 50%');
    // object-fit jumps between contain and cover in one paint. Keep the
    // same fitted picture and express the difference as an animatable scale.
    set(v,'object-fit','contain');
    set(v,'transform',`${baseTransform}scale(${zoom*sx*pictureX},${zoom*pictureY}) translate(${tx/pictureX}%,${ty/pictureY}%)`);
    set(v,'transform-origin',state?.baseTransformOrigin||'center center');set(v,'filter',[state?.baseFilter&&state.baseFilter!=='none'?state.baseFilter:'',filters,pictureFilter].filter(Boolean).join(' ')||'none');set(v,'will-change','transform');
    renderGlow(v);
    applyCrop(v,bars?.top||0,bars?.bottom||0,bars?.left||0,bars?.right||0);
  }
  // Pixel readback is best effort. Protected and cross-origin media can reject it.
  // A crop is committed at most once per media identity, after four matching
  // samples over at least 4.5 seconds. Scene changes cannot make it oscillate.
  let sampleCanvas=null,sampleContext=null;
  function sampleBars(v){
    const state=managed.get(v),now=performance.now();
    if(!settings.autoBars||!state||state.barLocked||state.clipFailed||v.readyState<2||settings.mode==='manual'&&settings.cropAspect!=='source'||now-(state.lastBarSample||0)<1400)return false;
    state.lastBarSample=now;
    try{
      if(!sampleCanvas){sampleCanvas=document.createElement('canvas');sampleCanvas.width=128;sampleCanvas.height=72;sampleContext=sampleCanvas.getContext('2d',{willReadFrequently:true});}
      const width=sampleCanvas.width,height=sampleCanvas.height;
      sampleContext.drawImage(v,0,0,width,height);
      const data=sampleContext.getImageData(0,0,width,height).data;
      const luma=(x,y)=>{const i=(y*width+x)*4;return data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;};
      const darkEdge=(positions,axis)=>{let sum=0,dark=0;for(const p of positions){const value=axis==='y'?luma(p,positions.row):luma(positions.column,p);sum+=value;if(value<40)dark++;}return sum/positions.length<24&&dark/positions.length>.84;};
      const horizontal=y=>{const xs=Array.from({length:width-24},(_,i)=>i+12);xs.row=y;return darkEdge(xs,'y');};
      const vertical=x=>{const ys=Array.from({length:height-14},(_,i)=>i+7);ys.column=x;return darkEdge(ys,'x');};
      let top=0,bottom=0,left=0,right=0;
      while(top<height*.24&&horizontal(top))top++;
      while(bottom<height*.24&&horizontal(height-1-bottom))bottom++;
      while(left<width*.24&&vertical(left))left++;
      while(right<width*.24&&vertical(width-1-right))right++;
      let center=0,count=0;
      for(let y=height*.3|0;y<height*.7;y+=3)for(let x=width*.3|0;x<width*.7;x+=3){center+=luma(x,y);count++;}
      const pairedHorizontal=top>=3&&bottom>=3&&Math.abs(top-bottom)<=3;
      const pairedVertical=left>=4&&right>=4&&Math.abs(left-right)<=4;
      if(center/Math.max(1,count)<36||(!state.rescanning&&!pairedHorizontal&&!pairedVertical)){state.barCandidate=null;state.barCount=0;return false;}
      const bars={top:pairedHorizontal?top*100/height:0,bottom:pairedHorizontal?bottom*100/height:0,left:pairedVertical?left*100/width:0,right:pairedVertical?right*100/width:0};
      const key=Object.values(bars).map(value=>Math.round(value/2)).join(':');
      if(key!==state.barCandidate){state.barCandidate=key;state.barCount=1;state.barCandidateSince=now;return false;}
      state.barCount++;
      if(state.barCount<4||now-state.barCandidateSince<4500)return false;
      state.detectedBars=pairedHorizontal||pairedVertical?bars:null;state.rescanning=false;state.barLocked=true;return true;
    }catch{
      state.clipFailed=true;sampleCanvas=sampleContext=null;return false;
    }
  }
  // Keep YouTube's existing caption nodes readable without copying their text
  // or changing the video's crop whenever a subtitle cue appears.
  const captionOffsets=new Map();let captionPlayer=null,captionFrame=0;
  function releaseCaption(node,state){
    if(node.style.getPropertyValue('translate')===state.expected&&node.style.getPropertyPriority('translate')==='important'){
      if(state.original)node.style.setProperty('translate',state.original,state.priority);else node.style.removeProperty('translate');
    }
    captionResize?.unobserve(node);captionOffsets.delete(node);
  }
  function queueCaptionProtection(){if(captionFrame)return;captionFrame=requestAnimationFrame(()=>{captionFrame=0;safeRun(protectCaptions);});}
  const captionObserver=new MutationObserver(queueCaptionProtection);
  const captionResize=typeof ResizeObserver==='function'?new ResizeObserver(queueCaptionProtection):null;
  function protectCaptions(){
    const video=selectedVideo;
    const player=settings.enabled&&!isYouTubeShorts()&&/(^|\.)youtube(?:-nocookie)?\.com$/i.test(location.hostname)?video?.closest('.html5-video-player'):null;
    if(player!==captionPlayer){captionObserver.disconnect();captionResize?.disconnect();for(const [node,state] of captionOffsets)releaseCaption(node,state);captionPlayer=player;if(player){captionObserver.observe(player,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class']});captionResize?.observe(player);}}
    if(!player)return;
    const bounds=player.getBoundingClientRect();if(bounds.width<80||bounds.height<60)return;
    const nodes=new Set(player.querySelectorAll('.caption-window'));
    for(const [node,state] of captionOffsets)if(!nodes.has(node))releaseCaption(node,state);
    for(const node of nodes){
      let state=captionOffsets.get(node);
      if(state&&(node.style.getPropertyValue('translate')!==state.expected||node.style.getPropertyPriority('translate')!=='important')){captionOffsets.delete(node);state=null;}
      // Respect a player's own translate rather than replacing its positioning.
      if(!state&&getComputedStyle(node).translate!=='none')continue;
      const rect=node.getBoundingClientRect();if(!rect.width||!rect.height||getComputedStyle(node).visibility==='hidden')continue;
      const scaleX=rect.width/Math.max(1,node.offsetWidth),scaleY=rect.height/Math.max(1,node.offsetHeight);
      const baseLeft=rect.left-(state?.x||0)*scaleX,baseTop=rect.top-(state?.y||0)*scaleY;
      const minX=bounds.left+8,maxX=bounds.right-8-rect.width,minY=bounds.top+8,maxY=bounds.bottom-8-rect.height;
      // Oversized captions cannot be made fully visible by moving them alone.
      if(maxX<minX||maxY<minY)continue;
      const x=Math.round((Math.min(maxX,Math.max(minX,baseLeft))-baseLeft)/scaleX*100)/100;
      const y=Math.round((Math.min(maxY,Math.max(minY,baseTop))-baseTop)/scaleY*100)/100;
      if(!x&&!y){if(state)releaseCaption(node,state);continue;}
      if(!state){state={original:node.style.getPropertyValue('translate'),priority:node.style.getPropertyPriority('translate')};captionOffsets.set(node,state);captionResize?.observe(node);}
      state.x=x;state.y=y;state.expected=`${x}px ${y}px`;
      if(node.style.getPropertyValue('translate')!==state.expected||node.style.getPropertyPriority('translate')!=='important')node.style.setProperty('translate',state.expected,'important');
    }
  }
  function scheduleLayout(){if(layoutFrame)return;layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;safeRun(()=>{apply();injectPlayerPanels();for(const host of playerPanels)host.__uwfPositionPanel?.();});});}
  let fullscreenSettleTimer=0,presentationDeadline=0,presentationRetries=0,presentationSignature='';
  function beginPresentationChange(){if(holdsFocusFrame())return;presentationDeadline=performance.now()+3000;presentationRetries=2;scheduleFullscreenLayout();}
  const presentationStyleObserver=new MutationObserver(()=>safeRun(()=>{
    const video=resizeObservedVideo,state=video&&managed.get(video);
    if(state&&holdsFocusFrame()&&settings.enabled&&comparisonVideo!==video){
      const changed=Object.entries(state.expected).filter(([property,expected])=>!sameInline(video,property,expected));
      if(changed.length&&focusRepairs<8){focusRepairs++;for(const [property,expected] of changed){state.props[property]={value:video.style.getPropertyValue(property),priority:video.style.getPropertyPriority(property)};video.style.setProperty(property,expected.value,expected.priority);}state.styleConflict=null;}
      return;
    }
    // Only retry author changes during a bounded presentation transition.
    // Our own writes match expected values and must never trigger a retry loop.
    if(!state||performance.now()>presentationDeadline||presentationRetries<=0)return;
    const transform=state.expected.transform;
    if(settings.enabled&&comparisonVideo!==video&&transform&&!sameInline(video,'transform',transform)&&sameInline(video,'transform',state.props.transform)){
      // A player cleared our scale after resizing. Restore it before the
      // browser paints the reset, then measure the new player dimensions.
      presentationRetries--;
      video.style.setProperty('transform',transform.value,transform.priority);
      scheduleLayout();
    }
    if(Object.entries(state.expected).some(([property,expected])=>!sameInline(video,property,expected)))scheduleFullscreenLayout();
  }));
  const presentationModeObserver=new MutationObserver(records=>safeRun(()=>{
    // Several players switch fullscreen/theater by toggling an ancestor class
    // without firing fullscreenchange. Catch that mode transition as well.
    const modeTokens=value=>String(value||'').split(/\s+/).filter(token=>/(?:full.?screen|theat(?:er|re)|cinema)/i.test(token)).sort().join(' ');
    const changed=records.some(record=>modeTokens(record.oldValue)!==modeTokens(record.target.className?.baseVal??record.target.className));
    if(changed)beginPresentationChange();
  }));
  function scheduleFullscreenLayout(){
    if(fullscreenSettleTimer)clearTimeout(fullscreenSettleTimer);
    // Fullscreen transitions can resize the player over several frames. Refit
    // after layout has settled, and keep a short delayed pass for sites whose
    // player controls update after the fullscreenchange event.
    requestAnimationFrame(()=>requestAnimationFrame(scheduleLayout));
    fullscreenSettleTimer=setTimeout(()=>{
      fullscreenSettleTimer=0;
      requestAnimationFrame(()=>safeRun(()=>{
        const video=activeVideo(),previous=video&&managed.get(video);
        const authorReset=previous&&Object.entries(previous.expected).some(([property,expected])=>!sameInline(video,property,expected));
        if(previous&&authorReset&&settings.enabled&&comparisonVideo!==video&&presentationRetries>0&&performance.now()<=presentationDeadline){
          presentationRetries--;
          rebasePresentationStyles(video,previous);
        }
        apply();injectPlayerPanels();
        for(const host of playerPanels)host.__uwfPositionPanel?.();
      }));
    },350);
  }
  function observeVideoLayout(video){
    if(video&&!document.hidden&&!holdsFocusFrame()&&visible(video)){
      const box=targetBox(video),signature=[video.offsetWidth,video.offsetHeight,Math.round(box.width),Math.round(box.height)].join(':');
      if(video===resizeObservedVideo&&presentationSignature&&signature!==presentationSignature)beginPresentationChange();
      presentationSignature=signature;
    }else if(!video)presentationSignature='';
    if(video===resizeObservedVideo)return;
    presentationStyleObserver.disconnect();presentationModeObserver.disconnect();
    if(video)presentationStyleObserver.observe(video,{attributes:true,attributeFilter:['style']});
    layoutObserver?.disconnect();resizeObservedVideo=video||null;
    let node=video,depth=0;
    while(node&&depth++<13){try{layoutObserver?.observe(node);presentationModeObserver.observe(node,{attributes:true,attributeFilter:['class'],attributeOldValue:true});}catch{}node=node.parentElement||node.getRootNode?.().host||null;}
  }
  const videoIdentities=new WeakMap();let reportedVideoToken;
  function videoTokenFor(video){
    if(!video||!video.isConnected||!video.videoWidth)return null;
    const signature=location.href+'\n'+video.currentSrc;
    let identity=videoIdentities.get(video);
    if(!identity||identity.signature!==signature||identity.mediaObject!==video.srcObject){identity={signature,mediaObject:video.srcObject,token:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`};videoIdentities.set(video,identity);}
    return identity.token;
  }
  function apply(){if(applying)return;applying=true;try{if(isYouTubeShorts()){for(const v of [...managed.keys()])restore(v);selectedVideo=null;return;}const current=activeVideo();if(current)reconcileMedia(current);if(comparisonVideo&&comparisonVideo!==current)comparisonVideo=null;observeVideoLayout(current);const token=videoTokenFor(current);if(token!==reportedVideoToken){reportedVideoToken=token;chrome.runtime.sendMessage({type:'uwf-media-updated'}).catch(()=>{});}if(settingsScope==='video'&&token!==appliedVideoToken){appliedVideoToken=token;settings={...settingsBaseline};loadSettings();}for(const v of [...managed.keys()])if(!v.isConnected||!settings.enabled||v!==current)restore(v,v===current&&!settings.enabled);if(settings.enabled&&current&&!document.hidden&&!holdsFocusFrame()&&visible(current)){if(comparisonVideo===current)restore(current,true);else{render(current);if(sampleBars(current)){render(current);}}}}finally{applying=false;queueCaptionProtection();}}
  // Audio-reactive effects are disabled, including previously saved settings.
  let settingsLoad=0,saveQueue=Promise.resolve(),settingsScope='global',settingsScopeInfo=null,appliedVideoToken=null,settingsBaseline={...defaults},keyboardShortcutConfig={enabled:false,bindings:{}};
  const shortcutActionNames=['toggleFit','resetFraming','zoomIn','zoomOut','toggleBars','togglePicture','cycleAspect','toggleTheater'];
  function normalizeShortcutConfig(input){
    if(!input||typeof input!=='object'||!input.bindings||typeof input.bindings!=='object')return {enabled:false,bindings:{}};
    const bindings={},used=new Set();
    for(const action of shortcutActionNames){const item=input.bindings[action];if(!item||typeof item.code!=='string'||!/^(?:Key[A-Z]|Digit[0-9]|Arrow(?:Up|Down|Left|Right)|F(?:[1-9]|1[0-2]))$/.test(item.code))continue;
      const binding={code:item.code,ctrl:item.ctrl===true,alt:item.alt===true,shift:item.shift===true,meta:item.meta===true};if(!(binding.ctrl||binding.alt||binding.meta))continue;
      const signature=[binding.code,binding.ctrl,binding.alt,binding.shift,binding.meta].join(':');if(used.has(signature))continue;used.add(signature);bindings[action]=binding;
    }
    return {enabled:input.enabled===true,bindings};
  }
  function loadShortcutConfiguration(){chrome.storage.sync.get({keyboardShortcutConfig:null}).then(result=>safeRun(()=>{keyboardShortcutConfig=normalizeShortcutConfig(result.keyboardShortcutConfig);}),()=>{});}
  function runShortcutAction(action){
    if(!settings.enabled||!siteAllowed)return;
    if(action==='toggleTheater'){if(!/(^|\.)youtube\.com$/i.test(location.hostname))return;const button=document.querySelector('.ytp-size-button');if(button instanceof HTMLButtonElement&&!button.disabled&&button.getClientRects().length)button.click();return;}
    if(action==='toggleFit'){saveFraming({ratio:settings.ratio==='contain'?'auto':'contain'});return;}
    if(action==='resetFraming'){saveFraming({zoom:1,wheelScale:1,shortcutScale:1,panX:0,panY:0,stretch:1,edgeStretch:0,ratio:'auto',cropAspect:'source',customAspect:2.39,autoBars:false,frameTrim:0});return;}
    if(action==='zoomIn'||action==='zoomOut'){
      const key=settings.mode==='manual'?'zoom':'shortcutScale',current=clamp(settings[key],1,2.5),next=clamp(Math.round((current+(action==='zoomIn'?.1:-.1))*100)/100,1,2.5);if(next!==current)saveFraming({[key]:next});return;
    }
    if(action==='toggleBars'){saveFraming({autoBars:!settings.autoBars});return;}
    if(action==='togglePicture'){saveFraming({autoPicture:!settings.autoPicture});return;}
    if(action==='cycleAspect'){
      const aspects=['source','16:9','16:10','18:9','21:9','32:9','4:3','1:1','custom'],index=aspects.indexOf(settings.cropAspect);saveFraming({cropAspect:aspects[(index+1)%aspects.length],mode:'manual'});
    }
  }
  let settingsConnectionIssue='';
  function connectionStatus(message){
    settingsConnectionIssue=message;
    for(const host of playerPanels)updateCompatibilityStatus(host.__uwfVideo,managed.get(host.__uwfVideo));
  }
  async function readSettingsWithRetry(request){
    for(const delay of [0,200,700,1800]){
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      if(request!==settingsLoad)return null;
      try{
        if(!chrome.runtime.id)break;
        return await chrome.runtime.sendMessage({type:'uwf-settings-read',videoToken:videoTokenFor(activeVideo())});
      }catch(error){
        const message=String(error?.message||error);
        if(/extension context invalidated/i.test(message))break;
        if(!/receiving end does not exist/i.test(message))throw error;
      }
    }
    if(request===settingsLoad)connectionStatus('Eklenti bağlantısı kurulamadı. Video sekmesini yenileyin.');
    return null;
  }
  function loadSettings(){
    const request=++settingsLoad;
    return readSettingsWithRetry(request).then(response=>safeRun(()=>{
      if(request!==settingsLoad||response===null)return;
      if(settingsConnectionIssue)connectionStatus('');
      if(!response?.ok)throw new Error(response?.error||'Ayarlar yüklenemedi.');
      siteAllowed=response.siteAllowed!==false;
      settings={...response.values,enabled:response.values.enabled&&siteAllowed};settingsBaseline={...response.baseline,enabled:response.baseline.enabled&&siteAllowed};appliedVideoToken=response.videoToken;siteHost=response.host;settingsScope=response.scope;settingsScopeInfo=response;
      apply();injectPlayerPanels();syncPlayerPanels();
    })).catch(error=>safeRun(()=>{throw error;}));
  }
  const framingKeys = new Set(['mode','ratio','zoom','panX','panY','stretch','edgeStretch','cropAspect','customAspect','frameTrim','wheelScale','shortcutScale']);
  let framingUndo=null;
  function framingContext(){return JSON.stringify([videoTokenFor(activeVideo()), settingsScope,settingsScopeInfo?.categoryScopes?.framing]);}
  function saveFraming(changes,recordUndo=true){
    // An explicit panel edit takes precedence over the passive focus hold.
    focusHold=false;focusReturnUntil=0;seekHold=false;seekReturnUntil=0;
    saveQueue=saveQueue.then(async()=>{
      const videoToken=videoTokenFor(activeVideo());
      let previous=settings;
      if(typeof changes==='function'){
        const current=await chrome.runtime.sendMessage({type:'uwf-settings-read',videoToken});
        if(!current?.ok)throw new Error(current?.error||'Ayarlar yüklenemedi.');
        previous=current.values;
        changes=changes(previous);
      }
      const keys=Object.keys(changes).filter(key=>framingKeys.has(key)&&changes[key]!==previous[key]);
      const undo=recordUndo&&keys.length?{context:framingContext(),values:Object.fromEntries(keys.map(key=>[key,previous[key]]))}:null;
      const response=await chrome.runtime.sendMessage({type:'uwf-settings-write',changes,videoToken});
      if(!response?.ok)throw new Error(response?.error||'Ayarlar kaydedilemedi.');
      if(undo)framingUndo=undo;else if(!recordUndo)framingUndo=null;
      return loadSettings();
    }).catch(error=>safeRun(()=>{throw error;}));
    return saveQueue;
  }
  function saveCategoryScope(category,scope){
    saveQueue=saveQueue.then(async()=>{
      const response=await chrome.runtime.sendMessage({type:'uwf-settings-scope',scope,category,videoToken:videoTokenFor(activeVideo())});
      if(!response?.ok)throw new Error(response?.error||'Kayıt kapsamı değiştirilemedi.');
      loadSettings();
    }).catch(error=>safeRun(()=>{throw error;}));
  }
  function clearCategoryScope(category){
    saveQueue=saveQueue.then(async()=>{
      const response=await chrome.runtime.sendMessage({type:'uwf-settings-clear',category,videoToken:videoTokenFor(activeVideo())});
      if(!response?.ok)throw new Error(response?.error||'Bölüm kapsamı kaldırılamadı.');
      loadSettings();
    }).catch(error=>safeRun(()=>{throw error;}));
  }
  const scopeOptionsMarkup='<option value="inherit">Varsayılan kapsam</option><option value="global">Genel · tüm cihazlar</option><option value="device">Bu cihaz</option><option value="site">Bu site</option><option value="tab">Yalnızca bu sekme</option><option value="video">Yalnızca bu video</option><option value="supported">İzinli siteler</option>';
  const panelFields=['enabled','mode','edgeStretch','autoBars','autoPicture','zoom','panX','panY','stretch','ratio','cropAspect','customAspect','frameTrim','brightness','contrast','hdr','shadowLift','saturation','vibrance','sharpen'];
  function syncPlayerPanels(){
    for(const host of playerPanels){
      const shadow=host.shadowRoot;if(!shadow)continue;
      host.dataset.theme=settings.theme||'dark';
      const fullFrameButton=shadow.getElementById('fullFramePreset');if(fullFrameButton){fullFrameButton.disabled=!siteAllowed||!host.__uwfVideo?.isConnected;UwideProfiles.renderFullFrame(fullFrameButton,settings);}
      const compareButton=shadow.getElementById('compareOriginal');if(compareButton){const showingOriginal=comparisonVideo===host.__uwfVideo;compareButton.setAttribute('aria-pressed',String(showingOriginal));compareButton.textContent=showingOriginal?'Uwide kadrajını göster':'Özgün görünümü karşılaştır';compareButton.disabled=!settings.enabled||!siteAllowed||!host.__uwfVideo?.isConnected;}
      for(const id of panelFields){const input=shadow.getElementById(id);if(!input)continue;const value=id==='edgeStretch'?(edgePreview.get(host.__uwfVideo)??settings[id]):settings[id];
        if(input.type==='checkbox')input.checked=Boolean(value);else input.value=value;
        const output=shadow.getElementById(`${id}Out`);if(output)output.value=`${['zoom','stretch'].includes(id)?Math.round(Number(value)*100):Number(value)}%`;
      }
      shadow.getElementById('manualControls').disabled=settings.mode!=='manual';
      shadow.getElementById('manualControls').hidden=false;
      shadow.getElementById('customAspectField').hidden=settings.cropAspect!=='custom';
      shadow.getElementById('enabled').disabled=!siteAllowed;
      shadow.getElementById('undoFraming').disabled=!framingUndo||framingUndo.context!==framingContext();
      shadow.getElementById('rescanBars').disabled=!settings.enabled||!settings.autoBars;
      const look=shadow.getElementById('pictureLook');
      look.value=Array.from(look.options).find(option=>{
        const preset=globalThis.UwideProfiles.builtins[option.value];
        return preset&&Object.entries({shadowLift:0,hdr:0,sharpen:0,...preset}).every(([key,value])=>settings[key]===value);
      })?.value||'custom';
      shadow.getElementById('pictureControls').disabled=!settings.autoPicture;
      shadow.getElementById('pictureControls').hidden=false;
      for(const category of ['framing','bars','picture']){
        const select=shadow.getElementById(`${category}Scope`);if(!select)continue;
        select.value=settingsScopeInfo?.categoryIndependent?.[category]?settingsScopeInfo.categoryScopes[category]:'inherit';
        for(const option of select.options){option.disabled=option.value==='video'?!settingsScopeInfo?.videoToken:option.value==='site'?!settingsScopeInfo?.host:option.value==='tab'?!Number.isInteger(settingsScopeInfo?.tabId):option.value==='supported'?!settingsScopeInfo?.sitePolicy?.sites?.includes(settingsScopeInfo.host):false;}
        const clearButton=shadow.getElementById(`${category}ScopeClear`);if(clearButton)clearButton.disabled=!settingsScopeInfo?.categoryIndependent?.[category];
      }
      host.__uwfPositionPanel?.();updateCompatibilityStatus(host.__uwfVideo,managed.get(host.__uwfVideo));
    }
  }
  function playerDiagnostics(video){
    if(!video?.isConnected)return 'Video artık bu sayfada değil.';
    const box=targetBox(video),state=managed.get(video);
    let totalFrames=null,droppedFrames=null;
    try{const quality=video.getVideoPlaybackQuality?.();if(quality){totalFrames=quality.totalVideoFrames;droppedFrames=quality.droppedVideoFrames;}}catch{}
    if(!Number.isFinite(totalFrames)&&Number.isFinite(video.webkitDecodedFrameCount))totalFrames=video.webkitDecodedFrameCount;
    if(!Number.isFinite(droppedFrames)&&Number.isFinite(video.webkitDroppedFrameCount))droppedFrames=video.webkitDroppedFrameCount;
    const now=performance.now(),previous=playbackSnapshots.get(video);let measuredFps=null;
    if(previous&&now>previous.time&&Number.isFinite(totalFrames)&&Number.isFinite(previous.totalFrames))measuredFps=Math.max(0,(totalFrames-previous.totalFrames)*1000/(now-previous.time));
    playbackSnapshots.set(video,{time:now,totalFrames});
    return [
      `Kaynak: ${video.videoWidth} × ${video.videoHeight}`,
      `Kare sayacı: ${Number.isFinite(totalFrames)?Math.round(totalFrames):'Desteklenmiyor'} · düşen: ${Number.isFinite(droppedFrames)?Math.round(droppedFrames):'Desteklenmiyor'}`,
      `Ölçülen hız: ${Number.isFinite(measuredFps)?`${measuredFps.toFixed(1)} fps · ölçüm aralığını görmek için tanılamayı yenileyin`:'İkinci tanılama yenilemesinde hesaplanır'}`,
      `Kırpma oranı: ${settings.mode==='manual'?(settings.cropAspect||'source'):'Otomatik modda uygulanmaz'}`,
      `Video alanı: ${video.offsetWidth} × ${video.offsetHeight}`,
      `Hedef alan: ${Math.round(box.width)} × ${Math.round(box.height)}`,
      `Kayıt kapsamı: ${{global:"Genel",device:"Bu cihaz",site:"Bu site",tab:"Bu sekme",video:"Bu video"}[settingsScope]}`,
      `Karşılaştırma: ${comparisonVideo===video?'Özgün görünüm':'Uwide kadrajı'}`,
      `Site izni: ${siteAllowed?'Açık':'İzinli listesinde yok'}`,
      `Mod: ${settings.mode==='manual'?'Manuel':'Otomatik esnetme'}`,
      `Kadraj geçişi: ${matchMedia('(prefers-reduced-motion: reduce)').matches?'Sistem hareketi azaltıyor':document.hidden||holdsFocusFrame()?'Kadraj geçici olarak kilitli':`${frameTiming.duration} ms · ease-in-out`}`,
      `Oynatıcının CSS animasyonu: ${animatedStyleProperties(video).join(', ')||'Kadraj özelliklerinde etkin animasyon yok'}`,
      `İşleme: ${!settings.enabled?'Kapalı':state?.styleConflict||state?.animationConflict?'Stil/animasyon çakışması nedeniyle bekliyor':state?.framingBlocked?'Boyut sınırı nedeniyle durduruldu':state?'Uygulanıyor':'Bekleniyor'}`,
      `Fare tekeri: ${settings.playerWheelZoom?`${Math.round(settings.wheelScale*100)}%`:'Kapalı'}`,
      `Renk: ${settings.autoPicture?'Açık':'Kapalı'}`,
      `Kenar esnetme: ${settings.edgeStretch?`${settings.edgeStretch}% ayarlı`:'Kapalı'}`,
      `İç bant algılama: ${!settings.autoBars?'Kapalı':state?.clipFailed?'Kare okunamadı':state?.barLocked?'Sabit kadraj uygulandı':'Ölçülüyor'}`,
      `Korumalı medya anahtarı: ${video.mediaKeys?'Var':'Algılanmadı'}`,
      `Yakalanan çalışma hatası: ${reportedRuntimeErrors.size}`,
      'Bu bilgiler görüntü çıktısını veya flaş güvenliğini doğrulamaz.'
    ].join('\n');
  }
  function positionFloatingPanel(host){const video=host.__uwfVideo;if(!video?.isConnected)return;const r=video.getBoundingClientRect(),width=Math.max(1,window.visualViewport?.width||innerWidth),height=Math.max(1,window.visualViewport?.height||innerHeight);host.style.left=`${clamp(r.right-44,8,Math.max(8,width-44))}px`;const desiredTop=r.bottom-44,top=desiredTop<height*.5?height-48:clamp(desiredTop,8,height-44);host.style.top=`${top}px`;}
  function composedContains(parent,child){let node=child;while(node){if(node===parent)return true;node=node.parentElement||node.getRootNode?.().host;}return false;}
  function createPlayerPanel(fullscreenButton,video,floating=false){
    const host=document.createElement('span');host.dataset.uwfHost='true';
    host.__uwfVideo=video||activeVideo();if(floating){host.dataset.uwfFloating='true';host.style.position='fixed';positionFloatingPanel(host);const fullscreen=document.fullscreenElement;(fullscreen&&fullscreen!==host.__uwfVideo&&composedContains(fullscreen,host.__uwfVideo)?fullscreen:document.body||document.documentElement).append(host);}
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>
:host{--surface:#101a26;--surface-2:#172638;--field:#0c1621;--text:#f4f7fb;--muted:#a4b3c2;--line:#304455;--accent:#9de8d0;--accent-strong:#67d4b2;--accent-ink:#07261d;display:inline-flex;position:relative;vertical-align:middle;z-index:2147483647;font:13px/1.5 Inter,"Segoe UI",system-ui,sans-serif;color:var(--text);color-scheme:dark}
:host([data-theme=light]){--surface:#fff;--surface-2:#f4f8f6;--field:#edf3f0;--text:#14231f;--muted:#53665f;--line:#cad8d2;--accent:#146c52;--accent-strong:#0b7958;--accent-ink:#fff;color-scheme:light}
:host([data-theme=ocean]){--surface:#0e2130;--surface-2:#142b3d;--field:#091a27;--text:#eff8ff;--muted:#abc4d4;--line:#29485c;--accent:#9bdafa;--accent-strong:#71c8ee;--accent-ink:#0a2532}
:host([data-theme=glass]){--surface:#171d30;--surface-2:#202943;--field:#121a2d;--text:#f3f4ff;--muted:#bac5df;--line:#465576;--accent:#c3caff;--accent-strong:#b3a5ff;--accent-ink:#171a2c}
:host([data-theme=glass]) .panel{background:linear-gradient(145deg,#202844,#171d30 72%,#211d35);border-color:#687495;box-shadow:inset 0 1px #ffffff26,0 18px 48px #080b1790,-1px 0 #aa9bff35,1px 0 #78d6ff35}
*{box-sizing:border-box}[hidden]{display:none!important}button,input,select{font:inherit}button{cursor:pointer}
button,select{min-width:0;min-height:38px;padding:8px 11px;border:1px solid var(--line);border-radius:10px;background:var(--field);color:var(--text);font-size:12px;font-weight:650}
button:hover:not(:disabled),select:hover{border-color:var(--accent);background:var(--surface-2)}button:disabled,input:disabled,select:disabled{opacity:.5;cursor:not-allowed}
:where(button,input,select):focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.trigger{all:initial;box-sizing:border-box;display:grid;place-items:center;width:36px;height:36px;border:1px solid transparent;border-radius:9px;color:var(--accent);background:#09121dbb;cursor:pointer;vertical-align:middle}
.trigger svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.trigger:hover{background:var(--surface-2);border-color:var(--line)}.trigger:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.panel{display:none;position:fixed;inset:auto;margin:0;width:min(340px,calc(100vw - 20px));max-height:calc(100dvh - 20px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--line) transparent;padding:14px;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:18px;box-shadow:0 22px 64px #0009}
.panel[open],.panel:popover-open{display:block}
.top{position:sticky;inset-block-start:-14px;z-index:2;display:flex;align-items:center;gap:7px;margin:-14px -14px 10px;padding:12px 14px;background:var(--surface);border-block-end:1px solid var(--line)}
.top h2{margin:0 auto 0 0;font-size:16px;line-height:1.2;font-weight:760;letter-spacing:-.025em}.top h2 small{margin-inline-start:5px;color:var(--accent);font-size:9px;letter-spacing:.12em}
.top button{min-height:34px;padding:6px 9px;font-size:11px}.drag-handle{cursor:grab;touch-action:none;user-select:none}.drag-handle.dragging{cursor:grabbing}.close{min-width:34px;padding:4px!important;font-size:18px!important}
.position-actions{display:flex;flex-wrap:wrap;gap:6px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.field{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;margin:11px 0;font-size:12px;font-weight:610}.field input[type=range],.field select{grid-column:1/-1;width:100%}
input[type=range]{accent-color:var(--accent-strong);min-height:26px;margin:0}output{color:var(--accent);font-variant-numeric:tabular-nums;font-size:11px;font-weight:720}
.toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;margin:7px 0;padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);font-size:12px;font-weight:600}.toggle input{appearance:none;position:relative;flex:0 0 40px;width:40px;height:23px;border:1px solid var(--line);border-radius:999px;background:#263748;accent-color:var(--accent);cursor:pointer}.toggle input::before{content:"";position:absolute;inset:2px auto auto 2px;width:17px;height:17px;border-radius:50%;background:#dce5ec;transition:transform .14s ease}.toggle input:checked{background:var(--accent-strong);border-color:var(--accent-strong)}.toggle input:checked::before{transform:translateX(17px);background:var(--accent-ink)}
fieldset:disabled{opacity:.55}fieldset{min-width:0;margin:13px 0;padding:12px;border:1px solid var(--line);border-radius:13px;background:var(--field)}legend{padding:0 6px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.03em}
.hint{margin:8px 1px 11px;color:var(--muted);font-size:11px;line-height:1.55}.reset,.scope-clear,#compareOriginal,#fullFramePreset{width:100%;margin-block:5px}.scope-clear{min-height:32px;padding:6px 9px;font-size:11px}.scope-clear:disabled{opacity:.5;cursor:not-allowed}#fullFramePreset{border-color:var(--accent);color:var(--accent)}#fullFramePreset:disabled{opacity:.5;cursor:not-allowed}

.ui-tabs{position:relative;min-width:0}
.ui-tab-input{position:absolute!important;inline-size:1px!important;block-size:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip-path:inset(50%);white-space:nowrap!important;border:0!important}
.ui-tab-labels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:4px;border:1px solid var(--line);border-radius:13px;background:var(--field);margin:12px 0}
.ui-tab-labels label{display:grid;place-items:center;min-block-size:40px;margin:0;padding:8px 4px;border:1px solid transparent;border-radius:9px;color:var(--muted);cursor:pointer;text-align:center;font-size:12px;font-weight:700}
.ui-pane{display:none;min-width:0}
.ui-tab-pages{max-block-size:min(440px,calc(100dvh - 230px));overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--line) transparent;padding:0 3px 4px 0}
#ui-tab-0:checked~.ui-tab-pages .ui-pane-0,#ui-tab-1:checked~.ui-tab-pages .ui-pane-1,#ui-tab-2:checked~.ui-tab-pages .ui-pane-2{display:block}
#ui-tab-0:checked~.ui-tab-labels label[for="ui-tab-0"],#ui-tab-1:checked~.ui-tab-labels label[for="ui-tab-1"],#ui-tab-2:checked~.ui-tab-labels label[for="ui-tab-2"]{color:var(--accent);background:var(--surface);border-color:var(--line);box-shadow:inset 0 -2px var(--accent)}
#ui-tab-0:focus-visible~.ui-tab-labels label[for="ui-tab-0"],#ui-tab-1:focus-visible~.ui-tab-labels label[for="ui-tab-1"],#ui-tab-2:focus-visible~.ui-tab-labels label[for="ui-tab-2"]{outline:2px solid var(--accent);outline-offset:2px}

.ui-pane>button{margin-block-start:7px}.ui-tabs .ui-tab-pages .ui-pane-1{display:contents}.ui-pane-1>*{display:none}#ui-tab-1:checked~.ui-tab-pages .ui-pane-1>label[for=autoPicture]{display:flex}#ui-tab-1:checked~.ui-tab-pages .ui-pane-1>#pictureControls{display:block}#ui-tab-0:checked~.ui-tab-pages .ui-pane-1>label[for=autoBars]{display:flex}#ui-tab-2:checked~.ui-tab-pages .ui-pane-1>label[for=barsScope]{display:grid}#ui-tab-2:checked~.ui-tab-pages .ui-pane-1>#barsScopeClear{display:block}
#ui-tab-1:checked~.ui-tab-pages .frame-tools{display:grid;gap:4px}.manual-detail{padding:9px 11px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}details{margin-block-start:11px;padding-block-start:9px;border-block-start:1px solid var(--line)}summary{cursor:pointer;padding-block:5px;color:var(--muted);font-size:11px;font-weight:680}pre{max-height:180px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.55 ui-monospace,Consolas,monospace;color:var(--muted)}.diagnose{width:100%}.compat-status{margin:8px 0;padding:9px 11px;border-inline-start:3px solid #e3ae58;border-radius:8px;background:var(--surface-2);font-size:11px;line-height:1.5}


.panel .ui-tabs {display:grid;grid-template-columns:62px minmax(0,1fr);align-items:start;gap:12px;margin:0}
.panel .ui-tab-labels {display:grid;grid-template-columns:1fr;gap:4px;padding:3px 6px 3px 0;margin:0;border:0;border-right:1px solid var(--line);border-radius:0;background:none}
.panel .ui-tab-labels label {display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:54px;margin:0;padding:4px 0;border:0;border-radius:3px;background:none;font-size:10px;font-weight:600}
.panel .ui-tab-labels svg {width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round}
.panel .ui-tab-pages {min-width:0;margin:0;border:0;border-radius:0;padding:0 4px 4px 0;background:none}
.panel .ui-tab-input:checked:nth-of-type(1)~.ui-tab-labels label[for=ui-tab-0],.panel .ui-tab-input:checked:nth-of-type(2)~.ui-tab-labels label[for=ui-tab-1],.panel .ui-tab-input:checked:nth-of-type(3)~.ui-tab-labels label[for=ui-tab-2] {background:var(--surface-2);color:var(--accent);box-shadow:inset 3px 0 var(--accent);border:0}
.panel fieldset {min-width:0;border:0;padding:0;margin:12px 0;background:none}
.panel select,.panel button {border-radius:4px}

:host(:not([data-theme=light]):not([data-theme=ocean]):not([data-theme=glass])) {--surface:#201f1d;--surface-2:#34312d;--field:#191816;--line:#49453f;--accent:#ffbf71;--accent-strong:#edac5f;--accent-ink:#241b0e;--muted:#c1bbb2;--text:#faf6ee}
.panel {border-radius:6px;padding:12px;box-shadow:0 10px 32px #0007}
.panel .top {inset-block-start:-12px;margin:-12px -12px 12px;padding:9px 12px;gap:8px;background:var(--surface)}
.panel .top h2 {font:italic 600 23px/1 Georgia,serif;letter-spacing:-1px}
.panel .top .toggle {margin:0;padding:0;border:0;background:none;min-height:32px}
.panel .field {margin:5px 0 12px}.panel .manual-detail {padding:4px 0;border:0;border-top:1px solid var(--line);border-radius:0;background:none}
.panel .toggle {background:none;border:0;padding:4px 0;border-radius:0}
.panel .hint {font-size:11px}.panel .ui-tab-pages {max-height:min(425px,calc(100dvh - 175px))}
@media(max-height:560px){.panel{max-height:calc(100dvh - 12px)}.ui-tab-pages{max-height:calc(100dvh - 200px)}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
</style><button class="trigger" type="button" aria-label="Uwide video ayarları" aria-expanded="false" aria-controls="uwidePanel" title="Uwide video ayarları"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"></path></svg></button><section id="uwidePanel" class="panel" role="region" aria-labelledby="panelTitle"><div class="top"><h2 id="panelTitle">Uwide</h2><label title="Eklentiyi etkinleştir" class="toggle" for="enabled"><span class="sr-only">Eklentiyi etkinleştir</span><input id="enabled" type="checkbox"></label><button class="drag-handle" type="button" hidden aria-label="Paneli taşı. Ok tuşlarıyla hareket ettirin; konum seçenekleri için tıklayın." aria-controls="panelPosition" aria-expanded="false">Taşı</button><button class="close" type="button" aria-label="Ayarları kapat">×</button></div><span class="sr-only position-status" role="status"></span><p class="hint compat-status" role="status" hidden></p><div class="ui-tabs"><input class="ui-tab-input" type="radio" name="uwide-ui-tabs" id="ui-tab-0" aria-label="Kadraj" aria-controls="ui-pane-0" checked><input class="ui-tab-input" type="radio" name="uwide-ui-tabs" id="ui-tab-1" aria-label="Görüntü" aria-controls="ui-pane-1" ><input class="ui-tab-input" type="radio" name="uwide-ui-tabs" id="ui-tab-2" aria-label="Kapsam" aria-controls="ui-pane-2" ><div class="ui-tab-labels"><label for="ui-tab-0"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 8V4h5m8 0h5v4M3 16v4h5m8 0h5v-4"/></svg>Kadraj</label><label for="ui-tab-1"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 5v14a7 7 0 0 0 0-14" fill="currentColor"/></svg>Görüntü</label><label for="ui-tab-2"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/></svg>Kapsam</label></div><div class="ui-tab-pages"><div class="ui-pane ui-pane-0" id="ui-pane-0" role="region" aria-label="Kadraj"><label class="field" for="mode">Boyutlandırma<select id="mode"><option value="automatic">Otomatik</option><option value="manual">Manuel</option></select></label><label class="field" for="ratio">Yerleşim<select id="ratio"><option value="auto">Alanı kapla · kenarlar kırpılabilir</option><option value="contain">Videonun tamamını sığdır</option><option value="fill">Esnet · en-boy oranı değişebilir</option></select></label><label class="field" for="edgeStretch">Kenar ağırlıklı esnetme · yaklaşık<output id="edgeStretchOut" for="edgeStretch"></output><input id="edgeStretch" type="range" min="0" max="100" step="1"></label><p class="hint">Kenarları daha fazla, merkezi daha az genişletir. Sıfırda kapalıdır; yüksek değerler görüntüyü bozabilir ve performansı etkileyebilir.</p><details class="manual-detail"><summary>Manuel kadraj araçları</summary><p class="hint">Bu araçları kullanmak için Boyutlandırma seçeneğini Manuel yapın. Otomatik modda araçlar pasiftir.</p><fieldset id="manualControls"><legend>Manuel kadraj</legend><label class="field" for="zoom">Yakınlaştırma<output id="zoomOut" for="zoom"></output><input id="zoom" type="range" min="1" max="2.5" step="0.01"></label><label class="field" for="panX">Yatay konum<output id="panXOut" for="panX"></output><input id="panX" type="range" min="-50" max="50" step="1"></label><label class="field" for="panY">Dikey konum<output id="panYOut" for="panY"></output><input id="panY" type="range" min="-50" max="50" step="1"></label><label class="field" for="stretch">Yatay esnetme<output id="stretchOut" for="stretch"></output><input id="stretch" type="range" min="1" max="1.6" step="0.01"></label><label class="field" for="frameTrim">Üst ve alt kırpma<output id="frameTrimOut" for="frameTrim"></output><input id="frameTrim" type="range" min="0" max="25" step="0.5"></label><label class="field" for="cropAspect">Kırpma oranı (manuel)<select id="cropAspect"><option value="source">Kaynak oranı · ek kırpma yok</option><option value="16:9">16:9</option><option value="16:10">16:10</option><option value="18:9">18:9</option><option value="21:9">21:9</option><option value="32:9">32:9</option><option value="4:3">4:3</option><option value="1:1">1:1 · kare</option><option value="custom">Özel oran</option></select></label><label id="customAspectField" for="customAspect" hidden>Özel oran · genişlik / yükseklik<input id="customAspect" type="number" min="0.5" max="4" step="0.01" inputmode="decimal" value="2.39"></label></fieldset></details><button id="fullFramePreset" type="button">Tam kareye sığdır</button><button class="reset" type="button">Kadrajı sıfırla</button><button id="compareOriginal" type="button" aria-pressed="false">Özgün görünümü karşılaştır</button><details><summary>Kadraj işlemleri</summary><button id="undoFraming" type="button">Son kadraj değişikliğini geri al</button><button id="rescanBars" type="button">Bantları yeniden ölç</button></details><details><summary>Kadraj hakkında</summary><p class="hint">Kaynak videonun içindeki hızlı ışık değişimlerini algılamaz; epilepsi güvenliği garantisi değildir.</p><p class="hint">Bu düğme yalnızca siz bastığınızda özgün görünüm ile Uwide kadrajı arasında geçiş yapar; ayarlarınızı değiştirmez.</p><p class="hint">Otomatik yerleşimde Alanı kapla kenarları kırpabilir; Videonun tamamını sığdır tüm kareyi gösterir ve boşluk bırakabilir. Değişiklikler seçili kayıt kapsamına kaydedilir.</p></details></div><div class="ui-pane ui-pane-1" id="ui-pane-1" role="region" aria-label="Görüntü"><label class="toggle" for="autoPicture"><span>Renk ve parlaklık işlemini uygula (isteğe bağlı)</span><input id="autoPicture" type="checkbox"></label><div class="frame-tools"><button type="button" id="frameToggle">30 → 60 FPS dene</button><div id="frameConsent" hidden><p>Deneysel kare üretimi hızlı harekette çift görüntü veya titreme oluşturabilir. Kaynaktaki flaşlar devam eder. Işığa duyarlı epilepsi açısından güvenliği doğrulanmamıştır.</p><button type="button" id="frameAccept">Bu video için aç</button><button type="button" id="frameCancel">Vazgeç</button></div><small role="status" id="frameStatus"></small></div><fieldset id="pictureControls"><legend>Sabit renk ayarları</legend><label class="field" for="pictureLook">Görüntü modu<select id="pictureLook"><option value="custom" disabled>Özel</option><option value="none">Nötr</option><option value="lift">Hafif</option><option value="movie">Sinema</option><option value="theater">Tiyatro</option><option value="portrait">Doğal ten tonları</option><option value="sport">Spor</option><option value="game">Oyun</option><option value="music">Müzik</option></select></label><p class="hint">Anahtarı açın, ardından parlaklık veya diğer değerleri değiştirin. Varsayılan değerler görüntüyü değiştirmez.</p><label class="field" for="brightness">Parlaklık<output id="brightnessOut" for="brightness"></output><input id="brightness" type="range" min="50" max="150" step="1"></label><label class="field" for="contrast">Kontrast<output id="contrastOut" for="contrast"></output><input id="contrast" type="range" min="50" max="150" step="1"></label><label class="field" for="hdr">Parlak alan vurgusu · SDR<output id="hdrOut" for="hdr"></output><input id="hdr" type="range" min="0" max="100" step="1"></label><p class="hint">Statik eğri SDR görüntüde parlak tonları güçlendirir; gerçek HDR çıkışı oluşturmaz. Yüksek değerler ton kayması, kırpma veya GPU yavaşlaması yapabilir.</p><label class="field" for="shadowLift">Sabit gölge kurtarma<output id="shadowLiftOut" for="shadowLift"></output><input id="shadowLift" type="range" min="0" max="30" step="1"></label><p class="hint">Sabit ton eğrisi koyu tonları daha çok açar; etki yaklaşık kalır ve farklı yayınlarda doğrulanmamıştır.</p><label class="field" for="saturation">Doygunluk<output id="saturationOut" for="saturation"></output><input id="saturation" type="range" min="0" max="200" step="1"></label><label class="field" for="vibrance">Seçici canlılık · yaklaşık<output id="vibranceOut" for="vibrance"></output><input id="vibrance" type="range" min="0" max="100" step="1"></label><label class="field" for="sharpen">Sabit keskinleştirme<output id="sharpenOut" for="sharpen"></output><input id="sharpen" type="range" min="0" max="100" step="1"></label><p class="hint">Varsayılan kapalı; yalnızca sabit SVG filtre uygular. Yüksek değerler halo veya yavaşlama yapabilir.</p><p class="hint">Sabit SVG kromatik eğrisi düşük/orta kromayı daha çok güçlendirmeye çalışır; ton kayması veya kırpma olabilir. Varsayılanı sıfırdır; renk işlemi kapalıyken uygulanmaz. Kapalı renk anahtarı bu ayarı da kapatır.</p></fieldset></div><div class="ui-pane ui-pane-2" id="ui-pane-2" role="region" aria-label="Kapsam"><label class="field" for="framingScope">Kadraj kayıt kapsamı<select id="framingScope">${scopeOptionsMarkup}</select></label><button id="framingScopeClear" class="scope-clear" type="button">Kadraj kapsamını kaldır</button><label class="field" for="pictureScope">Görüntü kayıt kapsamı<select id="pictureScope">${scopeOptionsMarkup}</select></label><button id="pictureScopeClear" class="scope-clear" type="button">Görüntü kapsamını kaldır</button><button id="openFullSettings" class="scope-clear" type="button">Tüm ayarları aç</button><span id="openSettingsStatus" role="status"></span></div></div></div><details id="panelPosition"><summary>Panel konumu ve klavye yardımı</summary><p class="hint">Taşı düğmesini sürükleyin veya odaktayken ok tuşlarını kullanın. Shift ile daha küçük adımlar atabilirsiniz. Aşağıdaki düğmeler sürüklemeden taşır. Konum bu sitede saklanır; ekran değişince görünür alana sığdırılır.</p><div class="position-actions"><button type="button" data-move="left">Sola</button><button type="button" data-move="right">Sağa</button><button type="button" data-move="up">Yukarı</button><button type="button" data-move="down">Aşağı</button><button type="button" class="position-reset">Konumu sıfırla</button></div></details><details><summary>Oynatıcı tanılaması</summary><pre class="diagnostics"></pre><button class="diagnose" type="button">Tanılamayı yenile</button></details></section>`;

    const barLabel=document.createElement('label'),barText=document.createElement('span'),barInput=document.createElement('input');
    barLabel.className='toggle';barLabel.htmlFor='autoBars';barText.textContent='Videonun içindeki siyah bantları algıla';barInput.id='autoBars';barInput.type='checkbox';
    barLabel.append(barText,barInput);const barScopeLabel=document.createElement('label'),barScopeSelect=document.createElement('select'),barScopeClear=document.createElement('button');barScopeLabel.className='field';barScopeLabel.htmlFor='barsScope';barScopeLabel.append(document.createTextNode('Siyah bant kapsamı'));barScopeSelect.id='barsScope';barScopeSelect.innerHTML=scopeOptionsMarkup;barScopeLabel.append(barScopeSelect);barScopeClear.id='barsScopeClear';barScopeClear.className='scope-clear';barScopeClear.type='button';barScopeClear.textContent='Bant algılama kapsamını kaldır';shadow.getElementById('autoPicture').closest('label').before(barScopeLabel,barScopeClear,barLabel);
    const trigger=shadow.querySelector('.trigger'),panel=shadow.querySelector('.panel'),close=shadow.querySelector('.close');
    const nativePopover='popover' in HTMLElement.prototype;
    const nativeCommands='commandForElement' in HTMLButtonElement.prototype;
    const isOpen=()=>nativePopover?panel.matches(':popover-open'):panel.hasAttribute('open');
    let customPosition=null,drag=null,savedPanelPosition=panelPositionsCache?.[(siteHost||location.hostname).toLowerCase()]||null;
    const savedPositionHost=(siteHost||location.hostname).toLowerCase();
    const handle=shadow.querySelector('.drag-handle'),positionDetails=shadow.getElementById('panelPosition');
    const announcePosition=message=>{shadow.querySelector('.position-status').textContent=message;};
    const restoreSavedPanelPosition=()=>{
      if(!savedPanelPosition||customPosition)return;
      const view=window.visualViewport,width=view?.width||innerWidth,height=view?.height||innerHeight,left=view?.offsetLeft||0,top=view?.offsetTop||0,rect=panel.getBoundingClientRect(),panelWidth=Math.min(340,width-16),panelHeight=Math.min(Math.max(rect.height,savedPanelPosition.height),height-16);
      customPosition={left:left+8+savedPanelPosition.x*Math.max(0,width-panelWidth-16),top:top+8+savedPanelPosition.y*Math.max(0,height-panelHeight-16),height:panelHeight};savedPanelPosition=null;
    };
    const positionPanel=()=>{
      const r=trigger.getBoundingClientRect(),view=window.visualViewport;
      const width=view?.width||innerWidth,height=view?.height||innerHeight;
      const left=view?.offsetLeft||0,top=view?.offsetTop||0;
      const panelWidth=Math.min(340,width-16);
      if(!customPosition&&savedPanelPosition)restoreSavedPanelPosition();
      if(customPosition){
        panel.style.maxHeight=`${Math.min(customPosition.height,height-16)}px`;
        const panelHeight=panel.getBoundingClientRect().height||customPosition.height;
        customPosition.left=clamp(customPosition.left,left+8,Math.max(left+8,left+width-panelWidth-8));
        customPosition.top=clamp(customPosition.top,top+8,Math.max(top+8,top+height-panelHeight-8));
        panel.style.left=`${customPosition.left}px`;panel.style.top=`${customPosition.top}px`;panel.style.bottom='auto';return;
      }
      panel.style.left=`${Math.max(left+8,Math.min(r.right-panelWidth,left+width-panelWidth-8))}px`;
      if(r.top-top>height/2){panel.style.top='auto';panel.style.bottom=`${Math.max(8,innerHeight-r.top+8)}px`;panel.style.maxHeight=`${Math.max(48,r.top-top-16)}px`;}
      else{panel.style.bottom='auto';panel.style.top=`${r.bottom+8}px`;panel.style.maxHeight=`${Math.max(48,top+height-r.bottom-16)}px`;}
    };
    const movePanel=(left,top)=>{
      savedPanelPosition=null;
      if(!customPosition){const rect=panel.getBoundingClientRect();customPosition={left:rect.left,top:rect.top,height:rect.height};}
      customPosition.left=left;customPosition.top=top;positionPanel();
    };
    const directions={left:[-1,0,'Panel sola taşındı.'],right:[1,0,'Panel sağa taşındı.'],up:[0,-1,'Panel yukarı taşındı.'],down:[0,1,'Panel aşağı taşındı.']};
    const persistPanelPosition=()=>{const rect=panel.getBoundingClientRect();if(!rect.width||!rect.height)return;const view=window.visualViewport,width=view?.width||innerWidth,height=view?.height||innerHeight,left=view?.offsetLeft||0,top=view?.offsetTop||0;writePanelPosition(savedPositionHost,{x:clamp((rect.left-left-8)/Math.max(1,width-rect.width-16),0,1),y:clamp((rect.top-top-8)/Math.max(1,height-rect.height-16),0,1),height:rect.height}).catch(()=>announcePosition('Panel taşındı; konumu bu cihazda kaydedilemedi.'));};
    const moveDirection=(direction,step=20)=>{const rect=panel.getBoundingClientRect(),[dx,dy,message]=directions[direction];movePanel(rect.left+dx*step,rect.top+dy*step);persistPanelPosition();announcePosition(message);};
    handle.hidden=false;
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0||!event.isPrimary)return;
      const rect=panel.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top,moved:false};handle.setPointerCapture(event.pointerId);
    });
    let suppressHandleClick=false;
    handle.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<4)return;
      drag.moved=true;handle.classList.add('dragging');movePanel(event.clientX-drag.offsetX,event.clientY-drag.offsetY);
    });
    const endDrag=()=>{if(drag?.moved){suppressHandleClick=true;persistPanelPosition();announcePosition('Panel konumu değiştirildi.');}drag=null;handle.classList.remove('dragging');};
    handle.addEventListener('pointerup',event=>{endDrag();if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);});
    handle.addEventListener('pointercancel',()=>{endDrag();suppressHandleClick=false;});handle.addEventListener('lostpointercapture',endDrag);
    handle.addEventListener('click',()=>{if(suppressHandleClick){suppressHandleClick=false;return;}positionDetails.open=!positionDetails.open;});
    handle.addEventListener('keydown',event=>{const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[event.key];if(direction){event.preventDefault();event.stopPropagation();moveDirection(direction,event.shiftKey?5:20);}});
    positionDetails.addEventListener('toggle',()=>{handle.setAttribute('aria-expanded',String(positionDetails.open));if(isOpen())positionPanel();});
    for(const button of shadow.querySelectorAll('[data-move]'))button.addEventListener('click',()=>moveDirection(button.dataset.move));
    shadow.querySelector('.position-reset').addEventListener('click',()=>{customPosition=null;savedPanelPosition=null;positionPanel();writePanelPosition(savedPositionHost,null).catch(()=>announcePosition('Varsayılan konuma döndü; kayıt temizlenemedi.'));announcePosition('Panel oynatıcı kontrollerinin yanına döndü.');});
    const refreshDiagnostics=()=>{shadow.querySelector('.diagnostics').textContent=playerDiagnostics(host.__uwfVideo);};
    host.__uwfClose=()=>{if(drag&&handle.hasPointerCapture(drag.id))handle.releasePointerCapture(drag.id);endDrag();if(nativePopover){if(isOpen())panel.hidePopover();}else panel.removeAttribute('open');trigger.setAttribute('aria-expanded','false');};
    if(nativePopover){
      panel.setAttribute('popover','auto');
      if(nativeCommands){trigger.setAttribute('commandfor','uwidePanel');trigger.setAttribute('command','toggle-popover');}
      else trigger.setAttribute('popovertarget','uwidePanel');
      panel.addEventListener('beforetoggle',event=>{if(event.newState==='open'){positionPanel();refreshDiagnostics();}});
      panel.addEventListener('toggle',()=>{trigger.setAttribute('aria-expanded',String(isOpen()));});
      trigger.addEventListener('click',event=>event.stopPropagation());
    }else{
      trigger.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(isOpen())host.__uwfClose();else{positionPanel();refreshDiagnostics();panel.setAttribute('open','');trigger.setAttribute('aria-expanded','true');close.focus();}});
    }
    trigger.addEventListener('wheel',event=>{
      if(!settings.playerWheelZoom||!event.deltaY)return;
      event.preventDefault();event.stopPropagation();
      const now=performance.now();if(now-lastPlayerWheelAt<90)return;lastPlayerWheelAt=now;
      const wheelScale=clamp(Math.round((settings.wheelScale+(event.deltaY<0?.0414:-.0414))*10000)/10000,1,2.5);
      if(wheelScale!==settings.wheelScale){const changes={wheelScale};settings={...settings,...changes};apply();saveFraming(changes);}
    },{passive:false});
    shadow.getElementById('openFullSettings').addEventListener('click',async()=>{
      const status=shadow.getElementById('openSettingsStatus');
      try{
        const result=await chrome.runtime.sendMessage({type:'uwf-open-options'});
        if(!result?.ok)throw new Error();
        status.textContent='';
      }catch{status.textContent='Ayarlar açılamadı. Video sekmesini yenileyip tekrar deneyin.';}
    });
    close.addEventListener('click',()=>{host.__uwfClose();trigger.focus();});
    host.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();event.stopPropagation();host.__uwfClose();trigger.focus();}},true);
    panel.addEventListener('keydown',event=>event.stopPropagation());
    panel.addEventListener('click',event=>event.stopPropagation());
    shadow.getElementById('pictureLook').addEventListener('change',event=>{
      const preset=globalThis.UwideProfiles.builtins[event.target.value];
      if(preset)saveFraming({shadowLift:0,hdr:0,sharpen:0,...preset});
    });
    const edgeInput=shadow.getElementById('edgeStretch');
    edgeInput.addEventListener('input',()=>{
      const video=host.__uwfVideo;
      if(video){edgePreview.set(video,Number(edgeInput.value));scheduleLayout();}
    });
    for(const id of panelFields){const input=shadow.getElementById(id);input.addEventListener('change',()=>{const value=input.type==='checkbox'?input.checked:['range','number'].includes(input.type)?Number(input.value):input.value;const saved=saveFraming({[id]:value});
      if(id==='edgeStretch'){
        const video=host.__uwfVideo;
        saved.finally(()=>{if(edgePreview.get(video)===value){edgePreview.delete(video);scheduleLayout();syncPlayerPanels();}});
      }});if(input.type==='range')input.addEventListener('input',()=>{const output=shadow.getElementById(`${id}Out`);if(output)output.value=`${['zoom','stretch'].includes(id)?Math.round(Number(input.value)*100):Number(input.value)}%`;});}
    for(const category of ['framing','bars','picture']){shadow.getElementById(`${category}Scope`).addEventListener('change',event=>saveCategoryScope(category,event.target.value));shadow.getElementById(`${category}ScopeClear`).addEventListener('click',()=>clearCategoryScope(category));}
    shadow.getElementById('fullFramePreset').addEventListener('click',()=>saveFraming(UwideProfiles.fullFrameChanges));
    shadow.querySelector('.reset').addEventListener('click',()=>saveFraming({zoom:1,wheelScale:1,shortcutScale:1,panX:0,panY:0,stretch:1,edgeStretch:0,ratio:'auto',cropAspect:'source',customAspect:2.39,autoBars:false,frameTrim:0}));
    shadow.getElementById('compareOriginal').addEventListener('click',()=>{const video=host.__uwfVideo;if(!video?.isConnected||!settings.enabled||!siteAllowed)return;focusReturnUntil=0;comparisonVideo=comparisonVideo===video?null:video;apply();syncPlayerPanels();refreshDiagnostics();});
    shadow.getElementById('undoFraming').addEventListener('click',()=>{
      if(framingUndo?.context===framingContext())saveFraming(framingUndo.values,false);
    });
    shadow.getElementById('rescanBars').addEventListener('click',()=>{
      const state=managed.get(host.__uwfVideo);
      if(!state||!settings.autoBars)return;
      Object.assign(state,{barLocked:false,barCandidate:null,barCount:0,lastBarSample:0,clipFailed:false,rescanning:true});
      apply();
    });
    shadow.querySelector('.diagnose').addEventListener('click',refreshDiagnostics);
    const toggle=shadow.getElementById('frameToggle'),consent=shadow.getElementById('frameConsent'),status=shadow.getElementById('frameStatus');
    let stopFrames=null;
    toggle.onclick=()=>{if(stopFrames)stopFrames();else consent.hidden=false;};
    shadow.getElementById('frameCancel').onclick=()=>{consent.hidden=true;toggle.focus();};
    shadow.getElementById('frameAccept').onclick=event=>{
      if(!event.isTrusted||consent.hidden)return;
      consent.hidden=true;const target=host.__uwfVideo;
      status.textContent='Kaynak kare hızı ölçülüyor…';toggle.textContent='Kare üretimini kapat';
      let ended=false;
      const stop=UwideFrameGen(target,()=>host.isConnected&&selectedVideo===target&&siteAllowed&&settings.enabled&&!isYouTubeShorts(),(message,done)=>{
        status.textContent=message;if(done){ended=true;stopFrames=null;toggle.textContent='30 → 60 FPS dene';}
      });
      if(!ended)stopFrames=stop;
    };
    host.__uwfPositionPanel=()=>{if(isOpen())positionPanel();};
    if(fullscreenButton)fullscreenButton.parentElement?.insertBefore(host,fullscreenButton);playerPanels.add(host);syncPlayerPanels();return host;
  }
  function injectPlayerPanels(){
    if(isYouTubeShorts()){for(const host of playerPanels)host.remove();playerPanels.clear();return;}
    if(!settings.showPlayerButton){for(const host of playerPanels)host.remove();playerPanels.clear();return;}
    if(!panelPositionsReady){if(!panelPositionsLoading){panelPositionsLoading=true;readPanelPositions().catch(()=>{}).then(()=>{panelPositionsReady=true;panelPositionsLoading=false;safeRun(injectPlayerPanels);});}return;}
    const video=activeVideo();if(!video)return;const videoRoot=video.getRootNode(),videoRect=video.getBoundingClientRect();
    const controlSelector='button,[role="button"],.ytp-fullscreen-button,.vjs-fullscreen-control,.jw-icon-fullscreen,[data-plyr="fullscreen"],[data-action*="fullscreen" i],div[class*="fullscreen" i],[aria-label*="fullscreen" i],[title*="fullscreen" i],button[class*="fullscreen" i],[role="button"][class*="fullscreen" i],[data-uia*="fullscreen" i],[data-testid*="fullscreen" i],[data-fullscreen]';
    // Prefer the active HTML5 player even if a second preview overlaps it.
    const player=video.closest('.mgp_container,.mgp_player,.flowplayer,.fp-player,.video-js,.jwplayer,.plyr,.mejs__container,.mejs-container');
    const nativeButton=player?.querySelector('.mgp_fullscreen,.mgp_fullScreen,.mgp_fullscreenButton,.fp-fullscreen,.vjs-fullscreen-control,.jw-icon-fullscreen,[data-plyr="fullscreen"],.mejs__fullscreen-button button,.mejs-fullscreen-button button');
    let fullscreenButton=nativeButton?.parentElement&&nativeButton.getClientRects().length?nativeButton:null;
    // YouTube's right-control rail is stable even while its toolbar fades in
    // and out. Resolve its fullscreen button from the active player first.
    const youtubePlayer=video.closest?.('.html5-video-player');
    const youtubeFullscreen=youtubePlayer?.querySelector('.ytp-right-controls .ytp-fullscreen-button,.ytp-fullscreen-button');
    if(youtubeFullscreen){const r=youtubeFullscreen.getBoundingClientRect();if(r.width>0&&r.height>0)fullscreenButton=youtubeFullscreen;}
    if(!fullscreenButton){
    search:for(const root of roots){for(const button of root.querySelectorAll(controlSelector)){
      if(button.closest?.('[data-uwf-host]')||!visibleControl(button))continue;
      // A document root can contain controls for several players. Keep the
      // extension button with the fullscreen control nearest to the active
      // video, regardless of whether that control lives in a shadow root.
      const buttonRect=button.getBoundingClientRect();if(buttonRect.right<videoRect.left-120||buttonRect.left>videoRect.right+120||buttonRect.bottom<videoRect.top-120||buttonRect.top>videoRect.bottom+120)continue;
      const label=[button.getAttribute('aria-label'),button.getAttribute('title'),button.getAttribute('data-title'),button.getAttribute('data-uia'),button.getAttribute('data-testid'),...[...button.querySelectorAll('[aria-label],[title]')].flatMap(node=>[node.getAttribute('aria-label'),node.getAttribute('title')])].filter(Boolean).join(' ');
      const semanticFullscreen=button.matches('.ytp-fullscreen-button,.vjs-fullscreen-control,.jw-icon-fullscreen,[data-plyr="fullscreen"],[data-action*="fullscreen" i],div[class*="fullscreen" i],[aria-label*="fullscreen" i],[title*="fullscreen" i],button[class*="fullscreen" i],[role="button"][class*="fullscreen" i],[data-uia*="fullscreen" i],[data-testid*="fullscreen" i],[data-fullscreen]');
      if(!semanticFullscreen&&!/(full\s.?screen|fullscreen|tam\s*ekran|pantalla completa|vollbild|plein\s*[ée]cran|schermo\s*intero|全屏|全畫面)/i.test(label))continue;
      const siblingPanel=button.parentElement?.querySelector(':scope > [data-uwf-host]');if(siblingPanel){if(siblingPanel.__uwfVideo===video&&!siblingPanel.dataset.uwfFloating){fullscreenButton=button;break search;}continue;}
      fullscreenButton=button;break search;
    }}
    }
    // The player can replace its control rail while fullscreen/theater mode
    // changes. Reconcile every injected host to one trigger for the active
    // video; stale inline and floating hosts otherwise can survive together.
    const wantFloating=!fullscreenButton;
    let keeper=null;
    // Discover hosts from the DOM as well as our in-memory set. The player can
    // move controls between shadow roots while changing presentation modes;
    // a moved host may then be missed by the set and leave a second trigger.
    const knownHosts=new Set(playerPanels);
    for(const root of roots){try{for(const host of root.querySelectorAll('[data-uwf-host]'))knownHosts.add(host);}catch{}}
    for(const host of knownHosts){
      if(!host.isConnected){playerPanels.delete(host);continue;}
      const matches=host.__uwfVideo===video&&Boolean(host.dataset.uwfFloating)===wantFloating&&(wantFloating||host.parentElement===fullscreenButton.parentElement);
      if(matches&&!keeper)keeper=host;
      else{host.remove();playerPanels.delete(host);}
    }
    if(keeper){playerPanels.add(keeper);if(wantFloating)positionFloatingPanel(keeper);}
    else createPlayerPanel(fullscreenButton,video,wantFloating);
  }
  document.addEventListener('pointerdown',event=>{for(const host of [...playerPanels]){if(!host.isConnected){playerPanels.delete(host);continue;}const panel=host.shadowRoot?.querySelector('.panel'),trigger=host.shadowRoot?.querySelector('.trigger');if(panel?.hasAttribute('open')&&!host.contains(event.target)){panel.removeAttribute('open');trigger?.setAttribute('aria-expanded','false');}}});
  const inspectVideoMotion=event=>{const path=event.composedPath?.()||[event.target],video=path.find(node=>node instanceof HTMLVideoElement);if(video&&managed.has(video))requestAnimationFrame(()=>safeRun(apply));};
  for(const event of ['animationstart','transitionrun','transitionstart'])document.addEventListener(event,inspectVideoMotion,true);
  chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{if(message?.type==='uwf-settings-changed')loadSettings();if(message?.type==='uwf-video-context'){const videoToken=videoTokenFor(activeVideo());if(videoToken)sendResponse({videoToken});}});
  loadSettings();
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='sync'&&Object.keys(changes).some(key=>key in defaults))loadSettings();if(area==='sync'&&changes.keyboardShortcutConfig)loadShortcutConfiguration();if(area==='local'&&(changes.siteOverrides||changes.deviceSettings||changes.sitePolicy))loadSettings();});
  window.addEventListener('keydown',event=>{
    if(!keyboardShortcutConfig.enabled||event.repeat||event.isComposing)return;
    const target=event.composedPath?.()[0]||event.target;if(target?.isContentEditable||target?.closest?.('[role="button"],[role="slider"],[role="menuitem"],[role="textbox"]')||/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target?.tagName||''))return;
    const action=shortcutActionNames.find(name=>{const b=keyboardShortcutConfig.bindings[name];return b&&event.code===b.code&&event.ctrlKey===b.ctrl&&event.altKey===b.alt&&event.shiftKey===b.shift&&event.metaKey===b.meta;});
    if(!action)return;event.preventDefault();event.stopPropagation();runShortcutAction(action);
  },true);
  loadShortcutConfiguration();
  const observer=new MutationObserver(()=>safeRun(()=>{scanOpenRoots();requestAnimationFrame(()=>safeRun(()=>{apply();injectPlayerPanels()}))}));
  const observeDocument=()=>{if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});else document.addEventListener('DOMContentLoaded',observeDocument,{once:true});};observeDocument();
  for(const event of ['play','playing','pause','loadedmetadata','resize','emptied','seeking','seeked','waiting'])document.addEventListener(event,e=>safeRun(()=>{
    const video=e.target;if(!(video instanceof HTMLVideoElement))return;
    const state=managed.get(video),signature=location.href+'\n'+video.currentSrc;
    if((event==='seeking'||event==='waiting')&&state&&video===selectedVideo){
      seekVideo=video;seekSource=video.currentSrc;seekObject=video.srcObject;seekPage=location.href;seekHold=true;seekReturnUntil=0;focusRepairs=0;
      if(fullscreenSettleTimer){clearTimeout(fullscreenSettleTimer);fullscreenSettleTimer=0;}
      set(video,'transition','none');
    }
    if((event==='seeked'||event==='playing'&&!video.seeking)&&video===seekVideo){seekHold=false;seekReturnUntil=performance.now()+750;}
    // emptied is transient during buffering. Reset crop only once metadata
    // confirms a different source/page, never for a same-video seek.
    if(event==='loadedmetadata')reconcileMedia(video);
    requestAnimationFrame(()=>safeRun(apply));
  }),true);
  window.addEventListener('resize',scheduleLayout);window.visualViewport?.addEventListener('resize',scheduleLayout);window.visualViewport?.addEventListener('scroll',scheduleLayout);window.addEventListener('orientationchange',beginPresentationChange);window.addEventListener('blur',lockFocusFrame);window.addEventListener('focus',resumeFocusFrame);window.addEventListener('pageshow',beginPresentationChange);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resumeFocusFrame();else lockFocusFrame();});document.addEventListener('fullscreenchange',()=>{if(!focusHold){focusReturnUntil=0;beginPresentationChange();}},true);
  window.addEventListener('popstate',scheduleLayout);document.addEventListener('yt-navigate-finish',scheduleLayout);

  setInterval(()=>safeRun(()=>{scanOpenRoots();apply();injectPlayerPanels();}),1500);
  window.addEventListener('pagehide',event=>{if(!event.persisted){for(const v of [...managed.keys()])restore(v);for(const [node,state] of captionOffsets)releaseCaption(node,state);captionObserver.disconnect();captionResize?.disconnect();}});
})();
