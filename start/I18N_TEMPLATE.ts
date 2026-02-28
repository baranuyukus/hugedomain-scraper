// Internationalization (i18n) module

export type Language = 'en' | 'tr';

export interface Translations {
    // Login
    login: {
        title: string;
        subtitle: string;
        // Tabs
        tabLogin: string;
        tabRegister: string;
        tabForgot: string;
        // Fields
        licenseKey: string;
        licensePlaceholder: string;
        username: string;
        usernamePlaceholder: string;
        password: string;
        passwordPlaceholder: string;
        email: string;
        emailPlaceholder: string;
        // Buttons
        loginButton: string;
        registerButton: string;
        resetButton: string;
        // Status
        checking: string;
        success: string;
        error: string;
        registerSuccess: string;
        resetSuccess: string;
        // Links
        forgotLink: string;
        backToLogin: string;
        noAccount: string;
        hasAccount: string;
        // Footer
        poweredBy: string;
    };
    // Sidebar
    sidebar: {
        title: string;
        subtitle: string;
        pointMode: string;
        polygonMode: string;
        projectInfo: string;
        projectName: string;
        projectNamePlaceholder: string;
        description: string;
        descriptionPlaceholder: string;
        keywords: string;
        keywordsPlaceholder: string;
        website: string;
        websitePlaceholder: string;
        phone: string;
        phonePlaceholder: string;
        generationSettings: string;
        pointCount: string;
        generationMethod: string;
        concentric: string;
        random: string;
        centerPoint: string;
        selectFromMap: string;
        radius: string;
        polygonStatus: string;
        polygonDrawn: string;
        drawOnMap: string;
        generateButton: string;
        generating: string;
        exportButton: string;
        pointsGenerated: string;
    };
    // Map
    map: {
        drawPolygon: string;
        deletePolygon: string;
        drawingHint: string;
        points: string;
    };
    // Common
    common: {
        required: string;
        error: string;
        success: string;
        loading: string;
        language: string;
    };
    // Export
    export: {
        success: string;
        error: string;
        selectFolder: string;
    };
}

const en: Translations = {
    login: {
        title: 'Lokal Boost SEO',
        subtitle: 'Coordinate generation for local SEO',
        // Tabs
        tabLogin: 'Login',
        tabRegister: 'Register',
        tabForgot: 'Reset Password',
        // Fields
        licenseKey: 'License key',
        licensePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
        username: 'Username',
        usernamePlaceholder: 'Enter your username',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        email: 'Email',
        emailPlaceholder: 'your@email.com',
        // Buttons
        loginButton: 'Login',
        registerButton: 'Create Account',
        resetButton: 'Send Reset Link',
        // Status
        checking: 'Please wait...',
        success: 'Success! Redirecting...',
        error: 'Error',
        registerSuccess: 'Account created! You can now login.',
        resetSuccess: 'Password reset link sent to your email.',
        // Links
        forgotLink: 'Forgot password?',
        backToLogin: 'Back to login',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        // Footer
        poweredBy: 'lokalboost.net • v1.0',
    },
    sidebar: {
        title: 'Lokal Boost',
        subtitle: 'SEO Coordinate Generator',
        pointMode: 'Point',
        polygonMode: 'Polygon',
        projectInfo: 'Project Info',
        projectName: 'Project Name',
        projectNamePlaceholder: 'e.g., Istanbul Data',
        description: 'Description',
        descriptionPlaceholder: 'Project description',
        keywords: 'Keywords (comma separated)',
        keywordsPlaceholder: 'keyword1, keyword2, keyword3',
        website: 'Website',
        websitePlaceholder: 'https://example.com',
        phone: 'Phone',
        phonePlaceholder: '+1 XXX XXX XXXX',
        generationSettings: 'Generation Settings',
        pointCount: 'Point Count',
        generationMethod: 'Generation Method',
        concentric: 'Concentric Circles',
        random: 'Random Distribution',
        centerPoint: 'Center Point',
        selectFromMap: 'Select from map',
        radius: 'Radius (km)',
        polygonStatus: 'Polygon Status',
        polygonDrawn: 'Polygon drawn',
        drawOnMap: 'Draw on map',
        generateButton: 'Generate Coordinates',
        generating: 'Generating...',
        exportButton: 'Export to Excel',
        pointsGenerated: 'points generated',
    },
    map: {
        drawPolygon: 'Draw Polygon',
        deletePolygon: 'Delete Polygon',
        drawingHint: 'Click on the map to draw polygon vertices. Click the first point to complete.',
        points: 'points',
    },
    common: {
        required: 'Required',
        error: 'Error',
        success: 'Success',
        loading: 'Loading...',
        language: 'Language',
    },
    export: {
        success: 'files saved successfully to',
        error: 'Export error',
        selectFolder: 'Select folder',
    },
};

const tr: Translations = {
    login: {
        title: 'Lokal Boost SEO',
        subtitle: 'Yerel SEO için koordinat üretimi',
        // Tabs
        tabLogin: 'Giriş',
        tabRegister: 'Kayıt Ol',
        tabForgot: 'Şifre Sıfırla',
        // Fields
        licenseKey: 'Lisans anahtarı',
        licensePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
        username: 'Kullanıcı adı',
        usernamePlaceholder: 'Kullanıcı adınızı girin',
        password: 'Şifre',
        passwordPlaceholder: 'Şifrenizi girin',
        email: 'E-posta',
        emailPlaceholder: 'email@adresiniz.com',
        // Buttons
        loginButton: 'Giriş Yap',
        registerButton: 'Hesap Oluştur',
        resetButton: 'Sıfırlama Linki Gönder',
        // Status
        checking: 'Lütfen bekleyin...',
        success: 'Başarılı! Yönlendiriliyor...',
        error: 'Hata',
        registerSuccess: 'Hesap oluşturuldu! Şimdi giriş yapabilirsiniz.',
        resetSuccess: 'Şifre sıfırlama linki e-postanıza gönderildi.',
        // Links
        forgotLink: 'Şifremi unuttum',
        backToLogin: 'Giriş ekranına dön',
        noAccount: 'Hesabınız yok mu?',
        hasAccount: 'Zaten hesabınız var mı?',
        // Footer
        poweredBy: 'lokalboost.net • v1.0',
    },
    sidebar: {
        title: 'Lokal Boost',
        subtitle: 'SEO Koordinat Üretici',
        pointMode: 'Nokta',
        polygonMode: 'Poligon',
        projectInfo: 'Proje Bilgileri',
        projectName: 'Proje Adı',
        projectNamePlaceholder: 'Örn: İstanbul Verisi',
        description: 'Açıklama',
        descriptionPlaceholder: 'Proje açıklaması',
        keywords: 'Anahtar kelimeler (virgülle ayırın)',
        keywordsPlaceholder: 'anahtar1, anahtar2, anahtar3',
        website: 'Web sitesi',
        websitePlaceholder: 'https://ornek.com',
        phone: 'Telefon',
        phonePlaceholder: '+90 XXX XXX XX XX',
        generationSettings: 'Üretim Ayarları',
        pointCount: 'Nokta Sayısı',
        generationMethod: 'Üretim Yöntemi',
        concentric: 'Eşmerkezli Daireler',
        random: 'Rastgele Dağılım',
        centerPoint: 'Merkez Noktası',
        selectFromMap: 'Haritadan seçin',
        radius: 'Yarıçap (km)',
        polygonStatus: 'Poligon Durumu',
        polygonDrawn: 'Poligon çizildi',
        drawOnMap: 'Haritada çizin',
        generateButton: 'Koordinat Üret',
        generating: 'Üretiliyor...',
        exportButton: 'Excel\'e Aktar',
        pointsGenerated: 'nokta üretildi',
    },
    map: {
        drawPolygon: 'Poligon Çiz',
        deletePolygon: 'Poligonu Sil',
        drawingHint: 'Haritaya tıklayarak poligon köşelerini çizin. Tamamlamak için ilk noktaya tıklayın.',
        points: 'nokta',
    },
    common: {
        required: 'Zorunlu',
        error: 'Hata',
        success: 'Başarılı',
        loading: 'Yükleniyor...',
        language: 'Dil',
    },
    export: {
        success: 'dosya başarıyla kaydedildi:',
        error: 'Export hatası',
        selectFolder: 'Klasör seçin',
    },
};

export const translations: Record<Language, Translations> = { en, tr };

export const getTranslations = (lang: Language): Translations => translations[lang];
