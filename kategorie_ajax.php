<?php
header('Content-Type: application/json');

// ============================================================
// kategorie_ajax.php – Read-only AJAX endpoint for categories
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
// CREATE TABLE IF NOT EXISTS kategorien (
//     id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     name    VARCHAR(100)  NOT NULL,
//     farbe   VARCHAR(7)    NOT NULL DEFAULT '#4a90e2',
//     INDEX idx_name (name)
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//
// Example rows:
// INSERT INTO kategorien (name, farbe) VALUES
//     ('meeting',     '#4a90e2'),
//     ('appointment', '#e74c3c'),
//     ('training',    '#f39c12'),
//     ('holiday',     '#2ecc71'),
//     ('vacation',    '#27ae60'),
//     ('planning',    '#9b59b6'),
//     ('workshop',    '#1abc9c');
// ============================================================

// Only GET requests are accepted – this endpoint is read-only.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['success' => false, 'message' => 'Nur GET-Anfragen sind erlaubt.']);
    exit;
}

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
    exit;
}
$conn->set_charset('utf8mb4');

$result = $conn->query('SELECT id, name, farbe FROM kategorien ORDER BY name ASC');
if (!$result) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Datenbankabfrage fehlgeschlagen.']);
    $conn->close();
    exit;
}

$kategorien = [];
while ($row = $result->fetch_assoc()) {
    $kategorien[] = [
        'id'    => (int)$row['id'],
        'name'  => $row['name'],
        'farbe' => $row['farbe'],
    ];
}

$result->free();
$conn->close();

echo json_encode($kategorien);
