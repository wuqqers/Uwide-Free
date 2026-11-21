# Gizlilik / Privacy

Geliştirici: Wuqqers — https://www.omerkayaekici.com/tr/
Sürüm: 0.4.68 · Güncelleme: 21 Kasım 2026

Uwide Free, video kadrajını ve isteğe bağlı sabit renk ayarlarını tarayıcıda işler.
Geliştiriciye veri gönderen sunucu bağlantısı, analitik, reklam veya izleme kodu yoktur.

- Video öğeleri ve oynatıcı kontrolleri sayfa içinde bulunur. Site alan adı, sekme
  kimliği ve geçici video anahtarı doğru ayar kapsamını seçmek için kullanılır.
  Sayfa ve medya adresleri çalışan içerik betiğinin belleğinde video değişimini
  anlamak için karşılaştırılır; geliştiriciye aktarılmaz.
- Genel ayarlar Chrome storage.sync alanındadır. Tarayıcı eşitlemesi açıksa Google
  hesabınıza bağlı tarayıcılara eşitlenebilir. Özel profiller yalnızca kullanıcı
  profil eşitlemesini açtığında bu alanı kullanır. Google'ın tarayıcı eşitlemesi
  kendi gizlilik koşullarına tabidir; geliştirici bu verilere erişmez.
- Cihaz/site ayarları, izinli site listesi ve panel konumu storage.local alanında;
  sekme/video kapsamları storage.session alanında tutulur. Tarama geçmişi günlüğü
  oluşturulmaz. İsteğe bağlı bant algılama, erişilebilen video karelerini geçici
  canvas üzerinde yerel olarak inceler; kare kaydetmez veya yüklemez.
- Profil içe/dışa aktarma kullanıcının seçtiği yerel JSON dosyalarıyla yapılır.
  Dosyayı paylaşmanız halinde profil adları ve ayarları alıcı tarafından görülebilir.
- Site/kapsam ayarları ve profiller arayüzden silinebilir. Uzantının kaldırılması
  tarayıcıdaki uzantı depolamasını temizler; dışa aktarılan dosyalar ayrıca silinmelidir.
- Geliştirici sitesi kullanıcı bağlantıya tıkladığında açılır; bu sitenin gizlilik
  uygulamaları eklentinin yerel işlemlerinden ayrıdır.

English: The extension processes player layout and optional video-frame samples
locally. No developer server, analytics, advertising or telemetry is used.
Settings use Chrome local/session/sync storage. Global settings and opted-in
custom profiles may be synchronized by Chrome/Google. Site domains, tab IDs and
transient media identifiers select settings scopes. Exported profile files stay
where the user saves them. Website visits initiated by the user are separate.
