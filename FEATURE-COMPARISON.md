# Uwide Free ve referans eklenti karşılaştırması

Referans: yerel `Zoom to Fill - Ultrawide Video` 3.0.14 paketindeki
`i18n/tr/features.json`, `i18n/tr/panel.json` ve JavaScript kaynak incelemesi.
REA ile içerik, service worker, uyumluluk, iki Widevine fallback, abonelik ve
popup/options JavaScript kaynakları durağan çözümlendi (`rea-all-js-summary.json`,
`rea-all-js-evidence.json`). 8 JavaScript dosyasında 2.779.944 bayt ve 490.520 AST
düğümü incelendi; 223 bulgu, 0 ayrıştırma hatası raporlandı. 244 envanter dosyası
(başta çeviri ve medya varlıkları) kaynak çözümlemesine seçilmedi. Sınırlı grafik ve
statik çözümleme çalışma zamanı davranışını kanıtlamaz. Manifest Widevine fallback
kodunu belge başlangıcında MAIN dünyaya enjekte ediyor; bu DRM yolu alternatifte
yeniden üretilmiyor. Pakette Ghidra'nın ayrıştıracağı yerel çalıştırılabilir dosya
veya WebAssembly yok; JavaScript'e Ghidra uygulamak anlamlı sonuç vermez.
Özgün uygulama kodu kopyalanmadı.

| İşlev | Uwide Free durumu | Kalan iş |
|---|---|---|
| YouTube Shorts koruması | 0.4.69’dan itibaren `/shorts/` sayfasında efektler ve Uwide kontrolü kapalıdır; önceki Uwide video stilleri geri yüklenir | Shorts dışı sayfa içinde gömülü Shorts oynatıcıları ayrıca doğrulanmalı |
| Yakınlaştırma ve yatay/dikey kaydırma | Manuel modda var | Farklı oynatıcılarda canlı doğrulama |
| Tam ekrana yeniden giriş | 0.4.80 geçici gizlenmede kadrajı korur; geç gelen stil sıfırlamalarında yalnızca değişen tabanı yeniden okur | Sentetik geçiş/odak testleri geçti; Windows Alt+Tab ve gerçek yayın doğrulaması bekleniyor |
| Alanı doldurma, sığdırma, esnetme | Var; otomatik modda oranı koruyarak alanı kapla veya videonun tamamını sığdır; manuel yatay esnetme tam ayarlarda, popup’ta ve oynatıcı panelinde | Gerçek oynatıcı sınırları ve geçişlerde doğrulama |
| Kenara ağırlıklı esnetme | İsteğe bağlı sabit SVG eşleme; merkez daha az, kenarlar daha fazla genişler. İç/dış yatay boşlukları kaynak genişliğinin en fazla 1,6 katına kadar doldurur; varsayılan kapalıdır | Sentetik Chromium görüntü testi geçti; gerçek yayın/GPU uyumluluğu ve referansla eşdeğerlik doğrulanmadı |
| Otomatik siyah bant tespiti | İsteğe bağlıdır ve yeni kurulumlarda kapalı başlar; açılırsa okunabilen karelerde üst-alt ve sağ-sol iç bantları dört tutarlı ölçümden sonra bir kez kırpar, aynı medya boyunca kilitler | Gerçek yayınlarda, DRM ve içerik oranı değişimlerinde doğrulama |
| En-boy oranı | Üç yerleşim seçeneği; manuel modda hazır oranlar veya 0,50–4,00 aralığında kullanıcı tanımlı kırpma | Gerçek platformlarda görsel doğrulama |
| Parlaklık, kontrast, doygunluk | Sabit CSS filtreleri var | Canlı renk doğrulaması |
| Gölgeler ve seçici canlılık | Popup, tam ayarlar ve oynatıcı panelinde sıfır-varsayılan sabit SVG gölge ve kromatik eğrileri var; ana renk işlemi kapalıyken uygulanmaz. Kromatik eğri RGB↔YCbCr dönüşümünde orta kromayı daha çok artırmayı hedefler; birebir referans eşdeğeri değildir | Koyu ton ve kromatik eğriler gerçek yayınlarda doğrulanmalı; renk uzayı dönüşümü ton kaymasına/kırpmaya yol açabilir. Referansın gökyüzünü koruyup balonları artıran örneğiyle eşdeğerlik iddiası yok |
| Keskinleştirme / HDR güçlendirme | İsteğe bağlı sabit SVG konvolüsyon keskinleştirmesi ve SDR için yaklaşık parlak alan eğrisi vardır; ikisi de varsayılan 0’dır ve ana renk anahtarı ister. Gerçek HDR çıkışı yoktur. | Filtrelerin DRM’li ve farklı GPU’lu yayınlarda uyumluluğu doğrulanmadı; halo, ton kayması, kırpma ve yavaşlama yapabilir. SDR eğrisi HDR metadata, geniş renk gamı veya ekranın HDR headroom’unu kullanmaz. |
| Kare üretimi / akıcılık | Yok | İşlem hattı, performans bütçesi, korumalı içerik sınırları |
| Ortam ışığı, ses nabzı, ışık yayılımı ve eşitleme hızı | Devre dışı. Referans eklentide eşitleme hızı, ışığın görüntü kesmelerini ne hızda izleyeceğini ayarlar; hızlı değer her kesmede sıçrar. | Zamana/sahneye/sese bağlı ışık değişimleri ve kare üretimi, kullanıcının titreme/bozulma önceliğiyle çeliştiği için eklenmiyor. |
| Hazır profiller | Renk profilleri statik değer kullanır; “Tam kare · filtre kapalı” profili ayarlar sayfası, popup ve oynatıcı panelinde sığdırma yerleşimi ile kapalı renk/bant işlemeyi uygular | Özgün renk profilleriyle birebir eşitlik yok; hazır profil tıbbi güvenlik modu değildir |
| Özel profiller | Kaydet/uygula/sil/geri al, JSON aktarımı ve isteğe bağlı Chromium tarayıcı eşitlemesi | Eşitleme tarayıcı sağlayıcısına ve profil ayarına bağlı; Chrome Sync kapalıysa cihazlar arasında senkron olmaz |
| Panel temaları | Gece, aydınlık, okyanus; oynatıcı paneli dahil | Gerçek platformlarda görsel doğrulama |
| Kayıt kapsamı | Genel senkron, cihaz, site, sekme ve video | Platformların medya/kalite değişimi davranışında canlı doğrulama |
| Her işlev için ayrı yeniden uygulama kuralı | Kadraj, görüntü ve siyah bant algılama için ayrı kapsam seçilebilir; izinli siteler ayrıca ortak hedef olur | Daha küçük işlev grupları ve bağımsız gerçek yayın doğrulaması |
| Desteklenen siteler listesi | Popup ve ayarlarda yönetilen, cihazda saklanan en fazla 100 site; liste modu kullanıcı seçimiyle açılır | Gerçek yayınlarda domain ve iframe davranışını doğrulama |
| Otomatik yeniden uygulama | Video keşfi ve ayar dinleyicileri var | SPA/reklam/video değişimi testleri |
| Uyumluluk / performans teşhisi | Boyut/mod/medya anahtarı/hata sayısı, toplam/düşen kare ve yenilemeler arasında yaklaşık FPS; sahip olunan inline stil veya etkin video kadraj animasyonu çakışmasında bekler | CSS animasyon denetimi video öğesinin etkin karelerine dayanır; GPU işlem bütçesi ve platform özgü uyumluluk davranışı |
| Oynatıcı düğmesi davranışı | Tıklayınca panel açılır; klavye ile erişilir; simge gizlenebilir; isteğe bağlı sabit adımlı fare tekeri yakınlaştırması; 0.4.42’de YouTube tiyatro modu için kullanıcı atamalı kısayol | Kaydırmayla otomatik tiyatro moduna geçiş yok; yeni kısayol gerçek YouTube oynatıcısında doğrulanmadı |
| Klavye kısayolları | Kadraj eylemlerine ek olarak isteğe bağlı renk işlemi aç/kapat eylemi; atamalar ve kısayol anahtarı kullanıcı denetiminde, varsayılan kapalı, basılı tutma tekrarı yok | Akıcılık/ambiyans gibi dinamik efektler sunulmuyor; atamaların gerçek oynatıcılarda doğrulanması gerekli |
| Panel taşıma | Fare, ok tuşları, yön düğmeleri ve sıfırlama; konum bu cihazda site başına saklanır ve yeni ekran boyutuna göre sınırlandırılır | Canlı yayınlarda kullanılabilirlik kontrolü gerekli |
| Kromatik cam panel görünümü | Popup, oynatıcı paneli ve ayarlar sayfasında isteğe bağlı, sabit renk/kenar vurgulu cam teması; animasyon ve video filtresi yok | Farklı ekranlarda kontrast ve tema görünümü doğrulaması |
| Önce-sonra karşılaştırması | Oynatıcı panelinde kullanıcı denetimli, geçici geçiş; kayıtlı ayarları değiştirmez | Farklı oynatıcılarda görsel doğrulama |

## Kalan özellik farkları: teknik inceleme ve karar

Aşağıdaki öğeler referans incelemesinde bulundu; bazıları kısmi veya yaklaşık biçimde uygulanmıştır, bazıları ise güvenli ve eşdeğer yöntem bulunmadığı için eksiktir. CSS/DOM kadrajı ile gerçek piksel işleme veya oynatma hattı özellikleri aynı şey değildir.

| Eksik özellik | Referanstaki davranış | Durum / uygulama koşulu |
|---|---|---|
| Kenara ağırlıklı esnetme | İsteğe bağlı sabit SVG eşleme; merkez daha az, kenarlar daha fazla genişler. İç/dış yatay boşlukları kaynak genişliğinin en fazla 1,6 katına kadar doldurur; varsayılan kapalıdır | Sentetik Chromium görüntü testi geçti; gerçek yayın/GPU uyumluluğu ve referansla eşdeğerlik doğrulanmadı |
| Seçici canlılık | Zaten doygun renkleri daha az artırıp soluk renkleri seçici güçlendirir | Kısmi yaklaşım: kullanıcı açtığında sabit SVG kromatik eğrisi düşük/orta kromayı daha fazla itmeye çalışır. Kaynak kareleri JavaScript’te yakalamaz; ton kayması ve kırpma olabilir, hue-aware referans davranışıyla birebir değildir. Gerçek yayın/GPU doğrulaması gerekli. |
| Seçici gölge kurtarma | Koyu tonları hedefler, aydınlık tonları mümkün olduğunca korur | Kısmi yaklaşık uygulama: opt-in, 0 varsayılanlı SVG kanal ton eğrisi; koyu tonları daha çok yükseltir. Kare yakalama/JS animasyonu yoktur; DRM, halo ve GPU uyumluluğu gerçek yayınlarda doğrulanmalı. |
| Gerçek HDR yükseltme | Video renk/ton aralığı işleme yolu | Kısmi SDR yaklaşımı: isteğe bağlı sabit kanal eğrisi parlak tonları mevcut SDR aralığında yükseltir. Extended/HDR çıkışı, HDR metadata ve geniş renk gamı desteği yoktur; aynı isimle sunulmaz. |
| Keskinleştirme | Uzamsal yüksek frekans detaylarını işleyen filtre | Uygulandı: isteğe bağlı sabit SVG konvolüsyon filtresi, varsayılan 0; yalnızca görüntü filtresi anahtarı açıldığında uygulanır. Piksel yakalama veya JS kare döngüsü kullanmaz. Yüksek değerlerde halo/GPU yavaşlaması ve yayın uyumluluğu olasılığı nedeniyle kullanıcı testi bekliyor. |
| Kare üretimi / akıcılık | Kaynak kareler arasına tahmini kareler oluşturur | Yok. Tarayıcı eklentisi video decode/present hattını güvenli şekilde değiştiremez; canvas/WebCodecs kopyalama kare düşmesi, gecikme ve DRM kısıtı doğurabilir. Kaynak FPS dönüştürülmez. |
| Ortam ışığı, renk yayılımı, ses nabzı, eşitleme hızı | Video/ses örneklerini izleyip sürekli değişen ışık üretir | Bilinçli olarak yok. Görüntü/sesle değişen ışık ve geçişler, kullanıcının titreme/epilepsi riskini minimumda tutma talebiyle çelişiyor. Sıfır risk garantisi verilemez. |

Seçici renk, HDR, kare üretimi ve dinamik ışık özellikleri hâlâ eşdeğer biçimde uygulanmamıştır; bu yüzden referansla tam işlev eşitliği iddiası yoktur. Gerçek WebGL/Canvas piksel hattı ve zamana/sese bağlı efektlere geçmek, kare hızı ve görüntü kararlılığı riskleri nedeniyle kullanıcının titreşim hassasiyeti önceliğiyle uyuşmuyor. Şimdiki yaklaşım, kararlı DOM kadrajı ve kullanıcı açtığında sabit filtrelerdir.

## Bu çalışma adımındaki değişiklikler

- 0.4.76 sıfır varsayılanlı sabit SDR parlak alan eğrisi ekledi. Bu gerçek HDR işleme değildir; ayar üç arayüzde, profillerde ve kayıt kapsamlarında tutulur.
- 0.4.75 eski genel “Ek doygunluk” artışını yaklaşık seçici canlılık eğrisiyle değiştirdi. Sıfır varsayılanlı sabit SVG RGB↔YCbCr eğrisi JavaScript kare yakalama kullanmaz; ton kayması, kırpma ve GPU maliyeti olasılığı arayüzde açıklanır.
- 0.4.74 koyu ton kurtarmayı sabit SVG ton eğrisiyle uygular; varsayılanı 0’dır, kaynak renk değişimlerine veya sese bağlı değildir. 340 px ayar panelini dar ekranlarda sınırlayıp taşan konum hesabını düzeltti.
- 0.4.73 masaüstü ayarlar sayfasında sidebar ve içerik sütunlarının eski grid kuralıyla çakışmasını düzeltti; Chromium’da 218 px sidebar ve 974 px içerik alanı ölçüldü. Sabit keskinleştirme 0 varsayılanlı, kullanıcı opt-in SVG filtresidir; render sırasında değişmeyen parametreler tekrar yazılmaz. Ayrıca bir istekte farklı ayar gruplarını kaydetmenin birbirini ezmesini önledi.
- 0.4.72 oynatıcı kontrol rayı değişince aktif video için eski inline/yüzen ayar düğümlerini temizleyip tek düğüm bırakır.
- 0.4.71 arayüz renk, kart ve kontrol sistemini popup, ayarlar ve video panelinde yeniledi; sekme seçimi şekil/kenar işareti de kullanır, görünür odak ve dar ekran düzeni korunur.

- 0.4.47 özellik farkı ve ışık hassasiyeti belgelerini kurulum arşivine ekledi; README içinden iki belgeye de erişilir.
- 0.4.48 özel en-boy oranını yapılandırılabilir kırpma oranı kısayol döngüsüne ekledi; özel oran değeri saklanır.
- 0.4.49 oynatıcı paneli ve kadraj sıfırlama kısayolunun özel en-boy oranını da varsayılan değere döndürmesini sağladı.
- 0.4.50 “Tam kare · filtre kapalı” görünümünü popup’a ekledi; eklenti ana anahtarını kendi kendine açmaz ve bu görünümün flaş analizi olmadığını belirtir.
- 0.4.51 popup’taki Tam kare durum mesajını izinli site engelini ve ana etkinleştirme durumunu ayırt edecek şekilde düzenledi.
- 0.4.52 oynatıcı paneline “Tam kare · filtre kapalı” ön ayarını ekledi. Tam kareyi sığdırır, statik renk efektlerini kapatır, yakınlaştırma/kaydırma/esnetmeyi sıfırlar ve eklentinin ana etkinleştirme anahtarına dokunmaz. Kaynak video flaşlarını algılamaz ve tıbbi güvenlik garantisi değildir.
- 0.4.53 yeni kurulumlarda iç siyah bant algılamasını varsayılan kapalı yaptı. Kullanıcı isterse algılamayı açabilir; önceden kaydedilmiş tercihler korunur.
- 0.4.54 ışık hassasiyeti notuna resmi WCAG 2.2 SC 2.3.1 kaynağını ekledi ve ölçütün tıbbi güvenlik garantisi olmadığını belirginleştirdi.
- 0.4.55 kayıtlı ek doygunluk ayarını popup ve oynatıcı panelinde görünür yaptı. Etki sabittir ve ana renk anahtarı kapalıyken çalışmaz; seçici canlılık eşdeğeri değildir.
- 0.4.56 mevcut CSS kontrast filtresini azaltan, sıfır-varsayılan yaklaşık gölge açma kontrolü ekledi. Yeni kare yakalama veya dinamik filtre kullanmaz; tüm tonları etkilediği için seçici gölge işleme eşdeğeri değildir.
- 0.4.57 kullanıcı tarafından atanan kısayollara renk işlemi anahtarını ekledi; varsayılan atama yoktur.
- 0.4.58 kadraj sıfırlama düğmesi ve kısayolunun iç bant algılamasını yanlışlıkla açmasını önledi; sıfırlama artık güvenli varsayılanla uyumludur.
- 0.4.59 gölge kaydırıcısı eklenmeden önce oluşturulmuş profiller bu yeni alanı içermiyorsa profil uygulamasında sıfır kullanır; önceki video ayarından gizlice devralmaz.
- 0.4.60 oynatıcı panelindeki Tam kare ön ayarı da popup ve ayarlar sayfası gibi etkin profili `fullFrame` olarak kaydeder.
- 0.4.61 popup açıldığında kaynak flaşlarının analiz edilmediğini ve epilepsi güvenliğinin doğrulanmadığını gösteren sabit bir bilgi notu sunar.
- 0.4.62 referansın yerel esnek germe ve canlılık önce/sonra görsellerini karşılaştırma envanterine ekledi; doğrusal esnetme ve global doygunluğun bu efektlere eşdeğer olmadığını belirtti.
- 0.4.63 referansın yerel HDR ve keskinleştirme örneklerini karşılaştırma envanterine ekledi; mevcut CSS parlaklık/kontrast ayarlarının HDR çıkışı ya da detay keskinleştirmesi olmadığını belirtti.
- Ayarlar sayfası Türkçe ve animasyonsuz olarak yeniden kuruldu; numaralı bölüm
  bağlantıları, yerel form kontrolleri ve görünür klavye odağı eklendi.
- Ortak stil sayfası yeniden yazıldı; popup bu tasarımı kullanıyor.
- Özel profiller yerelde veya isteğe bağlı tarayıcı eşitlemesinde saklanıyor. Ad doğrulaması ve 30 kayıt sınırı var.
- Hazır ve özel profiller ana etkinleştirme, tema ve otomatik renk anahtarını değiştirmiyor.
- Profil işlemleri dinamik ışık, HDR ve keskinleştirmeyi etkinleştirmiyor.
- Oynatıcı paneli yeniden tasarlandı; Türkçe etiketler, üç tema, kaydırmada sabit
  başlık, dar ekran sınırlandırması ve yerel popover açma/kapatma eklendi.
- Otomatik modda manuel kontroller gizleniyor; renk anahtarı kapalıysa renk
  sürgüleri de gizleniyor. Ayarlar fare bırakıldığında/klavye değişimiyle kaydediliyor.
- Oynatıcıdan yapılan kayıtlar sıralanıyor; aynı panelde hızlı değişiklikler
  birbirinin site ayarlarını eski veriyle ezmiyor.
- Kayıt kapsamı ortak bir servis üzerinden yönetiliyor. Genel ayarlar sync,
  cihaz/site ayarları local, sekme ayarları session alanında tutuluyor. Sekme
  kapanınca veya değiştirilince geçici ayarların yaşam döngüsü yönetiliyor.
- Daha önce kaydedilmiş site ayarları okunmaya devam ediyor. Kapsam seçmek başka
  kapsamın kaydını silmiyor; kaldırma işlemi ayrı bir düğmeyle yapılıyor.
- Sayısal kırpma oranları popup, ayarlar ve oynatıcı panelinde bulunuyor; profiller
  bu tercihi saklıyor. Oran hesabı videoWidth/videoHeight ile gerçek görüntüyü
  buluyor. Manuel sığdır/kapla eşit ölçek kullanırken esnet ayrı eksenleri dolduruyor.
  Otomatik mod sayısal kırpma oranını uygulamıyor.
- Profil dışa aktarımı yalnızca ad ve desteklenen görüntü/kadraj değerlerini
  içeriyor. İçe aktarım 128 KB/30 profil sınırı ve şema/değer kontrolü kullanıyor;
  aynı adlara numara ekliyor, mevcut profilleri koruyor ve videoya otomatik uygulamıyor.
- Tam ekran ölçümünde monitör oranından yükseklik türetme kaldırıldı; ölçülen tam
  ekran yüzeyi kullanılıyor. 1600×1000 alanın 1600×900 hesaplanması regresyon testiyle
  yakalandı ve düzeltildi.
- Panel için ayrı taşıma düğmesi, klavye/yön düğmesi alternatifleri ve konum
  sıfırlama eklendi. Panel ekran sınırları içinde tutuluyor; konum hareketleri
  video ayarlarını değiştirmiyor. Yardım ve ekran okuyucu durum bildirimi var.
- Video kapsamı kaynak/sayfa kimliği değiştiğinde daha genel ayarlara dönüyor;
  sekme kapsamı video değişiminde korunuyor. Geçici kimlikler URL içermeyen
  belirteçlerle session alanında tutuluyor. Açık ayarlar paneli medya değişiminde
  yenileniyor. Medyayı yeniden yükleyen kalite değişimleri de sıfırlayabilir.
- Uwide'ın yazdığı inline video stilleri sonradan değiştirilirse işleme duruyor;
  aynı değerleri tekrar tekrar dayatmıyor. Kapatırken yalnızca hâlâ Uwide'ın
  kontrolündeki değerler geri alınıyor, dışarıdan gelen son değişiklikler korunuyor.
  Panel değişen özelliği ve durma nedenini bildiriyor. Devam etmek açık bir
  kapat/aç işlemi gerektiriyor.
- 0.4.13'te iç bant algılama açıldı. 128×72 kare örneğinde yalnızca eşleşen iki
  karşı kenar ve aydınlık merkez kabul ediliyor. Dört tutarlı ölçüm en az 4,5
  saniyeye yayılmadan kırpma yapılmıyor; sonuç medya kimliği değişene kadar
  kilitleniyor. Okunamayan karelerde işlem duruyor. Popup, ayarlar ve oynatıcı
  panelinde bant anahtarı var; tanılama durumu gösteriyor.
- 0.4.14'te site izin listesi eklendi. Varsayılan tüm sitelerdir; liste modu seçilince
  açık hedef site başlangıç listesine alınır. İzin dışı sayfada Uwide video stillerini
  kaldırır, panelde nedeni açıklar ve etkinleştirme kontrolünü kilitler. Site ekleme
  ve çıkarma seçenekleri popup ve ayarlar sayfasında bulunur; liste cihazda saklanır.
- 0.4.17 ayarlar sayfasına geniş ekranda sabit yan gezinme, dar ekranda tek sütunlu
  akış ve görünür bölüme göre `aria-current` durumu ekledi. Görünüm değişimi animasyon
  kullanmaz.
- 0.4.18 renk/parlaklık filtresini manuel kadrajda da varsayılan kapalı ve bağımsız
  anahtara bağlı yaptı. Bu, eklenti kaynaklı görüntü değişimlerini sınırlar; kaynak
  videodaki flaşları analiz etmez veya epilepsi güvenliği garantisi vermez.
- 0.4.19 kadraj ve görüntü tercihleri için bağımsız kayıt kapsamı ekledi. Kapsam
  seçilmemişse önceki ortak kapsam kullanılmaya devam eder; eski kayıtlar korunur.
- 0.4.20 ortak kapsam yazımlarını ayrı kategori kayıtlarından ayırdı ve kullanıcı
  kategoriyi ortak kapsamdan bağımsızlaştırdığında yalnızca o grubun anahtarlarını
  saklar. Bu, diğer kategorilerin değerlerinin yanlışlıkla ortak kapsam içine
  kopyalanmasını önler.
- 0.4.21 siyah bant algılamayı ayrı kapsam seçilebilir bir ayar grubu yaptı; böylece
  bant tercihi kadraj ve görüntü kayıt yerlerinden bağımsız yönetilebilir.
- 0.4.22 oynatıcıdaki ayar paneline kadraj, bant algılama ve görüntü kayıt kapsamı
  seçimlerini ekledi. Hedef sekme/site/video yoksa ilgili seçenekler kapatılır.
- 0.4.23 otomatik doldurmada bağımsız yatay/dikey ölçek yerine oranı koruyan tek
  yakınlaştırma kullandı. En-boy farkı olan alanlarda boşluk yerine kenar kırpma
  oluşabilir; kare/kare grafik biçimleri bozulmaz.
- 0.4.24 Uwide kadrajı yönetirken video öğesinin CSS geçişlerini kapatır; boyut
  değişiklikleri ara ölçek/konum kareleri üretmeden uygulanır ve kapatıldığında
  sayfanın özgün geçişi geri yüklenir.
- 0.4.25 otomatik ölçeği dört ondalık basamağa yuvarlayarak çok küçük ölçüm
  gürültüsünün yinelenen stil yazımı oluşturmasını azaltır.
- 0.4.26 üç ayar grubu için izinli siteler kapsamı ekledi. Grup ayarı listedeki
  sitelerde cihazda ortak uygulanır; açık site listeye ekli değilse seçenek kapalıdır.
- 0.4.27 izinli siteler kapsamını listedeki bütün sitelerde varsayılan olarak
  yeniden uygulayacak hale getirdi. Bölüm başına kapsam kaldırma ve bir sekmede
  ortak varsayılana dönme kontrolleri eklendi.
- 0.4.33 manuel kırpma oranlarına kaynak eklentideki 18:9 seçeneğini ekledi;
  profil kaydı ve içe aktarma doğrulaması da bu oranı tanır.
- 0.4.32 oynatıcı ayar simgesinde varsayılanı kapalı fare tekeri yakınlaştırması
  ekledi. Sabit adımlar mevcut boyutlandırma modunu korur ve geçiş animasyonu
  kullanmaz.
- 0.4.30 videonun `transform`, `filter`, kırpma, nesne yerleşimi ve opaklık
  özelliklerine animasyon uygulayan etkin CSS/WAAPI işlemlerini tanılamaya ekledi.
  Çakışma sırasında Uwide bekler; animasyon bitince yeniden değerlendirir.
- 0.4.29 oynatıcı ayar simgesini göster/gizle tercihini popup ve ayarlara ekledi. Gizleme,
  oynatıcı içi paneli kaldırır; popup ve tam ayarlar erişilebilir kalır.
- 0.4.28 otomatik modda videonun tamamını sığdır seçeneği ekledi. Ölçeği doğal
  video boyutlarından tekdüze hesaplayıp `object-fit: contain` kullanarak oranı
  korur; sığdır seçeneğinde iç bant kırpması uygulamaz. Bu tercih flaş analizi
  yapmaz ve kaynak videonun ışık değişimlerini engellemez.

- 0.4.42 kullanıcı tarafından atanıp ayrıca etkinleştirilen YouTube tiyatro modu kısayolu ekledi. Yalnızca YouTube video oynatıcısındaki boyut düğmesini tıklar; varsayılan ataması yoktur.
- 0.4.43 oynatıcı paneline ve ayarlar sayfasına animasyonsuz Kromatik cam teması ekledi. Tema yalnızca arayüz kartlarını biçimlendirir; video filtresi ve arka plan bulanıklığı kullanmaz.
- 0.4.44 Kromatik cam tema değişkenlerini popup `body` öğesinde de uygular; böylece popup, ayarlar ve oynatıcı paneli aynı görünümü kullanır.
- 0.4.45 manuel yatay esnetme sürgüsünü oynatıcı paneline ekledi; sürgü mevcut sınırlı ölçek aralığını kullanır ve ayar kapsamına kaydedilir.
- 0.4.46 manuel yatay esnetme sürgüsünü popup’taki kadraj bölümüne de ekledi; yalnızca manuel modda görünür ve mevcut kayıt kapsamına yazar.
- 0.4.41 profil aktarımına siyah bant, teker yakınlaştırma ve kısayol ölçeği değerlerini ekledi. “Tam kare · filtre kapalı” profili otomatik sığdırma, sabit nötr renk değerleri, kapalı renk işlemi ve kapalı bant kırpma uygular; tıbbi güvenlik iddiası taşımaz.
- 0.4.40 manuel kadraja 0,50–4,00 arası özel en-boy oranı ekledi. Değer ayar kapsamları ve profil dışa/içe aktarma ile korunur.
- 0.4.39 oynatıcı paneline özgün görünüm/Uwide kadrajı karşılaştırma düğmesi ekledi. Geçiş yalnızca kullanıcı eylemiyle ve animasyonsuz yapılır; kaydedilmiş ayarlar değiştirilmez.
- 0.4.38 kaldırılmayan/erişilebilir hiçbir yolu olmayan SVG keskinleştirme ve ses tepkisi kancalarını içerik betiğinden temizledi; efektlerin zaten çalışmadığını kaynak referanslarıyla doğruladık.
- 0.4.37 panel konumunu bu cihazda site başına saklar; yeni ekran ölçüsünde konumu görünür sınırlara çeker. 0.4.36 özelleştirilebilir klavye kısayolları ekledi: yerleşim, sıfırlama, yakınlaştır/uzaklaştır, bant algılama ve kırpma oranı. Kısayollar varsayılan kapalıdır; tuş tekrarı, metin alanları ve oynatıcı kontrollerinde çalıştırma engellenir; yaygın tarayıcı kısayolları reddedilir.
- 0.4.35 senkron profil dizini kayıtları henüz gelmemişse yerel listeyi korur. 0.4.34 özel profiller için isteğe bağlı `storage.sync` eşitlemesi ekledi. İlk açılışta yerel ve eşitlenmiş profilleri kimliğe göre birleştirir; isim çakışmalarını ayırır; 30 kayıt sınırını aşan geçişi reddeder. Senkron yazım başarısızsa profil listesi değiştirilmez. Eşitlemeyi kapatmak uzak profil kopyalarını temizler, yerel kopyayı korur. Arayüz ve oynatıcı paneli işletim sistemi hareket azaltma tercihi etkin olduğunda kendi CSS animasyon/geçişlerini kapatır; bu, videodaki flaşları incelemez veya engellemez.

## Tarayıcı doğrulaması


ode tests/browser.cjs`, çalışma klasörüne kurulu Playwright ve ayrı Chromium
oturumunda gerçek uzantıyı yükler. Yerel sayfa sabit bir canvas görüntüsünü video
akışına verir; yanıp sönen test görüntüsü kullanılmaz. Testte simgenin kontrol
çubuğu konumu, açma/kapatma/odak, klavye sürgüsü, tanılama, tam ekran, 390 px
panel ve ayarlar yerleşimi, profil kaydet/sil/geri al ve tema yayılımı doğrulandı.
Ek olarak aynı siteyi açan iki sekmenin izolasyonu, paralel ayar yazmalarının
birbirini ezmemesi, kapanan sekmenin temizliği ve yeni sekmenin cihaz ayarlarını
devralması doğrulandı. Model/profil testleri 
ode --test tests/profiles.cjs
tests/settings.cjs` ile çalıştırılır.
`tests/framing.cjs` altı sabit oranı, dikey videoyu, öğe içindeki bantları, trim ve zoom
birleşimini kontrol eder. Özel oran, 0.4.41 profil alanları, Tam kare hazır profili ve 0.4.42 YouTube tiyatro kısayolu otomatik test kapsamına henüz eklenmedi. Tarayıcı testi altı sabit oranın gerçek clip-path çıktısını,
eşit eksen ölçeğini, otomatik modda kırpmanın kalkmasını ve profil saklamasını doğrular.
Tarayıcı testi ayrıca gerçek JSON indirmesini, yeniden içe aktarımı, ad çakışmasını,
hatalı JSON reddini ve mevcut video değerlerinin korunmasını kontrol eder.
`tests/layout.cjs` farklı ekran/yüzey oranlarını kontrol eder. Tarayıcı testi
normal/tiyatro/tam ekran geçişlerinde ortalanmış test videosunun oynatıcı sınırlarını
doldurduğunu ve sabit ölçüde 120 kare boyunca tekrarlanan resize olaylarının video
stilini yeniden yazmadığını doğrular. Bu ölçüm piksel çıktısı/flaş analizi değildir.
Fare sürükleme, ok tuşları, Shift ile ince hareket, yön düğmeleri, dar ekranda
yeniden sınırlandırma ve konum sıfırlama gerçek tarayıcı testinde doğrulanmıştır.
Video kapsamı kaynak değişimi, açık ayarlar panelinin yenilenmesi ve SPA URL
değişimiyle gerçek Chromium'da test edildi; model testi sekme kapsamının aynı
kimlik değişimlerinde korunduğunu ve kapanış temizliğini doğrular.
Stil çakışması testinde sayfa transform/filter değerlerini değiştiriyor. 90 kare
boyunca Uwide'ın bunları yeniden yazmadığı, kapatırken dış değişikliklerin korunduğu
ve yeniden etkinleştirmenin çalıştığı doğrulandı. `tests/style-ownership.cjs`
özellik kaldırma, öncelik değişimi, kilitli durma ve ilgisiz stilleri ayrıca test eder.
Sonuç ve görseller `test-results/` altında. Bu, gerçek YouTube/Netflix/Max
oynatıcıları veya korumalı video çıktısı için doğrulama değildir.
Sentetik bant testleri üst-alt ve sağ-sol iç bantların görünür alanı doldurduğunu,
kilitlenmeden sonra 3,2 saniyede sıfır video stil yazımı olduğunu doğrular.
`test-results/embedded-bars-horizontal.png` ve `embedded-bars-vertical.png`
görsel çıktı örnekleridir; ekran kaydı boyunca flaş analizi değildir.
Site listesi akışı Chromium'da doğrulandı: liste modunu açma, hedefi seçme, dışlama
sonrasında video stillerinin geri alınması ve tekrar eklenince uygulamanın başlaması.

## Tamamlanma sınırı

Bu dosyadaki eksikler tamamlanmadan tüm işlevlerin eşdeğerliği iddia edilemez.
Arayüz ve profil birim testleri, gerçek video çıktısında flaş bulunmadığını
kanıtlamaz. Netflix/Max canlı doğrulaması ve kayıt üzerinden geçiş analizi hâlâ gerekli.
Eklenti kaynak videonun flaşlarını filtrelemiyor; epilepsi açısından güvenlik
garantisi veya sertifika sunulmuyor.

## Kapsam kararı — 23 Kasım 2026

Kullanıcının görüntü kararlılığı ve ışığa duyarlılık önceliği doğrultusunda, kare üretimi/interpolasyon ve eklenti tarafından SDR → HDR yükseltme geliştirme planından çıkarıldı. Bu karar, her 60 FPS veya HDR videonun nöbet tetiklediği anlamına gelmez; bu eklentide bu yeni işleme yollarının ek risk yaratmadığı doğrulanmamıştır.

- Kare üretimi: erişilebilen karelerde ayrı bir GPU işleme hattıyla teknik olarak araştırılabilir. WebCodecs tek başına ara kare üretmez. Hatalı ara kareler, geçişler ve performans kararsızlığı açısından doğrulama yapılmadığı için uygulanmayacak.
- HDR yükseltme: uygun ekran/tarayıcıda WebGPU extended tone mapping teknik olarak mümkündür. Daha yüksek parlaklık ve kontrastın içerikteki flaşları güçlendirme olasılığı nedeniyle uygulanmayacak. Kaynak videonun tarayıcı tarafından doğal HDR oynatılması değiştirilmeyecek.
- Mevcut SDR parlak alan filtresi gerçek HDR değildir. Bu karar mevcut koddan filtre kaldırmaz; kaynak içerik veya mevcut renk/kadraj işlemleri için epilepsi güvenliği iddiası oluşturmaz.
- Kalan çalışma: mevcut kadraj/odak kararlılığı, gerçek yayın uyumluluğu ve performans doğrulaması.

Kaynaklar: https://www.epilepsy.com/what-is-epilepsy/seizure-triggers/photosensitivity ; https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html ; https://developer.chrome.com/docs/web-platform/best-practices/webcodecs ; https://developer.chrome.com/blog/new-in-webgpu-129
