# MPA RETRO Game

Prosta gra webowa w stylu arcade. Maszyna MADROG naprawia ubytki w drodze po kliknięciu, dotknięciu ekranu albo naciśnięciu spacji.

## Uruchomienie lokalne

Najprościej: otwórz plik `index.html` w przeglądarce.

Jeżeli chcesz sprawdzić grę na telefonie w tej samej sieci Wi-Fi, możesz uruchomić prosty serwer lokalny w folderze projektu:

```bash
python3 -m http.server 8000
```

Potem otwórz w przeglądarce adres pokazany przez komputer, np. `http://localhost:8000`.

## Publikacja online i QR

Docelowy publiczny adres gry:

`https://kluczekuba.github.io/gifgame/`

Żeby QR działał po zeskanowaniu:

1. Wgraj pliki projektu do repozytorium GitHub.
2. Włącz GitHub Pages dla repozytorium.
3. Ustaw źródło wdrożenia na `GitHub Actions` albo `main` / `/ (root)` zgodnie z konfiguracją repo.
4. Po wdrożeniu otwórz adres:
   `https://kluczekuba.github.io/gifgame/`
5. Ten sam adres jest zapisany w plikach QR:
   - `qr-github-pages.png`
   - `qr-mpa-retro-game.png`

Jeżeli po zeskanowaniu QR strona się nie otwiera, problemem jest zwykle brak włączonego Pages albo jeszcze nieukończone wdrożenie po stronie GitHub.

## Pliki

- `index.html` - struktura strony i ekrany start/koniec.
- `style.css` - wygląd strony i responsywność.
- `game.js` - logika gry, Canvas 2D, punkty, życia i localStorage.
- `assets/madrog-machine.gif` - oryginalny plik źródłowy.
- `assets/madrog-machine-cutout.gif` - wycięty animowany sprite maszyny z przezroczystym tłem, używany w grze.
- `assets/madrog-machine-model.png` - aktualny wycięty model maszyny używany w grze.
- `qr-github-pages.png` - gotowy kod QR do publicznego linku GitHub Pages.

## Sterowanie

- komputer: spacja albo kliknięcie myszą,
- telefon: dotknięcie ekranu.

Za poprawnie naprawiony ubytek gracz dostaje punkt. Co 5 trafień z rzędu gra dodaje mały bonus.
