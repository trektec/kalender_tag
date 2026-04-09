<?php
header('Content-Type: application/json');

// ============================================================
// event_week_ajax.php – AJAX endpoint for weekly calendar
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
//     employer_id  INT UNSIGNED    NULL DEFAULT NULL,
//     user_id      INT UNSIGNED    NOT NULL,
//     date         DATE            NOT NULL,
//     date_to      DATE            NULL DEFAULT NULL,
//     start_time   TIME            NULL,
//     end_time     TIME            NULL,
//     category     VARCHAR(100)    NOT NULL DEFAULT '',
//     color        VARCHAR(7)      NOT NULL DEFAULT '#4a90e2',
//     is_all_day   TINYINT(1)      NOT NULL DEFAULT 0,
//     title        VARCHAR(255)    NOT NULL DEFAULT '',
//     single_event TINYINT(1)      NOT NULL DEFAULT 0,
//     deleted      TINYINT(1)      NOT NULL DEFAULT 0,
//     created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
//                                           ON UPDATE CURRENT_TIMESTAMP,
//     INDEX idx_date (date),
//     INDEX idx_employer (employer_id)
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
// -- Verknüpfungstabelle für Mehrfach-Mitarbeiter-Termine:
// CREATE TABLE IF NOT EXISTS event_employers (
//     event_id    INT UNSIGNED NOT NULL,
//     employer_id INT UNSIGNED NOT NULL,
//     PRIMARY KEY (event_id, employer_id),
//     INDEX idx_event_id    (event_id),
//     INDEX idx_employer_id (employer_id)
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
// Bei bestehender Tabelle:
//   ALTER TABLE events MODIFY COLUMN employer_id INT UNSIGNED NULL DEFAULT NULL;
//   ALTER TABLE events ADD COLUMN single_event TINYINT(1) NOT NULL DEFAULT 0 AFTER is_all_day;
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
        $singleEvent = isset($_POST['single_event']) && $_POST['single_event'] === '1' ? 1 : 0;

        if ($singleEvent === 0) {
            $employerIdRaw = isset($_POST['employer_id']) ? $_POST['employer_id'] : '';
            if (filter_var($employerIdRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ungültige Mitarbeiter-ID.']);
                exit;
            }
            $employerId  = (int)$employerIdRaw;
            $employerIds = [$employerId];
        } else {
            $employerIdsRaw = isset($_POST['employer_ids']) && is_array($_POST['employer_ids'])
                              ? $_POST['employer_ids'] : [];
            $employerIds = [];
            foreach ($employerIdsRaw as $eid) {
                if (filter_var($eid, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) !== false) {
                    $employerIds[] = (int)$eid;
                }
            }
            $employerIds = array_values(array_unique($employerIds));
            if (empty($employerIds)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Mindestens ein Mitarbeiter muss ausgewählt werden.']);
                exit;
            }
            $employerId = null;
        }

        $userId    = isset($_POST['user_id'])    ? $_POST['user_id']     : '1';
        $date      = isset($_POST['date'])       ? trim($_POST['date'])  : '';
        $title     = isset($_POST['title'])      ? trim($_POST['title']) : '';
        $category  = isset($_POST['category'])   ? trim($_POST['category']) : '';
        $color     = isset($_POST['color'])      ? trim($_POST['color']) : '#4a90e2';
        $isAllDay  = isset($_POST['is_all_day']) ? (bool)$_POST['is_all_day'] : false;
        $startTime = isset($_POST['start_time']) ? trim($_POST['start_time']) : '';
        $endTime   = isset($_POST['end_time'])   ? trim($_POST['end_time'])   : '';
        $dateTo    = isset($_POST['date_to'])    ? trim($_POST['date_to'])    : '';

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
                  category, color, is_all_day, title, single_event)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param(
            'iissssssisi',
            $employerId,
            $userId,
            $date,
            $dateTo,
            $startTime,
            $endTime,
            $category,
            $color,
            $isAllDayInt,
            $title,
            $singleEvent
        );
        $stmt->execute();
        $newId = (int)$conn->insert_id;
        $stmt->close();

        if ($singleEvent === 1 && !empty($employerIds)) {
            $stmtEmp = $conn->prepare(
                'INSERT IGNORE INTO event_employers (event_id, employer_id) VALUES (?, ?)'
            );
            foreach ($employerIds as $empId) {
                $stmtEmp->bind_param('ii', $newId, $empId);
                $stmtEmp->execute();
            }
            $stmtEmp->close();
        }

        $conn->close();

        $newEvent = [
            'id'           => $newId,
            'employer_id'  => $employerId,
            'employer_ids' => $employerIds,
            'single_event' => $singleEvent,
            'user_id'      => $userId,
            'date'         => $date,
            'date_to'      => $dateTo,
            'start_time'   => $startTime ?? '',
            'end_time'     => $endTime   ?? '',
            'category'     => $category,
            'color'        => $color,
            'is_all_day'   => $isAllDay,
            'title'        => $title,
        ];

        echo json_encode(['success' => true, 'event' => $newEvent]);
        exit;
    }

    // ----------------------------------------------------------
    // EDIT (update) an existing event
    // ----------------------------------------------------------
    if ($action === 'edit') {
        $eventId     = isset($_POST['event_id'])    ? $_POST['event_id']          : '';
        $date        = isset($_POST['date'])         ? trim($_POST['date'])        : '';
        $title       = isset($_POST['title'])        ? trim($_POST['title'])       : '';
        $category    = isset($_POST['category'])     ? trim($_POST['category'])    : '';
        $color       = isset($_POST['color'])        ? trim($_POST['color'])       : '#4a90e2';
        $isAllDay    = isset($_POST['is_all_day'])   ? (bool)$_POST['is_all_day']  : false;
        $startTime   = isset($_POST['start_time'])   ? trim($_POST['start_time'])  : '';
        $endTime     = isset($_POST['end_time'])     ? trim($_POST['end_time'])    : '';
        $dateTo      = isset($_POST['date_to'])      ? trim($_POST['date_to'])     : '';
        $singleEvent = isset($_POST['single_event']) && $_POST['single_event'] === '1' ? 1 : 0;

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

        if ($singleEvent === 0) {
            $employerIdRaw = isset($_POST['employer_id']) ? $_POST['employer_id'] : '';
            if (filter_var($employerIdRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ungültige Mitarbeiter-ID.']);
                exit;
            }
            $employerId  = (int)$employerIdRaw;
            $employerIds = [$employerId];
        } else {
            $employerIdsRaw = isset($_POST['employer_ids']) && is_array($_POST['employer_ids'])
                              ? $_POST['employer_ids'] : [];
            $employerIds = [];
            foreach ($employerIdsRaw as $eid) {
                if (filter_var($eid, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) !== false) {
                    $employerIds[] = (int)$eid;
                }
            }
            $employerIds = array_values(array_unique($employerIds));
            if (empty($employerIds)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Mindestens ein Mitarbeiter muss ausgewählt werden.']);
                exit;
            }
            $employerId = null;
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
             SET    date         = ?,
                    date_to      = ?,
                    start_time   = ?,
                    end_time     = ?,
                    category     = ?,
                    color        = ?,
                    is_all_day   = ?,
                    title        = ?,
                    single_event = ?,
                    employer_id  = ?
             WHERE  id = ? AND deleted = 0'
        );
        $stmt->bind_param(
            'sssssisiiii',
            $date,
            $dateTo,
            $startTime,
            $endTime,
            $category,
            $color,
            $isAllDayInt,
            $title,
            $singleEvent,
            $employerId,
            $eventId
        );
        $stmt->execute();
        $stmt->close();

        // event_employers aktualisieren
        $stmtDel = $conn->prepare('DELETE FROM event_employers WHERE event_id = ?');
        $stmtDel->bind_param('i', $eventId);
        $stmtDel->execute();
        $stmtDel->close();

        if ($singleEvent === 1 && !empty($employerIds)) {
            $stmtEmp = $conn->prepare(
                'INSERT IGNORE INTO event_employers (event_id, employer_id) VALUES (?, ?)'
            );
            foreach ($employerIds as $empId) {
                $stmtEmp->bind_param('ii', $eventId, $empId);
                $stmtEmp->execute();
            }
            $stmtEmp->close();
        }

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
// GET – return events for the requested week
// ============================================================
$requestedStartDate = isset($_GET['start_date']) ? trim($_GET['start_date']) : date('Y-m-d', strtotime('monday this week'));

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedStartDate)) {
    $requestedStartDate = date('Y-m-d', strtotime('monday this week'));
}
$dateTime = DateTime::createFromFormat('Y-m-d', $requestedStartDate);
if (!$dateTime || $dateTime->format('Y-m-d') !== $requestedStartDate) {
    $requestedStartDate = date('Y-m-d', strtotime('monday this week'));
}

// Calculate end date (Sunday = Monday + 6 days)
$endDate = date('Y-m-d', strtotime($requestedStartDate . ' +6 days'));

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
    exit;
}
$conn->set_charset('utf8mb4');

$stmt = $conn->prepare(
    'SELECT e.id, e.employer_id, e.user_id,
            DATE_FORMAT(e.date,    \'%Y-%m-%d\') AS date,
            DATE_FORMAT(e.date_to, \'%Y-%m-%d\') AS date_to,
            IFNULL(TIME_FORMAT(e.start_time, \'%H:%i\'), \'\') AS start_time,
            IFNULL(TIME_FORMAT(e.end_time,   \'%H:%i\'), \'\') AS end_time,
            e.category, e.color, e.is_all_day, e.title, e.single_event,
            GROUP_CONCAT(ee.employer_id ORDER BY ee.employer_id) AS multi_employer_ids
     FROM   events e
     LEFT   JOIN event_employers ee ON ee.event_id = e.id AND e.single_event = 1
     WHERE  e.date <= ? AND COALESCE(e.date_to, e.date) >= ? AND e.deleted = 0
     GROUP  BY e.id
     ORDER  BY e.date ASC, e.is_all_day DESC, e.start_time ASC'
);
$stmt->bind_param('ss', $endDate, $requestedStartDate);
$stmt->execute();

$result = $stmt->get_result();
$events = [];

while ($row = $result->fetch_assoc()) {
    $row['id']           = (int)$row['id'];
    $row['user_id']      = (int)$row['user_id'];
    $row['is_all_day']   = (bool)$row['is_all_day'];
    $row['single_event'] = (int)$row['single_event'];
    // Normalize date_to: fall back to date if not set
    $row['date_to']      = $row['date_to'] ?? $row['date'];

    if ($row['single_event'] === 1) {
        $row['employer_ids'] = $row['multi_employer_ids'] !== null
            ? array_map('intval', explode(',', $row['multi_employer_ids']))
            : [];
        $row['employer_id']  = null;
    } else {
        $row['employer_id']  = (int)$row['employer_id'];
        $row['employer_ids'] = [$row['employer_id']];
    }
    unset($row['multi_employer_ids']);

    $events[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode($events);
