<?php
header('Content-Type: application/json');

$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbUser = getenv('DB_USER');
$dbPass = getenv('DB_PASS');
$dbName = getenv('DB_NAME');
$dbPort = (int)(getenv('DB_PORT') ?: 3306);

if ($dbUser === false || $dbPass === false || $dbName === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Datenbank-Konfiguration fehlt (DB_USER/DB_PASS/DB_NAME).']);
    exit;
}

$conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
    exit;
}
$conn->set_charset('utf8mb4');

$result = $conn->query(
    'SELECT id, name, color
     FROM kategorien
     ORDER BY name ASC'
);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Kategorien konnten nicht geladen werden.']);
    $conn->close();
    exit;
}

$categories = [];
while ($row = $result->fetch_assoc()) {
    $color = isset($row['color']) ? trim((string)$row['color']) : '';
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
        $color = '#4a90e2';
    }

    $categories[] = [
        'id'    => (int)$row['id'],
        'name'  => (string)$row['name'],
        'color' => $color,
    ];
}

$result->free();
$conn->close();

echo json_encode($categories);
