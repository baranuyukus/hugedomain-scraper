import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import type { Language } from '../i18n';

type AuthMode = 'login' | 'register' | 'forgot';

const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    const { t, language, setLanguage } = useLanguage();
    const [mode, setMode] = useState<AuthMode>('login');

    // Form fields
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [licenseKey, setLicenseKey] = useState('');

    // Status
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setEmail('');
        setLicenseKey('');
        setStatus('');
        setIsSuccess(false);
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        resetForm();
    };

    // Login with username/password
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;

        setLoading(true);
        setStatus(t.login.checking);
        setIsSuccess(false);

        try {
            const result = await window.ipcRenderer.invoke('auth:login-credentials', { username, password });

            if (result.success) {
                setIsSuccess(true);
                setStatus(t.login.success);
                setTimeout(onLoginSuccess, 1000);
            } else {
                setStatus(`${t.login.error}: ${result.message}`);
            }
        } catch (err: any) {
            setStatus(`${t.login.error}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Register with license key + username + password + email
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password || !email || !licenseKey) return;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStatus(`${t.login.error}: Invalid email format`);
            return;
        }

        setLoading(true);
        setStatus(t.login.checking);
        setIsSuccess(false);

        try {
            const result = await window.ipcRenderer.invoke('auth:register', {
                username,
                password,
                email,
                licenseKey,
            });

            if (result.success) {
                setIsSuccess(true);
                setStatus(t.login.registerSuccess);
                // Switch to login mode after 2 seconds
                setTimeout(() => switchMode('login'), 2000);
            } else {
                setStatus(`${t.login.error}: ${result.message}`);
            }
        } catch (err: any) {
            setStatus(`${t.login.error}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Forgot password
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !email) return;

        setLoading(true);
        setStatus(t.login.checking);
        setIsSuccess(false);

        try {
            const result = await window.ipcRenderer.invoke('auth:forgot-password', { username, email });

            if (result.success) {
                setIsSuccess(true);
                setStatus(t.login.resetSuccess);
            } else {
                setStatus(`${t.login.error}: ${result.message}`);
            }
        } catch (err: any) {
            setStatus(`${t.login.error}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        background: 'var(--surface-200)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-3) var(--space-4)',
        color: 'var(--text-primary)',
        fontSize: '14px',
        transition: 'var(--transition-fast)',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        fontWeight: 500,
        marginBottom: 'var(--space-2)',
    };

    const renderForm = () => {
        switch (mode) {
            case 'login':
                return (
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={labelStyle}>{t.login.username}</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t.login.usernamePlaceholder}
                                className="focus-ring"
                                style={inputStyle}
                                autoComplete="username"
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={labelStyle}>{t.login.password}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t.login.passwordPlaceholder}
                                className="focus-ring"
                                style={inputStyle}
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            style={{
                                width: '100%',
                                background: loading || !username || !password
                                    ? 'var(--surface-200)'
                                    : 'var(--accent-primary)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                padding: 'var(--space-3)',
                                color: loading || !username || !password
                                    ? 'var(--text-muted)'
                                    : 'var(--surface-base)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                                transition: 'var(--transition-fast)',
                            }}
                        >
                            {loading ? t.login.checking : t.login.loginButton}
                        </button>

                        {/* Forgot password link */}
                        <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
                            <button
                                type="button"
                                onClick={() => switchMode('forgot')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                }}
                            >
                                {t.login.forgotLink}
                            </button>
                        </div>
                    </form>
                );

            case 'register':
                return (
                    <form onSubmit={handleRegister}>
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <label style={labelStyle}>{t.login.licenseKey} *</label>
                            <input
                                type="text"
                                value={licenseKey}
                                onChange={(e) => setLicenseKey(e.target.value)}
                                placeholder={t.login.licensePlaceholder}
                                className="focus-ring"
                                style={{ ...inputStyle, fontFamily: 'var(--font-data)' }}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <label style={labelStyle}>{t.login.username} *</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t.login.usernamePlaceholder}
                                className="focus-ring"
                                style={inputStyle}
                                autoComplete="username"
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <label style={labelStyle}>{t.login.email} *</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t.login.emailPlaceholder}
                                className="focus-ring"
                                style={inputStyle}
                                autoComplete="email"
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={labelStyle}>{t.login.password} *</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t.login.passwordPlaceholder}
                                className="focus-ring"
                                style={inputStyle}
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !password || !email || !licenseKey}
                            style={{
                                width: '100%',
                                background: loading || !username || !password || !email || !licenseKey
                                    ? 'var(--surface-200)'
                                    : 'var(--success)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                padding: 'var(--space-3)',
                                color: loading || !username || !password || !email || !licenseKey
                                    ? 'var(--text-muted)'
                                    : 'var(--text-primary)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: loading || !username || !password || !email || !licenseKey ? 'not-allowed' : 'pointer',
                                transition: 'var(--transition-fast)',
                            }}
                        >
                            {loading ? t.login.checking : t.login.registerButton}
                        </button>
                    </form>
                );

            case 'forgot':
                return (
                    <form onSubmit={handleForgotPassword}>
                        <p style={{
                            color: 'var(--text-muted)',
                            fontSize: '13px',
                            marginBottom: 'var(--space-4)',
                            textAlign: 'center',
                        }}>
                            {language === 'tr'
                                ? 'Kayıt olurken kullandığınız kullanıcı adı ve e-posta adresini girin.'
                                : 'Enter your username and the email you used during registration.'
                            }
                        </p>

                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <label style={labelStyle}>{t.login.username}</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t.login.usernamePlaceholder}
                                className="focus-ring"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={labelStyle}>{t.login.email}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t.login.emailPlaceholder}
                                className="focus-ring"
                                style={inputStyle}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !email}
                            style={{
                                width: '100%',
                                background: loading || !username || !email
                                    ? 'var(--surface-200)'
                                    : 'var(--accent-primary)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                padding: 'var(--space-3)',
                                color: loading || !username || !email
                                    ? 'var(--text-muted)'
                                    : 'var(--surface-base)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: loading || !username || !email ? 'not-allowed' : 'pointer',
                                transition: 'var(--transition-fast)',
                            }}
                        >
                            {loading ? t.login.checking : t.login.resetButton}
                        </button>

                        {/* Back to login link */}
                        <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
                            <button
                                type="button"
                                onClick={() => switchMode('login')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                }}
                            >
                                {t.login.backToLogin}
                            </button>
                        </div>
                    </form>
                );
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center grid-pattern"
            style={{ background: 'var(--surface-base)' }}
        >
            {/* Language Switcher */}
            <div
                style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {t.common.language}:
                </span>
                <div
                    style={{
                        display: 'flex',
                        background: 'var(--surface-200)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '2px',
                    }}
                >
                    {(['en', 'tr'] as Language[]).map((lang) => (
                        <button
                            key={lang}
                            onClick={() => setLanguage(lang)}
                            style={{
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: 500,
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'var(--transition-fast)',
                                background: language === lang ? 'var(--accent-primary)' : 'transparent',
                                color: language === lang ? 'var(--surface-base)' : 'var(--text-muted)',
                            }}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Login Card */}
            <div
                className="w-full max-w-sm mx-4"
                style={{
                    background: 'var(--surface-100)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-6)',
                }}
            >
                {/* Header */}
                <div className="text-center" style={{ marginBottom: 'var(--space-5)' }}>
                    <div
                        className="inline-flex items-center justify-center"
                        style={{
                            width: '56px',
                            height: '56px',
                            background: 'var(--accent-muted)',
                            border: '1px solid var(--border-meridian)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-4)',
                        }}
                    >
                        <svg
                            style={{ width: '28px', height: '28px' }}
                            fill="none"
                            stroke="var(--accent-primary)"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>

                    <h1
                        style={{
                            color: 'var(--text-primary)',
                            fontSize: '22px',
                            fontWeight: 600,
                            marginBottom: 'var(--space-2)',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {t.login.title}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {t.login.subtitle}
                    </p>
                </div>

                {/* Mode Tabs */}
                {mode !== 'forgot' && (
                    <div
                        style={{
                            display: 'flex',
                            background: 'var(--surface-200)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '3px',
                            marginBottom: 'var(--space-5)',
                        }}
                    >
                        {(['login', 'register'] as AuthMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => switchMode(m)}
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-2) var(--space-3)',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'var(--transition-fast)',
                                    background: mode === m ? 'var(--surface-base)' : 'transparent',
                                    color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                                    boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                                }}
                            >
                                {m === 'login' ? t.login.tabLogin : t.login.tabRegister}
                            </button>
                        ))}
                    </div>
                )}

                {/* Forgot Password Header */}
                {mode === 'forgot' && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <h2 style={{
                            color: 'var(--text-primary)',
                            fontSize: '16px',
                            fontWeight: 600,
                            textAlign: 'center',
                        }}>
                            {t.login.tabForgot}
                        </h2>
                    </div>
                )}

                {/* Form */}
                {renderForm()}

                {/* Status Message */}
                {status && (
                    <div
                        style={{
                            marginTop: 'var(--space-4)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '13px',
                            textAlign: 'center',
                            background: isSuccess ? 'var(--success-muted)' : 'var(--error-muted)',
                            color: isSuccess ? '#6B8E6B' : '#CD853F',
                            border: `1px solid ${isSuccess ? 'rgba(61, 90, 71, 0.3)' : 'rgba(139, 69, 19, 0.3)'}`,
                        }}
                    >
                        {status}
                    </div>
                )}

                {/* Footer Links */}
                {mode === 'login' && (
                    <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            {t.login.noAccount}{' '}
                            <button
                                onClick={() => switchMode('register')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                {t.login.tabRegister}
                            </button>
                        </span>
                    </div>
                )}

                {mode === 'register' && (
                    <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            {t.login.hasAccount}{' '}
                            <button
                                onClick={() => switchMode('login')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                {t.login.tabLogin}
                            </button>
                        </span>
                    </div>
                )}

                {/* Powered By Footer */}
                <div
                    style={{
                        marginTop: 'var(--space-6)',
                        paddingTop: 'var(--space-4)',
                        borderTop: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                    }}
                >
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        {t.login.poweredBy}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
