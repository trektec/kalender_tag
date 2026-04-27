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
// CREATE TABLE IF NOT EXISTS categories (
//     id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     name  VARCHAR(100) NOT NULL,
//     color VARCHAR(7)   NOT NULL DEFAULT '#4a90e2'
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
// CREATE TABLE IF NOT EXISTS events (
//     id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     employer_id  INT UNSIGNED    NOT NULL,
//     user_id      INT UNSIGNED    NOT NULL,
//     date         DATE            NOT NULL,
//     date_to      DATE            NULL DEFAULT NULL,
//     start_time   TIME            NULL,
//     end_time     TIME            NULL,
//     category_id  INT UNSIGNED    NULL DEFAULT NULL,
//     color        VARCHAR(7)      NOT NULL DEFAULT '#4a90e2',
//     is_all_day   TINYINT(1)      NOT NULL DEFAULT 0,
//     title        VARCHAR(255)    NOT NULL DEFAULT '',
//     deleted      TINYINT(1)      NOT NULL DEFAULT 0,
//     created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
//                                           ON UPDATE CURRENT_TIMESTAMP,
//     INDEX idx_date (date),
//     INDEX idx_employer (employer_id),
//     FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
// -- Junction table for many-to-many event-employer assignments:
// CREATE TABLE IF NOT EXISTS event_employers (
//     event_id     INT UNSIGNED NOT NULL,
//     employer_id  INT UNSIGNED NOT NULL,
//     PRIMARY KEY (event_id, employer_id),
//     INDEX idx_ee_employer (employer_id)
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
// To migrate from category text to category_id on an existing table:
//   ALTER TABLE events DROP COLUMN category;
//   ALTER TABLE events ADD COLUMN category_id INT UNSIGNED NULL DEFAULT NULL
//       AFTER end_time,
//       ADD FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
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
        // Accept employer_ids[] array (multi-employer) or fall back to single employer_id
        $employerIdsRaw = isset($_POST['employer_ids']) && is_array($_POST['employer_ids'])
            ? $_POST['employer_ids']
            : (isset($_POST['employer_id']) ? [$_POST['employer_id']] : []);
        $employerIds = [];
        foreach ($employerIdsRaw as $eid) {
            if (filter_var($eid, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) !== false) {
                $employerIds[] = (int)$eid;
            }
        }
        if (empty($employerIds)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige oder fehlende Mitarbeiter-ID(s).']);
            exit;
        }
        $employerId = $employerIds[0]; // primary employer for backward compatibility

        $userId      = isset($_POST['user_id'])      ? $_POST['user_id']          : '1';
        $date        = isset($_POST['date'])         ? trim($_POST['date'])        : '';
        $title       = isset($_POST['title'])        ? trim($_POST['title'])       : '';
        $categoryIdRaw = isset($_POST['category_id']) ? trim($_POST['category_id']) : '';
        $color       = isset($_POST['color'])        ? trim($_POST['color'])       : '#4a90e2';
        $isAllDay    = isset($_POST['is_all_day'])   ? (bool)$_POST['is_all_day']  : false;
        $startTime   = isset($_POST['start_time'])   ? trim($_POST['start_time'])  : '';
        $endTime     = isset($_POST['end_time'])     ? trim($_POST['end_time'])    : '';
        $dateTo      = isset($_POST['date_to'])      ? trim($_POST['date_to'])     : '';

        if ($categoryIdRaw !== '') {
            if (filter_var($categoryIdRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ungültige Kategorie-ID.']);
                exit;
            }
            $categoryId = (int)$categoryIdRaw;
        } else {
            $categoryId = null;
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

        $userId      = filter_var($userId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) !== false
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
                  category_id, color, is_all_day, title)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param(
            'iissssisis',
            $employerId,
            $userId,
            $date,
            $dateTo,
            $startTime,
            $endTime,
            $categoryId,
            $color,
            $isAllDayInt,
            $title
        );
        $stmt->execute();
        $newId = (int)$conn->insert_id;
        $stmt->close();

        // Insert all employer assignments into the event_employers junction table
        $stmtEmp = $conn->prepare('INSERT IGNORE INTO event_employers (event_id, employer_id) VALUES (?, ?)');
        foreach ($employerIds as $eid) {
            $stmtEmp->bind_param('ii', $newId, $eid);
            $stmtEmp->execute();
        }
        $stmtEmp->close();

        // Look up the category name for the response; null category_id if not found
        $categoryName = '';
        if ($categoryId !== null) {
            $stmtCat = $conn->prepare('SELECT name FROM categories WHERE id = ?');
            $stmtCat->bind_param('i', $categoryId);
            $stmtCat->execute();
            $stmtCat->bind_result($categoryName);
            if (!$stmtCat->fetch()) {
                $categoryId   = null;
                $categoryName = '';
            }
            $stmtCat->close();
        }

        $conn->close();

        $newEvent = [
            'id'            => $newId,
            'employer_id'   => $employerId,
            'employer_ids'  => $employerIds,
            'user_id'       => $userId,
            'date'          => $date,
            'date_to'       => $dateTo,
            'start_time'    => $startTime ?? '',
            'end_time'      => $endTime   ?? '',
            'category_id'   => $categoryId,
            'category_name' => $categoryName,
            'color'         => $color,
            'is_all_day'    => $isAllDay,
            'title'         => $title,
        ];

        echo json_encode(['success' => true, 'event' => $newEvent]);
        exit;
    }

    // ----------------------------------------------------------
    // EDIT (update) an existing event
    // ----------------------------------------------------------
    if ($action === 'edit') {
        $eventId        = isset($_POST['event_id'])    ? $_POST['event_id']           : '';
        $date           = isset($_POST['date'])         ? trim($_POST['date'])          : '';
        $title          = isset($_POST['title'])        ? trim($_POST['title'])         : '';
        $categoryIdRaw  = isset($_POST['category_id'])  ? trim($_POST['category_id'])   : '';
        $color          = isset($_POST['color'])        ? trim($_POST['color'])         : '#4a90e2';
        $isAllDay       = isset($_POST['is_all_day'])   ? (bool)$_POST['is_all_day']    : false;
        $startTime      = isset($_POST['start_time'])   ? trim($_POST['start_time'])    : '';
        $endTime        = isset($_POST['end_time'])     ? trim($_POST['end_time'])      : '';
        $dateTo         = isset($_POST['date_to'])      ? trim($_POST['date_to'])       : '';

        if (filter_var($eventId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Termin-ID.']);
            exit;
        }

        if ($categoryIdRaw !== '') {
            if (filter_var($categoryIdRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ungültige Kategorie-ID.']);
                exit;
            }
            $categoryId = (int)$categoryIdRaw;
        } else {
            $categoryId = null;
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
             SET    date        = ?,
                    date_to     = ?,
                    start_time  = ?,
                    end_time    = ?,
                    category_id = ?,
                    color       = ?,
                    is_all_day  = ?,
                    title       = ?
             WHERE  id = ? AND deleted = 0'
        );
        $stmt->bind_param(
            'ssssisisi',
            $date,
            $dateTo,
            $startTime,
            $endTime,
            $categoryId,
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
// Increase GROUP_CONCAT limit to avoid truncation when many employers are assigned to an event
$conn->query('SET SESSION group_concat_max_len = 65536');

$stmt = $conn->prepare(
    'SELECT e.id, e.employer_id, e.user_id,
            DATE_FORMAT(e.date,    \'%Y-%m-%d\') AS date,
            DATE_FORMAT(e.date_to, \'%Y-%m-%d\') AS date_to,
            IFNULL(TIME_FORMAT(e.start_time, \'%H:%i\'), \'\') AS start_time,
            IFNULL(TIME_FORMAT(e.end_time,   \'%H:%i\'), \'\') AS end_time,
            e.category_id, IFNULL(c.name, \'\') AS category_name,
            e.color, e.is_all_day, e.title,
            GROUP_CONCAT(DISTINCT ee.employer_id ORDER BY ee.employer_id) AS employer_ids_str
     FROM   events e
     LEFT JOIN categories c ON c.id = e.category_id
     LEFT JOIN event_employers ee ON ee.event_id = e.id
     WHERE  e.date <= ? AND COALESCE(e.date_to, e.date) >= ? AND e.deleted = 0
     GROUP  BY e.id
     ORDER  BY e.is_all_day DESC, e.start_time ASC'
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
    $row['category_id'] = $row['category_id'] !== null ? (int)$row['category_id'] : null;
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

echo json_encode($events);
