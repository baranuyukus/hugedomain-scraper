# 🔐 KeyAuth Entegrasyon Rehberi

## KeyAuth Nedir?

KeyAuth, yazılım lisanslama ve kullanıcı kimlik doğrulama servisidir. Lokal Boost ürünlerinde lisans kontrolü ve kullanıcı yönetimi için kullanılır.

---

## 1. KeyAuth Hesabı Oluşturma

1. https://keyauth.cc adresine git
2. Ücretsiz hesap oluştur
3. Dashboard'a giriş yap

---

## 2. Uygulama Oluşturma

1. **Applications** → **Create Application**
2. Uygulama adını gir (örn: "lokal_boost_maps")
3. Version: "1.0"
4. **Create** butonuna tıkla

---

## 3. API Bilgilerini Alma

Uygulama oluşturduktan sonra şu bilgileri al:
- **Application Name** (VITE_KEYAUTH_NAME)
- **Owner ID** (VITE_KEYAUTH_OWNERID)
- **Version** (VITE_KEYAUTH_VERSION)

---

## 4. .env Dosyası

Proje kök dizinine `.env` dosyası oluştur:

```env
VITE_KEYAUTH_NAME="uygulama_adi"
VITE_KEYAUTH_OWNERID="xxxxxxxxxx"
VITE_KEYAUTH_VERSION="1.0"
```

> ⚠️ Bu dosyayı `.gitignore`'a ekle!

---

## 5. Lisans Oluşturma

### Dashboard'dan Lisans
1. **Licenses** → **Create License**
2. Expiry gün sayısı gir (veya lifetime için boş bırak)
3. Level, mask vb. opsiyonel
4. **Create** → Lisans key kopyala

### API ile Lisans (Seller API)
```
https://keyauth.win/api/seller/?sellerkey=SELLER_KEY&type=add&format=json&expiry=30&level=1&amount=1
```

---

## 6. Desteklenen İşlemler

### 6.1 Initialize (Oturum Başlatma)
```typescript
type=init&ver={version}&name={app_name}&ownerid={owner_id}
```

### 6.2 License Login (Sadece Lisans Key)
```typescript
type=license&key={license_key}&sessionid={session}&name={app}&ownerid={owner}&hwid={hwid}
```

### 6.3 User Login (Username + Password)
```typescript
type=login&username={user}&pass={pass}&sessionid={session}&name={app}&ownerid={owner}&hwid={hwid}
```

### 6.4 Register (Kayıt)
```typescript
type=register&username={user}&pass={pass}&key={license}&email={email}&sessionid={session}&name={app}&ownerid={owner}
```

### 6.5 Forgot Password (Şifre Sıfırlama)
```typescript
type=forgot&username={user}&email={email}&sessionid={session}&name={app}&ownerid={owner}
```

---

## 7. Auth.ts Modülü

`electron/main/auth.ts` dosyası şu methodları içermeli:

```typescript
class AuthManager {
  // Oturum başlatma
  async init(): Promise<boolean>
  
  // Lisans ile giriş
  async loginWithLicense(key: string): Promise<AuthResult>
  
  // Kullanıcı adı + şifre ile giriş
  async loginWithCredentials(username: string, password: string): Promise<AuthResult>
  
  // Yeni kullanıcı kaydı
  async register(username: string, password: string, email: string, licenseKey: string): Promise<AuthResult>
  
  // Şifre sıfırlama maili gönder
  async forgotPassword(username: string, email: string): Promise<AuthResult>
  
  // Çıkış
  logout(): void
  
  // IPC handlers kaydet
  registerHandlers(): void
}
```

---

## 8. IPC Handlers

Electron main process'te şu IPC handlers kayıtlı olmalı:

| Handler | Parametreler | Açıklama |
|---------|-------------|----------|
| `auth:login` | `key: string` | Lisans key ile giriş |
| `auth:login-credentials` | `{username, password}` | Kullanıcı adı/şifre ile giriş |
| `auth:register` | `{username, password, email, licenseKey}` | Yeni kayıt |
| `auth:forgot-password` | `{username, email}` | Şifre sıfırlama |
| `auth:logout` | - | Çıkış |
| `auth:check` | - | Oturum durumu kontrolü |

---

## 9. Frontend Kullanımı (React)

```typescript
// Giriş
const result = await window.ipcRenderer.invoke('auth:login-credentials', {
  username: 'user',
  password: 'pass'
});

// Kayıt
const result = await window.ipcRenderer.invoke('auth:register', {
  username: 'newuser',
  password: 'pass',
  email: 'email@example.com',
  licenseKey: 'XXXX-XXXX-XXXX'
});

// Şifre sıfırlama
const result = await window.ipcRenderer.invoke('auth:forgot-password', {
  username: 'user',
  email: 'email@example.com'
});
```

---

## 10. HWID (Hardware ID)

Cihaz kilitleme için `node-machine-id` paketi kullanılır:

```typescript
import { machineId } from 'node-machine-id';

const hwid = await machineId();
```

Bu şekilde her cihazın benzersiz bir ID'si olur ve lisans başka cihazda kullanılamaz.

---

## 11. Hata Mesajları

| Kod | Mesaj | Açıklama |
|-----|-------|----------|
| `keynotfound` | Key not found | Lisans bulunamadı |
| `keyused` | Key already used | Lisans zaten kullanılmış |
| `keyexpired` | Key expired | Lisans süresi dolmuş |
| `hwid_mismatch` | HWID mismatch | Farklı cihaz |
| `usernotfound` | User not found | Kullanıcı bulunamadı |
| `wrongpass` | Wrong password | Yanlış şifre |

---

## 12. Test

1. KeyAuth dashboard'da test lisans oluştur
2. Uygulamayı `npm run dev` ile çalıştır
3. Kayıt ol (Register)
4. Giriş yap (Login)
5. Şifre sıfırlama test et
