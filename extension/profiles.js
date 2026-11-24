/* Independent preset model. Profiles never enable dynamic light effects. */
globalThis.UwideProfiles = (() => {
  const ranges = {zoom:[1,2.5],wheelScale:[1,2.5],shortcutScale:[1,2.5],panX:[-50,50],panY:[-50,50],customAspect:[0.5,4],stretch:[1,1.6],edgeStretch:[0,100],frameTrim:[0,25],brightness:[50,150],contrast:[50,150],shadowLift:[0,30],saturation:[0,200],vibrance:[0,100],sharpen:[0,100],hdr:[0,100]};
  function snapshot(input) {
    const out = {};
    for (const [key,[min,max]] of Object.entries(ranges)) {
      if (typeof input[key] === 'number' && Number.isFinite(input[key])) out[key]=Math.min(max,Math.max(min,input[key]));
    }
    // Profiles saved before the approximate shadow control existed must not
    // inherit a nonzero value from the currently active video settings.
    if (!Object.hasOwn(out,'shadowLift')) out.shadowLift=0;
    if (!Object.hasOwn(out,'edgeStretch')) out.edgeStretch=0;
    if (!Object.hasOwn(out,'sharpen')) out.sharpen=0;
    if (['automatic','manual'].includes(input.mode)) out.mode=input.mode;
    if (['auto','contain','fill'].includes(input.ratio)) out.ratio=input.ratio;
    if (['source','16:9','16:10','18:9','21:9','32:9','4:3','1:1','custom'].includes(input.cropAspect)) out.cropAspect=input.cropAspect;
    if (typeof input.autoBars === 'boolean') out.autoBars=input.autoBars;
    // Keep master enable, theme, storage scope and autoPicture as user choices.
    if (!Object.hasOwn(out,'hdr')) out.hdr=0;
    return {...out,ambience:false,audioPulse:false};
  }
  function make(name, values, id=crypto.randomUUID()) {
    name=String(name).trim();
    if (!name || name.length>48) throw new Error('Profil adı 1–48 karakter olmalı.');
    return {id,name,settings:snapshot(values)};
  }
  const fullFrameLayout={mode:'automatic',ratio:'contain',cropAspect:'source',zoom:1,wheelScale:1,shortcutScale:1,panX:0,panY:0,stretch:1,edgeStretch:0,frameTrim:0,autoBars:false};
  function isFullFrame(values){
    return Object.entries(fullFrameLayout).every(([key,value])=>values[key]===value);
  }
  function fullFrameChanges(values){
    if(isFullFrame(values))return {autoPicture:!values.autoPicture};
    return {...fullFrameLayout,profile:'fullFrame',autoPicture:false};
  }
  function renderFullFrame(button,values){
    const active=isFullFrame(values);
    button.textContent=active?(values.autoPicture?'Tam kare · filtre açık':'Tam kare · filtre kapalı'):'Tam kareye sığdır';
    button.title=active?(values.autoPicture?'Renk filtresini kapat':'Renk filtresini aç'):'Videonun tamamını filtresiz göster';
  }
  const builtins = {
    lift:{brightness:102,contrast:104,saturation:103,vibrance:0},
    movie:{brightness:102,contrast:108,saturation:106,vibrance:0},
    theater:{brightness:96,contrast:106,saturation:96,vibrance:0},
    portrait:{brightness:101,contrast:96,saturation:97,vibrance:0},
    sport:{brightness:105,contrast:115,saturation:115,vibrance:0},
    game:{brightness:108,contrast:120,saturation:125,vibrance:0},
    music:{brightness:100,contrast:100,saturation:125,vibrance:15},
    none:{brightness:100,contrast:100,saturation:100,vibrance:0},
    fullFrame:{...fullFrameLayout,brightness:100,contrast:100,shadowLift:0,saturation:100,vibrance:0,hdr:0}
  };
  const format='uwide-free-profiles',version=1,maxBytes=128*1024;
  function exportBundle(profiles){
    return JSON.stringify({format,version,profiles:profiles.map(p=>({name:p.name,settings:snapshot(p.settings)}))},null,2);
  }
  function importBundle(text,existing){
    if(typeof text!=='string'||text.length>maxBytes)throw new Error('Dosya en fazla 128 KB olmalı.');
    let bundle;try{bundle=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('Dosya geçerli JSON değil.');}
    if(!bundle||bundle.format!==format||bundle.version!==version||!Array.isArray(bundle.profiles))throw new Error('Uwide Free profil dosyası (sürüm 1) seçin.');
    if(!bundle.profiles.length)throw new Error('Dosyada profil bulunmuyor.');
    if(existing.length+bundle.profiles.length>30)throw new Error('İçe aktarma toplam 30 profil sınırını aşıyor. Önce yer açın.');
    const names=new Set(existing.map(p=>p.name.toLocaleLowerCase('tr'))),added=[];
    for(const record of bundle.profiles){
      if(!record||typeof record.name!=='string'||!record.settings||typeof record.settings!=='object'||Array.isArray(record.settings))throw new Error('Bir profilin adı veya ayarları geçersiz. Hiçbir profil eklenmedi.');
      const input=record.settings;
      for(const [key,[min,max]] of Object.entries(ranges))if(Object.hasOwn(input,key)&&(typeof input[key]!=='number'||!Number.isFinite(input[key])||input[key]<min||input[key]>max))throw new Error(`${record.name}: ${key} değeri desteklenen aralıkta değil.`);
      for(const [key,allowed] of Object.entries({mode:['automatic','manual'],ratio:['auto','contain','fill'],cropAspect:['source','16:9','16:10','18:9','21:9','32:9','4:3','1:1','custom']}))if(Object.hasOwn(input,key)&&!allowed.includes(input[key]))throw new Error(`${record.name}: ${key} seçimi geçersiz.`);
      if(Object.hasOwn(input,'autoBars')&&typeof input.autoBars!=='boolean')throw new Error(`${record.name}: autoBars değeri geçersiz.`);
      const preset=make(record.name,input),base=preset.name;let suffix=2;
      while(names.has(preset.name.toLocaleLowerCase('tr'))){const tail=` (${suffix++})`;preset.name=base.slice(0,48-tail.length)+tail;}
      names.add(preset.name.toLocaleLowerCase('tr'));added.push(preset);
    }
    return {profiles:[...existing,...added],added};
  }
  return {snapshot,make,builtins,renderFullFrame,fullFrameChanges,exportBundle,importBundle,maxBytes};
})();
