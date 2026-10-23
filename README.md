<p align="center">
  <img src="assets/vojta-mark.svg" alt="Vojtův pixelový robot" width="64" height="64">
</p>

<h1 align="center">Vojta · můj kousek internetu</h1>

<p align="center">Osobní a školní portfolio v pixelovém stylu. Trocha kódu, hodně pokusů.</p>

<p align="center">
  <a href="https://vojtechbedan.github.io/">Otevřít web</a> ·
  <a href="https://vojtechbedan.github.io/citace.html">Citace AI</a>
</p>

<p align="center">
  <img src="assets/pixel-room.webp" alt="Pixelový pokoj s počítačem, nočním oknem, rostlinami a spící kočkou" width="560">
</p>

## Co tu najdeš

- **Portfolio:** představení, projekty, co se učím a kontakty s přímými e-mailovými odkazy.
- **Pixelový svět:** vlastní grafika, lesní paleta, měsíc a padající hvězdy.
- **Plynulá navigace:** běžné odkazy mezi sekcemi s plynulým posouváním pomocí CSS.
- **GoonOnTheGo Search:** projekt inspirovaný vyhledávačem Google, včetně obrázků a rozšířeného hledání.

Web je responzivní a používá **HTML a CSS** bez frameworků a bez sestavování. Písmo i grafické podklady jsou uložené přímo v repozitáři.

## Spuštění lokálně

Stáhni nebo naklonuj repozitář a otevři `index.html` v prohlížeči. Pro běžnou práci můžeš použít také lokální server, například s Pythonem 3:

```sh
python -m http.server 8000
```

Příkaz spusť v kořenové složce projektu a otevři [localhost:8000](http://localhost:8000). Není potřeba instalovat balíčky ani nastavovat API klíče.

## Struktura projektu

```text
.
├── index.html                 # hlavní portfolio
├── style.css                  # rozvržení hlavní stránky
├── citace.html                # čitelná citace AI na webu
├── CITACE-AI.md                # citace ve formátu Markdown
├── assets/                    # sdílené styly, grafika a písmo
│   ├── pixel-theme.css        # pixelový vzhled a animované pozadí
│   └── document.css           # vzhled dokumentace na webu
└── projects/
    └── googlesearch/          # GoonOnTheGo Search
```

## Bez skriptů

Web neobsahuje JavaScript, hernu ani skrytá překvapení. Navigace používá běžné odkazy, vyhledávání formuláře v HTML a kontakty odkazy `mailto:`. Detaily dokumentace se otevírají nativním prvkem `<details>`. Měsíc a padající hvězdy jsou vytvořené v HTML a CSS. Projekt nepoužívá `localStorage`, backend, účty ani databázi.

## Vznik a podklady

Současnou podobu portfolia vytvořil **OpenAI Codex** podle zadání a průběžné zpětné vazby autora. Ilustrace pokoje vznikla pomocí nástroje OpenAI pro generování obrázků. Rozsah práce AI a role autora jsou popsané v [citaci použití AI](CITACE-AI.md), která má i [čtenářskou verzi na webu](https://vojtechbedan.github.io/citace.html).

Pixelové nadpisy používají **Pixelify Sans** od Stefie Justprince pod licencí SIL Open Font License 1.1. Podrobnosti najdeš v [dokumentaci podkladů](assets/README.md) a [licenčním textu písma](assets/fonts/OFL-PixelifySans.txt).
