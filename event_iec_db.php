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
//        date_to      DATE            NULL DEFAULT NULL,
//        start_time   TIME            NULL,
//        end_time     TIME            NULL,
//        katid        TINYINT UNSIGNED NOT NULL DEFAULT 1,
//        category     VARCHAR(100)    NOT NULL DEFAULT '',
//        color        VARCHAR(7)      NOT NULL DEFAULT '#4a90e2',
//        is_all_day   TINYINT(1)      NOT NULL DEFAULT 0,
//        title        VARCHAR(255)    NOT NULL DEFAULT '',
//        deleted      TINYINT(1)      NOT NULL DEFAULT 0,
//        created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
//        updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
//                                              ON UPDATE CURRENT_TIMESTAMP,
//        INDEX idx_date     (date),
//        INDEX idx_employer (employer_id)
//    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
//    -- Junction table for many-to-many event-employer assignments:
//    CREATE TABLE IF NOT EXISTS event_employers (
//        event_id     INT UNSIGNED NOT NULL,
//        employer_id  INT UNSIGNED NOT NULL,
//        PRIMARY KEY (event_id, employer_id),
//        INDEX idx_ee_employer (employer_id)
//    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
//    To add date_to to an existing table:
//      ALTER TABLE events ADD COLUMN date_to DATE NULL DEFAULT NULL AFTER date;
//    To add katid to an existing table:
//      ALTER TABLE events ADD COLUMN katid TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER end_time;
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

    // Increase GROUP_CONCAT limit to avoid truncation when many employers are assigned to an event
    $conn->query('SET SESSION group_concat_max_len = 65536');

    // Alle aktiven Termine laden, die das gewünschte Datum abdecken
    // (date <= $date AND date_to >= $date); Ganztags-Termine werden zuerst angezeigt
    $stmt = $conn->prepare(
        'SELECT e.id, e.employer_id, e.user_id,
                DATE_FORMAT(e.date,    \'%Y-%m-%d\') AS date,
                DATE_FORMAT(e.date_to, \'%Y-%m-%d\') AS date_to,
                IFNULL(TIME_FORMAT(e.start_time, \'%H:%i\'), \'\') AS start_time,
                IFNULL(TIME_FORMAT(e.end_time,   \'%H:%i\'), \'\') AS end_time,
                COALESCE(e.katid, 1) AS katid,
                e.category, e.color, e.is_all_day, e.title,
                GROUP_CONCAT(DISTINCT ee.employer_id ORDER BY ee.employer_id) AS employer_ids_str
         FROM   events e
         LEFT JOIN event_employers ee ON ee.event_id = e.id
         WHERE  e.date <= ? AND COALESCE(e.date_to, e.date) >= ? AND e.deleted = 0
         GROUP  BY e.id
         ORDER  BY e.is_all_day DESC, e.start_time ASC'
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
        $row['katid']       = (int)$row['katid'];
        $row['is_all_day']  = (bool)$row['is_all_day'];
        // Normalize date_to: fall back to date if not set
        $row['date_to']     = $row['date_to'] ?? $row['date'];
        // Parse employer_ids from GROUP_CONCAT result; fall back to primary employer_id
        $row['employer_ids'] = $row['employer_ids_str'] !== null
            ? array_map('intval', explode(',', $row['employer_ids_str']))
            : [$row['employer_id']];
        unset($row['employer_ids_str']);
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
//                        employer_id  – primäre Mitarbeiter-ID (für Rückwärtskompatibilität)
//                        employer_ids – Array aller zugewiesenen Mitarbeiter-IDs
//                        user_id      – ID des angemeldeten Nutzers
//                        date         – Startdatum (Y-m-d)
//                        date_to      – Enddatum (Y-m-d, >= date; gleich date für eintägige Termine)
//                        start_time   – Startzeit (HH:MM) oder ''
//                        end_time     – Endzeit   (HH:MM) oder ''
//                        katid        – Kategorie-ID (1=Intern, 2=Extern, 3=Krank, 4=Urlaub)
//                        category     – Kategoriename
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
             (employer_id, user_id, date, date_to, start_time, end_time,
               katid, category, color, is_all_day, title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    // Bei Ganztags-Terminen werden Startzeit und Endzeit auf NULL gesetzt
    $isAllDay  = $data['is_all_day'] ? 1 : 0;
    $startTime = $isAllDay ? null : ($data['start_time'] ?: null);
    $endTime   = $isAllDay ? null : ($data['end_time']   ?: null);
    // Enddatum normalisieren: Fallback auf Startdatum, falls nicht angegeben
    $dateTo    = !empty($data['date_to']) && $data['date_to'] >= $data['date']
                 ? $data['date_to'] : $data['date'];
    $katid     = isset($data['katid']) ? (int)$data['katid'] : 1;
    if ($katid < 1 || $katid > 4) {
        $katid = 1;
    }

    // Parametertypen: i=int, s=string
    $stmt->bind_param(
        'iissssissis',
        $data['employer_id'],
        $data['user_id'],
        $data['date'],
        $dateTo,
        $startTime,
        $endTime,
        $katid,
        $data['category'],
        $data['color'],
        $isAllDay,
        $data['title']
    );

    $stmt->execute();

    // Die von MySQL automatisch vergebene ID des neuen Datensatzes lesen
    $newId = (int)$conn->insert_id;

    $stmt->close();

    // Alle Mitarbeiter-Zuweisungen in die Junction-Tabelle eintragen
    $employerIds = !empty($data['employer_ids']) && is_array($data['employer_ids'])
        ? $data['employer_ids']
        : [$data['employer_id']];

    $stmtEmp = $conn->prepare('INSERT IGNORE INTO event_employers (event_id, employer_id) VALUES (?, ?)');
    foreach ($employerIds as $eid) {
        $eid = (int)$eid;
        $stmtEmp->bind_param('ii', $newId, $eid);
        $stmtEmp->execute();
    }
    $stmtEmp->close();

    $conn->close();

    return $newId;
}

// ============================================================
// Einen vorhandenen (nicht gelöschten) Termin aktualisieren.
//
// @param  int   $id    ID des zu ändernden Termins
// @param  array $data  Zu aktualisierende Felder:
//                        date, date_to, start_time, end_time,
//                        katid, category, color, is_all_day, title,
//                        employer_ids (optional) – Array aller zugewiesenen Mitarbeiter-IDs
// @return bool         true, wenn mindestens eine Zeile geändert wurde
// ============================================================
function dbUpdateEvent(int $id, array $data): bool
{
    $conn = getDbConnection();

    // Nur nicht-gelöschte Termine können bearbeitet werden (deleted = 0)
    $stmt = $conn->prepare(
        'UPDATE events
         SET    date       = ?,
                date_to    = ?,
                start_time = ?,
                end_time   = ?,
                katid      = ?,
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
    // Enddatum normalisieren: Fallback auf Startdatum, falls nicht angegeben
    $dateTo    = !empty($data['date_to']) && $data['date_to'] >= $data['date']
                 ? $data['date_to'] : $data['date'];
    $katid     = isset($data['katid']) ? (int)$data['katid'] : 1;
    if ($katid < 1 || $katid > 4) {
        $katid = 1;
    }

    $stmt->bind_param(
        'ssssissisi',
        $data['date'],
        $dateTo,
        $startTime,
        $endTime,
        $katid,
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

    // Mitarbeiter-Zuweisungen aktualisieren, wenn employer_ids übergeben wurden
    if (!empty($data['employer_ids']) && is_array($data['employer_ids'])) {
        $employerIds = array_map('intval', $data['employer_ids']);

        // Bestehende Zuweisungen löschen und neu setzen
        $stmtDel = $conn->prepare('DELETE FROM event_employers WHERE event_id = ?');
        $stmtDel->bind_param('i', $id);
        $stmtDel->execute();
        $stmtDel->close();

        $stmtEmp = $conn->prepare('INSERT IGNORE INTO event_employers (event_id, employer_id) VALUES (?, ?)');
        foreach ($employerIds as $eid) {
            $stmtEmp->bind_param('ii', $id, $eid);
            $stmtEmp->execute();
        }
        $stmtEmp->close();
    }

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
