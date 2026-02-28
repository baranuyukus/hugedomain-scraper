# ⚡ Electron Yapılandırma Rehberi

## Proje Yapısı

```
project/
├── electron/
│   ├── main/
│   │   ├── index.ts      # Ana electron dosyası
│   │   ├── auth.ts       # KeyAuth modülü
│   │   └── export.ts     # Export işlemleri (opsiyonel)
│   └── preload/
│       └── index.ts      # Preload script
├── src/                  # React uygulaması
├── dist/                 # Vite build output
├── dist-electron/        # Electron build output
├── build/                # Icon dosyaları
│   └── icon.icns         # macOS icon
├── release/              # DMG/EXE output
├── .env                  # KeyAuth credentials
├── package.json
├── vite.config.ts
└── index.html
```

---

## package.json Yapılandırması

```json
{
  "name": "uygulama-adi",
  "version": "1.0.0",
  "private": true,
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "dist": "npm run build && electron-builder",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "build": {
    "appId": "com.lokalboost.uygulama",
    "productName": "Uygulama Adı",
    "directories": {
      "output": "release/${version}"
    },
    "files": [
      "dist",
      "dist-electron"
    ],
    "extraResources": [
      {
        "from": ".env",
        "to": ".env"
      }
    ],
    "asar": true,
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns",
      "identity": null,
      "hardenedRuntime": false,
      "gatekeeperAssess": false
    },
    "dmg": {
      "title": "Uygulama Adı",
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        entry: 'electron/preload/index.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  build: {
    outDir: 'dist'
  }
})
```

---

## electron/main/index.ts (Ana Dosya)

```typescript
import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { release } from 'os'
import { join } from 'path'
import * as dotenv from 'dotenv'
import { AuthManager } from './auth'

// Determine if we are in production (packaged) mode
const isPackaged = app.isPackaged

// Load .env from different locations
if (!isPackaged) {
    dotenv.config({ path: join(process.cwd(), '.env') })
} else {
    dotenv.config({ path: join(process.resourcesPath, '.env') })
}

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Paths
const DIST_PATH = isPackaged 
    ? join(process.resourcesPath, 'app.asar', 'dist')
    : join(__dirname, '../..')

const PUBLIC_PATH = isPackaged
    ? join(process.resourcesPath, 'app.asar', 'dist')
    : join(__dirname, '../../public')

let win: BrowserWindow | null = null
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL as string
const indexHtml = join(DIST_PATH, 'index.html')

async function createWindow() {
    win = new BrowserWindow({
        title: 'Uygulama Adı',
        width: 1200,
        height: 800,
        icon: join(PUBLIC_PATH, 'favicon.ico'),
        webPreferences: {
            preload,
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(url)
        win.webContents.openDevTools()
    } else {
        win.loadFile(indexHtml)
    }
}

app.whenReady().then(async () => {
    await createWindow();
    if (win) {
        const authManager = new AuthManager(win);
        authManager.registerHandlers();
        await authManager.init();
    }
})

app.on('window-all-closed', () => {
    win = null
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
```

---

## electron/preload/index.ts

```typescript
import { contextBridge, ipcRenderer } from 'electron'

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

## Icon Oluşturma

### macOS (.icns)
```bash
mkdir -p build/icons.iconset

# icon.png dosyanız 512x512 veya daha büyük olmalı
sips -z 16 16 icon.png --out build/icons.iconset/icon_16x16.png
sips -z 32 32 icon.png --out build/icons.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out build/icons.iconset/icon_32x32.png
sips -z 64 64 icon.png --out build/icons.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out build/icons.iconset/icon_128x128.png
sips -z 256 256 icon.png --out build/icons.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out build/icons.iconset/icon_256x256.png
sips -z 512 512 icon.png --out build/icons.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out build/icons.iconset/icon_512x512.png
cp icon.png build/icons.iconset/icon_512x512@2x.png

iconutil -c icns build/icons.iconset -o build/icon.icns
```

### Windows (.ico)
Online converter kullan veya ImageMagick:
```bash
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

---

## DMG Derleme (macOS, İmzasız)

```bash
# Code signing'i atla
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist
```

### Sonuç
```
release/1.0.0/
├── Uygulama Adı-1.0.0-arm64.dmg
└── Uygulama Adı-1.0.0-arm64.dmg.blockmap
```

---

## Windows EXE Derleme

```bash
npm run dist
```

### Sonuç
```
release/1.0.0/
├── Uygulama Adı Setup 1.0.0.exe
└── ...
```

---

## İmzasız Uygulama Açma (macOS)

Kullanıcılara şu talimatları ver:

1. DMG'yi çift tıkla
2. Uygulamayı Applications'a sürükle
3. **Sağ tık → Aç** yap
4. "Yine de Aç" seçeneğine tıkla

Veya terminal'den:
```bash
xattr -cr /Applications/UygulamaAdi.app
```

---

## Bağımlılıklar

```json
{
  "dependencies": {
    "axios": "^1.x",
    "dotenv": "^17.x",
    "node-machine-id": "^1.x"
  },
  "devDependencies": {
    "electron": "^40.x",
    "electron-builder": "^26.x",
    "vite-plugin-electron": "^0.29.x",
    "vite-plugin-electron-renderer": "^0.14.x"
  }
}
```
