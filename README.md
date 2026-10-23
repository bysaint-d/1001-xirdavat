# 1001-Xırdavat

Azərbaycan dilində çoxsatıcılı marketplace. Ümumi kataloq, mağazalar, satıcı/admin panelləri, ayrıca indi-al axını, səbət və mərhələli sifarişlər.

Bu repozitoriya aktiv Cloudflare Pages tətbiqinin təmiz mənbə nüsxəsidir. Şəxsi baza, istifadəçi məlumatları, köhnə hosting adapteri, hesab identifikatorları və giriş açarları daxil edilməyib. Git tarixçəsi təmiz başlanıb.

## Yoxlama

Node.js 26 tələb olunur.

```sh
npm ci
npm test
npm run build
```

## Cloudflare Pages

1. Öz Cloudflare hesabında Pages layihəsi və D1 bazası yarat.
2. pages/wrangler.example.json faylını pages/wrangler.json kimi köçür və öz D1 identifikatorunu yaz. Yerli konfiqurasiya Git-dən kənardır.
3. drizzle/*.sql miqrasiyalarını sıra ilə, sonra pages/auth-schema.sql faylını öz bazana tətbiq et. Bunlar yalnız sxemdir, şəxsi məlumat daşımır.
4. Pages runtime üçün DB binding təyin et. AUTH_PEPPER (ən azı 32 təsadüfi simvol) və ADMIN_EMAILS dəyərlərini Cloudflare secrets bölməsinə yaz. Onları brauzer koduna və repozitoriyaya yazma.
5. npm run build işlət və .pages-output qovluğunu Pages advanced-mode olaraq yayımla. Deploy skriptində layihə adını öz layihənə uyğun dəyiş.

Mövcud saytda hesablar şəxsi dəvətlə açılır. Boş bazada ilk admin istifadəçisi və hash-lənmiş, vaxtı məhdud dəvət qeydi operator tərəfindən yaradılmalıdır; repozitoriyada hazır admin hesabı və universal şifrə yoxdur.

Məhsul nümunələri lib/seed-data.mjs faylındadır; Birmarket məhsul mənbələri həmin qeydlərdə göstərilib. Ödəniş yalnız test simulyasiyasıdır; real kart məlumatı daxil etməyin. Test sifarişi real ödəniş sübutu deyil.

## Odero

Odero server adapteri hazırlanıb və offline yoxlanılıb. Checkout-a hələ qoşulmayıb; canlı ödəniş aktiv deyil. Hesab tələbləri və qalan inteqrasiya addımları [ODERO.md](ODERO.md) faylındadır.
