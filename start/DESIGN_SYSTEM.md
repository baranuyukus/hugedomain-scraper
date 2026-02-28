# 🎨 Lokal Boost Design System

## CSS Variables - Dark Kartografik Theme

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ===================================
   Lokal Boost - Design System
   Marka: lokalboost.net
   Tema: Kartografik Dark Mode
   =================================== */

:root {
  /* === Surface Hierarchy (Topografik Katmanlar) === */
  --surface-base: #1A1F2E;      /* Ana zemin - gece gökyüzü */
  --surface-100: #1E2436;       /* Çok hafif elevation */
  --surface-200: #232A3C;       /* Kartlar, paneller */
  --surface-300: #2A3347;       /* Dropdown, overlay */
  --surface-paper: #F5F1E8;     /* Açık tema için parşömen */

  /* === Text Hierarchy === */
  --text-primary: #F5F1E8;      /* Kum beyazı - ana metin */
  --text-secondary: #A8A29E;    /* Kum grisi - ikincil */
  --text-muted: #6B6560;        /* Toprak tonu - placeholder */
  --text-data: #D4A84B;         /* Meridyen sarısı - veri, koordinat */

  /* === Border Strategy (Subtle Borders) === */
  --border-default: rgba(255, 255, 255, 0.06);
  --border-subtle: rgba(255, 255, 255, 0.03);
  --border-strong: rgba(255, 255, 255, 0.12);
  --border-meridian: rgba(212, 168, 75, 0.15);

  /* === Accent & Brand === */
  --accent-primary: #D4A84B;    /* Meridyen sarısı - ana vurgu */
  --accent-hover: #E0B85C;      /* Hover state */
  --accent-muted: rgba(212, 168, 75, 0.15);

  /* === Semantic Colors === */
  --success: #3D5A47;           /* Orman yeşili */
  --success-muted: rgba(61, 90, 71, 0.2);
  --warning: #B8860B;           /* Altın kahve */
  --warning-muted: rgba(184, 134, 11, 0.2);
  --error: #8B4513;             /* Toprak kırmızısı */
  --error-muted: rgba(139, 69, 19, 0.2);

  /* === Ocean Blues (Veri / Su) === */
  --ocean-deep: #2A4B5E;
  --ocean-surface: #3A6B7E;

  /* === Spacing System (8px base) === */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;

  /* === Border Radius (Technical) === */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* === Typography === */
  --font-ui: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-data: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;

  /* === Transitions === */
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease-out;
}

/* === Base Styles === */
html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
  background: var(--surface-base);
  color: var(--text-primary);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

/* === Signature Element: Grid Pattern === */
.grid-pattern {
  background-image:
    linear-gradient(var(--border-meridian) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-meridian) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: center center;
}

.grid-pattern-subtle {
  background-image:
    linear-gradient(var(--border-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* === Surface Utilities === */
.surface-base { background: var(--surface-base); }
.surface-100 { background: var(--surface-100); }
.surface-200 { background: var(--surface-200); }
.surface-300 { background: var(--surface-300); }

/* === Text Utilities === */
.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }
.text-data {
  color: var(--text-data);
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
}

/* === Border Utilities === */
.border-default { border-color: var(--border-default); }
.border-subtle { border-color: var(--border-subtle); }
.border-strong { border-color: var(--border-strong); }
.border-meridian { border-color: var(--border-meridian); }

/* === Focus States === */
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--accent-muted);
}

/* === Data Display === */
.coord-display {
  font-family: var(--font-data);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--text-data);
}

/* === Scrollbar Styling === */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--surface-100); }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* === Selection === */
::selection {
  background: var(--accent-muted);
  color: var(--text-primary);
}
```

---

## Renk Paleti Özeti

| Kullanım | CSS Variable | Hex |
|----------|--------------|-----|
| Ana arka plan | `--surface-base` | #1A1F2E |
| Kart/Panel | `--surface-200` | #232A3C |
| Ana metin | `--text-primary` | #F5F1E8 |
| Vurgu (accent) | `--accent-primary` | #D4A84B |
| Başarı | `--success` | #3D5A47 |
| Hata | `--error` | #8B4513 |

---

## Font Yükleme (index.html)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## Buton Stilleri

```css
/* Primary Button */
.btn-primary {
  background: var(--accent-primary);
  color: #1A1F2E;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: var(--transition-fast);
}
.btn-primary:hover {
  background: var(--accent-hover);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
}
.btn-secondary:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
```

---

## Input Stilleri

```css
.input-field {
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  font-size: 14px;
  transition: var(--transition-fast);
}
.input-field:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-muted);
}
.input-field::placeholder {
  color: var(--text-muted);
}
```

---

## Kart Stilleri

```css
.card {
  background: var(--surface-200);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}
.card-header {
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-4);
}
```
