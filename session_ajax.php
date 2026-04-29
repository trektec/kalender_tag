<?php
header('Content-Type: application/json');

// event_iec_db.php wird nur für die Datenbankverbindung (getDbConnection) benötigt.
require_once 'event_iec_db.php';

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

// Die Tabelle a_tab_session speichert Login- und Logout-Ereignisse als separate Zeilen.
// Erwartete Tabellenstruktur:
//   CREATE TABLE IF NOT EXISTS a_tab_session (
//       session_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//       user_id       INT UNSIGNED NOT NULL,
//       session_date  DATE         NOT NULL,
//       session_time  TIME         NOT NULL,
//       session_type  ENUM('login','logout') NOT NULL,
//       INDEX idx_session_date (session_date),
//       INDEX idx_session_user (user_id)
//   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

try {
    $conn = getDbConnection();

    $stmt = $conn->prepare(
        'SELECT session_id,
                user_id,
                TIME_FORMAT(session_time, \'%H:%i\') AS session_time,
                session_type
         FROM   a_tab_session
         WHERE  session_date = ?
         ORDER  BY user_id ASC, session_time ASC'
    );

    $stmt->bind_param('s', $requestedDate);

    if (!$stmt->execute()) {
        throw new RuntimeException('Datenbankabfrage fehlgeschlagen: ' . $stmt->error);
    }

    $result = $stmt->get_result();

    if ($result === false) {
        throw new RuntimeException('Datenbankabfrage fehlgeschlagen: ' . $conn->error);
    }

    // Einträge nach Nutzer gruppieren und in Logins / Logouts aufteilen
    $logins  = [];   // $logins[$user_id]  = [[id, time], ...]
    $logouts = [];   // $logouts[$user_id] = [time, ...]

    while ($row = $result->fetch_assoc()) {
        $uid = (int)$row['user_id'];
        if ($row['session_type'] === 'login') {
            $logins[$uid][] = ['id' => (int)$row['session_id'], 'time' => $row['session_time']];
        } else {
            $logouts[$uid][] = $row['session_time'];
        }
    }

    $stmt->close();
    $conn->close();

    // Login- und Logout-Einträge paarweise zusammenführen.
    // login[0] ↔ logout[0], login[1] ↔ logout[1], …
    // Hat ein Login keinen passenden Logout, ist logout_time '' → Session gilt als aktiv.
    $sessions = [];

    foreach ($logins as $uid => $userLogins) {
        $userLogouts = isset($logouts[$uid]) ? $logouts[$uid] : [];

        foreach ($userLogins as $index => $login) {
            $sessions[] = [
                'id'          => $login['id'],
                'employer_id' => $uid,
                'date'        => $requestedDate,
                'login_time'  => $login['time'],
                'logout_time' => isset($userLogouts[$index]) ? $userLogouts[$index] : '',
            ];
        }
    }
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

echo json_encode($sessions);
?>
