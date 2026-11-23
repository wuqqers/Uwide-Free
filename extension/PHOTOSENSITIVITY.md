# Işık hassasiyeti tasarım sınırları

Uwide Free'nin ürettiği görüntü değişiklikleri olabildiğince durağan olmalıdır. Bu belge bir tıbbi güvenlik sertifikası değildir ve ürün “epilepsi için güvenli” olarak tanımlanamaz. Kaynak videonun kendi flaşlarını, keskin renk geçişlerini veya çizgili desenlerini eklenti kontrol edemez. Özellikle korumalı ve farklı kaynaktan gelen videolarda kareleri okuyamadığı için içerik hakkında güvenlik iddiasında bulunamaz.

## Mevcut korumalar

- Renk ve parlaklık işlemi varsayılan olarak hem otomatik hem manuel kadrajda kapalıdır. Tek anahtarla isteğe bağlı açılır; değerler sabittir, sahneye veya sese göre değişmez.
- Ortam ışığı, ses nabzı, gerçek HDR çıkışı ve kare üretme yoktur. SDR parlak alan vurgusu yalnızca kullanıcı açarsa çalışan sabit bir yaklaşık eğridir. Keskinleştirme ve yaklaşık seçici canlılık yalnızca ana renk işlemi elle açılıp ilgili sıfır varsayılanlı kaydırıcı yükseltilirse sabit SVG filtresi olarak çalışır.
- Arayüzde yanıp sönen durum işareti veya sürekli animasyon kullanılmaz. Sistem hareket azaltma tercihi etkinse ayarlar sayfası, popup ve oynatıcı panelindeki CSS animasyonları/geçişleri ayrıca kapatılır.
- Kromatik cam teması yalnızca panel/ayar yüzeylerinde durağan renk ve kenar vurgusu kullanır; video filtresi, arka plan bulanıklığı veya animasyon eklemez.
- Kadraj güncellemeleri video öğesindeki CSS geçişlerini kapatıp tek adımda uygular; Uwide kapanınca özgün geçiş değeri geri yüklenir. İsteğe bağlı fare tekeri yakınlaştırması varsayılan kapalıdır ve açılırsa yalnızca kullanıcı tekerleği çevirdiğinde sabit adım uygular.
- İsteğe bağlı kısayollar varsayılan kapalıdır; tek tuş basışında bir kadraj eylemi uygular ve tuşu basılı tutmak tekrar oluşturmaz.
- Oynatıcı ölçüleri sabitken tekrar hesaplama aynı stili yeniden yazmaz; sayfa video stiline müdahale ederse eklenti yazmayı durdurur.
- İç siyah bant algılaması yeni kurulumlarda varsayılan olarak kapalıdır. Açılırsa okunabilen karelerde dört tutarlı ölçüm ve en az 4,5 saniyeden sonra bir kez uygulanır; bu tek seferlik kadraj değişikliği fark edilebilir. Aynı medya için daha sonra değişmez. Kare okunamazsa algılama bırakılır.
- Ana etkinleştirme düğmesi bütün eklenti görüntü işlemlerini kapatabilir. Renk anahtarı kapalıyken eklentinin `filter` işlemi temel oynatıcı stiline döner; manuel kadraj renk işlemini kendiliğinden açmaz.

## Bilinen sınırlar ve doğrulama ihtiyacı

- Eklentide dinamik ışık, ses tepkisi, kare sentezi veya gerçek HDR çıkışı yoktur. Keskinleştirme, yaklaşık seçici canlılık ve SDR parlak alan vurgusu yalnızca kullanıcı opt-in verdiğinde etkinleşen statik SVG filtreleridir; gerçek yayın ve GPU uyumluluğu doğrulanmamıştır. 0.4.38 ile kullanılmayan eski SVG filtre ve ses kancaları içerik betiğinden kaldırılmıştı; 0.4.73–0.4.76 filtreleri yeni, ayrı uygulamalardır.
- Referans eklentideki ışık eşitleme hızı görüntü kesmelerini takip eder; hızlı ayar her kesmede ışığı sıçratabilir. Bu dinamik ışık/yayılım/ses nabzı yolları Uwide Free'ye taşınmamıştır.
- Renk/parlaklık ayarı varsayılan kapalıdır; kullanıcı açarsa değer sabit tutulur ve sahneye/sese göre değişmez. İçe aktarılan veya eski kayıtlar HDR/keskinleştirme/dinamik efektleri açamaz; `settings-store.js` bunları etkisizleştirir.
- Kadraj değişimleri video öğesindeki CSS geçişlerini kapatır; ölçüm değişince tek adımda yeniden hesaplanır. Bu, sayfanın kendi video içeriğini veya tarayıcı/GPU kaynaklı bozulmaları denetlemez.
- Kullanıcı tanımlı kırpma oranı (0,50–4,00) yalnızca manuel kadrajda uygulanır. Bu statik geometri ayarı flaş üretmez, ancak kaynak görüntünün görünen alanını değiştirebilir.
- “Tam kare · filtre kapalı” hazır profili videonun tamamını sığdırır, renk işlemini ve iç bant kırpmayı kapatır. Bu yalnızca sabit başlangıç ayarıdır; video kaynağındaki flaşları denetlemez ve tıbbi güvenlik modu değildir.
- İç bant algılaması yalnızca okunabilir karelerde, dört tutarlı ölçüm ve en az 4,5 saniyeden sonra bir kez uygulanır; medya oranı daha sonra değişirse kendiliğinden tekrar analiz etmez.
- Gerçek ekran kaydıyla YouTube/Netflix/Max üzerinde normal, tiyatro ve tam ekran geçişleri doğrulanmamıştır. Bu belge uygulama davranışını tarif eder; tıbbi güvenlik veya sıfır titreme garantisi değildir.

W3C'nin [WCAG 2.2 başarı ölçütü 2.3.1 açıklaması](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold) sayfaların bir saniyede üçten fazla genel/kırmızı flaş içermemesini ya da flaşların tanımlı eşiklerin altında kalmasını ister. Bu erişilebilirlik ölçütü “flaş yok” veya epilepsisi olan her kişi için güvenlik anlamına gelmez; kaynağı analiz edip eşik uygunluğunu doğruladığımızı da iddia etmiyoruz. Video alanını büyütmek kaynak içeriğin kapladığı görsel alanı artırabilir. Uwide Free'nin videonun tamamını sığdırma seçeneği boşluk bırakabilir, ancak kaynaktaki flaşları filtrelemez.
