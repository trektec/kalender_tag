<?php
header('Content-Type: application/json');

// ============================================================
// event_iec_ajax2.php – AJAX endpoint + DB layer in one file
// ============================================================
// Adjust these values to match your MySQL/MariaDB setup.
// ============================================================

define('DB_HOST', 'localhost');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('DB_NAME', 'your_db_name');
define('DB_PORT', 3306);

// ============================================================
// Required table structure – run once on your database:
//
// CREATE TABLE IF NOT EXISTS events (
//     id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     employer_id  INT UNSIGNED    NOT NULL,
//     user_id      INT UNSIGNED    NOT NULL,
//     date         DATE            NOT NULL,
//     date_to      DATE            NULL DEFAULT NULL,
//     start_time   TIME            NULL,
//     end_time     TIME            NULL,
//     category     VARCHAR(100)    NOT NULL DEFAULT '',
//     color        VARCHAR(7)      NOT NULL DEFAULT '#4a90e2',
//     is_all_day   TINYINT(1)      NOT NULL DEFAULT 0,
//     title        VARCHAR(255)    NOT NULL DEFAULT '',
//     deleted      TINYINT(1)      NOT NULL DEFAULT 0,
//     created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
//                                           ON UPDATE CURRENT_TIMESTAMP,
//     INDEX idx_date (date),
//     INDEX idx_employer (employer_id)
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
// To add date_to to an existing table:
//   ALTER TABLE events ADD COLUMN date_to DATE NULL DEFAULT NULL AFTER date;
// ============================================================

// ============================================================
// POST – write actions (create / edit / delete)
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? trim($_POST['action']) : '';

    // ----------------------------------------------------------
    // CREATE a new event
    // ----------------------------------------------------------
    if ($action === 'create') {
        $employerId = isset($_POST['employer_id']) ? $_POST['employer_id'] : '';
        $userId     = isset($_POST['user_id'])     ? $_POST['user_id']     : '1';
        $date       = isset($_POST['date'])        ? trim($_POST['date'])  : '';
        $title      = isset($_POST['title'])       ? trim($_POST['title']) : '';
        $category   = isset($_POST['category'])    ? trim($_POST['category']) : '';
        $color      = isset($_POST['color'])       ? trim($_POST['color']) : '#4a90e2';
        $isAllDay   = isset($_POST['is_all_day'])  ? (bool)$_POST['is_all_day'] : false;
        $startTime  = isset($_POST['start_time'])  ? trim($_POST['start_time']) : '';
        $endTime    = isset($_POST['end_time'])    ? trim($_POST['end_time'])   : '';
        $dateTo     = isset($_POST['date_to'])     ? trim($_POST['date_to'])    : '';

        if (filter_var($employerId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Mitarbeiter-ID.']);
            exit;
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültiges Datum.']);
            exit;
        }
        $dt = DateTime::createFromFormat('Y-m-d', $date);
        if (!$dt || $dt->format('Y-m-d') !== $date) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültiges Datum.']);
            exit;
        }

        if ($title === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Titel darf nicht leer sein.']);
            exit;
        }

        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            $color = '#4a90e2';
        }

        if (!$isAllDay) {
            if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ungültige Start- oder Endzeit.']);
                exit;
            }
        } else {
            $startTime = null;
            $endTime   = null;
        }

        // Validate and normalize date_to: must be >= date; defaults to date if empty
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
            $dateTo = $date;
        } else {
            $dtTo = DateTime::createFromFormat('Y-m-d', $dateTo);
            if (!$dtTo || $dtTo->format('Y-m-d') !== $dateTo || $dateTo < $date) {
                $dateTo = $date;
            }
        }

        $employerId = (int)$employerId;
        $userId     = filter_var($userId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) !== false
                      ? (int)$userId : 1;
        $isAllDayInt = $isAllDay ? 1 : 0;

        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
        if ($conn->connect_error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
            exit;
        }
        $conn->set_charset('utf8mb4');

        $stmt = $conn->prepare(
            'INSERT INTO events
                 (employer_id, user_id, date, date_to, start_time, end_time,
                  category, color, is_all_day, title)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param(
            'iissssssis',
            $employerId,
            $userId,
            $date,
            $dateTo,
            $startTime,
            $endTime,
            $category,
            $color,
            $isAllDayInt,
            $title
        );
        $stmt->execute();
        $newId = (int)$conn->insert_id;
        $stmt->close();
        $conn->close();

        $newEvent = [
            'id'          => $newId,
            'employer_id' => $employerId,
            'user_id'     => $userId,
            'date'        => $date,
            'date_to'     => $dateTo,
            'start_time'  => $startTime ?? '',
            'end_time'    => $endTime   ?? '',
            'category'    => $category,
            'color'       => $color,
            'is_all_day'  => $isAllDay,
            'title'       => $title,
        ];

        echo json_encode(['success' => true, 'event' => $newEvent]);
        exit;
    }

    // ----------------------------------------------------------
    // EDIT (update) an existing event
    // ----------------------------------------------------------
    if ($action === 'edit') {
        $eventId   = isset($_POST['event_id'])   ? $_POST['event_id']         : '';
        $date      = isset($_POST['date'])        ? trim($_POST['date'])       : '';
        $title     = isset($_POST['title'])       ? trim($_POST['title'])      : '';
        $category  = isset($_POST['category'])    ? trim($_POST['category'])   : '';
        $color     = isset($_POST['color'])       ? trim($_POST['color'])      : '#4a90e2';
        $isAllDay  = isset($_POST['is_all_day'])  ? (bool)$_POST['is_all_day'] : false;
        $startTime = isset($_POST['start_time'])  ? trim($_POST['start_time']) : '';
        $endTime   = isset($_POST['end_time'])    ? trim($_POST['end_time'])   : '';
        $dateTo    = isset($_POST['date_to'])     ? trim($_POST['date_to'])    : '';

        if (filter_var($eventId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Termin-ID.']);
            exit;
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültiges Datum.']);
            exit;
        }
        $dt = DateTime::createFromFormat('Y-m-d', $date);
        if (!$dt || $dt->format('Y-m-d') !== $date) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültiges Datum.']);
            exit;
        }

        if ($title === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Titel darf nicht leer sein.']);
            exit;
        }

        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            $color = '#4a90e2';
        }

        if (!$isAllDay) {
            if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ungültige Start- oder Endzeit.']);
                exit;
            }
        } else {
            $startTime = null;
            $endTime   = null;
        }

        // Validate and normalize date_to: must be >= date; defaults to date if empty
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
            $dateTo = $date;
        } else {
            $dtTo = DateTime::createFromFormat('Y-m-d', $dateTo);
            if (!$dtTo || $dtTo->format('Y-m-d') !== $dateTo || $dateTo < $date) {
                $dateTo = $date;
            }
        }

        $eventId     = (int)$eventId;
        $isAllDayInt = $isAllDay ? 1 : 0;

        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
        if ($conn->connect_error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
            exit;
        }
        $conn->set_charset('utf8mb4');

        $stmt = $conn->prepare(
            'UPDATE events
             SET    date       = ?,
                    date_to    = ?,
                    start_time = ?,
                    end_time   = ?,
                    category   = ?,
                    color      = ?,
                    is_all_day = ?,
                    title      = ?
             WHERE  id = ? AND deleted = 0'
        );
        $stmt->bind_param(
            'sssssisis',
            $date,
            $dateTo,
            $startTime,
            $endTime,
            $category,
            $color,
            $isAllDayInt,
            $title,
            $eventId
        );
        $stmt->execute();
        $stmt->close();
        $conn->close();

        echo json_encode(['success' => true]);
        exit;
    }

    // ----------------------------------------------------------
    // DELETE an event (soft-delete: sets deleted = 1)
    // ----------------------------------------------------------
    if ($action === 'delete') {
        $eventId = isset($_POST['event_id']) ? $_POST['event_id'] : '';

        if (filter_var($eventId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Termin-ID.']);
            exit;
        }

        $eventId = (int)$eventId;

        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
        if ($conn->connect_error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
            exit;
        }
        $conn->set_charset('utf8mb4');

        $stmt = $conn->prepare(
            'UPDATE events SET deleted = 1 WHERE id = ? AND deleted = 0'
        );
        $stmt->bind_param('i', $eventId);
        $stmt->execute();
        $stmt->close();
        $conn->close();

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unbekannte Aktion.']);
    exit;
}

// ============================================================
// GET – return events for the requested date
// ============================================================
$requestedDate = isset($_GET['date']) ? trim($_GET['date']) : date('Y-m-d');

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
    $requestedDate = date('Y-m-d');
}
$dateTime = DateTime::createFromFormat('Y-m-d', $requestedDate);
if (!$dateTime || $dateTime->format('Y-m-d') !== $requestedDate) {
    $requestedDate = date('Y-m-d');
}

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
    exit;
}
$conn->set_charset('utf8mb4');

$stmt = $conn->prepare(
    'SELECT id, employer_id, user_id,
            DATE_FORMAT(date,    \'%Y-%m-%d\') AS date,
            DATE_FORMAT(date_to, \'%Y-%m-%d\') AS date_to,
            IFNULL(TIME_FORMAT(start_time, \'%H:%i\'), \'\') AS start_time,
            IFNULL(TIME_FORMAT(end_time,   \'%H:%i\'), \'\') AS end_time,
            category, color, is_all_day, title
     FROM   events
     WHERE  date <= ? AND COALESCE(date_to, date) >= ? AND deleted = 0
     ORDER  BY is_all_day DESC, start_time ASC'
);
$stmt->bind_param('ss', $requestedDate, $requestedDate);
$stmt->execute();

$result = $stmt->get_result();
$events = [];

while ($row = $result->fetch_assoc()) {
    $row['id']          = (int)$row['id'];
    $row['employer_id'] = (int)$row['employer_id'];
    $row['user_id']     = (int)$row['user_id'];
    $row['is_all_day']  = (bool)$row['is_all_day'];
    // Normalize date_to: fall back to date if not set
    $row['date_to']     = $row['date_to'] ?? $row['date'];
    $events[]           = $row;
}

$stmt->close();
$conn->close();

echo json_encode($events);
