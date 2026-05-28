# Yeni Projeler İçin Sistem Mimarisi ve Scraper Rehberi (START.md)

Bu doküman, mevcut **HugeDomains Tracker** projesindeki yüksek performanslı (Milyonlarca satırı kasmadan işleyen) mimarinin temelini anlatır. Yeni bir web sitesi veya farklı bir veri kaynağı için benzer bir sistem kuracağınız zaman buradaki teknik prensipleri uygulatarak yapay zeka asistanlarını (bana) veya geliştiricileri kolayca yönlendirebilirsiniz.

---

## 1. Mimari Genel Bakış

Sistem 3 temel ayaktan oluşmaktadır:
1.  **Frontend (React + AG Grid):** Milyonlarca satır veriyi tarayıcıyı çökertmeden göstermek için "Sonsuz Kaydırma" (Server-Side Pagination/Infinite Scroll) kullanan arayüz.
2.  **Backend (FastAPI):** Hızlı, asenkron ve Python tabanlı API sunucusu. Frontend ile Veritabanı (DuckDB) arasındaki köprü.
3.  **Veritabanı (DuckDB):** Saniyeler içinde Gigabaytlarca CSV dosyasını okuyup analiz edebilen, kurulumsuz, analitik (OLAP) odaklı SQL veritabanı.

---

## 2. Neden DuckDB Kullanıyoruz? (Teknik Altyapı)

Yeni bir scraper yaparken verileri MySQL, PostgreSQL veya SQLite'a **kaydetmiyoruz**. Bunun yerine **DuckDB** kullanıyoruz. Neden?
*   **Sütun Bazlı (Columnar) Çalışır:** Klasik veritabanları verileri satır satır okur. DuckDB sütun sütun okuduğu için filtreleme, sıralama ve sayma işlemlerinde (Örn: "Fiyatı 500'den büyük olanlar") SQLite'tan 100 kat daha hızlıdır.
*   **Zero-Copy CSV Import:** `read_csv_auto` fonksiyonu sayesinde, scraper'ın ürettiği 5 milyon satırlık bir CSV dosyasını saniyeler içinde direkt diskten okuyup veritabanı tablosuna dönüştürebilir.
*   **Sunucusuz (Serverless):** Arka planda çalışan bir servis yoktur. Tek bir `.db` dosyası olarak durur. Yönetmesi ve yedeklemesi aşırı kolaydır.

### Veritabanı Şeması (Relations)
HugeDomains veya benzeri izleme/takip projelerinde verileri genellikle şu 3 tabloya ayırıyoruz:
1.  **`snapshots` (Tarama Geçmişi):** Her bir scraping işlemini temsil eder. (ID, İsim, Tarih, Toplam Satır).
2.  **`items / domains` (Kalıcı Varlıklar):** Kazıdığınız asıl nesneler. URL, Domain veya Ürün ismi. Sadece bir kere kaydedilir ve eşsiz bir ID alır.
3.  **`snapshot_data` (İlişki ve Fiyat/Durum Tablosu):** Hangi snapshot'ta, hangi eşsiz varlık, hangi fiyattan (veya hangi teknik özellikle) bulundu? Bu tablo milyonlarca satır olabilir.

---

## 3. Yeni Scraper Geliştirme Mantığı (Yapay Zekaya Verilecek Komutlar)

Mevcut sistemde en önemli nokta **Scraper'ın veritabanına direkt INSERT yapmamasıdır.**

Yeni bir site kazınacağı zaman yapay zekaya veya geliştiriciye şu mantığı kurdurmalısınız:

### Adım 1: Scraper'ın Görevi (CSV Üretmek)
*   Scraper hedef siteyi tarar (Örn: Cloudflare varsa `curl_cffi` veya `undetected_chromedriver` kullanılır).
*   Gelen verileri anlık olarak veritabanına yazmak yerine, **arka planda hızlıca bir `.csv` dosyasına (Append modunda `a`) satır satır ekler.**
*   Bu sayede scraper'ı hiçbir veritabanı kilidi (database lock) yavaşlatmaz. İşlem asenkron ve inanılmaz hızlı biter.

### Adım 2: ETL İşlemi (CSV'den DuckDB'ye Aktarım)
*   Kazıma bitince (veya durdurulunca), FastAPI tarafındaki bir fonksiyon çağrılır.
*   Önce sisteme yeni bir "Snapshot" kaydı açılır (Örn: `id=5`).
*   Ardından DuckDB'nin muazzam gücü kullanılarak şu tarz bir SQL çalıştırılır:
    ```sql
    INSERT INTO snapshot_data (snapshot_id, url_id, price, length)
    SELECT 5, get_url_id(url), price, length FROM read_csv_auto('temp_results.csv');
    ```
*   Bu işlem birkaç saniye sürer ve scraper çöp dosyası silinir.

---

## 4. Frontend & Backend Haberleşmesi (Performans Standartları)

Yeni yapacağınız arayüzde milyonlarca satırı gösterirken tarayıcının sekmesinin çökmemesi için şu kurallara her zaman uyulmalıdır:

1.  **Server-Side Pagination:** Arayüz (React) backend'den her defasında sadece o an ekranda görünen 100 satırı istemelidir (`limit=100`, `offset=0` parametreleriyle). Hiçbir zaman tüm veriyi JSON olarak çekmeyin.
2.  **Debounce:** Arama kutusuna veya filtreye (Min Price vb.) yazı yazarken, kullanıcı klavyeden elini çekene kadar (örn. 800ms) backend'e istek atılmamalıdır. Yoksa her harfte (`A`, `Ah`, `Ahm`, `Ahme`, `Ahmet`) API'ye DB sorgusu gider ve sistemi tıkar.
3.  **AG-Grid Infinite Row Model:** React tarafında standart `<table>` elementleri yerine AG Grid kütüphanesinin "Infinite" (Sonsuz) modeli kullanılmalıdır. Bu yapı kullanıldığında grid, sadece kullanıcının aşağı kaydırdığı (scroll) kısımdaki verileri API'den otomatik GET isteğiyle çeker.

---

## 5. Yeni Site Projesi İçin Taslak Prompt (Yapay Zeka Yönlendirme Şablonu)

Yeni bir projeye başlarken bu START.md dosyasını referans gösterip yapay zekaya (Cursor, Gemini vs.) şu prompt'u verebilirsiniz:

> *"Yeni bir web scraping ve takip dashboard'u projesine başlıyoruz. Hedef sitemiz: [SİTE_URL]. Mimari ve altyapı kodlama kuralları projemizin ana dizininde bulunan `START.md` isimli dosyada detaylıca anlatılmıştır. Lütfen ilk olarak o dosyayı oku. Ardından, hedef site için Cloudflare bypass eden asenkron bir scraper yaz. Scraper verileri direkt DB'ye DEĞİL, bir CSV dosyasına yazmalı. Backend olarak FastAPI, veritabanı olarak DuckDB kullanılacak. CSV'den DuckDB'ye aktarım `read_csv_auto` ile yapılacak. Frontend React ve AG Grid Infinite Scroll yapısıyla kurulacak. Bu kurallara uygun şekilde backend ve veritabanı iskeletini oluşturarak başla."*

Bu rehberi veya bu yaklaşımı kullanarak herhangi bir e-ticaret sitesini, emlak sitesini veya veri platformunu mevcut HugeDomains projesindeki gibi "Sıfır Kasmayla" ve "Milyonlarca satırı anında filtreleyebilecek" seviyede kurabilirsiniz.
