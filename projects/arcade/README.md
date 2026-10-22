# Pixelová herna

Tři malé hry v prohlížeči, dostupné z navigace portfolia přes **Herna**. Otevři `index.html`; není potřeba sestavení ani server.

- **Blackjack:** nové kolo, další karta a zůstat. Esa se počítají jako 1 nebo 11, blackjack má přednost před běžnou jednadvacítkou a dealer stojí na každé 17. Výhry, prohry a remízy se ukládají do prohlížeče.
- **Snake:** šipky, W A S D nebo směrová tlačítka pod plochou. Mezerník pozastaví hru. Hra se pozastaví také při přepnutí hry nebo skrytí záložky. Ukládá se nejlepší skóre.
- **Postřeh:** klikni pro start, počkej na zelenou a klikni znovu. Fungují i Enter a mezerník. Předčasný klik se nepočítá. Posledních pět pokusů zůstává po dobu návštěvy, nejlepší čas se ukládá.

Pravidla blackjacku a Snake jsou oddělena v `core.js`, ovládání a vykreslování v `arcade.js`. Skóre využívá volitelné `localStorage`; pokud je blokované, hry fungují dál bez trvalého ukládání.

Blackjack rozdává karty postupně z balíčku a dealer otočí skrytou kartu před dobráním. Během rozdávání jsou akce zamčené; při omezeném pohybu se místo letu a otáčení používá jemné prolínání.

Přepínač barev vpravo nahoře mění lesní a noční paletu včetně ilustrací a pamatuje si výběr. Sdílená překvapení jsou v `../../assets/eastereggs.js`. Párty spustí krátkou animaci barevných pixelů s nápisem. Klávesa Escape zavře objevená překvapení.
