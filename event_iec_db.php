<?php
// ============================================================
// event_iec_db.php – Datenbankschicht (mysqli) für Kalender-Termine
// ============================================================
//
// ZWECK:
//   Diese Datei stellt alle Datenbankfunktionen bereit, die für
//   das Erstellen, Bearbeiten, Löschen und Abrufen von Terminen
//   benötigt werden.  Sie wird von event_iec_ajax.php verwendet,
//   sobald der Produktionsmodus aktiviert ist.
//
// ============================================================
// SCHRITT-FÜR-SCHRITT-ANLEITUNG ZUR EINBINDUNG
// ============================================================
//
// 1. DATENBANK ANLEGEN
//    Führe das folgende SQL-Statement einmalig in deiner
//    MySQL-/MariaDB-Datenbank aus, um die Tabelle zu erstellen:
//
//    CREATE TABLE IF NOT EXISTS events (
//        id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//        employer_id  INT UNSIGNED    NOT NULL,
//        user_id      INT UNSIGNED    NOT NULL,
//        date         DATE            NOT NULL,
//        end_date     DATE            NOT NULL,
//        start_time   TIME            NULL,
//        end_time     TIME            NULL,
//        category     VARCHAR(100)    NOT NULL DEFAULT '',
//        color        VARCHAR(7)      NOT NULL DEFAULT '#4a90e2',
//        is_all_day   TINYINT(1)      NOT NULL DEFAULT 0,
//        title        VARCHAR(255)    NOT NULL DEFAULT '',
//        deleted      TINYINT(1)      NOT NULL DEFAULT 0,
//        created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
//        updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
//                                              ON UPDATE CURRENT_TIMESTAMP,
//        INDEX idx_date     (date),
//        INDEX idx_end_date (end_date),
//        INDEX idx_employer (employer_id)
//    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
//    -- Migration für bestehende Tabellen ohne end_date-Spalte:
//    -- ALTER TABLE events ADD COLUMN end_date DATE NOT NULL DEFAULT '0000-00-00' AFTER date;
//    -- UPDATE events SET end_date = date WHERE end_date = '0000-00-00';
//
// 2. ZUGANGSDATEN EINTRAGEN
//    Passe die vier Konstanten DB_HOST, DB_USER, DB_PASS und
//    DB_NAME weiter unten in dieser Datei auf deine Datenbank an.
//
// 3. PRODUKTIONSMODUS IN event_iec_ajax.php AKTIVIEREN
//    Öffne event_iec_ajax.php und erledige dort zwei Dinge:
//
//    a) Kommentiere die require_once-Zeile am Dateianfang ein:
//         // require_once 'event_iec_db.php';
//       wird zu:
//         require_once 'event_iec_db.php';
//
//    b) Ersetze die drei Demo-Blöcke durch den jeweiligen
//       Produktions-Code (die Stellen sind mit dem Kommentar
//       "// Produktionsmodus:" markiert).
//
//       TERMIN ERSTELLEN – ersetze:
//         $newId = (int)(microtime(true) * 1000) % 999000 + 1000;
//       durch:
//         $newId = dbCreateEvent($eventData);
//
//       TERMIN BEARBEITEN – ersetze den auskommentierten Block
//       nach "// Produktionsmodus:" durch:
//         dbUpdateEvent($eventId, [
//             'date'       => $date,       'start_time' => $startTime,
//             'end_time'   => $endTime,    'category'   => $category,
//             'color'      => $color,      'is_all_day' => $isAllDay,
//             'title'      => $title,
//         ]);
//
//       TERMIN LÖSCHEN – ersetze nach "// Produktionsmodus:":
//         dbDeleteEvent($eventId);
//
//       TERMINE LADEN (GET-Anfrage) – ersetze den Demo-$events-Block
//       am Ende der Datei durch:
//         echo json_encode(dbGetEvents($requestedDate));
//         exit;
//
// ============================================================

// ------------------------------------------------------------
// Datenbankverbindungsdaten – hier anpassen!
// ------------------------------------------------------------
define('DB_HOST', 'localhost');       // Hostname des Datenbankservers (meist localhost)
define('DB_USER', 'your_db_user');    // Datenbankbenutzer
define('DB_PASS', 'your_db_password'); // Passwort des Datenbankbenutzers
define('DB_NAME', 'your_db_name');    // Name der Datenbank
define('DB_PORT', 3306);              // Port (Standard: 3306)

// ============================================================
// Interne Hilfsfunktion – öffnet und gibt eine mysqli-Verbindung zurück.
// Wirf eine RuntimeException, wenn die Verbindung fehlschlägt.
// ============================================================
function getDbConnection(): mysqli
{
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

    if ($conn->connect_error) {
        // Verbindung zur Datenbank fehlgeschlagen – Fehlermeldung ausgeben
        throw new RuntimeException(
            'Datenbankverbindung fehlgeschlagen: ' . $conn->connect_error
        );
    }

    // Zeichensatz auf UTF-8 (Multibyte) setzen, damit Umlaute korrekt gespeichert werden
    $conn->set_charset('utf8mb4');

    return $conn;
}

// ============================================================
// Alle (nicht gelöschten) Termine für ein bestimmtes Datum abrufen.
//
// @param  string $date  Datum im Format Y-m-d (z. B. '2026-04-08')
// @return array         Array mit Termin-Datensätzen (assoziative Arrays)
// ============================================================
function dbGetEvents(string $date): array
{
    $conn = getDbConnection();

    // Alle aktiven Termine des gewünschten Tages laden;
    // Ganztags-Termine werden zuerst angezeigt, danach nach Startzeit sortiert
    $stmt = $conn->prepare(
        'SELECT id, employer_id, user_id,
                DATE_FORMAT(date,     \'%Y-%m-%d\') AS date,
                DATE_FORMAT(end_date, \'%Y-%m-%d\') AS end_date,
                IFNULL(TIME_FORMAT(start_time, \'%H:%i\'), \'\') AS start_time,
                IFNULL(TIME_FORMAT(end_time,   \'%H:%i\'), \'\') AS end_time,
                category, color, is_all_day, title
         FROM   events
         WHERE  date <= ? AND end_date >= ? AND deleted = 0
         ORDER  BY is_all_day DESC, start_time ASC'
    );

    $stmt->bind_param('ss', $date, $date);
    $stmt->execute();

    $result = $stmt->get_result();
    $events = [];

    // Jeden Datensatz in das richtige PHP-Format umwandeln
    while ($row = $result->fetch_assoc()) {
        $row['id']          = (int)$row['id'];
        $row['employer_id'] = (int)$row['employer_id'];
        $row['user_id']     = (int)$row['user_id'];
        $row['is_all_day']  = (bool)$row['is_all_day'];
        $events[]           = $row;
    }

    $stmt->close();
    $conn->close();

    return $events;
}

// ============================================================
// Neuen Termin in der Datenbank anlegen und die neue ID zurückgeben.
//
// @param  array $data  Erforderliche Schlüssel:
//                        employer_id  – ID des Mitarbeiters
//                        user_id      – ID des angemeldeten Nutzers
//                        date         – Startdatum (Y-m-d)
//                        end_date     – Enddatum   (Y-m-d); gleich date für eintägige Termine
//                        start_time   – Startzeit (HH:MM) oder ''
//                        end_time     – Endzeit   (HH:MM) oder ''
//                        category     – Kategorie (z. B. 'meeting')
//                        color        – Farbe als HEX-Code (z. B. '#4a90e2')
//                        is_all_day   – true/false
//                        title        – Bezeichnung des Termins
// @return int           Automatisch vergebene Datenbank-ID des neuen Termins
// ============================================================
function dbCreateEvent(array $data): int
{
    $conn = getDbConnection();

    $stmt = $conn->prepare(
        'INSERT INTO events
             (employer_id, user_id, date, end_date, start_time, end_time,
              category, color, is_all_day, title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    // Bei Ganztags-Terminen werden Startzeit und Endzeit auf NULL gesetzt
    $isAllDay  = $data['is_all_day'] ? 1 : 0;
    $startTime = $isAllDay ? null : ($data['start_time'] ?: null);
    $endTime   = $isAllDay ? null : ($data['end_time']   ?: null);
    $endDate   = $data['end_date'] ?? $data['date'];

    // Parametertypen: i=int, s=string
    $stmt->bind_param(
        'iissssssis',
        $data['employer_id'],
        $data['user_id'],
        $data['date'],
        $endDate,
        $startTime,
        $endTime,
        $data['category'],
        $data['color'],
        $isAllDay,
        $data['title']
    );

    $stmt->execute();

    // Die von MySQL automatisch vergebene ID des neuen Datensatzes lesen
    $newId = (int)$conn->insert_id;

    $stmt->close();
    $conn->close();

    return $newId;
}

// ============================================================
// Einen vorhandenen (nicht gelöschten) Termin aktualisieren.
//
// @param  int   $id    ID des zu ändernden Termins
// @param  array $data  Zu aktualisierende Felder:
//                        date, end_date, start_time, end_time,
//                        category, color, is_all_day, title
// @return bool         true, wenn mindestens eine Zeile geändert wurde
// ============================================================
function dbUpdateEvent(int $id, array $data): bool
{
    $conn = getDbConnection();

    // Nur nicht-gelöschte Termine können bearbeitet werden (deleted = 0)
    $stmt = $conn->prepare(
        'UPDATE events
         SET    date       = ?,
                end_date   = ?,
                start_time = ?,
                end_time   = ?,
                category   = ?,
                color      = ?,
                is_all_day = ?,
                title      = ?
         WHERE  id = ? AND deleted = 0'
    );

    // Bei Ganztags-Terminen werden Startzeit und Endzeit auf NULL gesetzt
    $isAllDay  = $data['is_all_day'] ? 1 : 0;
    $startTime = $isAllDay ? null : ($data['start_time'] ?: null);
    $endTime   = $isAllDay ? null : ($data['end_time']   ?: null);
    $endDate   = $data['end_date'] ?? $data['date'];

    $stmt->bind_param(
        'ssssssisi',
        $data['date'],
        $endDate,
        $startTime,
        $endTime,
        $data['category'],
        $data['color'],
        $isAllDay,
        $data['title'],
        $id
    );

    $stmt->execute();

    // Prüfen, ob wirklich ein Datensatz verändert wurde
    $changed = $stmt->affected_rows > 0;

    $stmt->close();
    $conn->close();

    return $changed;
}

// ============================================================
// Einen Termin als gelöscht markieren (Soft-Delete: deleted = 1).
// Der Datensatz bleibt in der Datenbank erhalten, wird aber nicht
// mehr angezeigt.  So lässt er sich bei Bedarf wiederherstellen.
//
// @param  int  $id  ID des zu löschenden Termins
// @return bool      true, wenn der Termin erfolgreich gelöscht wurde
// ============================================================
function dbDeleteEvent(int $id): bool
{
    $conn = getDbConnection();

    // Nur aktive Termine löschen (deleted = 0), um doppelte Löschvorgänge zu verhindern
    $stmt = $conn->prepare(
        'UPDATE events SET deleted = 1 WHERE id = ? AND deleted = 0'
    );

    $stmt->bind_param('i', $id);
    $stmt->execute();

    // Prüfen, ob wirklich ein Datensatz als gelöscht markiert wurde
    $changed = $stmt->affected_rows > 0;

    $stmt->close();
    $conn->close();

    return $changed;
}
