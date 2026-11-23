/* Storage model shared by the service worker and extension pages. */
globalThis.UwideSettings=(()=>{
  const defaults=Object.freeze({enabled:true,mode:'automatic',autoPicture:false,zoom:1,wheelScale:1,shortcutScale:1,panX:0,panY:0,ratio:'auto',cropAspect:'source',customAspect:2.39,stretch:1,edgeStretch:0,autoBars:false,frameTrim:0,brightness:100,contrast:100,shadowLift:0,saturation:100,vibrance:0,sharpen:0,hdr:0,ambience:false,glow:24,blur:32,smoothing:75,audioPulse:false,profile:'custom',theme:'dark',showPlayerButton:true,playerWheelZoom:false});
  const limits={zoom:[1,2.5],wheelScale:[1,2.5],shortcutScale:[1,2.5],panX:[-50,50],panY:[-50,50],customAspect:[0.5,4],stretch:[1,1.6],edgeStretch:[0,100],frameTrim:[0,25],brightness:[50,150],contrast:[50,150],shadowLift:[0,30],saturation:[0,200],vibrance:[0,100],sharpen:[0,100],hdr:[0,100],glow:[0,60],blur:[0,100],smoothing:[0,900]};
  const enums={mode:['automatic','manual'],ratio:['auto','contain','fill'],cropAspect:['source','16:9','16:10','18:9','21:9','32:9','4:3','1:1','custom'],theme:['dark','light','ocean','glass']};
  const categories={framing:['mode','zoom','wheelScale','shortcutScale','panX','panY','ratio','cropAspect','customAspect','stretch','edgeStretch','frameTrim'],bars:['autoBars'],picture:['autoPicture','brightness','contrast','shadowLift','saturation','vibrance','sharpen','hdr','ambience','glow','blur','smoothing','audioPulse']};
  const categoryFor=key=>Object.keys(categories).find(category=>categories[category].includes(key))||null;
  const categoryValues=(values,category)=>Object.fromEntries(categories[category].filter(key=>Object.hasOwn(values,key)).map(key=>[key,values[key]]));
  function sitePolicy(value){
    const mode=value?.mode==='list'?'list':'all';
    const sites=Array.isArray(value?.sites)?[...new Set(value.sites.filter(host=>typeof host==='string'&&host.length<=253&&/^[a-z0-9.-]+$/.test(host)&&!host.startsWith('.')&&!host.endsWith('.')))].slice(0,100):[];
    return {mode,sites};
  }
  function sanitize(input){
    const out={};if(!input||typeof input!=='object')return out;
    for(const key of Object.keys(defaults)){
      const value=input[key];if(value===undefined)continue;
      if(key==='ambience'||key==='audioPulse'){out[key]=false;continue;}
      if(limits[key]){if(typeof value==='number'&&Number.isFinite(value))out[key]=Math.max(limits[key][0],Math.min(limits[key][1],value));}
      else if(enums[key]){if(enums[key].includes(value))out[key]=value;}
      else if(typeof defaults[key]==='boolean'){if(typeof value==='boolean')out[key]=value;}
      else if(key==='profile'&&typeof value==='string')out[key]=value.slice(0,100);
    }
    return out;
  }
  function createStore(storage){
    const keyFor=ctx=>Number.isInteger(ctx.tabId)?String(ctx.tabId):'options';
    async function state(){
      const [sync,local,session]=await Promise.all([storage.sync.get(defaults),storage.local.get({siteOverrides:{},deviceSettings:null,categoryDeviceSettings:{},categorySiteOverrides:{},categorySupportedSettings:{},sitePolicy:{mode:'all',sites:[]}}),storage.session.get({tabOverrides:{},videoOverrides:{},categoryTabOverrides:{},categoryVideoOverrides:{},categoryScopeSelections:{},scopeSelections:{}})]);
      return {sync,local,session};
    }
    function resolve(ctx,data){
      const {sync,local,session}=data,key=keyFor(ctx),hasTab=Number.isInteger(ctx.tabId),hasSite=Boolean(ctx.host);
      let scope=session.scopeSelections[key];
      if(!['global','device','site','tab','video'].includes(scope)||((scope==='tab'||scope==='video')&&!hasTab)||(scope==='site'&&!hasSite))scope=hasTab&&session.tabOverrides[key]?'tab':hasSite&&local.siteOverrides[ctx.host]?'site':local.deviceSettings?'device':'global';
      const policy=sitePolicy(local.sitePolicy);
      let values={...defaults,...sanitize(sync)};
      if(scope!=='global')values={...values,...sanitize(local.deviceSettings)};
      if((scope==='site'||scope==='tab'||scope==='video')&&hasSite)values={...values,...sanitize(local.siteOverrides[ctx.host])};
      if(scope==='tab'||scope==='video')values={...values,...sanitize(session.tabOverrides[key])};
      const categoryScopes={};
      const categoryIndependent={};
      for(const category of Object.keys(categories)){
        const selected=session.categoryScopeSelections[key]?.[category];
        const explicit=['global','device','site','tab','video','supported'].includes(selected)&&!((selected==='tab'||selected==='video')&&!hasTab)&&(selected!=='site'||hasSite)&&(selected!=='supported'||hasSite&&policy.sites.includes(ctx.host));
        const supportedDefault=selected!=='inherit'&&hasSite&&policy.sites.includes(ctx.host)&&Object.hasOwn(local.categorySupportedSettings,category);
        categoryIndependent[category]=explicit||supportedDefault;
        const categoryScope=explicit?selected:supportedDefault?'supported':scope;categoryScopes[category]=categoryScope;
        if(!categoryIndependent[category])continue;
        const group={...defaults,...sanitize(sync)};
        if(categoryScope!=='global')Object.assign(group,sanitize(local.categoryDeviceSettings[category]));
        if(categoryScope==='supported'&&policy.sites.includes(ctx.host))Object.assign(group,sanitize(local.categorySupportedSettings[category]));
        if((categoryScope==='site'||categoryScope==='tab'||categoryScope==='video')&&hasSite)Object.assign(group,sanitize(local.categorySiteOverrides[ctx.host]?.[category]));
        if(categoryScope==='tab'||categoryScope==='video')Object.assign(group,sanitize(session.categoryTabOverrides[key]?.[category]));
        Object.assign(values,categoryValues(group,category));
      }
      const baseline={...values};
      if(scope==='video'&&ctx.videoToken&&session.videoOverrides[key]?.token===ctx.videoToken){
        const legacyVideo=sanitize(session.videoOverrides[key].values);
        for(const name of Object.keys(legacyVideo)){const category=categoryFor(name);if(category&&categoryIndependent[category])delete legacyVideo[name];}
        values={...values,...legacyVideo};
      }
      for(const category of Object.keys(categories))if(categoryScopes[category]==='video'&&ctx.videoToken&&session.categoryVideoOverrides[key]?.[category]?.token===ctx.videoToken)Object.assign(values,categoryValues(sanitize(session.categoryVideoOverrides[key][category].values),category));
      return {values,baseline,videoToken:ctx.videoToken||null,scope,categoryScopes,categoryIndependent,host:ctx.host||'',tabId:hasTab?ctx.tabId:null,sitePolicy:policy,siteAllowed:policy.mode==='all'||hasSite&&policy.sites.includes(ctx.host)};
    }
    async function read(ctx){return resolve(ctx,await state());}
    async function select(ctx,scope,category=null){
      if(category&&scope==='inherit'){
        const data=await state(),key=keyFor(ctx),selected={...data.session.categoryScopeSelections[key],[category]:'inherit'};
        if(!Object.hasOwn(categories,category))throw new Error('Geçersiz ayar bölümü.');
        await storage.session.set({categoryScopeSelections:{...data.session.categoryScopeSelections,[key]:selected}});return read(ctx);
      }
      if(!['global','device','site','tab','video','supported'].includes(scope)||scope==='supported'&&!category)throw new Error('Geçersiz kayıt kapsamı.');
      if(category!==null&&!Object.hasOwn(categories,category))throw new Error('Geçersiz ayar bölümü.');
      const data=await state();
      if(scope==='supported'&&(!ctx.host||!sitePolicy(data.local.sitePolicy).sites.includes(ctx.host)))throw new Error('Bu kapsam için önce açık siteyi izinli siteler listesine ekleyin.');
      if(scope==='video'&&(!Number.isInteger(ctx.tabId)||!ctx.videoToken))throw new Error('Video kapsamı için hedef sekmede bir video başlatın.');
      if(scope==='site'&&!ctx.host)throw new Error('Site kapsamı için bir web sekmesi açın.');
      if(scope==='tab'&&!Number.isInteger(ctx.tabId))throw new Error('Sekme kapsamı için bir web sekmesi açın.');
      const current=resolve(ctx,data),key=keyFor(ctx);
      if(category){
        const group=categoryValues(current.values,category);
        if(scope==='global')await storage.sync.set(group);
        if(scope==='device')await storage.local.set({categoryDeviceSettings:{...data.local.categoryDeviceSettings,[category]:group}});
        if(scope==='site')await storage.local.set({categorySiteOverrides:{...data.local.categorySiteOverrides,[ctx.host]:{...data.local.categorySiteOverrides[ctx.host],[category]:group}}});
        if(scope==='supported')await storage.local.set({categorySupportedSettings:{...data.local.categorySupportedSettings,[category]:group}});
        if(scope==='tab')await storage.session.set({categoryTabOverrides:{...data.session.categoryTabOverrides,[key]:{...data.session.categoryTabOverrides[key],[category]:group}}});
        if(scope==='video')await storage.session.set({categoryVideoOverrides:{...data.session.categoryVideoOverrides,[key]:{...data.session.categoryVideoOverrides[key],[category]:{token:ctx.videoToken,values:group}}}});
        await storage.session.set({categoryScopeSelections:{...data.session.categoryScopeSelections,[key]:{...data.session.categoryScopeSelections[key],[category]:scope}}});
        return read(ctx);
      }
      if(scope==='device'&&!data.local.deviceSettings)await storage.local.set({deviceSettings:current.values});
      if(scope==='site'&&!data.local.siteOverrides[ctx.host])await storage.local.set({siteOverrides:{...data.local.siteOverrides,[ctx.host]:current.values}});
      if(scope==='tab'&&!data.session.tabOverrides[key])data.session.tabOverrides[key]=current.values;
      if(scope==='video'&&data.session.videoOverrides[key]?.token!==ctx.videoToken)data.session.videoOverrides[key]={token:ctx.videoToken,values:current.values};
      data.session.scopeSelections[key]=scope;
      await storage.session.set(data.session);
      return read(ctx);
    }
    async function write(ctx,changes){
      const data=await state(),current=resolve(ctx,data),patch=sanitize(changes),key=keyFor(ctx);
      const syncChanges={},localChanges={},sessionChanges={};
      const mergeGeneral=(scope,fields)=>{
        if(scope==='global')Object.assign(syncChanges,fields);
        if(scope==='device')localChanges.deviceSettings={...sanitize(localChanges.deviceSettings??data.local.deviceSettings),...fields};
        if(scope==='site')localChanges.siteOverrides={...data.local.siteOverrides,[ctx.host]:{...sanitize(localChanges.siteOverrides?.[ctx.host]??data.local.siteOverrides[ctx.host]),...fields}};
        if(scope==='tab')sessionChanges.tabOverrides={...data.session.tabOverrides,[key]:{...sanitize(sessionChanges.tabOverrides?.[key]??data.session.tabOverrides[key]),...fields}};
        if(scope==='video'){
          if(!ctx.videoToken)throw new Error('Hedef video hazır değil.');
          const entry=sessionChanges.videoOverrides?.[key]??data.session.videoOverrides[key];
          const existing=entry?.token===ctx.videoToken?sanitize(entry.values):{};
          sessionChanges.videoOverrides={...data.session.videoOverrides,[key]:{token:ctx.videoToken,values:{...existing,...fields}}};
        }
      };
      const general=Object.fromEntries(Object.entries(patch).filter(([name])=>!categoryFor(name)));
      if(Object.keys(general).length)mergeGeneral(current.scope,general);
      for(const category of Object.keys(categories)){
        const categoryPatch=categoryValues(patch,category);if(!Object.keys(categoryPatch).length)continue;
        const selection=data.session.categoryScopeSelections[key]?.[category],selected=selection==='inherit'?null:selection,scope=selected||current.scope;
        if(!selected){mergeGeneral(scope,categoryPatch);continue;}
        const combined=categoryPatch;
        if(scope==='global')Object.assign(syncChanges,combined);
        if(scope==='device'){const groups=localChanges.categoryDeviceSettings??data.local.categoryDeviceSettings;localChanges.categoryDeviceSettings={...groups,[category]:{...sanitize(groups[category]),...combined}};}
        if(scope==='site'){const sites=localChanges.categorySiteOverrides??data.local.categorySiteOverrides,site=sites[ctx.host]||{};localChanges.categorySiteOverrides={...sites,[ctx.host]:{...site,[category]:{...sanitize(site[category]),...combined}}};}
        if(scope==='supported'){const groups=localChanges.categorySupportedSettings??data.local.categorySupportedSettings;localChanges.categorySupportedSettings={...groups,[category]:{...sanitize(groups[category]),...combined}};}
        if(scope==='tab'){const tabs=sessionChanges.categoryTabOverrides??data.session.categoryTabOverrides,tab=tabs[key]||{};sessionChanges.categoryTabOverrides={...tabs,[key]:{...tab,[category]:{...sanitize(tab[category]),...combined}}};}
        if(scope==='video'){
          if(!ctx.videoToken)throw new Error('Hedef video hazır değil.');
          const videos=sessionChanges.categoryVideoOverrides??data.session.categoryVideoOverrides,tab=videos[key]||{},entry=tab[category],existing=entry?.token===ctx.videoToken?sanitize(entry.values):{};
          sessionChanges.categoryVideoOverrides={...videos,[key]:{...tab,[category]:{token:ctx.videoToken,values:{...existing,...combined}}}};
        }
      }
      const writes=[];
      if(Object.keys(syncChanges).length)writes.push(storage.sync.set(syncChanges));
      if(Object.keys(localChanges).length)writes.push(storage.local.set(localChanges));
      if(Object.keys(sessionChanges).length)writes.push(storage.session.set(sessionChanges));
      await Promise.all(writes);
      return read(ctx);
    }
    async function clear(ctx,category=null){
      const data=await state(),current=resolve(ctx,data),key=keyFor(ctx);
      if(category){
        if(!Object.hasOwn(categories,category))throw new Error('Geçersiz ayar bölümü.');
        const scope=current.categoryScopes[category];if(scope==='global')throw new Error('Genel bölüm ayarlarını varsayılanlara sıfırlayın.');
        if(scope==='device')delete data.local.categoryDeviceSettings[category];
        if(scope==='site'&&data.local.categorySiteOverrides[ctx.host])delete data.local.categorySiteOverrides[ctx.host][category];
        if(scope==='supported')delete data.local.categorySupportedSettings[category];
        if(scope==='tab'&&data.session.categoryTabOverrides[key])delete data.session.categoryTabOverrides[key][category];
        if(scope==='video'&&data.session.categoryVideoOverrides[key])delete data.session.categoryVideoOverrides[key][category];
        delete data.session.categoryScopeSelections[key]?.[category];
        await Promise.all([storage.local.set({categoryDeviceSettings:data.local.categoryDeviceSettings,categorySiteOverrides:data.local.categorySiteOverrides,categorySupportedSettings:data.local.categorySupportedSettings}),storage.session.set({categoryTabOverrides:data.session.categoryTabOverrides,categoryVideoOverrides:data.session.categoryVideoOverrides,categoryScopeSelections:data.session.categoryScopeSelections})]);
        return read(ctx);
      }
      if(current.scope==='global')throw new Error('Genel ayarlar silinmez; varsayılanlara sıfırlayabilirsiniz.');
      if(current.scope==='device')await storage.local.set({deviceSettings:null});
      if(current.scope==='site'){delete data.local.siteOverrides[ctx.host];await storage.local.set({siteOverrides:data.local.siteOverrides});}
      if(current.scope==='video')delete data.session.videoOverrides[key];
      if(current.scope==='tab')delete data.session.tabOverrides[key];
      delete data.session.scopeSelections[key];await storage.session.set(data.session);return read(ctx);
    }
    async function updateSites(ctx,change){
      const {local}=await state(),policy=sitePolicy(local.sitePolicy);
      if(change?.mode!==undefined){if(!['all','list'].includes(change.mode))throw new Error('Geçersiz site kuralı.');policy.mode=change.mode;}
      if(change?.action==='add'){
        if(!ctx.host)throw new Error('Listeye eklemek için hedef web sekmesini açın.');
        if(!policy.sites.includes(ctx.host)){if(policy.sites.length>=100)throw new Error('Site listesi en fazla 100 kayıt tutar.');policy.sites.push(ctx.host);}
      }else if(change?.action==='remove'){
        if(typeof change.site!=='string'||!policy.sites.includes(change.site))throw new Error('Listede bu site yok.');
        policy.sites=policy.sites.filter(site=>site!==change.site);
      }else if(change?.action!==undefined)throw new Error('Geçersiz site işlemi.');
      if(change?.mode==='list'&&!policy.sites.length&&ctx.host)policy.sites.push(ctx.host);
      await storage.local.set({sitePolicy:policy});return read(ctx);
    }
    async function removeTab(tabId){const {session}=await state();for(const map of [session.tabOverrides,session.videoOverrides,session.categoryTabOverrides,session.categoryVideoOverrides,session.categoryScopeSelections,session.scopeSelections])delete map[tabId];await storage.session.set(session);}
    async function replaceTab(added,removed){const {session}=await state();for(const map of [session.tabOverrides,session.videoOverrides,session.categoryTabOverrides,session.categoryVideoOverrides,session.categoryScopeSelections,session.scopeSelections]){if(Object.hasOwn(map,removed))map[added]=map[removed];delete map[removed];}await storage.session.set(session);}
    return {read,select,write,clear,updateSites,removeTab,replaceTab};
  }
  return {defaults,sanitize,createStore};
})();
