# 🚀 Lokal Boost Starter Pack

## Yeni Bir Electron + React Uygulaması Başlatmak İçin Kapsamlı Rehber

> **Marka:** lokalboost.net
> **Teknoloji:** Electron + React + Vite + TypeScript + KeyAuth
> **Tasarım:** Kartografi/Topografik dark theme

---

## 📋 Bu Pack Ne İçeriyor?

```
start/
├── START.md          # Bu dosya - ana başlangıç promptu
├── DESIGN_SYSTEM.md  # CSS tasarım değişkenleri ve kuralları
├── KEYAUTH_SETUP.md  # KeyAuth entegrasyonu rehberi
├── AUTH_TEMPLATE.ts  # Hazır auth.ts şablonu
├── LOGIN_TEMPLATE.tsx # Hazır Login.tsx şablonu
├── I18N_TEMPLATE.ts  # Çoklu dil desteği şablonu
├── ELECTRON_CONFIG.md # Electron yapılandırması ve DMG derleme
└── CHECKLIST.md      # Adım adım kontrol listesi
```

---

## 🎯 Yeni Proje Başlatma Promptu

Aşağıdaki promptu AI'a vererek yeni bir Lokal Boost uygulaması başlatabilirsin:

```markdown
# Yeni Lokal Boost Uygulaması: [UYGULAMA ADI]

## Marka Bilgileri
- **Marka:** Lokal Boost (lokalboost.net)
- **Uygulama Adı:** [UYGULAMA_ADI]
- **App ID:** com.lokalboost.[uygulama-adi]

## Teknik Gereksinimler
- Electron + React + Vite + TypeScript
- KeyAuth lisanslama sistemi (Login + Register + Forgot Password)
- Çoklu dil desteği (EN/TR)
- macOS DMG + Windows NSIS derleme
- İmzasız build (Apple Dev hesabı yok)

## Tasarım Gereksinimleri
- `start/DESIGN_SYSTEM.md` dosyasındaki CSS değişkenlerini kullan
- Dark theme (kartografik/topografik tarz)
- Meridyen sarısı accent rengi (#D4A84B)
- Grid pattern arka plan
- Tailwind CSS ile utility sınıflar

## KeyAuth Gereksinimleri
- `start/AUTH_TEMPLATE.ts` şablonunu kullan
- Login (username + password)
- Register (license key + username + password + email)
- Forgot Password (username + email)
- HWID kilitleme

## Login Ekranı
- `start/LOGIN_TEMPLATE.tsx` şablonunu kullan
- 3 modlu tab sistemi (Login/Register/Forgot)
- Dil değiştirici (EN/TR)
- Marka logosu ve ismi

## Uygulama Özellikleri
[BURAYA UYGULAMAYA ÖZEL ÖZELLİKLERİ YAZ]

## Dosya Yapısı
```
[uygulama-adi]/
├── electron/
│   ├── main/
│   │   ├── index.ts      # Ana electron dosyası
│   │   └── auth.ts       # KeyAuth modülü
│   └── preload/
│       └── index.ts
├── src/
│   ├── components/       # React bileşenleri
│   ├── pages/
│   │   ├── Login.tsx     # Giriş ekranı
│   │   └── MainPage.tsx  # Ana sayfa
│   ├── LanguageContext.tsx
│   ├── i18n.ts
│   └── main.tsx
├── .env                  # KeyAuth credentials
├── package.json
└── index.html
```
```

---

## ⚡ Hızlı Başlangıç Adımları

### 1. Proje Oluştur
```bash
# Yeni klasör oluştur
mkdir [uygulama-adi]
cd [uygulama-adi]

# Vite + React + TS template
npm create vite@latest ./ -- --template react-ts

# Electron ve diğer bağımlılıklar
npm install electron electron-builder axios node-machine-id dotenv maplibre-gl @turf/turf
npm install -D concurrently cross-env vite-plugin-electron vite-plugin-electron-renderer

# Tailwind CSS
npm install tailwindcss @tailwindcss/postcss autoprefixer postcss
```

### 2. KeyAuth Uygulaması Oluştur
1. https://keyauth.cc adresine git
2. Yeni uygulama oluştur
3. Seller API key al
4. `.env` dosyası oluştur:
```env
VITE_KEYAUTH_NAME="uygulama_adi"
VITE_KEYAUTH_OWNERID="xxxxxxxxxxx"
VITE_KEYAUTH_VERSION="1.0"
```

### 3. Dosyaları Kopyala
- `start/AUTH_TEMPLATE.ts` → `electron/main/auth.ts`
- `start/LOGIN_TEMPLATE.tsx` → `src/pages/Login.tsx`
- `start/I18N_TEMPLATE.ts` → `src/i18n.ts`
- `start/DESIGN_SYSTEM.md` içeriğini → `src/index.css`

### 4. package.json Yapılandırması
```json
{
  "name": "[uygulama-adi]",
  "version": "1.0.0",
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "dist": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.lokalboost.[uygulama-adi]",
    "productName": "[Uygulama Adı]",
    "directories": { "output": "release/${version}" },
    "files": ["dist", "dist-electron"],
    "extraResources": [{ "from": ".env", "to": ".env" }],
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns",
      "identity": null
    },
    "dmg": {
      "title": "[Uygulama Adı]",
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    "win": { "target": "nsis" }
  }
}
```

### 5. DMG/EXE Derleme
```bash
# macOS DMG (imzasız)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist

# Windows NSIS
npm run dist
```

---

## 🎨 Tasarım Prensipleri

### Renk Paleti
| Değişken | Değer | Kullanım |
|----------|-------|----------|
| `--surface-base` | #1A1F2E | Ana arka plan |
| `--surface-100` | #1E2436 | Hafif elevation |
| `--surface-200` | #232A3C | Kartlar, paneller |
| `--accent-primary` | #D4A84B | Meridyen sarısı - butonlar, vurgular |
| `--text-primary` | #F5F1E8 | Ana metin |
| `--text-secondary` | #A8A29E | İkincil metin |

### Tipografi
- **UI Font:** Work Sans
- **Data Font:** JetBrains Mono (koordinatlar, kodlar için)

### Spacing (8px Grid)
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 24px
- `--space-6`: 32px

### Border Radius
- Küçük öğeler: 4px
- Orta öğeler: 6px
- Büyük kartlar: 8px

---

## 🔐 KeyAuth Entegrasyonu

### Desteklenen İşlemler
1. **License Login** - Sadece lisans key ile giriş
2. **User Login** - Username + password ile giriş
3. **Register** - License key + username + password + email ile kayıt
4. **Forgot Password** - Email ile şifre sıfırlama
5. **HWID Lock** - Cihaz kilitleme

### API Endpoints
```
init:     type=init&ver={}&name={}&ownerid={}
license:  type=license&key={}&sessionid={}&name={}&ownerid={}&hwid={}
login:    type=login&username={}&pass={}&sessionid={}&name={}&ownerid={}&hwid={}
register: type=register&username={}&pass={}&key={}&email={}&sessionid={}&name={}&ownerid={}
forgot:   type=forgot&username={}&email={}&sessionid={}&name={}&ownerid={}
```

---

## 📱 Login Ekranı Bileşenleri

### Modlar
1. **Login** - Username + Password alanları + "Forgot password?" linki
2. **Register** - License Key + Username + Email + Password + "Create Account" butonu
3. **Forgot** - Username + Email + "Send Reset Link" butonu

### Özellikler
- Tab geçişleri (Login/Register)
- Dil değiştirici (EN/TR)
- Marka logosu ve ismi
- Başarı/hata mesajları
- Loading durumları

---

## 📦 Derleme Notları

### macOS (İmzasız)
```bash
# .env dosyası extraResources olarak dahil edilmeli
# identity: null ile code signing atlanır
# Kullanıcılar "sağ tık → Aç" yapmalı
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist
```

### Icon Oluşturma (macOS)
```bash
mkdir -p build/icons.iconset
sips -z 512 512 icon.png --out build/icons.iconset/icon_512x512.png
# ... diğer boyutlar
iconutil -c icns build/icons.iconset -o build/icon.icns
```

---

## ✅ Kontrol Listesi

- [ ] KeyAuth uygulaması oluşturuldu
- [ ] `.env` dosyası yapılandırıldı
- [ ] Design system CSS eklendi
- [ ] Auth modülü entegre edildi
- [ ] Login ekranı 3 modlu çalışıyor
- [ ] Dil desteği (EN/TR) çalışıyor
- [ ] Ana sayfa tasarlandı
- [ ] Dev modda test edildi
- [ ] DMG/EXE derlendi
- [ ] Production testten geçti

---

## 🔗 Referans Dosyalar

Bu pack içindeki dosyalar:
- `DESIGN_SYSTEM.md` - Tam CSS değişkenleri
- `AUTH_TEMPLATE.ts` - Komple auth modülü
- `LOGIN_TEMPLATE.tsx` - Hazır login sayfası
- `I18N_TEMPLATE.ts` - Çeviri sistemi
- `ELECTRON_CONFIG.md` - Electron ayarları
- `CHECKLIST.md` - Detaylı kontrol listesi

---

**Hazırlayan:** Antigravity AI
**Tarih:** 2026-01-30
**Marka:** Lokal Boost (lokalboost.net)
