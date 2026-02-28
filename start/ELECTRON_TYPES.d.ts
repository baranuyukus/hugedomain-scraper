/**
 * Lokal Boost - TypeScript Declarations
 * 
 * Bu dosya, Electron IPC API'sinin TypeScript tarafından
 * tanınması için gerekli type tanımlarını içerir.
 * 
 * Dosyayı şu konuma koyun: src/types/electron.d.ts
 * veya src/vite-env.d.ts dosyasına ekleyin.
 */

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

export { };
