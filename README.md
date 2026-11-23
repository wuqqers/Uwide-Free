# Uwide Free

**Uwide Free is a free Chromium extension for fitting videos to the player.** Adjust framing from the video player itself, including in theater and fullscreen modes.

**Developer:** [Wuqqers](https://www.omerkayaekici.com/tr/)
**Languages:** Turkish and English
**Current release:** 0.4.82
**Browsers:** Chrome and Chromium based browsers, version 119 or newer

Uwide Free is source available under a custom license. You may use, modify, and redistribute it for free, including at work. Selling the extension or a modified or derivative version is prohibited. See [LICENSE](LICENSE) for the complete terms. This is not an OSI approved open source license.

## Features

- **Updated visual design:** Refined the popup, player panel and settings page, including visible focus and responsive layouts.
- **Duplicate control cleanup:** Player panel triggers are reconciled across fullscreen and theater control changes to prevent stale duplicate Uwide buttons.
- **YouTube Shorts:** Shorts pages are excluded; Uwide does not crop or alter their videos.
- **Automatic fit:** Cover the player or fit the complete video frame, with player sizing for regular, theater, and fullscreen layouts.
- **Manual framing:** Set zoom, horizontal and vertical position, aspect ratio, crop, and horizontal stretch.
- **Optional static picture controls:** Adjust brightness, contrast, shadow recovery, saturation, approximate selective vibrance, SDR highlight emphasis, and sharpening. The color switch starts off; SVG shadow recovery, selective vibrance and sharpening default to zero and may affect GPU rendering speed.
- **Compact player panel:** Open the 340 px panel beside the player's fullscreen control. It has Framing, Picture, and Scope tabs, draggable positioning, and player diagnostics.
- **Settings scopes:** Save preferences globally, for this device, a site, a tab, or a video. Some scopes are temporary for the current browser session.
- **Profiles:** Save and apply picture profiles; export and import profile files.
- **Optional black bar detection:** On readable frames, the extension can detect and crop persistent inner black bars. Protected or inaccessible video frames may prevent detection.
- **Reduced visual activity:** No audio reactive lighting, ambient glow, true HDR output, frame generation, or source flash filtering is included. Shadow recovery, selective vibrance, SDR highlight emphasis and sharpening are static SVG filters, zero by default; they do not capture video frames in JavaScript.

## Install from a GitHub Release

Chrome Web Store publication is not provided. Install the extension locally:

1. Download `Uwide-Free-Chromium-0.4.82.zip` from the repository's **Releases** page and extract it to a folder. Alternatively, download the repository and use its `extension` folder.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the folder that contains `manifest.json` (the extracted release folder or the repository's `extension` folder).
5. Refresh your video tab. Click the Uwide control next to the player's fullscreen button.
6. Open full settings from the browser's Extensions page → Uwide Free → **Details** → **Extension options**.

To update, replace the files in the same folder, reload Uwide on the extensions page, and refresh video tabs. Do not load two copies of Uwide at the same time. Updates are manual. The browser may still list Uwide under its Extensions menu even though this extension has no toolbar popup button.

## Privacy and permissions

Read the full [Privacy Notice](PRIVACY.md). The extension does not send data to a developer operated server and contains no analytics, advertising, or telemetry.

- `storage` saves preferences and profiles in Chrome storage. Global preferences use Chrome Sync and may synchronize through the signed in browser account. Custom profile sync is optional.
- `scripting` supports the existing user initiated helper that activates the extension in an already open tab.
- Access to all sites lets the content script find video elements and player controls on different websites and embedded players, then apply the selected framing settings. You can restrict operation with the allowed sites list in settings.
- Site names, tab identifiers, and temporary video identifiers are used to select the right settings scope. They are not sent to the developer.
- Optional black bar detection samples readable video frames locally and does not save or upload those frames.

## Build a release package

No compilation or third party runtime package is required. Extension source files are in `extension/`. With Python 3.9 or newer, run:

```sh
python scripts/package.py
```

The script checks required files, creates a loadable archive under `dist/`, verifies the ZIP, and writes a SHA 256 checksum alongside it. The manifest is placed at the archive root.

## Limitations and light sensitivity

Uwide Free has not been verified as safe for people with epilepsy or photosensitivity. It does not detect or block flashes, rapid color changes, or patterns in the source video; enlarging video can make those effects cover more of the screen. Static color settings are optional and do not change with scenes or audio. Protected video may prevent frame sampling. Compatibility can vary between players. There is no true HDR output, frame generation, or source flash filtering; the static SDR highlight curve is only an approximation. Optional shadow recovery, selective vibrance and sharpening can affect GPU rendering. The SVG chroma curve may shift or clip colors; sharpening may cause halos. Neither filter has been validated on protected streaming video. See [PHOTOSENSITIVITY.md](../extension/PHOTOSENSITIVITY.md) for further information.

When reporting an issue, include the extension version, browser, website, and steps to reproduce. Do not post personal information, cookies, account details, or private media URLs.

## License and contributions

The [Uwide Free Non-Sale License 1.0](LICENSE) allows free use, modification, and redistribution. It prohibits selling the extension and derivative versions, charging for access, or including it in a paid bundle. Use in a business is allowed. MIT is not used because MIT permits sale. The non sale restriction means this is not an OSI approved open source license.

Before contributing, read [CONTRIBUTING.md](CONTRIBUTING.md). Contributions are accepted under the same license terms.

---

## Türkçe

**Uwide Free, videoyu oynatıcı alanına sığdırmak için hazırlanmış ücretsiz bir Chromium eklentisidir.** Normal, tiyatro ve tam ekran görünümlerinde kadrajı video oynatıcısının içinden ayarlayabilirsiniz.

**Geliştirici:** [Wuqqers](https://www.omerkayaekici.com/tr/)
**Diller:** Türkçe ve İngilizce
**Güncel sürüm:** 0.4.82
**Tarayıcılar:** Chrome ve Chromium tabanlı tarayıcılar, sürüm 119 veya üstü

Uwide Free, özel bir lisans altında kaynak kodu erişilebilir bir yazılımdır. İş yerinde kullanım da dahil olmak üzere ücretsiz kullanabilir, değiştirebilir ve ücretsiz dağıtabilirsiniz. Eklentinin veya değiştirilmiş/türetilmiş sürümlerinin satışı yasaktır. Tam koşullar için [LICENSE](LICENSE) dosyasını okuyun. Bu lisans OSI onaylı bir açık kaynak lisansı değildir.

## Özellikler

- **Otomatik sığdırma:** Oynatıcı alanını kaplayın veya videonun tamamını gösterin. Normal, tiyatro ve tam ekran düzenlerinde oynatıcı ölçülerini kullanır.
- **Manuel kadraj:** Yakınlaştırma, yatay/dikey konum, en-boy oranı, kırpma ve yatay esnetme ayarları.
- **İsteğe bağlı sabit görüntü ayarları:** Parlaklık, kontrast, yaklaşık gölge kurtarma, doygunluk ve keskinleştirme. Renk anahtarı kapalı başlar; SVG gölge kurtarma ve keskinleştirme varsayılan olarak 0’dır ve GPU hızını etkileyebilir.
- **Kompakt oynatıcı paneli:** Tam ekran düğmesinin yanındaki Uwide simgesine tıklayın. 340 px panelde Kadraj, Görüntü ve Kapsam sekmeleri, sürükleyerek taşıma ve oynatıcı tanılaması bulunur.
- **Ayar kapsamları:** Tercihleri genel, bu cihaz, site, sekme veya video için kaydedin. Bazı kapsamlar mevcut tarayıcı oturumu boyunca geçerlidir.
- **Profiller:** Görüntü profilleri kaydedip uygulayın; profil dosyalarını dışa veya içe aktarın.
- **İsteğe bağlı siyah bant algılama:** Okunabilen karelerde sabit iç siyah bantları bulup kırpabilir. Korumalı veya erişilemeyen videolarda kare analizi yapılamayabilir.
- **Az görsel hareket:** Ses tepkili ışık, ortam parıltısı, HDR, kare üretimi ve kaynak videodaki flaşları filtreleme yoktur. Gölge kurtarma ve keskinleştirme sabit SVG filtreleridir; varsayılan kapalıdır ve JavaScript ile video karesi yakalamaz.

## GitHub Releases üzerinden yükleme

Chrome Web Mağazası yayını sunulmuyor. Eklentiyi bilgisayarınıza elle yükleyin:

1. Depodaki **Releases** bölümünden `Uwide-Free-Chromium-0.4.82.zip` dosyasını indirin ve bir klasöre çıkarın. Alternatif olarak depoyu indirin ve içindeki `extension` klasörünü kullanın.
2. Chrome'da `chrome://extensions`, Edge'de `edge://extensions` adresini açın.
3. **Geliştirici modu** seçeneğini açın.
4. **Paketlenmemiş öğe yükle** düğmesine basıp `manifest.json` dosyasını içeren klasörü seçin (çıkarılmış paket klasörü veya depodaki `extension` klasörü).
5. Video sekmesini yenileyin. Oynatıcının tam ekran düğmesinin yanındaki Uwide simgesine tıklayın.
6. Tam ayarlar için tarayıcının Uzantılar sayfasında Uwide Free → **Ayrıntılar** → **Uzantı seçenekleri** yolunu izleyin.

Güncellemek için aynı klasördeki dosyaları değiştirin, uzantılar sayfasından Uwide'ı yenileyin ve video sekmelerini yenileyin. Uwide'ın iki kopyasını aynı anda yüklemeyin. Güncellemeler elle yapılır. Araç çubuğunda popup düğmesi olmasa da Chrome Uwide'ı kendi Uzantılar menüsünde gösterebilir.

## Gizlilik ve izinler

[Gizlilik açıklamasının tamamını](PRIVACY.md) okuyun. Eklenti, geliştiricinin yönettiği bir sunucuya veri göndermez; analiz, reklam veya telemetri kodu içermez.

- `storage`, tercih ve profilleri Chrome depolama alanında tutar. Genel tercihler Chrome Sync kullanır ve oturum açılmış tarayıcı hesabı üzerinden eşitlenebilir. Özel profil eşitlemesi isteğe bağlıdır.
- `scripting`, açık sekmede eklentiyi etkinleştiren mevcut kullanıcı eylemli yardımcı işlev için kullanılır.
- Tüm sitelere erişim, farklı internet sitelerinde ve gömülü oynatıcılarda video öğeleriyle oynatıcı kontrollerini bulup seçilen kadrajı uygulamak için gereklidir. Ayarlardaki izinli siteler listesiyle kapsamı kısıtlayabilirsiniz.
- Site adı, sekme numarası ve geçici video kimliği doğru ayar kapsamını seçmek için kullanılır; geliştiriciye gönderilmez.
- İsteğe bağlı bant algılama, okunabilen kareleri yerel olarak inceler; kareleri saklamaz veya yüklemez.

## Paket oluşturma

Derleme veya çalışma zamanında üçüncü taraf paket gerekmiyor. Eklenti kaynakları `extension/` klasöründedir. Python 3.9 veya üzeriyle şu komutu çalıştırın:

```sh
python scripts/package.py
```

Komut gerekli dosyaları kontrol eder, yüklenebilir ZIP paketini `dist/` altına oluşturur, ZIP'i doğrular ve yanına SHA-256 özeti yazar. Arşivin kökünde manifest bulunur.

## Sınırlar ve ışık hassasiyeti

Uwide Free'nin epilepsisi veya ışık hassasiyeti olan kişiler için güvenli olduğu doğrulanmamıştır. Kaynak videodaki flaşları, hızlı renk değişimlerini veya desenleri algılayıp engellemez; videoyu büyütmek bu etkilerin ekranda kapladığı alanı artırabilir. Sabit renk ayarları isteğe bağlıdır, sahneye veya sese göre değişmez. Korumalı yayınlarda kare analizi engellenebilir. Oynatıcı uyumluluğu değişebilir. HDR, kare üretimi veya flaş filtreleme yoktur. İsteğe bağlı gölge kurtarma ve keskinleştirme GPU çizimini etkileyebilir; keskinleştirme halo oluşturabilir. İkisi de korumalı yayınlarda doğrulanmamıştır. Ayrıntılar için [Işık hassasiyeti notunu](extension/PHOTOSENSITIVITY.md) inceleyin.

Sorun bildirirken eklenti sürümünü, tarayıcıyı, internet sitesini ve tekrar oluşturma adımlarını ekleyin. Kişisel bilgi, çerez, hesap bilgisi veya özel medya bağlantısı paylaşmayın.

## Lisans ve katkı

[Uwide Free Non-Sale License 1.0](LICENSE) ücretsiz kullanıma, değiştirmeye ve dağıtıma izin verir. Eklentiyi veya türev sürümlerini satmak, erişim için ücret almak ve ücretli pakete eklemek yasaktır. İş yerinde kullanım serbesttir. MIT satışı mümkün kıldığı için tercih edilmedi. Satış yasağı nedeniyle bu lisans OSI onaylı açık kaynak lisansı değildir.

Katkı göndermeden önce [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun. Katkılar aynı lisans koşulları altında kabul edilir.
