# 1001-Xırdavat

Azərbaycan dilində çoxsatıcılı marketplace: açıq kataloq, fərdi mağazalar, müştəri və satıcı üçün ayrı giriş, ayrıca qorunan admin/moderator paneli.

## Ünvanlar

- `/` — girişsiz kataloq və axtarış.
- `/login`, `/register` — müştəri girişi və qeydiyyatı.
- `/seller/login`, `/seller/register` — satıcı girişi və qeydiyyatı.
- `/seller` — mağaza, məhsul, stok və sifariş idarəetməsi.
- `/admin` — ayrıca giriş tələb edən idarəetmə paneli; açıq menyuda göstərilmir.
- `/account`, `/notifications` — profil, ünvanlar və bildirişlər.

## İşə salmaq

Node.js 26 tələb olunur.

```sh
npm ci
npm test
npm run build
npm run dev
```

Lokal önizləmə `http://127.0.0.1:8788` ünvanında işləyir. Lokal baza `.sites-runtime/preview.sqlite` faylındadır və Git-ə daxil edilmir. Lokal və canlı hesablar fərqlidir; repozitoriyada universal admin şifrəsi yoxdur.

## Cloudflare Pages

1. Öz Pages layihəni və D1 bazanı yarat.
2. `pages/wrangler.example.json` faylını `pages/wrangler.json` kimi köçür, layihə və baza məlumatlarını doldur.
3. `node scripts/cloudflare-db.mjs migrate pages/wrangler.json` işlət.
4. `AUTH_PEPPER` (ən azı 32 təsadüfi simvol) və `ADMIN_EMAILS` dəyərlərini Pages runtime secrets-də saxla.
5. `npm run deploy` işlət. İlk admin üçün bazada mövcud hesab/şəxsi dəvət tələb olunur; açıq qeydiyyatdan admin olmaq mümkün deyil.

Müştəri və satıcı açıq qeydiyyatdan keçir. Admin əsas hesabı idarə edir və istifadəçilərə konkret mağazalar üzrə moderator hüquqları verir. Hüquqlar hər API sorğusunda serverdə yoxlanılır.

## Sənədlər

- [DATABASE.md](DATABASE.md): versiyalı miqrasiya, şifrəli tam ixrac/idxal və bərpa.
- [API.md](API.md): saytın API-si və sonrakı Android tətbiqləri üçün sərhədlər.
- [RELEASE-STATUS.md](RELEASE-STATUS.md): hazır funksiyalar və xarici xidmət tələbləri.
- [SECURITY.md](SECURITY.md): təhlükəsizlik qeydləri.
- [ODERO.md](ODERO.md): hələ aktivləşdirilməmiş ödəniş modulu.

Email üçün göndərən domen və xidmət açarı, avtomatik kargo üçün ayrıca provayder hesabı lazımdır. Bunlar qoşulmayıbsa, saytda uyğun vəziyyət açıq göstərilir. Bildiriş qutusu və əl ilə kargo idarəsi işləyir.

Ödəniş hazırda açıq işarələnmiş test simulyasiyasıdır. Real kart məlumatı daxil etməyin. Mənbəsi göstərilən demo məhsullar rəsmi stok/təchizat inteqrasiyası deyil.

Hesab identifikatorları, runtime açarları, şəxsi verilənlər bazası və ehtiyat nüsxələr repozitoriyadan kənarda saxlanılır.
