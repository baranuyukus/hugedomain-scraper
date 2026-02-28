import { contextBridge, ipcRenderer } from 'electron'

/**
 * Lokal Boost - Electron Preload Script
 * 
 * Bu dosya, React uygulaması ile Electron main process 
 * arasındaki güvenli iletişimi sağlar.
 * 
 * window.ipcRenderer olarak expose edilen methodlar:
 * - invoke(channel, ...args) → IPC çağrısı yapar
 * - on(channel, listener) → Event dinler
 * - removeAllListeners(channel) → Dinleyicileri kaldırır
 */

// IPC API'yi window.ipcRenderer olarak expose et
contextBridge.exposeInMainWorld('ipcRenderer', {
    /**
     * IPC invoke - main process'e mesaj gönderir ve yanıt bekler
     * @example
     * const result = await window.ipcRenderer.invoke('auth:login', { username, password });
     */
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

    /**
     * IPC on - main process'ten gelen mesajları dinler
     * @example
     * window.ipcRenderer.on('update-available', (data) => console.log(data));
     */
    on: (channel: string, listener: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (event, ...args) => listener(...args))
    },

    /**
     * Belirli bir kanalın tüm dinleyicilerini kaldırır
     * @example
     * window.ipcRenderer.removeAllListeners('update-available');
     */
    removeAllListeners: (channel: string) => {
        ipcRenderer.removeAllListeners(channel)
    }
})

/**
 * Opsiyonel: Ek API'ler expose etmek için
 * 
 * contextBridge.exposeInMainWorld('electronAPI', {
 *     openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
 *     getVersion: () => ipcRenderer.invoke('get-version'),
 * })
 */
