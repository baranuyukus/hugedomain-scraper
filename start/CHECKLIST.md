# ✅ Lokal Boost - Yeni Proje Kontrol Listesi

## 🚀 Proje Başlatma

### Kurulum
- [ ] Yeni klasör oluştur: `mkdir [proje-adi]`
- [ ] Vite + React + TS template: `npm create vite@latest ./ -- --template react-ts`
- [ ] Bağımlılıkları yükle:
  ```bash
  npm install electron electron-builder axios node-machine-id dotenv
  npm install -D vite-plugin-electron vite-plugin-electron-renderer
  npm install tailwindcss @tailwindcss/postcss autoprefixer postcss
  ```

### Dosya Yapısı
- [ ] `electron/main/` klasörü oluştur
- [ ] `electron/preload/` klasörü oluştur
- [ ] `src/pages/` klasörü oluştur
- [ ] `src/components/` klasörü oluştur
- [ ] `build/` klasörü oluştur (icon için)

---

## 🔐 KeyAuth Entegrasyonu

### Hesap & Uygulama
- [ ] KeyAuth hesabı oluştur (keyauth.cc)
- [ ] Dashboard'da yeni uygulama oluştur
- [ ] Application Name al
- [ ] Owner ID al
- [ ] Test lisans anahtarı oluştur

### Konfigürasyon
- [ ] `.env` dosyası oluştur
- [ ] `VITE_KEYAUTH_NAME` ekle
- [ ] `VITE_KEYAUTH_OWNERID` ekle
- [ ] `VITE_KEYAUTH_VERSION` ekle
- [ ] `.env` dosyasını `.gitignore`'a ekle

### Auth Modülü
- [ ] `AUTH_TEMPLATE.ts` → `electron/main/auth.ts` kopyala
- [ ] Marka adını güncelle
- [ ] IPC handlers kontrol et

---

## 🎨 Tasarım

### CSS Setup
- [ ] `DESIGN_SYSTEM.md` içeriğini `src/index.css`'e kopyala
- [ ] Google Fonts bağlantısını `index.html`'e ekle (Work Sans, JetBrains Mono)
- [ ] Tailwind config oluştur
- [ ] PostCSS config oluştur

### Branding
- [ ] Icon dosyası hazırla (512x512 PNG)
- [ ] macOS için .icns oluştur
- [ ] Windows için .ico oluştur
- [ ] Favicon ekle

---

## 📱 Login Ekranı

### Template
- [ ] `LOGIN_TEMPLATE.tsx` → `src/pages/Login.tsx` kopyala
- [ ] Marka adını güncelle
- [ ] Logo/icon ekle
- [ ] Footer'ı güncelle (lokalboost.net)

### Çoklu Dil
- [ ] `I18N_TEMPLATE.ts` → `src/i18n.ts` kopyala
- [ ] LanguageContext.tsx oluştur
- [ ] EN çevirilerini güncelle
- [ ] TR çevirilerini güncelle

### Test
- [ ] Login modu çalışıyor
- [ ] Register modu çalışıyor
- [ ] Forgot Password modu çalışıyor
- [ ] Dil değiştirme çalışıyor

---

## ⚡ Electron Yapılandırması

### Ana Dosyalar
- [ ] `electron/main/index.ts` oluştur
- [ ] `electron/preload/index.ts` oluştur
- [ ] `vite.config.ts` yapılandır
- [ ] TypeScript config'leri güncelle

### package.json
- [ ] `name` alanını güncelle
- [ ] `version` alanını güncelle (1.0.0)
- [ ] `build.appId` güncelle (com.lokalboost.xxx)
- [ ] `build.productName` güncelle
- [ ] `extraResources` → .env ekle
- [ ] Mac ve Win target'ları yapılandır

### index.html
- [ ] Title güncelle
- [ ] Favicon ekle
- [ ] Google Fonts ekle

---

## 🏗️ Ana Uygulama

### Yapı
- [ ] MainPage.tsx oluştur
- [ ] App.tsx'te routing ayarla
- [ ] Auth state yönetimi ekle

### Uygulamaya Özel
- [ ] Ana özellik 1 implement et
- [ ] Ana özellik 2 implement et
- [ ] Ana özellik 3 implement et
- [ ] Export/Import özellikleri (gerekirse)

---

## 🧪 Test & Derleme

### Development
- [ ] `npm run dev` çalışıyor
- [ ] Login flow çalışıyor
- [ ] Ana özellikler çalışıyor
- [ ] Dil değiştirme çalışıyor

### Production Build
- [ ] `npm run build` başarılı
- [ ] DMG derleme başarılı
- [ ] DMG'den uygulama açılıyor
- [ ] Title bar'da doğru isim görünüyor
- [ ] Icon doğru görünüyor
- [ ] Login çalışıyor (production)
- [ ] Ana özellikler çalışıyor (production)

---

## 📦 Release

### Final Kontroller
- [ ] Version numarası doğru
- [ ] Tüm özellikler çalışıyor
- [ ] Hata mesajları kullanıcı dostu
- [ ] Dil desteği tam

### Dosyalar
- [ ] DMG dosyası hazır
- [ ] EXE dosyası hazır (Windows için)
- [ ] README.md hazır
- [ ] Kurulum talimatları hazır

---

## 📝 Notlar

### Bilinen Sorunlar
- macOS'ta imzasız uygulama için "sağ tık → Aç" gerekiyor
- Windows'ta antivirus uyarısı çıkabilir

### Önemli Komutlar
```bash
# Development
npm run dev

# Production build
npm run build

# DMG derleme (imzasız)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist

# macOS icon oluşturma
iconutil -c icns build/icons.iconset -o build/icon.icns
```
