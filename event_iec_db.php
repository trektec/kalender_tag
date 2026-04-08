<?php
// ============================================================
// event_iec_db.php – mysqli database layer for calendar events
// ============================================================
// This file is intentionally NOT included by default.
// To activate database persistence, add the following line at
// the top of event_iec_ajax.php:
//
//   require_once 'event_iec_db.php';
//
// and remove (or comment out) the demo-data blocks there.
// ============================================================

// --- Database configuration ---------------------------------
// Adjust these constants to match your MySQL/MariaDB setup.
define('DB_HOST', 'localhost');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('DB_NAME', 'your_db_name');
define('DB_PORT', 3306);

// --- Required table structure --------------------------------
// Run once on your database to create the events table:
//
// CREATE TABLE IF NOT EXISTS events (
//     id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     employer_id  INT UNSIGNED    NOT NULL,
//     user_id      INT UNSIGNED    NOT NULL,
//     date         DATE            NOT NULL,
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

// ============================================================
// Internal helper – returns an open mysqli connection.
// ============================================================
function getDbConnection(): mysqli
{
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

    if ($conn->connect_error) {
        throw new RuntimeException(
            'Datenbankverbindung fehlgeschlagen: ' . $conn->connect_error
        );
    }

    $conn->set_charset('utf8mb4');

    return $conn;
}

// ============================================================
// Fetch all (non-deleted) events for a specific date.
//
// @param  string $date  Date string in Y-m-d format
// @return array         Array of event rows (associative arrays)
// ============================================================
function dbGetEvents(string $date): array
{
    $conn = getDbConnection();

    $stmt = $conn->prepare(
        'SELECT id, employer_id, user_id,
                DATE_FORMAT(date, \'%Y-%m-%d\') AS date,
                IFNULL(TIME_FORMAT(start_time, \'%H:%i\'), \'\') AS start_time,
                IFNULL(TIME_FORMAT(end_time,   \'%H:%i\'), \'\') AS end_time,
                category, color, is_all_day, title
         FROM   events
         WHERE  date = ? AND deleted = 0
         ORDER  BY is_all_day DESC, start_time ASC'
    );

    $stmt->bind_param('s', $date);
    $stmt->execute();

    $result = $stmt->get_result();
    $events = [];

    while ($row = $result->fetch_assoc()) {
        $row['id']         = (int)$row['id'];
        $row['employer_id']= (int)$row['employer_id'];
        $row['user_id']    = (int)$row['user_id'];
        $row['is_all_day'] = (bool)$row['is_all_day'];
        $events[]          = $row;
    }

    $stmt->close();
    $conn->close();

    return $events;
}

// ============================================================
// Insert a new event and return the newly created ID.
//
// @param  array $data  Keys: employer_id, user_id, date,
//                            start_time, end_time, category,
//                            color, is_all_day, title
// @return int          Auto-generated event ID
// ============================================================
function dbCreateEvent(array $data): int
{
    $conn = getDbConnection();

    $stmt = $conn->prepare(
        'INSERT INTO events
             (employer_id, user_id, date, start_time, end_time,
              category, color, is_all_day, title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $isAllDay  = $data['is_all_day'] ? 1 : 0;
    $startTime = $isAllDay ? null : ($data['start_time'] ?: null);
    $endTime   = $isAllDay ? null : ($data['end_time']   ?: null);

    $stmt->bind_param(
        'iisssssis',
        $data['employer_id'],
        $data['user_id'],
        $data['date'],
        $startTime,
        $endTime,
        $data['category'],
        $data['color'],
        $isAllDay,
        $data['title']
    );

    $stmt->execute();
    $newId = (int)$conn->insert_id;

    $stmt->close();
    $conn->close();

    return $newId;
}

// ============================================================
// Update an existing (non-deleted) event.
//
// @param  int   $id    Event ID to update
// @param  array $data  Keys: date, start_time, end_time,
//                            category, color, is_all_day, title
// @return bool         true if a row was actually changed
// ============================================================
function dbUpdateEvent(int $id, array $data): bool
{
    $conn = getDbConnection();

    $stmt = $conn->prepare(
        'UPDATE events
         SET    date       = ?,
                start_time = ?,
                end_time   = ?,
                category   = ?,
                color      = ?,
                is_all_day = ?,
                title      = ?
         WHERE  id = ? AND deleted = 0'
    );

    $isAllDay  = $data['is_all_day'] ? 1 : 0;
    $startTime = $isAllDay ? null : ($data['start_time'] ?: null);
    $endTime   = $isAllDay ? null : ($data['end_time']   ?: null);

    $stmt->bind_param(
        'sssssisi',
        $data['date'],
        $startTime,
        $endTime,
        $data['category'],
        $data['color'],
        $isAllDay,
        $data['title'],
        $id
    );

    $stmt->execute();
    $changed = $stmt->affected_rows > 0;

    $stmt->close();
    $conn->close();

    return $changed;
}

// ============================================================
// Soft-delete an event (sets deleted = 1).
//
// @param  int  $id  Event ID to delete
// @return bool      true if a row was actually marked deleted
// ============================================================
function dbDeleteEvent(int $id): bool
{
    $conn = getDbConnection();

    $stmt = $conn->prepare(
        'UPDATE events SET deleted = 1 WHERE id = ? AND deleted = 0'
    );

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $changed = $stmt->affected_rows > 0;

    $stmt->close();
    $conn->close();

    return $changed;
}
