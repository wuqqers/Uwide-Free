// Local, opt-in temporal interpolation. Midpoints are convex pixel blends.
// Store one previous source frame; never feed a generated frame back as input.
globalThis.UwideFrameGen = function startFrameGen(video, allowed, notify) {
  const abort = new AbortController();
  const source = video.currentSrc, stream = video.srcObject, url = location.href;
  const overlay = document.createElement('canvas');
  const previous = document.createElement('canvas');
  const probe = document.createElement('canvas');
  probe.width = 32; probe.height = 18;
  const sample = probe.getContext('2d', {willReadFrequently:true});
  const out = overlay.getContext('2d', {alpha:false});
  const history = previous.getContext('2d', {alpha:false});
  let awaitingPlay = false;
  let callback = 0, animation = 0, stopped = false, lastTime, oldPixels;
  let steady = 0, irregular = 0, misses = 0, watchdog = 0;
  overlay.setAttribute('aria-hidden','true');
  overlay.dataset.uwfInterpolation = '';
  function stop(message='Kare üretimi kapalı.') {
    if(stopped)return;
    stopped=true; abort.abort(); clearTimeout(watchdog);
    if(callback)video.cancelVideoFrameCallback(callback);
    cancelAnimationFrame(animation); overlay.remove();
    previous.width=overlay.width=0;
    notify(message,true);
  }
  function validContext(){return allowed() && location.href===url && video.isConnected && video.currentSrc===source && video.srcObject===stream && !video.mediaKeys && !document.hidden && document.fullscreenElement!==video && !document.pictureInPictureElement && video.playbackRate===1;}
  function valid(){return validContext() && !video.paused && !video.seeking;}
  function frame(now,meta){
    try {
      if(!valid())return stop();
      clearTimeout(watchdog);watchdog=setTimeout(()=>stop('Oynatma kesildi. Kaynak görüntüye dönüldü.'),500);
      const delta=meta.mediaTime-lastTime; lastTime=meta.mediaTime;
      if(delta>=.031 && delta<=.036)steady++; else steady=0;
      if(!oldPixels && steady<5){if(++misses>90)return stop('Kararlı bir 30 FPS kaynak bulunamadı.');callback=video.requestVideoFrameCallback(frame);return;}
      if(oldPixels && !steady){
        cancelAnimationFrame(animation);
        overlay.style.display='none';
        if(++irregular>=3)return stop('Kare aralığı kararsız. Kaynak görüntüye dönüldü.');
        history.drawImage(video,0,0);sample.drawImage(video,0,0,32,18);
        oldPixels=sample.getImageData(0,0,32,18).data;
        callback=video.requestVideoFrameCallback(frame);return;
      }
      irregular=0;
      const style=getComputedStyle(video);
      if(style.position!=='absolute'||!video.offsetParent||video.videoWidth>1920||video.videoHeight>1080||Array.from(video.textTracks).some(t=>t.mode==='showing'))return stop('Bu oynatıcı düzeni veya çözünürlük desteklenmiyor.');
      if(!oldPixels){
        previous.width=overlay.width=video.videoWidth;previous.height=overlay.height=video.videoHeight;
        video.after(overlay); overlay.style.cssText='position:absolute;pointer-events:none;display:none;margin:0;padding:0;border:0';misses=0;
      }else if(previous.width!==video.videoWidth||previous.height!==video.videoHeight)return stop('Video boyutu değişti.');
      for(const key of ['transform','transformOrigin','objectFit','objectPosition','clipPath','filter','zIndex','borderRadius'])overlay.style[key]=style[key];
      Object.assign(overlay.style,{left:video.offsetLeft+'px',top:video.offsetTop+'px',width:video.offsetWidth+'px',height:video.offsetHeight+'px'});
      sample.drawImage(video,0,0,32,18);const pixels=sample.getImageData(0,0,32,18).data;
      let changed=0;
      if(oldPixels){
        for(let i=0;i<pixels.length;i+=4){
          const difference=Math.max(Math.abs(pixels[i]-oldPixels[i]),Math.abs(pixels[i+1]-oldPixels[i+1]),Math.abs(pixels[i+2]-oldPixels[i+2]));
          if(difference>40)changed++;
        }
      }
      cancelAnimationFrame(animation);
      if(oldPixels && changed<32*18*.12){
        out.globalAlpha=1;out.drawImage(previous,0,0);out.globalAlpha=.5;out.drawImage(video,0,0);out.globalAlpha=1;
        overlay.style.display='block';
        const release=time=>{if(!valid())return stop();if(time<meta.expectedDisplayTime+12){animation=requestAnimationFrame(release);return;}overlay.style.display='none';if(time-meta.expectedDisplayTime>27&&++misses>=3)stop('Ekran kareleri zamanında gösteremedi.');};
        animation=requestAnimationFrame(release);
      }else overlay.style.display='none';
      history.drawImage(video,0,0);if(!oldPixels)notify('30 FPS kaynak algılandı · hedef 60 FPS',false);oldPixels=pixels;
      if(performance.now()-now>16 && ++misses>=3)return stop('İşlem süresi yetersiz.');
      callback=video.requestVideoFrameCallback(frame);
    } catch {stop('Bu videonun kareleri işlenemiyor. Kaynak görüntüye dönüldü.');}
  }
  for(const event of ['seeking','pause','waiting','emptied','ended','ratechange','encrypted','enterpictureinpicture'])video.addEventListener(event,()=>{if(event!=='waiting'||!awaitingPlay)stop();},{signal:abort.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},{signal:abort.signal});
  window.addEventListener('blur',()=>stop(),{signal:abort.signal});
  window.addEventListener('pagehide',()=>stop(),{signal:abort.signal});
  document.addEventListener('fullscreenchange',()=>stop(),{signal:abort.signal});
  if(!video.requestVideoFrameCallback||!sample||!history||!out){stop('Tarayıcıda kare işleme desteği bulunamadı.');return stop;}
  if(video.mediaKeys){stop('Korumalı videoda kare üretimi kullanılamıyor.');return stop;}
  if(video.playbackRate!==1){stop('Kare üretimi için oynatma hızını 1× yapın.');return stop;}
  if(!validContext()||video.seeking){stop('Etkin video hazır olduğunda yeniden deneyin.');return stop;}
  function begin(){
    awaitingPlay=false;
    if(!valid()){stop();return;}
    notify('Kaynak kare hızı ölçülüyor…',false);
    watchdog=setTimeout(()=>stop('Kaynak kare alınamadı.'),1000);
    callback=video.requestVideoFrameCallback(frame);
  }
  if(video.paused){
    awaitingPlay=true;
    notify('Video duraklatıldı. Oynattığınızda kare hızı ölçülecek.',false);
    video.addEventListener('playing',begin,{once:true,signal:abort.signal});
  }else begin();
  return stop;
};
