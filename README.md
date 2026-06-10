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

Docelowy adres dla repozytorium `Kluczekuba/gifgame` po włączeniu GitHub Pages:

`https://kluczekuba.github.io/gifgame/`

Najprostsza publikacja:

1. Wgraj pliki projektu do repozytorium GitHub.
2. Na GitHub wejdź w `Settings` -> `Pages`.
3. W sekcji `Build and deployment` ustaw:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - folder: `/ (root)`
4. Zapisz ustawienia.
5. Po chwili gra będzie publicznie dostępna pod adresem:
   `https://kluczekuba.github.io/gifgame/`

Gotowy kod QR do tego adresu:

- `qr-github-pages.png`

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
