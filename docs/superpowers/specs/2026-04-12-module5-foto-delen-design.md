# Module 5 — DinnerJump Foto Delen: Design Spec

## Doel

Deelnemers kunnen tijdens het diner foto's maken/kiezen, voorzien van een herkenbaar DinnerJump "Dark Elegance" frame, en direct delen op social media. Het primaire doel is **naamsbekendheid** — één consistent frame dat steeds herkenbaarder wordt naarmate meer mensen delen.

## Wat het doet

1. **Camera-knop altijd zichtbaar** — als kaart op het home-scherm ("Deel je avond") + als 4e tab in de navigatiebalk
2. **Foto kiezen**: camera openen óf bestaande foto uit galerij selecteren
3. **Dark Elegance frame**: donker frame met gouden hoekaccenten, eventnaam (serif), gangnaam, datum, en "dinnerjump.nl" onderaan
4. **Automatisch formaat per platform**: 9:16 (Instagram Story), 4:5 (Instagram/Facebook feed), 16:9 (X)
5. **Hashtags meegeven**: `#DinnerJump` + `#[EventNaam]` automatisch in de deeltekst
6. **Delen**: Instagram, X, Facebook als primaire knoppen + "meer" knop (native share sheet)
7. **Dessert-herinnering**: eenmalige push notificatie bij dessert als er nog niet gedeeld is
8. **Geen server-opslag**: alles lokaal op de telefoon

## Wat het NIET doet

- Geen gedeeld foto-album
- Geen meerdere frame-varianten (één frame = herkenbaarheid)
- Geen QR-code (URL-tekst is voldoende)
- Geen WhatsApp (focus op publieke social media)

## Dark Elegance Frame

- Donkere achtergrond (#1a1a2e) met subtiele rand
- Gouden hoekaccenten (rgba(255,180,120,0.4))
- "✦ DINNERJUMP ✦" in kleine gouden caps bovenaan
- Eventnaam in Georgia serif
- Gangnaam met decoratieve lijnen
- Datum klein onderaan
- "dinnerjump.nl" als laatste regel

## Platformformaten

| Platform | Formaat | Gebruik |
|----------|---------|---------|
| Instagram Story | 9:16 (1080×1920) | Deep link instagram-stories:// |
| Instagram/Facebook feed | 4:5 (1080×1350) | Share intent |
| X | 16:9 (1200×675) | Share intent |

## Dessert-herinnering

- Flag in AsyncStorage: `photo_shared_[eventId]`
- Gezet zodra gebruiker de share-flow voltooit
- Bij dessert-gang: als flag niet bestaat → lokale push notificatie
- Tekst: "Deel een leuke foto van de avond! Kies of maak een foto met een DinnerJump frame en deel het via social."
