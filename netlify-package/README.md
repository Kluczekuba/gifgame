# MADROG Road Repair

Prosta gra webowa w stylu arcade. Maszyna MADROG naprawia ubytki w drodze po kliknięciu, dotknięciu ekranu albo naciśnięciu spacji.

## Uruchomienie lokalne

Najprościej: otwórz plik `index.html` w przeglądarce.

Jeżeli chcesz sprawdzić grę na telefonie w tej samej sieci Wi-Fi, możesz uruchomić prosty serwer lokalny w folderze projektu:

```bash
python3 -m http.server 8000
```

Potem otwórz w przeglądarce adres pokazany przez komputer, np. `http://localhost:8000`.

## Publikacja online i QR

1. Wgraj cały folder projektu na hosting statyczny, np. GitHub Pages, Netlify albo Vercel.
2. Skopiuj publiczny link do gry.
3. Wygeneruj kod QR prowadzący do tego linku.
4. Po zeskanowaniu kodu QR gra otworzy się w przeglądarce telefonu.

## Pliki

- `index.html` - struktura strony i ekrany start/koniec.
- `style.css` - wygląd strony i responsywność.
- `game.js` - logika gry, Canvas 2D, punkty, życia i localStorage.
- `assets/madrog-machine.gif` - oryginalny plik źródłowy.
- `assets/madrog-machine-cutout.gif` - wycięty animowany sprite maszyny z przezroczystym tłem, używany w grze.
- `assets/madrog-machine-model.png` - aktualny wycięty model maszyny używany w grze.

## Sterowanie

- komputer: spacja albo kliknięcie myszą,
- telefon: dotknięcie ekranu.

Za poprawnie naprawiony ubytek gracz dostaje punkt. Co 5 trafień z rzędu gra dodaje mały bonus.
