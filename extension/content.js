(() => {
  let contentVersion;
  try{contentVersion=globalThis.chrome?.runtime?.getManifest?.().version;}catch{return;}
  if(!contentVersion)return;
  if(window.__uwideFreeInstalled===contentVersion)return;
  if(window.__uwideFreeInstalled){window.__uwideFreeUpgradeRequired=true;return;}
  window.__uwideFreeInstalled=contentVersion;
  const defaults = { enabled:true, mode:'automatic',autoPicture:false, zoom:1, wheelScale:1,shortcutScale:1, panX:0, panY:0, ratio:'auto',cropAspect:'source',customAspect:2.39, stretch:1, autoBars:false, frameTrim:0, brightness:100, contrast:100, shadowLift:0, saturation:100, vibrance:0, sharpen:0, hdr:0, ambience:false, glow:24, blur:32, smoothing:75, audioPulse:false, profile:'custom', theme:'dark', showPlayerButton:true, playerWheelZoom:false };
  // Wait for persisted settings before changing a video, avoiding a brief
  // default-mode render when a different site or global setting is saved.
  let settings={...defaults,enabled:false},globalSettings={...defaults},siteHost=location.hostname, applying=false, layoutFrame=0, resizeObservedVideo=null,lastPlayerWheelAt=0,comparisonVideo=null;
  const managed=new Map();
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
  let selectedVideo=null;
  function activeVideo(){const available=candidates().sort((a,b)=>rank(b)-rank(a)),best=available[0]||null;if(!best){selectedVideo=null;return null;}if(selectedVideo&&available.includes(selectedVideo)&&rank(best)<rank(selectedVideo)*1.4)return selectedVideo;selectedVideo=best;return best;}
  function remember(v){if(managed.has(v))return managed.get(v);const props={};for(const p of originalProps)props[p]={value:v.style.getPropertyValue(p),priority:v.style.getPropertyPriority(p)};const computed=getComputedStyle(v),origin=computed.transformOrigin.split(/\s+/),width=Math.max(1,v.offsetWidth),height=Math.max(1,v.offsetHeight);const originPercent=origin.slice(0,2).map((part,index)=>{const value=parseFloat(part),size=index?height:width;return Number.isFinite(value)?`${value/size*100}%`:part;}).join(' ');const m={props,expected:{},baseTransform:computed.transform,baseFilter:computed.filter,baseObjectPosition:computed.objectPosition,baseTransformOrigin:originPercent,clipFailed:false};managed.set(v,m);return m;}
  function sameInline(v,p,entry){return v.style.getPropertyValue(p)===entry.value&&v.style.getPropertyPriority(p)===entry.priority;}
  function restore(v){
    const m=managed.get(v);if(!m)return;
    // Restore only values still owned by us; preserve later author changes.
    for(const [p,expected] of Object.entries(m.expected)){
      if(!sameInline(v,p,expected))continue;
      const original=m.props[p];if(original.value)v.style.setProperty(p,original.value,original.priority);else v.style.removeProperty(p);
    }
    managed.delete(v);updateCompatibilityStatus(v,null);
  }
  function set(v,p,value){
    if(v.style.getPropertyValue(p)!==value||v.style.getPropertyPriority(p)!=='important')v.style.setProperty(p,value,'important');
    const m=managed.get(v);if(m)m.expected[p]={value:v.style.getPropertyValue(p),priority:v.style.getPropertyPriority(p)};
  }
  function updateCompatibilityStatus(video,state){
    const conflict=state?.styleConflict||state?.animationConflict;
    const message=!siteAllowed?'Bu site izinli siteler listesinde değil. Eklemek için araç çubuğundaki Uwide simgesini açın.':conflict?`Video görünümünde stil çakışması algılandı (${conflict}). Karşılıklı yazmayı ve olası görüntü bozulmasını önlemek için Uwide bu videoda bekliyor.`:'';
    for(const host of playerPanels){if(host.__uwfVideo!==video)continue;const node=host.shadowRoot?.querySelector('.compat-status');if(node){if(node.textContent!==message)node.textContent=message;node.hidden=!message;}}
  }
  function animatedStyleProperties(video){
    const propertyNames={transform:'transform','transform-origin':'transformOrigin',filter:'filter','clip-path':'clipPath','object-fit':'objectFit','object-position':'objectPosition',opacity:'opacity'};
    const active=new Set();
    try{for(const animation of video.getAnimations?.()||[]){
      const effect=animation.effect;if(!effect||animation.playState==='idle')continue;
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
    const fullscreen=v.getRootNode?.().fullscreenElement||document.fullscreenElement;
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
  function render(v){
    if(!v)return;const remembered=remember(v);if(hasStyleConflict(v,remembered))return;
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
      const scaleX=box.width/visibleWidth,scaleY=box.height/visibleHeight,baseScale=settings.ratio==='contain'?Math.min(scaleX,scaleY):Math.max(scaleX,scaleY),wheelScale=settings.playerWheelZoom?clamp(settings.wheelScale,1,2.5):1,scale=Math.round(Math.min(2.5,baseScale*wheelScale*clamp(settings.shortcutScale,1,2.5))*10000)/10000;
      // A transient layout measurement must not disable later valid fits.
      if(!Number.isFinite(scale)||scale<.5||scale>2.5)return;
      // Use one uniform scale in both layouts. Cover fills the player and may
      // crop edges; contain preserves the whole frame and may leave letterboxes.
      // Apply each sizing update in one paint; author transitions on the video
      // element can otherwise animate intermediate crop/scale states.
      set(v,'transition','none');
      set(v,'transform',base+'scale('+scale+')');
      set(v,'object-position',state.baseObjectPosition||'50% 50%');set(v,'transform-origin','center center');set(v,'object-fit','contain');
      const clipTop=bars?((h-imageHeight)/2+imageHeight*bars.top/100)/h*100:0;
      const clipRight=bars?((w-imageWidth)/2+imageWidth*bars.right/100)/w*100:0;
      const clipBottom=bars?((h-imageHeight)/2+imageHeight*bars.bottom/100)/h*100:0;
      const clipLeft=bars?((w-imageWidth)/2+imageWidth*bars.left/100)/w*100:0;
      set(v,'clip-path',bars?`inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}%)`:'none');
      const baseFilter=state.baseFilter&&state.baseFilter!=='none'?state.baseFilter:'';const picture=settings.autoPicture?`brightness(${clamp(settings.brightness,0,200)}%) contrast(${clamp(settings.contrast-clamp(settings.shadowLift,0,30),0,200)}%) saturate(${clamp(settings.saturation,0,250)+clamp(settings.vibrance,0,100)}%)`:'';set(v,'filter',[baseFilter,picture].filter(Boolean).join(' ')||'none');set(v,'box-shadow','none');set(v,'will-change','auto');return;
    }
    const box=targetBox(v), elementWidth=Math.max(1,v.offsetWidth),elementHeight=Math.max(1,v.offsetHeight);
    // In fill mode, cover the rendered player box. This removes the outer bars
    // created when a 16:9 video is contained in a 16:10 (1920x1200) display.
    const state=managed.get(v),trim=clamp(settings.frameTrim,0,25),bars=settings.autoBars&&settings.cropAspect==='source'?state.detectedBars:null;
    const remainingWidth=Math.max(.1,1-((bars?.left||0)+(bars?.right||0))/100);
    const remainingHeight=Math.max(.1,1-(2*trim+(bars?.top||0)+(bars?.bottom||0))/100);
    const cover=settings.ratio==='auto'||settings.ratio==='cover' ? Math.max(box.width/(elementWidth*remainingWidth),box.height/(elementHeight*remainingHeight)) : 1;
    const wheelScale=settings.playerWheelZoom?clamp(settings.wheelScale,1,2.5):1,zoom=clamp(settings.zoom*wheelScale,1,2.5), sx=clamp(settings.stretch,1,2);
    const tx=clamp(settings.panX,-50,50),ty=clamp(settings.panY,-50,50);
    const sharpFilter='';
    // Picture processing is opt-in in both framing modes.
    const filters=settings.autoPicture?`${sharpFilter}brightness(${clamp(settings.brightness,0,200)}%) contrast(${clamp(settings.contrast-clamp(settings.shadowLift,0,30),0,200)}%) saturate(${clamp(settings.saturation,0,250)+clamp(settings.vibrance,0,100)}%)`:'';
    const baseTransform=state?.baseTransform&&state.baseTransform!=='none'?`${state.baseTransform} `:'';
    const aspectFrame=aspectFrameGeometry({width:elementWidth,height:elementHeight,videoWidth:v.videoWidth,videoHeight:v.videoHeight,targetWidth:box.width,targetHeight:box.height,cropAspect:settings.cropAspect,customAspect:settings.customAspect,trim:settings.frameTrim,layout:settings.ratio,zoom,stretch:settings.stretch});
    set(v,'transition','none');
    if(aspectFrame){
      set(v,'object-fit','contain');set(v,'object-position','50% 50%');set(v,'transform-origin','center center');
      set(v,'transform',`${baseTransform}scale(${aspectFrame.scaleX},${aspectFrame.scaleY}) translate(${tx}%,${ty}%)`);
      set(v,'clip-path',`inset(${aspectFrame.top}% ${aspectFrame.left}% ${aspectFrame.top}% ${aspectFrame.left}%)`);
      set(v,'filter',[state.baseFilter&&state.baseFilter!=='none'?state.baseFilter:'',filters].filter(Boolean).join(' ')||'none');
      set(v,'will-change','auto');renderGlow(v);return;
    }
    set(v,'object-position',state.baseObjectPosition||'50% 50%');
    set(v,'transform',`${baseTransform}scale(${cover*zoom*sx},${cover*zoom}) translate(${tx}%,${ty}%)`);
    set(v,'transform-origin',state?.baseTransformOrigin||'center center');set(v,'filter',[state?.baseFilter&&state.baseFilter!=='none'?state.baseFilter:'',filters].filter(Boolean).join(' ')||'none');set(v,'will-change','transform');
    renderGlow(v);
    if(settings.ratio==='contain')set(v,'object-fit','contain');
    else if(settings.ratio==='fill')set(v,'object-fit','fill');
    else set(v,'object-fit','cover');
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
      if(center/Math.max(1,count)<36||!pairedHorizontal&&!pairedVertical){state.barCandidate=null;state.barCount=0;return false;}
      const bars={top:pairedHorizontal?top*100/height:0,bottom:pairedHorizontal?bottom*100/height:0,left:pairedVertical?left*100/width:0,right:pairedVertical?right*100/width:0};
      const key=Object.values(bars).map(value=>Math.round(value/2)).join(':');
      if(key!==state.barCandidate){state.barCandidate=key;state.barCount=1;state.barCandidateSince=now;return false;}
      state.barCount++;
      if(state.barCount<4||now-state.barCandidateSince<4500)return false;
      state.detectedBars=bars;state.barLocked=true;return true;
    }catch{
      state.clipFailed=true;sampleCanvas=sampleContext=null;return false;
    }
  }
  function scheduleLayout(){if(layoutFrame)return;layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;safeRun(()=>{apply();injectPlayerPanels();for(const host of playerPanels)host.__uwfPositionPanel?.();});});}
  let fullscreenSettleTimer=0,presentationDeadline=0,presentationRetries=0,presentationSignature='';
  function beginPresentationChange(){presentationDeadline=performance.now()+3000;presentationRetries=2;scheduleFullscreenLayout();}
  const presentationStyleObserver=new MutationObserver(()=>safeRun(()=>{
    const video=resizeObservedVideo,state=video&&managed.get(video);
    // Only retry author changes during a bounded presentation transition.
    // Our own writes match expected values and must never trigger a retry loop.
    if(!state||performance.now()>presentationDeadline||presentationRetries<=0)return;
    if(Object.entries(state.expected).some(([property,expected])=>!sameInline(video,property,expected)))scheduleFullscreenLayout();
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
        if(previous&&settings.enabled&&comparisonVideo!==video&&presentationRetries>0){
          presentationRetries--;
          // Players may replace inline styles when changing presentation mode.
          // Rebase once per fullscreen event, preserving the locked content crop.
          // Restore and render in the same frame; never restart this on a poll.
          const crop={};
          for(const key of ['detectedBars','barLocked','barCandidate','barCount','barCandidateSince','lastBarSample','clipFailed'])crop[key]=previous[key];
          restore(video);
          Object.assign(remember(video),crop);
        }
        apply();injectPlayerPanels();
        for(const host of playerPanels)host.__uwfPositionPanel?.();
      }));
    },350);
  }
  function observeVideoLayout(video){
    if(video){
      const box=targetBox(video),signature=[video.offsetWidth,video.offsetHeight,Math.round(box.width),Math.round(box.height)].join(':');
      if(video===resizeObservedVideo&&presentationSignature&&signature!==presentationSignature)beginPresentationChange();
      presentationSignature=signature;
    }else presentationSignature='';
    if(video===resizeObservedVideo)return;
    presentationStyleObserver.disconnect();
    if(video)presentationStyleObserver.observe(video,{attributes:true,attributeFilter:['style']});
    layoutObserver?.disconnect();resizeObservedVideo=video||null;
    let node=video,depth=0;
    while(node&&depth++<13){try{layoutObserver?.observe(node);}catch{}node=node.parentElement||node.getRootNode?.().host||null;}
  }
  const videoIdentities=new WeakMap();let reportedVideoToken;
  function videoTokenFor(video){
    if(!video||!video.isConnected||!video.videoWidth)return null;
    const signature=location.href+'\n'+video.currentSrc;
    let identity=videoIdentities.get(video);
    if(!identity||identity.signature!==signature){identity={signature,token:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`};videoIdentities.set(video,identity);}
    return identity.token;
  }
  function apply(){if(applying)return;applying=true;try{const current=activeVideo();if(comparisonVideo&&comparisonVideo!==current)comparisonVideo=null;observeVideoLayout(current);const token=videoTokenFor(current);if(token!==reportedVideoToken){reportedVideoToken=token;chrome.runtime.sendMessage({type:'uwf-media-updated'}).catch(()=>{});}if(settingsScope==='video'&&token!==appliedVideoToken){appliedVideoToken=token;settings={...settingsBaseline};loadSettings();}for(const v of [...managed.keys()])if(!v.isConnected||!settings.enabled||v!==current)restore(v);if(settings.enabled&&current){if(comparisonVideo===current)restore(current);else{render(current);if(sampleBars(current))render(current);}}}finally{applying=false;}}
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
    if(action==='resetFraming'){saveFraming({zoom:1,wheelScale:1,shortcutScale:1,panX:0,panY:0,stretch:1,ratio:'auto',cropAspect:'source',customAspect:2.39,autoBars:false,frameTrim:0});return;}
    if(action==='zoomIn'||action==='zoomOut'){
      const key=settings.mode==='manual'?'zoom':'shortcutScale',current=clamp(settings[key],1,2.5),next=clamp(Math.round((current+(action==='zoomIn'?.1:-.1))*100)/100,1,2.5);if(next!==current)saveFraming({[key]:next});return;
    }
    if(action==='toggleBars'){saveFraming({autoBars:!settings.autoBars});return;}
    if(action==='togglePicture'){saveFraming({autoPicture:!settings.autoPicture});return;}
    if(action==='cycleAspect'){
      const aspects=['source','16:9','16:10','18:9','21:9','32:9','4:3','1:1','custom'],index=aspects.indexOf(settings.cropAspect);saveFraming({cropAspect:aspects[(index+1)%aspects.length],mode:'manual'});
    }
  }
  function loadSettings(){
    const request=++settingsLoad;
    chrome.runtime.sendMessage({type:'uwf-settings-read',videoToken:videoTokenFor(activeVideo())}).then(response=>safeRun(()=>{
      if(request!==settingsLoad)return;
      if(!response?.ok)throw new Error(response?.error||'Ayarlar yüklenemedi.');
      siteAllowed=response.siteAllowed!==false;
      settings={...response.values,enabled:response.values.enabled&&siteAllowed};settingsBaseline={...response.baseline,enabled:response.baseline.enabled&&siteAllowed};appliedVideoToken=response.videoToken;siteHost=response.host;settingsScope=response.scope;settingsScopeInfo=response;
      apply();injectPlayerPanels();syncPlayerPanels();
    })).catch(error=>safeRun(()=>{throw error;}));
  }
  function saveFraming(changes){
    saveQueue=saveQueue.then(async()=>{
      const response=await chrome.runtime.sendMessage({type:'uwf-settings-write',changes,videoToken:videoTokenFor(activeVideo())});
      if(!response?.ok)throw new Error(response?.error||'Ayarlar kaydedilemedi.');
      loadSettings();
    }).catch(error=>safeRun(()=>{throw error;}));
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
  const panelFields=['enabled','mode','autoBars','autoPicture','zoom','panX','panY','stretch','ratio','cropAspect','customAspect','frameTrim','brightness','contrast','shadowLift','saturation','vibrance'];
  function syncPlayerPanels(){
    for(const host of playerPanels){
      const shadow=host.shadowRoot;if(!shadow)continue;
      host.dataset.theme=settings.theme||'dark';
      const fullFrameButton=shadow.getElementById('fullFramePreset');if(fullFrameButton)fullFrameButton.disabled=!siteAllowed||!host.__uwfVideo?.isConnected;
      const compareButton=shadow.getElementById('compareOriginal');if(compareButton){const showingOriginal=comparisonVideo===host.__uwfVideo;compareButton.setAttribute('aria-pressed',String(showingOriginal));compareButton.textContent=showingOriginal?'Uwide kadrajını göster':'Özgün görünümü karşılaştır';compareButton.disabled=!settings.enabled||!siteAllowed||!host.__uwfVideo?.isConnected;}
      for(const id of panelFields){const input=shadow.getElementById(id);if(!input)continue;const value=settings[id];
        if(input.type==='checkbox')input.checked=Boolean(value);else input.value=value;
        const output=shadow.getElementById(`${id}Out`);if(output)output.value=`${['zoom','stretch'].includes(id)?Math.round(Number(value)*100):Number(value)}%`;
      }
      shadow.getElementById('manualControls').disabled=settings.mode!=='manual';
      shadow.getElementById('manualControls').hidden=settings.mode!=='manual';
      shadow.getElementById('customAspectField').hidden=settings.cropAspect!=='custom';
      shadow.getElementById('enabled').disabled=!siteAllowed;
      shadow.getElementById('pictureControls').disabled=!settings.autoPicture;
      shadow.getElementById('pictureControls').hidden=!settings.autoPicture;
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
      `Video CSS animasyonu: ${animatedStyleProperties(video).join(', ')||'Kadraj özelliklerinde etkin animasyon yok'}`,
      `İşleme: ${!settings.enabled?'Kapalı':state?.styleConflict||state?.animationConflict?'Stil/animasyon çakışması nedeniyle bekliyor':state?.framingBlocked?'Boyut sınırı nedeniyle durduruldu':state?'Uygulanıyor':'Bekleniyor'}`,
      `Fare tekeri: ${settings.playerWheelZoom?`${Math.round(settings.wheelScale*100)}%`:'Kapalı'}`,
      `Renk: ${settings.autoPicture?'Açık':'Kapalı'}`,
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
:host{--surface:#192124;--field:#202c30;--text:#edf5f3;--muted:#b1c1c1;--line:#53686b;--accent:#9be3cb;display:inline-flex;position:relative;vertical-align:middle;z-index:2147483647;font:13px/1.5 system-ui,sans-serif;color:var(--text);color-scheme:dark}
:host([data-theme=light]){--surface:#fff;--field:#eef3ef;--text:#182c28;--muted:#4e625b;--line:#758a80;--accent:#1b6e51;color-scheme:light}
:host([data-theme=ocean]){--surface:#142b3b;--field:#203e50;--text:#edf6ff;--muted:#b3cad9;--line:#597e93;--accent:#9ddbf6}
:host([data-theme=glass]){--surface:#1a2034;--field:#222b45;--text:#f2f4ff;--muted:#c1c9df;--line:#6f7b9f;--accent:#c3caff}
:host([data-theme=glass]) .panel{background:linear-gradient(145deg,#202844,#171d30 72%,#211d35);border-color:#687495;box-shadow:inset 0 1px #ffffff26,0 12px 32px #080b1790,-1px 0 #aa9bff35,1px 0 #78d6ff35}
:host([data-theme=glass]) .trigger{color:#c3caff}
*{box-sizing:border-box}[hidden]{display:none!important}button,input,select{font:inherit}button{cursor:pointer}button,select{color:var(--text);background:var(--field);border:1px solid var(--line);border-radius:8px;min-height:36px;padding:6px 10px}
.trigger{all:initial;box-sizing:border-box;display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:6px;color:#9be3cb;background:transparent;cursor:pointer}.trigger svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.trigger:focus-visible{outline:2px solid #9be3cb;outline-offset:-2px}.trigger:hover{background:#ffffff26}
.panel{display:none;position:fixed;inset:auto;margin:0;width:min(320px,calc(100vw - 16px));max-height:calc(100vh - 24px);overflow:auto;overscroll-behavior:contain;padding:18px;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 32px #0006}
.panel[open]{display:block}.panel:popover-open{display:block}
.top{position:sticky;top:-18px;z-index:1;background:var(--surface);padding-block:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.top h2{font:650 16px/1.3 system-ui;margin:0}.drag-handle{cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}.drag-handle.dragging{cursor:grabbing}.position-actions{display:flex;flex-wrap:wrap;gap:6px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.close{font-size:20px;min-width:36px}.field{display:grid;grid-template-columns:1fr auto;gap:6px;margin:14px 0}.field input[type=range],.field select{grid-column:1/-1;width:100%}input[type=range]{accent-color:var(--accent);min-height:24px;margin:0}output{color:var(--accent);font-variant-numeric:tabular-nums}.toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:42px}.toggle input{width:22px;height:22px;flex-shrink:0;accent-color:var(--accent)}fieldset{border:0;padding:0;margin:16px 0;min-width:0}legend,.hint{font-size:12px;color:var(--muted)}input:disabled,select:disabled{opacity:.5}.reset,.scope-clear,#compareOriginal,#fullFramePreset{width:100%}.scope-clear{min-height:30px;font-size:11px}.scope-clear:disabled{opacity:.5;cursor:not-allowed}#fullFramePreset{border-color:var(--accent);color:var(--accent)}#fullFramePreset:disabled{opacity:.5;cursor:not-allowed}.hint{margin:12px 0 0}details{border-top:1px solid var(--line);padding-top:12px;margin-top:18px}summary{cursor:pointer;padding-block:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 system-ui;color:var(--muted)}.diagnose{width:100%}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
:host{--surface:#171b26;--field:#222838;--text:#f0f2fa;--muted:#a9b2c9;--line:#394258;--accent:#b7afff}
.panel{width:min(340px,calc(100vw - 16px));padding:16px;border-radius:18px;box-shadow:0 20px 60px #0008;border-color:var(--line)}
.top{position:static;padding:0 0 12px;margin:0;border-bottom:1px solid var(--line);gap:8px}.top h2{margin-right:auto;font-size:17px;letter-spacing:-.4px}.top h2 small{font-size:9px;letter-spacing:1px;color:var(--accent)}
.top button{min-height:30px;padding:4px 8px;font-size:12px}.close{font-size:18px!important}.field{margin:10px 0;gap:4px}.toggle{font-size:12px;min-height:40px}.toggle input{width:18px;height:18px}button,select{border-radius:9px;font-size:12px}select{max-width:100%}fieldset{margin:12px 0}.hint{line-height:1.5;font-size:11px;margin:8px 0}.ui-pane>button{margin-top:6px}details{margin-top:10px;padding-top:6px}summary{font-size:12px;color:var(--muted)}.manual-detail{border:1px solid var(--line);padding:8px 10px;border-radius:10px}.trigger{color:#c5bfff}.panel>details{border-top:1px solid var(--line)}

.ui-tabs{position:relative;min-width:0}.ui-tab-input{position:absolute!important;width:1px!important;height:1px!important;clip-path:inset(50%);overflow:hidden}
.ui-tab-labels{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;background:var(--field);border-radius:12px;margin:12px 0}
.ui-tab-labels label{display:block;text-align:center;margin:0;padding:9px 4px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:650;color:var(--muted)}
.ui-pane{display:none}.ui-tab-pages{max-height:min(410px,calc(100dvh - 240px));overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--line) transparent;padding:0 3px 2px 0}
#ui-tab-0:checked ~ .ui-tab-pages .ui-pane-0{display:block}#ui-tab-0:checked ~ .ui-tab-labels label[for="ui-tab-0"]{background:var(--surface);color:var(--accent);box-shadow:0 1px 4px #0002}#ui-tab-0:focus-visible ~ .ui-tab-labels label[for="ui-tab-0"]{outline:2px solid var(--accent);outline-offset:-2px}#ui-tab-1:checked ~ .ui-tab-pages .ui-pane-1{display:block}#ui-tab-1:checked ~ .ui-tab-labels label[for="ui-tab-1"]{background:var(--surface);color:var(--accent);box-shadow:0 1px 4px #0002}#ui-tab-1:focus-visible ~ .ui-tab-labels label[for="ui-tab-1"]{outline:2px solid var(--accent);outline-offset:-2px}#ui-tab-2:checked ~ .ui-tab-pages .ui-pane-2{display:block}#ui-tab-2:checked ~ .ui-tab-labels label[for="ui-tab-2"]{background:var(--surface);color:var(--accent);box-shadow:0 1px 4px #0002}#ui-tab-2:focus-visible ~ .ui-tab-labels label[for="ui-tab-2"]{outline:2px solid var(--accent);outline-offset:-2px}
.ui-tabs .ui-tab-pages .ui-pane-1{display:contents}
.ui-pane-1 > *{display:none}
#ui-tab-1:checked ~ .ui-tab-pages .ui-pane-1 > label[for=autoPicture]{display:flex}
#ui-tab-1:checked ~ .ui-tab-pages .ui-pane-1 > #pictureControls{display:block}
#ui-tab-0:checked ~ .ui-tab-pages .ui-pane-1 > label[for=autoBars]{display:flex}
#ui-tab-2:checked ~ .ui-tab-pages .ui-pane-1 > label[for=barsScope]{display:grid}
#ui-tab-2:checked ~ .ui-tab-pages .ui-pane-1 > #barsScopeClear{display:block}
</style><button class="trigger" type="button" aria-label="Uwide video ayarları" aria-expanded="false" aria-controls="uwidePanel" title="Uwide video ayarları"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"></path></svg></button><section id="uwidePanel" class="panel" role="region" aria-labelledby="panelTitle"><div class="top"><h2 id="panelTitle">Uwide <small>FREE</small></h2><button class="drag-handle" type="button" hidden aria-label="Paneli taşı. Ok tuşlarıyla hareket ettirin; konum seçenekleri için tıklayın." aria-controls="panelPosition" aria-expanded="false">Taşı</button><button class="close" type="button" aria-label="Ayarları kapat">×</button></div><details id="panelPosition"><summary>Panel konumu ve klavye yardımı</summary><p class="hint">Taşı düğmesini sürükleyin veya odaktayken ok tuşlarını kullanın. Shift ile daha küçük adımlar atabilirsiniz. Aşağıdaki düğmeler sürüklemeden taşır. Konum bu sitede saklanır; ekran değişince görünür alana sığdırılır.</p><div class="position-actions"><button type="button" data-move="left">Sola</button><button type="button" data-move="right">Sağa</button><button type="button" data-move="up">Yukarı</button><button type="button" data-move="down">Aşağı</button><button type="button" class="position-reset">Konumu sıfırla</button></div></details><span class="sr-only position-status" role="status"></span><p class="hint compat-status" role="status" hidden></p><label class="toggle" for="enabled"><span>Eklentiyi etkinleştir</span><input id="enabled" type="checkbox"></label><div class="ui-tabs"><input class="ui-tab-input" type="radio" name="uwide-ui-tabs" id="ui-tab-0" aria-label="Kadraj" aria-controls="ui-pane-0" checked><input class="ui-tab-input" type="radio" name="uwide-ui-tabs" id="ui-tab-1" aria-label="Görüntü" aria-controls="ui-pane-1" ><input class="ui-tab-input" type="radio" name="uwide-ui-tabs" id="ui-tab-2" aria-label="Kapsam" aria-controls="ui-pane-2" ><div class="ui-tab-labels"><label for="ui-tab-0">Kadraj</label><label for="ui-tab-1">Görüntü</label><label for="ui-tab-2">Kapsam</label></div><div class="ui-tab-pages"><div class="ui-pane ui-pane-0" id="ui-pane-0" role="region" aria-label="Kadraj"><label class="field" for="mode">Boyutlandırma<select id="mode"><option value="automatic">Otomatik</option><option value="manual">Manuel</option></select></label><label class="field" for="ratio">Yerleşim<select id="ratio"><option value="auto">Alanı kapla · kenarlar kırpılabilir</option><option value="contain">Videonun tamamını sığdır</option><option value="fill">Esnet · yalnızca manuel</option></select></label><details class="manual-detail"><summary>Manuel kadraj araçları</summary><fieldset id="manualControls"><legend>Manuel kadraj</legend><label class="field" for="zoom">Yakınlaştırma<output id="zoomOut" for="zoom"></output><input id="zoom" type="range" min="1" max="2.5" step="0.01"></label><label class="field" for="panX">Yatay konum<output id="panXOut" for="panX"></output><input id="panX" type="range" min="-50" max="50" step="1"></label><label class="field" for="panY">Dikey konum<output id="panYOut" for="panY"></output><input id="panY" type="range" min="-50" max="50" step="1"></label><label class="field" for="stretch">Yatay esnetme<output id="stretchOut" for="stretch"></output><input id="stretch" type="range" min="1" max="1.6" step="0.01"></label><label class="field" for="frameTrim">Üst ve alt kırpma<output id="frameTrimOut" for="frameTrim"></output><input id="frameTrim" type="range" min="0" max="25" step="0.5"></label><label class="field" for="cropAspect">Kırpma oranı (manuel)<select id="cropAspect"><option value="source">Kaynak oranı · ek kırpma yok</option><option value="16:9">16:9</option><option value="16:10">16:10</option><option value="18:9">18:9</option><option value="21:9">21:9</option><option value="32:9">32:9</option><option value="4:3">4:3</option><option value="1:1">1:1 · kare</option><option value="custom">Özel oran</option></select></label><label id="customAspectField" for="customAspect" hidden>Özel oran · genişlik / yükseklik<input id="customAspect" type="number" min="0.5" max="4" step="0.01" inputmode="decimal" value="2.39"></label></fieldset></details><button id="fullFramePreset" type="button">Tam kare · filtre kapalı</button><button class="reset" type="button">Kadrajı sıfırla</button><button id="compareOriginal" type="button" aria-pressed="false">Özgün görünümü karşılaştır</button><details><summary>Kadraj hakkında</summary><p class="hint">Kaynak videonun içindeki hızlı ışık değişimlerini algılamaz; epilepsi güvenliği garantisi değildir.</p><p class="hint">Bu düğme yalnızca siz bastığınızda özgün görünüm ile Uwide kadrajı arasında geçiş yapar; ayarlarınızı değiştirmez.</p><p class="hint">Otomatik yerleşimde Alanı kapla kenarları kırpabilir; Videonun tamamını sığdır tüm kareyi gösterir ve boşluk bırakabilir. Değişiklikler seçili kayıt kapsamına kaydedilir.</p></details></div><div class="ui-pane ui-pane-1" id="ui-pane-1" role="region" aria-label="Görüntü"><label class="toggle" for="autoPicture"><span>Renk ve parlaklık işlemini uygula (isteğe bağlı)</span><input id="autoPicture" type="checkbox"></label><fieldset id="pictureControls"><legend>Sabit renk ayarları</legend><label class="field" for="brightness">Parlaklık<output id="brightnessOut" for="brightness"></output><input id="brightness" type="range" min="50" max="150" step="1"></label><label class="field" for="contrast">Kontrast<output id="contrastOut" for="contrast"></output><input id="contrast" type="range" min="50" max="150" step="1"></label><label class="field" for="shadowLift">Gölge açma · yaklaşık<output id="shadowLiftOut" for="shadowLift"></output><input id="shadowLift" type="range" min="0" max="30" step="1"></label><p class="hint">Kontrastı düşürerek koyu tonları açar; tüm tonları etkiler, seçici gölge işleme değildir.</p><label class="field" for="saturation">Doygunluk<output id="saturationOut" for="saturation"></output><input id="saturation" type="range" min="0" max="200" step="1"></label><label class="field" for="vibrance">Ek doygunluk<output id="vibranceOut" for="vibrance"></output><input id="vibrance" type="range" min="0" max="100" step="1"></label><p class="hint">Ek doygunluk seçici canlılık değildir; renkleri genel olarak artırır. Kapalı renk anahtarı bu ayarı da kapatır.</p></fieldset></div><div class="ui-pane ui-pane-2" id="ui-pane-2" role="region" aria-label="Kapsam"><label class="field" for="framingScope">Kadraj kayıt kapsamı<select id="framingScope">${scopeOptionsMarkup}</select></label><button id="framingScopeClear" class="scope-clear" type="button">Kadraj kapsamını kaldır</button><label class="field" for="pictureScope">Görüntü kayıt kapsamı<select id="pictureScope">${scopeOptionsMarkup}</select></label><button id="pictureScopeClear" class="scope-clear" type="button">Görüntü kapsamını kaldır</button></div></div></div><details><summary>Oynatıcı tanılaması</summary><pre class="diagnostics"></pre><button class="diagnose" type="button">Tanılamayı yenile</button></details></section>`;

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
      const view=window.visualViewport,width=view?.width||innerWidth,height=view?.height||innerHeight,left=view?.offsetLeft||0,top=view?.offsetTop||0,rect=panel.getBoundingClientRect(),panelWidth=Math.min(320,width-16),panelHeight=Math.min(Math.max(rect.height,savedPanelPosition.height),height-16);
      customPosition={left:left+8+savedPanelPosition.x*Math.max(0,width-panelWidth-16),top:top+8+savedPanelPosition.y*Math.max(0,height-panelHeight-16),height:panelHeight};savedPanelPosition=null;
    };
    const positionPanel=()=>{
      const r=trigger.getBoundingClientRect(),view=window.visualViewport;
      const width=view?.width||innerWidth,height=view?.height||innerHeight;
      const left=view?.offsetLeft||0,top=view?.offsetTop||0;
      const panelWidth=Math.min(320,width-16);
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
    close.addEventListener('click',()=>{host.__uwfClose();trigger.focus();});
    host.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();event.stopPropagation();host.__uwfClose();trigger.focus();}},true);
    panel.addEventListener('keydown',event=>event.stopPropagation());
    panel.addEventListener('click',event=>event.stopPropagation());
    for(const id of panelFields){const input=shadow.getElementById(id);input.addEventListener('change',()=>{const value=input.type==='checkbox'?input.checked:['range','number'].includes(input.type)?Number(input.value):input.value;saveFraming(id==='mode'&&value==='automatic'&&settings.ratio==='fill'?{mode:value,ratio:'auto'}:{[id]:value});});if(input.type==='range')input.addEventListener('input',()=>{const output=shadow.getElementById(`${id}Out`);if(output)output.value=`${['zoom','stretch'].includes(id)?Math.round(Number(input.value)*100):Number(input.value)}%`;});}
    for(const category of ['framing','bars','picture']){shadow.getElementById(`${category}Scope`).addEventListener('change',event=>saveCategoryScope(category,event.target.value));shadow.getElementById(`${category}ScopeClear`).addEventListener('click',()=>clearCategoryScope(category));}
    shadow.getElementById('fullFramePreset').addEventListener('click',()=>saveFraming({mode:'automatic',autoPicture:false,zoom:1,wheelScale:1,shortcutScale:1,panX:0,panY:0,ratio:'contain',cropAspect:'source',customAspect:2.39,stretch:1,autoBars:false,frameTrim:0,brightness:100,contrast:100,shadowLift:0,saturation:100,vibrance:0,profile:'fullFrame'}));
    shadow.querySelector('.reset').addEventListener('click',()=>saveFraming({zoom:1,wheelScale:1,shortcutScale:1,panX:0,panY:0,stretch:1,ratio:'auto',cropAspect:'source',customAspect:2.39,autoBars:false,frameTrim:0}));
    shadow.getElementById('compareOriginal').addEventListener('click',()=>{const video=host.__uwfVideo;if(!video?.isConnected||!settings.enabled||!siteAllowed)return;comparisonVideo=comparisonVideo===video?null:video;apply();syncPlayerPanels();refreshDiagnostics();});
    shadow.querySelector('.diagnose').addEventListener('click',refreshDiagnostics);
    host.__uwfPositionPanel=()=>{if(isOpen())positionPanel();};
    if(fullscreenButton)fullscreenButton.parentElement?.insertBefore(host,fullscreenButton);playerPanels.add(host);syncPlayerPanels();return host;
  }
  function injectPlayerPanels(){
    if(!settings.showPlayerButton){for(const host of playerPanels)host.remove();playerPanels.clear();return;}
    if(!panelPositionsReady){if(!panelPositionsLoading){panelPositionsLoading=true;readPanelPositions().catch(()=>{}).then(()=>{panelPositionsReady=true;panelPositionsLoading=false;safeRun(injectPlayerPanels);});}return;}
    const video=activeVideo();if(!video)return;const videoRoot=video.getRootNode(),videoRect=video.getBoundingClientRect();
    const controlSelector='button,[role="button"],.ytp-fullscreen-button,.vjs-fullscreen-control,.jw-icon-fullscreen,[data-plyr="fullscreen"],[data-action*="fullscreen" i],div[class*="fullscreen" i],[aria-label*="fullscreen" i],[title*="fullscreen" i],button[class*="fullscreen" i],[role="button"][class*="fullscreen" i],[data-uia*="fullscreen" i],[data-testid*="fullscreen" i],[data-fullscreen]';
    let fullscreenButton=null;
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
    let inline=null,floating=null;for(const host of [...playerPanels]){if(!host.isConnected){playerPanels.delete(host);continue;}if(host.__uwfVideo===video){if(host.dataset.uwfFloating)floating=host;else inline=host;}}
    if(fullscreenButton){if(floating){floating.remove();playerPanels.delete(floating);}if(!inline)createPlayerPanel(fullscreenButton,video);}
    else if(inline){inline.remove();playerPanels.delete(inline);if(!floating)createPlayerPanel(null,video,true);}
    else if(floating)positionFloatingPanel(floating);else createPlayerPanel(null,video,true);
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
  for(const event of ['play','playing','pause','loadedmetadata','resize','emptied'])document.addEventListener(event,e=>safeRun(()=>{if(e.target instanceof HTMLVideoElement){if(event==='loadedmetadata'||event==='emptied')videoIdentities.delete(e.target);const state=managed.get(e.target);if(state&&(event==='loadedmetadata'||event==='emptied')){state.clipFailed=false;state.barLocked=false;state.detectedBars=null;state.barCandidate=null;state.barCount=0;state.lastBarSample=0;}requestAnimationFrame(()=>safeRun(apply))}}),true);
  window.addEventListener('resize',scheduleLayout);window.visualViewport?.addEventListener('resize',scheduleLayout);window.visualViewport?.addEventListener('scroll',scheduleLayout);window.addEventListener('orientationchange',scheduleLayout);window.addEventListener('pageshow',scheduleLayout);document.addEventListener('fullscreenchange',beginPresentationChange,true);

  setInterval(()=>safeRun(()=>{scanOpenRoots();apply();injectPlayerPanels();}),1500);
  window.addEventListener('pagehide',()=>{for(const v of [...managed.keys()])restore(v);});
})();
