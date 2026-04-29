<?php
header('Content-Type: application/json');

require_once 'event_iec_db.php';

try {
    $conn = getDbConnection();

    $result = $conn->query('SELECT user_id, user_kalender_name FROM a_tab_user ORDER BY user_kalender_name ASC');

    if ($result === false) {
        throw new RuntimeException('Datenbankabfrage fehlgeschlagen: ' . $conn->error);
    }

    $employers = [];
    while ($row = $result->fetch_assoc()) {
        $employers[] = [
            'id'         => (int)$row['user_id'],
            'name'       => $row['user_kalender_name'],
            'department' => '',
            'color'      => '',
        ];
    }

    $result->free();
    $conn->close();
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

echo json_encode($employers);
?>
