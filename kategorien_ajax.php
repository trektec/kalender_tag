<?php
header('Content-Type: application/json');

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'your_db_user');
define('DB_PASS', getenv('DB_PASS') ?: 'your_db_password');
define('DB_NAME', getenv('DB_NAME') ?: 'your_db_name');
define('DB_PORT', (int)(getenv('DB_PORT') ?: 3306));

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
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
