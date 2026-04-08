<?php
header('Content-Type: application/json');

// ── Database configuration ────────────────────────────────────────────────────
// Set these values via environment variables (recommended) or change the
// fallback strings here. Never commit real credentials to version control.
define('DB_HOST',    getenv('DB_HOST')    ?: 'localhost');
define('DB_NAME',    getenv('DB_NAME')    ?: 'kalender');
define('DB_USER',    getenv('DB_USER')    ?: 'kalender_user');
define('DB_PASS',    getenv('DB_PASS')    ?: '');
define('DB_CHARSET', 'utf8mb4');

// ── Helper: open a PDO connection ─────────────────────────────────────────────
function getDB(): PDO {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    return new PDO($dsn, DB_USER, DB_PASS, $options);
}

// ── Helper: send a JSON error and exit ───────────────────────────────────────
function jsonError(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

// Expected database table (create once in your database):
//
// CREATE TABLE events (
//     id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     employer_id INT UNSIGNED NOT NULL,
//     user_id     INT UNSIGNED NOT NULL,
//     date        DATE         NOT NULL,
//     start_time  TIME         NULL,
//     end_time    TIME         NULL,
//     category    VARCHAR(100) NOT NULL DEFAULT '',
//     color       VARCHAR(7)   NOT NULL DEFAULT '#4a90e2',
//     is_all_day  TINYINT(1)   NOT NULL DEFAULT 0,
//     title       VARCHAR(255) NOT NULL DEFAULT '',
//     INDEX idx_date (date)
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

$method = $_SERVER['REQUEST_METHOD'];

// ── DELETE: remove an event by ID ────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        jsonError(400, 'Ungültige Event-ID.');
    }

    try {
        $db   = getDB();
        $stmt = $db->prepare('DELETE FROM events WHERE id = :id');
        $stmt->execute([':id' => $id]);

        if ($stmt->rowCount() === 0) {
            jsonError(404, 'Event nicht gefunden.');
        }

        echo json_encode(['success' => true, 'id' => $id]);
    } catch (PDOException $e) {
        jsonError(500, 'Datenbankfehler: ' . $e->getMessage());
    }
    exit;
}

// ── POST: update (edit) an existing event ────────────────────────────────────
if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);

    if (!$data || !isset($data['id'])) {
        jsonError(400, 'Ungültige oder fehlende Daten.');
    }

    $id        = (int) $data['id'];
    $title     = isset($data['title'])      ? trim($data['title'])    : '';
    $category  = isset($data['category'])   ? trim($data['category']) : '';
    $color     = isset($data['color'])      ? trim($data['color'])    : '#4a90e2';
    $isAllDay  = isset($data['is_all_day']) ? (bool) $data['is_all_day'] : false;
    $startTime = isset($data['start_time']) ? trim($data['start_time']) : null;
    $endTime   = isset($data['end_time'])   ? trim($data['end_time'])   : null;

    if ($id <= 0) {
        jsonError(400, 'Ungültige Event-ID.');
    }
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
        $color = '#4a90e2';
    }
    if (!$isAllDay) {
        if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
            jsonError(400, 'Bitte Start- und Endzeit angeben.');
        }
    } else {
        $startTime = null;
        $endTime   = null;
    }

    try {
        $db   = getDB();
        $stmt = $db->prepare(
            'UPDATE events
                SET title      = :title,
                    category   = :category,
                    color      = :color,
                    is_all_day = :is_all_day,
                    start_time = :start_time,
                    end_time   = :end_time
              WHERE id = :id'
        );
        $stmt->execute([
            ':title'      => $title,
            ':category'   => $category,
            ':color'      => $color,
            ':is_all_day' => $isAllDay ? 1 : 0,
            ':start_time' => $startTime,
            ':end_time'   => $endTime,
            ':id'         => $id,
        ]);

        // rowCount() returns 0 both when the event does not exist and when it
        // exists but no columns actually changed. We therefore do NOT treat
        // 0 affected rows as "not found" – the caller's data is still valid.

        echo json_encode([
            'success' => true,
            'event'   => [
                'id'         => $id,
                'title'      => $title,
                'category'   => $category,
                'color'      => $color,
                'is_all_day' => $isAllDay,
                'start_time' => $isAllDay ? '' : $startTime,
                'end_time'   => $isAllDay ? '' : $endTime,
            ]
        ]);
    } catch (PDOException $e) {
        jsonError(500, 'Datenbankfehler: ' . $e->getMessage());
    }
    exit;
}

// ── GET: list events for a date ───────────────────────────────────────────────

// Get date parameter from query string, default to today
$requestedDate = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

// Validate date format (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
    $requestedDate = date('Y-m-d');
}

// Verify it's a valid date
$dateTime = DateTime::createFromFormat('Y-m-d', $requestedDate);
if (!$dateTime || $dateTime->format('Y-m-d') !== $requestedDate) {
    $requestedDate = date('Y-m-d');
}

try {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT id, employer_id, user_id, date,
                IFNULL(TIME_FORMAT(start_time, "%H:%i"), "") AS start_time,
                IFNULL(TIME_FORMAT(end_time,   "%H:%i"), "") AS end_time,
                category, color, is_all_day, title
           FROM events
          WHERE date = :date
          ORDER BY is_all_day DESC, start_time ASC'
    );
    $stmt->execute([':date' => $requestedDate]);

    $events = $stmt->fetchAll();

    // Cast types so they match what the JavaScript expects
    foreach ($events as &$event) {
        $event['id']          = (int)  $event['id'];
        $event['employer_id'] = (int)  $event['employer_id'];
        $event['user_id']     = (int)  $event['user_id'];
        $event['is_all_day']  = (bool) $event['is_all_day'];
    }
    unset($event);

    echo json_encode($events);
} catch (PDOException $e) {
    jsonError(500, 'Datenbankfehler: ' . $e->getMessage());
}
