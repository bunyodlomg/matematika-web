# 📚 Matematika testi — web ilova (1–4 sinflar)

Telegram botning web ilova ko'rinishi. O'quvchilar telefon, planshet yoki kompyuter
brauzerida test ishlaydi, o'qituvchi esa barcha natijalarni alohida panelda ko'radi.

## Imkoniyatlar

**O'quvchi uchun** (`/`)
- Ro'yxatdan o'tish: **ism, familiya, maktab, sinf (1–4)**. Ma'lumot qurilmada eslab qolinadi.
- 3 ta daraja: **Oson, O'rta, Qiyin**.
- Har testda 12 ta misol: **qo'shish, ayirish, ko'paytirish, bo'lish** (har biridan 3 tadan).
  Sonlar o'quvchining sinfi va darajasiga qarab tanlanadi, bo'lish doim qoldiqsiz.
- Ekrandagi raqamli klaviatura (bolalar uchun qulay), har javobdan keyin ✓/✗ va to'g'ri javob.
- Oxirida **sertifikat**: ism-familiya, maktab, sinf, daraja, natija, sarflangan vaqt, sana.
  PNG qilib yuklab olish yoki chop etish mumkin.
  Baho: 90%+ «A'LO», 70%+ «YAXSHI», 50%+ «QONIQARLI», qolganlari «ISHTIROKCHI».

**O'qituvchi uchun** (`/admin`, parol bilan)
- Har bir o'quvchi: natija (to'g'ri/jami, foiz), **sarflangan vaqt (daqiqa:soniya)**, sana.
- **Qaysi misolda xato qilgani** — jadvalda darhol ko'rinadi (masalan `30 ÷ 5 = 7`).
- Qatorni bosganda: har bir misol, o'quvchi javobi, to'g'ri javob va unga ketgan soniyalar.
- Filtrlar: ism, maktab, sinf, daraja, tugallangan/tugallanmagan.
- Excel uchun **CSV** yuklab olish. Har 30 soniyada avtomatik yangilanadi.

Vaqt va javoblar serverda hisoblanadi — o'quvchi brauzerda o'zgartira olmaydi.

## Ishga tushirish (kompyuterda)

```bash
npm install
cp .env.example .env     # so'ng .env ichida ADMIN_PASSWORD ni o'zgartiring
npm start
```

- O'quvchilar: http://localhost:3000
- O'qituvchi paneli: http://localhost:3000/admin

`MONGODB_URI` bo'sh bo'lsa, natijalar `data/db.json` fayliga yoziladi.
Botdagi MongoDB manzilini qo'ysangiz, natijalar MongoDB'da (`tests` kolleksiyasi) saqlanadi.

## O'z serveringizga joylash (VPS, Ubuntu)

Kerak: Node.js 18 yoki yangiroq. Quyidagi buyruqlar Ubuntu uchun.

**1. Node.js va pm2 o'rnatish** (bir marta)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

**2. Loyihani serverga ko'chirish**

```bash
git clone https://github.com/bunyodlomg/matematika-web.git
cd matematika-web
npm install --omit=dev
cp .env.example .env
nano .env        # ADMIN_PASSWORD ni o'zgartiring; MONGODB_URI ixtiyoriy
```

**3. Ishga tushirish va server qayta yonganda avtomatik ishlashi**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup      # chiqqan buyruqni nusxalab ishga tushiring
```

Tekshirish: `curl http://localhost:3000/api/health` → `{"ok":true,...}` qaytishi kerak.

**4. Domen va HTTPS (nginx)**

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/matematika
sudo nano /etc/nginx/sites-available/matematika   # server_name ga domeningizni yozing
sudo ln -s /etc/nginx/sites-available/matematika /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d matematika.example.uz
```

Domen bo'lmasa, 4-qadamni o'tkazib yuboring va `http://SERVER_IP:3000` orqali kiring
(firewall'da 3000-portni oching: `sudo ufw allow 3000`).

**Yangilash:** `git pull && npm install --omit=dev && pm2 restart matematika`

**Natijalar qayerda:** `MONGODB_URI` bo'sh bo'lsa — `data/db.json` faylida. Bu faylni vaqti-vaqti bilan
nusxalab qo'ying. O'qituvchi panelidagi "Excel'ga yuklab olish" ham zaxira vazifasini bajaradi.

**Xato chiqsa:** `pm2 logs matematika` — server jurnali.

## Boshqa variantlar

- **Hosting panel (cPanel / "Setup Node.js App"):** Application startup file — `server.js`,
  so'ng "Run NPM Install" va muhit o'zgaruvchilariga `ADMIN_PASSWORD` qo'shing.
- **Render:** New → Web Service, Build: `npm install`, Start: `npm start`,
  Environment: `ADMIN_PASSWORD` va `MONGODB_URI` (bepul tarifda fayl o'chib ketadi, shuning uchun MongoDB shart).
- **Netlify:** `netlify.toml` tayyor, lekin u yerda fayl saqlanmaydi, shuning uchun
  Environment variables'ga `MONGODB_URI` (masalan, bepul [MongoDB Atlas](https://www.mongodb.com/atlas))
  va `ADMIN_PASSWORD` qo'shish shart.

## Tuzilishi

```
server.js            Lokal server (npm start)
src/app.js           Express ilovasi va API
netlify/functions/   Netlify uchun API funksiyasi
netlify.toml         Netlify sozlamalari
src/questions.js     Misollar generatori (sinf × daraja)
src/store.js         Saqlash: MongoDB yoki data/db.json
ecosystem.config.js  pm2 sozlamasi
deploy/nginx.conf    Nginx namunasi
public/index.html    O'quvchi sahifasi (+ app.js)
public/admin.html    O'qituvchi paneli (+ admin.js)
public/style.css     Umumiy dizayn
```
