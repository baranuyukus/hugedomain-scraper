# Gelişmiş Web Scraping ve İstek (Request) Mimarisi Rehberi

Bu doküman, sistemimizde çalışan yüksek performanslı ve anti-bot sistemlerini (Cloudflare, Datadome vb.) aşabilen scraper (kazıyıcı) modülünün çalışma mantığını açıklar. Yeni bir hedef site için scraper yazarken bu prensiplere sadık kalınmalıdır.

---

## 1. Temel Teknoloji: Neden `curl_cffi` Kullanıyoruz?

Modern web siteleri sıradan `requests` veya `aiohttp` kütüphanelerini kullanan botları anında tespit edip engeller, çünkü bu kütüphanelerin TLS (Transport Layer Security) parmak izleri gerçek bir tarayıcıya (Chrome, Safari) benzemez.

Hedef siteleri kazarken **`curl_cffi`** (özellikle asenkron versiyonu `AsyncSession`) kullanıyoruz. Neden?
- **Impersonate (Taklit):** `curl_cffi`, network seviyesinde kendini gerçek bir tarayıcı olarak gösterir (`impersonate="chrome110"` gibi).
- **Cloudflare Bypass:** Hedef site Cloudflare arkasındaysa bile TLS katmanında gerçek bir Chrome sinyali yolladığı için HTTP 403 (Forbidden) yemeden veriyi alırız.
- **Asenkron Destek:** `asyncio` ile uyumludur, bu sayede aynı saniye içinde yüzlerce istek atılabilir.

---

## 2. Asenkron (Async) Mimarisi ve Concurrency (Eşzamanlılık)

Milyonlarca satırı dakikalar içinde çekebilmek için senkron (satır satır bekleyen) kodlar KULLANILMAZ.
Sistem, Python'un `asyncio` kütüphanesi üzerine kuruludur.

### Semaphore Mantığı (Istek Sınırlandırma)
Binlerce isteği aynı anda atarsak bilgisayarımızın RAM'i dolar veya karşı sunucu bizi tamamen banlar. Bu yüzden araya bir **kilit / filtre (Semaphore)** koyuyoruz:

```python
# Aynı anda en fazla 50 istek atılsın
semaphore = asyncio.Semaphore(50)

async def worker(url):
    async with semaphore:
        # İstek atma kodları...
```

Bu yapı sayesinde scraper her zaman maksimum kapasitede çalışır ama asla sistemi kitleyecek veya proxy'leri patlatacak kadar çok eşzamanlı istek göndermez. Sayfalar geldikçe sıradakiler işleme alınır.

---

## 3. Proxy Kullanımı ve Rotasyon Yapısı

Büyük veri kazıma işlemlerinde tek bir IP adresi kullanmak intihardır. Verimli bir kazıma için hedef sitelere dinamik olarak değişen (Rotating) proxy havuzları üzerinden bağlanılır.

- Proxy formatı `http://user:pass@host:port` şeklindedir.
- `curl_cffi` içerisinde `proxies={"http": PROXY_URL, "https": PROXY_URL}` şeklinde tanımlanır.
- Eğer kaliteli bir "Rotating Residential Proxy" kullanıyorsanız, proxy servisi arka planda her yeni istekte IP'nizi kendi kendine değiştireceğinden kodunuzda ekstra bir rotasyon mantığı yazmanıza gerek kalmaz.

---

## 4. İstek Başlıkları (Headers) Optimizasyonu

Hedef sitenin bot korumalarından geçmek için sadece `curl_cffi` yetmez, HTTP başlıklarının da bir insanı taklit etmesi gerekir. 

Örnek zorunlu başlıklar:
```python
HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1", # Tarayıcı olduğumuzu belli eden önemli kısım
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}
```

---

## 5. Başarısız İstekleri Yönetme (Retry Mechanism)

İnternet dünyasında isteklerin kopması, timeout yemesi veya proxy'nin anlık çökmesi çok normaldir. Bu yüzden istek fonksiyonları **"Retry" (Yeniden Deneme)** mantığı ile sarmalanır.

Eğer bir sayfadan `200 OK` dönmezse, scraper hata verip çökmemeli; belirli bir süre bekleyip (Exponential Backoff) tekrar denemelidir.

```python
async def fetch_page(session, url, retries=3):
    for attempt in range(retries):
        try:
            response = await session.get(url, headers=HEADERS, timeout=15)
            if response.status_code == 200:
                return response.text
            else:
                await asyncio.sleep(2 ** attempt) # Giderek artan bekleme süresi
        except Exception as e:
            await asyncio.sleep(2 ** attempt)
    return None # Tüm denemeler bitince None dön
```

---

## 6. Veriyi İşleme (Parse) ve Çıktı Üretme

İstek atıldı ve HTML veya JSON cevap başarıyla alındı. 
1. Ekrana direkt regex ile veya `BeautifulSoup` kütüphanesi ile dalarak sadece istenilen spesifik elementleri çekmeliyiz. (Tüm HTML'i hafızada tutmayın).
2. Tüm veri parçalanır parçalanmaz asla Veritabanına (DB) **satır satır INSERT ETMİYORUZ**.
3. Bunun yerine en hızlı metod olan **CSV dosyasına Ekleme (Append `a` modu)** uyguluyoruz.

**Neden?** Asenkron işçiler (workers) saniyede 100 sayfa işlerken, 100 sayfanın sonucunu her saniye DB'ye kaydetmeye çalışmak "Database Lock"a sebep olur. CSV dosyasına düz metin yazmak I/O (Girdi/Çıktı) olarak bilgisayarda en ucuz işlemdir ve kazıma işlemini uçurur. İşlem sonunda CSV'den toplu halde veritabanına aktarım (`read_csv_auto`) yapılır.

## Yeni Yapay Zeka (AI) Promptu İçin Scraper Eklentisi:
Bir önceki belge de bulunan mimari direktifine ek olarak;
*"Scraper modülünü yazarken kesinlikle `curl_cffi` asenkron session yapısını kullan. Proxy parametrelerini tanımla. Hedeflenen API endpoint'ine (veya sayfalara) atacağın eşzamanlı istekleri `asyncio.Semaphore()` ile 50 ile sınırla. Eğer sayfa yüklenmezse 3 kez yeniden deneme (retry) mekanizması ekle. Scraping sonucunu `BeautifulSoup` veya Regex ile parse edip asenkron olmayan, klasik `csv_writer` append (`a`) metodu ile anında geçici dosyaya dump (kaydet) et."*
