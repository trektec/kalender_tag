# kalender_tag

Tageskalender (Day Calendar) - Ein flexibler Stundenkalender für mehrere Mitarbeiter von 6:00 bis 18:00 Uhr.

## Features

- **Stundenbereich**: 6:00 Uhr bis 18:00 Uhr
- **Mehrere Mitarbeiter**: Zeigt mehrere Mitarbeiter in Spalten nebeneinander an
- **Einstellbare Stundenhöhe**: Höhe der Stundeneinteilung über einen Schieberegler anpassbar (30-120px)
- **Ganztagstermine**: Eigener Bereich für ganztägige Termine unter jedem Mitarbeiternamen
- **AJAX Datenabruf**: Mitarbeiterdaten werden dynamisch von `employers_ajax.php` geladen

## Installation & Verwendung

1. Stellen Sie sicher, dass PHP installiert ist
2. Starten Sie den PHP-Entwicklungsserver:
   ```bash
   php -S localhost:8080
   ```
3. Öffnen Sie im Browser: `http://localhost:8080/index.html`

## Dateien

- `index.html` - Hauptseite mit Kalenderansicht
- `style.css` - Styling für den Kalender
- `kalender.js` - JavaScript-Logik (Datenabruf, Rendering, Stundenhöhe)
- `employers_ajax.php` - Backend-Endpunkt für Mitarbeiterdaten

## Anpassung

### Mitarbeiter ändern

Bearbeiten Sie `employers_ajax.php` und passen Sie das `$employers` Array an:

```php
$employers = [
    ['id' => 1, 'name' => 'Max Mustermann'],
    ['id' => 2, 'name' => 'Anna Schmidt'],
    // Weitere Mitarbeiter hinzufügen...
];
```

### Stundenbereich ändern

In `kalender.js` können Sie den Zeitbereich anpassen:

```javascript
const START_HOUR = 6;  // Startzeit
const END_HOUR = 18;   // Endzeit
```