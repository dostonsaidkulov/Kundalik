# Kundalik

Vazifalar, rejalar, g'oyalar, shaxsiy moliya (bozorlik ro'yxati bilan) va kitoblar (iqtiboslar bilan) bitta ilovada.
Android ilovasi va kompyuter (brauzer) versiyasi bir xil ma'lumotlar bilan ishlaydi.

## Qayerdan olish

- **Android:** shu repodagi **Releases** bo'limidan oxirgi `Kundalik.apk` faylini yuklab o'rnating.
- **Kompyuter:** `https://<github-nomingiz>.github.io/kundalik/`

## Qanday ishlaydi

- Kod `main` tarmog'iga yuklanishi bilan GitHub Actions o'zi APK yig'adi va kompyuter versiyasini yangilaydi.
- Ma'lumotlar Firebase'da (Firestore) saqlanadi va internetsiz ham ishlaydi; internet qaytganda sinxronlanadi.
- Firebase sozlamalari `src/config.js` faylida.
- APK imzo kaliti `android-res/kundalik.p12`, paroli GitHub'da `KEYSTORE_PASSWORD` sirida saqlanadi.

## Texnologiyalar

React + Vite, Capacitor 7 (Android), Firebase Auth + Firestore, Capacitor Local Notifications.
