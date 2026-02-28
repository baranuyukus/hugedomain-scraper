import axios from 'axios';
import { machineId } from 'node-machine-id';
import { ipcMain, BrowserWindow } from 'electron';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables BEFORE using them
dotenv.config({ path: join(process.cwd(), '.env') });

const API_URL = 'https://keyauth.win/api/1.3/';

interface AuthState {
    isInitialized: boolean;
    sessionId: string | null;
    isAuthenticated: boolean;
    user: any | null;
}

const state: AuthState = {
    isInitialized: false,
    sessionId: null,
    isAuthenticated: false,
    user: null,
};

// Env vars are injected by Vite at build time via process.env
const CONFIG = {
    name: process.env.VITE_KEYAUTH_NAME || '',
    ownerId: process.env.VITE_KEYAUTH_OWNERID || '',
    version: process.env.VITE_KEYAUTH_VERSION || '1.0',
};

console.log('--- KeyAuth Config Loaded ---');
console.log('Name:', CONFIG.name);
console.log('OwnerID:', CONFIG.ownerId);
console.log('Version:', CONFIG.version);
console.log('-----------------------------');

export class AuthManager {
    private mainWindow: BrowserWindow | null = null;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
    }

    public async init() {
        // Always re-init to get fresh session
        try {
            console.log('Initializing KeyAuth...');
            const url = `${API_URL}?type=init&ver=${CONFIG.version}&name=${encodeURIComponent(CONFIG.name)}&ownerid=${CONFIG.ownerId}`;
            const response = await axios.get(url);

            if (response.data.success) {
                state.isInitialized = true;
                state.sessionId = response.data.sessionid;
                console.log('KeyAuth Initialized. Session ID:', state.sessionId);
                return true;
            } else {
                console.error('KeyAuth Init Failed:', response.data.message);
                return false;
            }
        } catch (error) {
            console.error('KeyAuth Init Error:', error);
            return false;
        }
    }

    // Register with License Key + Username + Password + Email
    public async register(username: string, password: string, email: string, licenseKey: string) {
        if (!state.isInitialized) {
            const initSuccess = await this.init();
            if (!initSuccess) return { success: false, message: 'Initialization failed' };
        }

        try {
            const params = new URLSearchParams({
                type: 'register',
                username: username,
                pass: password,
                key: licenseKey,
                email: email,
                sessionid: state.sessionId || '',
                name: CONFIG.name,
                ownerid: CONFIG.ownerId,
            });

            const response = await axios.get(`${API_URL}?${params.toString()}`);

            if (response.data.success) {
                console.log('Registration successful for:', username);
                return { success: true, message: 'Registration successful' };
            } else {
                console.error('Registration failed:', response.data.message);
                return { success: false, message: response.data.message || 'Registration failed' };
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            return { success: false, message: error.message || 'Network error' };
        }
    }

    // Login with Username + Password
    public async loginWithCredentials(username: string, password: string) {
        if (!state.isInitialized) {
            const initSuccess = await this.init();
            if (!initSuccess) return { success: false, message: 'Initialization failed' };
        }

        try {
            const hwid = await machineId();
            const params = new URLSearchParams({
                type: 'login',
                username: username,
                pass: password,
                sessionid: state.sessionId || '',
                name: CONFIG.name,
                ownerid: CONFIG.ownerId,
                hwid: hwid,
            });

            const response = await axios.get(`${API_URL}?${params.toString()}`);

            if (response.data.success) {
                state.isAuthenticated = true;
                state.user = response.data.info;
                console.log('Login successful for:', username);
                return { success: true, message: 'Login successful', info: response.data.info };
            } else {
                return { success: false, message: response.data.message || 'Login failed' };
            }
        } catch (error: any) {
            console.error('Login error:', error);
            return { success: false, message: error.message || 'Network error' };
        }
    }

    // Login with License Key (existing method)
    public async loginWithLicense(key: string) {
        if (!state.isInitialized) {
            const initSuccess = await this.init();
            if (!initSuccess) return { success: false, message: 'Initialization failed' };
        }

        try {
            const hwid = await machineId();
            const params = new URLSearchParams({
                type: 'license',
                key: key,
                sessionid: state.sessionId || '',
                name: CONFIG.name,
                ownerid: CONFIG.ownerId,
                hwid: hwid,
            });

            const response = await axios.get(`${API_URL}?${params.toString()}`);

            if (response.data.success) {
                state.isAuthenticated = true;
                state.user = response.data.info;
                return { success: true, message: 'Login successful', info: response.data.info };
            } else {
                return { success: false, message: response.data.message || 'Login failed' };
            }
        } catch (error: any) {
            return { success: false, message: error.message || 'Network error' };
        }
    }

    // Forgot Password - Send reset email
    public async forgotPassword(username: string, email: string) {
        if (!state.isInitialized) {
            const initSuccess = await this.init();
            if (!initSuccess) return { success: false, message: 'Initialization failed' };
        }

        try {
            const params = new URLSearchParams({
                type: 'forgot',
                username: username,
                email: email,
                sessionid: state.sessionId || '',
                name: CONFIG.name,
                ownerid: CONFIG.ownerId,
            });

            const response = await axios.get(`${API_URL}?${params.toString()}`);

            if (response.data.success) {
                console.log('Password reset email sent for:', username);
                return { success: true, message: 'Password reset email sent' };
            } else {
                return { success: false, message: response.data.message || 'Failed to send reset email' };
            }
        } catch (error: any) {
            console.error('Forgot password error:', error);
            return { success: false, message: error.message || 'Network error' };
        }
    }

    // Logout
    public logout() {
        state.isAuthenticated = false;
        state.user = null;
        // Re-init on next login
        state.isInitialized = false;
        state.sessionId = null;
        console.log('User logged out');
        return { success: true };
    }

    public registerHandlers() {
        // Login with license key
        ipcMain.handle('auth:login', async (_, key: string) => {
            return await this.loginWithLicense(key);
        });

        // Login with username/password
        ipcMain.handle('auth:login-credentials', async (_, { username, password }) => {
            return await this.loginWithCredentials(username, password);
        });

        // Register new user
        ipcMain.handle('auth:register', async (_, { username, password, email, licenseKey }) => {
            return await this.register(username, password, email, licenseKey);
        });

        // Forgot password
        ipcMain.handle('auth:forgot-password', async (_, { username, email }) => {
            return await this.forgotPassword(username, email);
        });

        // Logout
        ipcMain.handle('auth:logout', () => {
            return this.logout();
        });

        // Check auth status
        ipcMain.handle('auth:check', () => {
            return {
                isAuthenticated: state.isAuthenticated,
                isInitialized: state.isInitialized
            };
        });
    }
}
