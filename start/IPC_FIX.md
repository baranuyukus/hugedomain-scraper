# 🔧 IPC Renderer Hatası Çözümü

## Hata
```
Error: Cannot read properties of undefined (reading 'invoke')
```

## Sebep
Bu hata, `window.ipcRenderer` objesinin tanımlı olmadığı anlamına gelir. Electron'da renderer process (React) ile main process arasındaki iletişim için preload script gereklidir.

---

## Çözüm

### 1. Preload Script Oluştur

`electron/preload/index.ts` dosyası:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

// window.ipcRenderer olarak expose et
contextBridge.exposeInMainWorld('ipcRenderer', {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (event, ...args) => listener(...args))
    },
    removeAllListeners: (channel: string) => {
        ipcRenderer.removeAllListeners(channel)
    }
})
```

---

### 2. TypeScript Deklarasyonu

`src/types/electron.d.ts` veya `src/vite-env.d.ts` dosyasına ekle:

```typescript
export interface IElectronAPI {
    ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, listener: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
    };
}

declare global {
    interface Window {
        ipcRenderer: IElectronAPI['ipcRenderer'];
    }
}
```

---

### 3. Main Process'te Preload Yolu

`electron/main/index.ts` dosyasında:

```typescript
import { join } from 'path'

// Preload dosyasının yolu
const preload = join(__dirname, '../preload/index.js')

async function createWindow() {
    win = new BrowserWindow({
        webPreferences: {
            preload,                    // ← Preload script
            contextIsolation: true,     // ← Güvenlik için true olmalı
            nodeIntegration: false,     // ← Güvenlik için false olmalı
        },
    })
}
```

---

### 4. Vite Config'de Preload Build

`vite.config.ts` dosyasında hem main hem preload build olmalı:

```typescript
import electron from 'vite-plugin-electron'

export default defineConfig({
    plugins: [
        react(),
        electron([
            // Main process
            {
                entry: 'electron/main/index.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron/main',
                    }
                }
            },
            // Preload script
            {
                entry: 'electron/preload/index.ts',
                onstart(options) {
                    options.reload()
                },
                vite: {
                    build: {
                        outDir: 'dist-electron/preload',
                    }
                }
            }
        ]),
    ],
})
```

---

### 5. Kullanım (React'ta)

```typescript
// Login.tsx veya herhangi bir component'te
const result = await window.ipcRenderer.invoke('auth:login-credentials', {
    username: 'test',
    password: 'test123'
});
```

---

## Kontrol Listesi

- [ ] `electron/preload/index.ts` dosyası var mı?
- [ ] `contextBridge.exposeInMainWorld` çağrısı yapılıyor mu?
- [ ] Main process'te `preload` yolu doğru mu?
- [ ] `webPreferences.contextIsolation` true mu?
- [ ] `webPreferences.nodeIntegration` false mu?
- [ ] Vite config'de preload build var mı?
- [ ] TypeScript deklarasyonu eklenmiş mi?

---

## Debug

Terminal'de şunları kontrol et:
```bash
# Preload dosyası build edilmiş mi?
ls -la dist-electron/preload/

# Çıktı olmalı:
# index.js
```

Console'da kontrol:
```javascript
// Tarayıcı/Electron console'da
console.log(window.ipcRenderer);
// undefined yerine {invoke: ƒ, on: ƒ, ...} görmelisin
```

---

## Yaygın Hatalar

1. **Preload dosyası yok** → `electron/preload/index.ts` oluştur
2. **Yanlış yol** → `join(__dirname, '../preload/index.js')` kullan
3. **contextIsolation false** → `true` olmalı (modern Electron)
4. **Vite build eksik** → Config'e preload entry ekle
