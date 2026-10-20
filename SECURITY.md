# Təhlükəsizlik qeydləri

Yalnız pages/worker.mjs giriş nöqtəsini yerləşdirin. lib/market-service.mjs autentifikasiyanı adapterdən qəbul edir; onu birbaşa internetə açmayın. Brauzerdən gələn istifadəçi identity başlıqları autentifikasiya üçün istifadə edilmir.

Sessiyalar HttpOnly/Secure/SameSite cookie ilə qorunur. Şifrələr salt və runtime pepper ilə PBKDF2 hash olaraq saxlanılır. Məxfi açarlar yalnız runtime secrets-də saxlanmalıdır. Dəvət linkləri hesab girişi verdiyindən onları loglara və issue-lara yazmayın.

Admin siyahısından email çıxarılması admin API və dəvət səlahiyyətini dayandırır. Testlər sessiya, CSRF, mağazalar arasında giriş sərhədi, stok və sifariş ardıcıllığını yoxlayır. Bu yoxlama tam penetration test və production sertifikatı deyil.

Ödəniş test rejimindədir. Real ticarət üçün ayrıca payment provider, webhook təsdiqi, backup və əməliyyat prosedurları hazırlanmalıdır.

Şübhəli açarı Git-ə əlavə etmisinizsə, sadəcə fayldan silmək kifayət deyil: açarı xidmət provayderində ləğv edib yenisini yaradın.
