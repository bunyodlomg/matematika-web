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

## Internetga joylash: Netlify (tavsiya etiladi)

Loyiha Netlify uchun tayyor (`netlify.toml`). Natijalar Netlify'ning o'z omborida
(Netlify Blobs) saqlanadi, alohida bazani sozlash shart emas.

1. Loyihani GitHub'ga yuklang.
2. [Netlify](https://app.netlify.com) → **Add new site → Import an existing project** → GitHub → shu repozitoriy.
   Build sozlamalarini o'zgartirmang, ular `netlify.toml` dan olinadi.
3. **Site configuration → Environment variables** bo'limida `ADMIN_PASSWORD` qo'shing
   (o'qituvchi paneli paroli), keyin **Deploys → Trigger deploy** ni bosing.
4. Netlify bergan havolani (masalan `https://matematika.netlify.app`) o'quvchilarga yuboring,
   o'zingiz `.../admin` orqali kirasiz.

GitHub'ga har safar o'zgarish yuklanganda sayt o'zi yangilanadi.
`MONGODB_URI` ni ham qo'shsangiz, natijalar Netlify Blobs o'rniga MongoDB'da saqlanadi.

### Boshqa variant: Render + MongoDB Atlas

1. [MongoDB Atlas](https://www.mongodb.com/atlas) da bepul klaster oching va ulanish manzilini oling.
2. [Render](https://render.com) → **New → Web Service** → GitHub reponi tanlang.
   Build command: `npm install`, Start command: `npm start`,
   Environment: `ADMIN_PASSWORD` va `MONGODB_URI`.

## Tuzilishi

```
server.js            Lokal server (npm start)
src/app.js           Express ilovasi va API
netlify/functions/   Netlify uchun API funksiyasi
netlify.toml         Netlify sozlamalari
src/questions.js     Misollar generatori (sinf × daraja)
src/store.js         Saqlash: MongoDB, Netlify Blobs yoki data/db.json
public/index.html    O'quvchi sahifasi (+ app.js)
public/admin.html    O'qituvchi paneli (+ admin.js)
public/style.css     Umumiy dizayn
```
