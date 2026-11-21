globalThis.UwideClient={
  async request(tabId,type='uwf-settings-read',extra={}){
    const result=await chrome.runtime.sendMessage({type,tabId,...extra});
    if(!result?.ok)throw new Error(result?.error||'Ayar servisine ulaşılamadı.');
    return result;
  },
  renderScope(root,result){
    const select=root.getElementById('scope');select.value=result.scope;
    for(const option of select.options){option.disabled=option.value==='video'?!result.videoToken:option.value==='site'?!result.host:option.value==='tab'?!Number.isInteger(result.tabId):false;}
    root.getElementById('scope-clear').disabled=result.scope==='global';
    const descriptions={global:'Genel ayarlar tarayıcı hesabınızla senkronlanır.',device:'Bu cihazın tarayıcı profilinde saklanır; başka cihazlara gönderilmez.',site:`Yalnızca ${result.host} için bu cihazda saklanır.`,tab:'Yalnızca hedef sekmede uygulanır; sekme kapanınca silinir.',video:'Medya kaynağı veya sayfa değişince daha genel ayarlara döner. Kalite değişiminde medya yeniden yüklenirse de sıfırlanabilir.'};
    root.getElementById('scope-help').textContent=descriptions[result.scope]+' Kapsam değiştirmek mevcut kayıtları silmez.';
    for(const category of ['framing','bars','picture']){
      const categorySelect=root.getElementById(`${category}-scope`);if(!categorySelect)continue;
      categorySelect.value=result.categoryIndependent?.[category]?result.categoryScopes[category]:'inherit';
      const clearButton=root.getElementById(`${category}-scope-clear`);if(clearButton)clearButton.disabled=!result.categoryIndependent?.[category];
      for(const option of categorySelect.options){
        const scope=option.value;
        option.disabled=scope==='video'?!result.videoToken:scope==='site'?!result.host:scope==='tab'?!Number.isInteger(result.tabId):scope==='supported'?!result.sitePolicy?.sites?.includes(result.host):false;
      }
    }
  }
};
