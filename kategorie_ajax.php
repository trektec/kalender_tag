<?php
header('Content-Type: application/json');

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: '');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: '');
define('DB_PORT', (int)(getenv('DB_PORT') ?: 3306));

function getDbConnection(): mysqli
{
    if (DB_USER === '' || DB_NAME === '') {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Datenbankkonfiguration unvollständig.']);
        exit;
    }

    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
        exit;
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

function normalizeColor(string $value): string
{
    return preg_match('/^#[0-9A-Fa-f]{6}$/', $value) ? $value : '#4a90e2';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? trim($_POST['action']) : '';
    $conn = getDbConnection();

    if ($action === 'create') {
        $katname = isset($_POST['katname']) ? trim($_POST['katname']) : '';
        $katcolor = normalizeColor(isset($_POST['katcolor']) ? trim($_POST['katcolor']) : '#4a90e2');

        if ($katname === '') {
            $conn->close();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Kategoriename darf nicht leer sein.']);
            exit;
        }

        $stmt = $conn->prepare('INSERT INTO kategorien (katname, katcolor) VALUES (?, ?)');
        $stmt->bind_param('ss', $katname, $katcolor);
        if (!$stmt->execute()) {
            $stmt->close();
            $conn->close();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Kategorie konnte nicht erstellt werden.']);
            exit;
        }
        $katid = (int)$conn->insert_id;
        $stmt->close();
        $conn->close();

        echo json_encode([
            'success' => true,
            'category' => ['katid' => $katid, 'katname' => $katname, 'katcolor' => $katcolor],
        ]);
        exit;
    }

    if ($action === 'edit') {
        $katid = isset($_POST['katid']) ? $_POST['katid'] : '';
        $katname = isset($_POST['katname']) ? trim($_POST['katname']) : '';
        $katcolor = normalizeColor(isset($_POST['katcolor']) ? trim($_POST['katcolor']) : '#4a90e2');

        if (filter_var($katid, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            $conn->close();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Kategorie-ID.']);
            exit;
        }
        if ($katname === '') {
            $conn->close();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Kategoriename darf nicht leer sein.']);
            exit;
        }
        $katid = (int)$katid;

        $stmt = $conn->prepare(
            'UPDATE kategorien
             SET katname = ?, katcolor = ?
             WHERE katid = ? AND deleted = 0'
        );
        $stmt->bind_param('ssi', $katname, $katcolor, $katid);
        if (!$stmt->execute()) {
            $stmt->close();
            $conn->close();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Kategorie konnte nicht aktualisiert werden.']);
            exit;
        }
        if ($stmt->affected_rows < 1) {
            $stmt->close();
            $conn->close();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Kategorie wurde nicht gefunden.']);
            exit;
        }
        $stmt->close();

        $stmtEvents = $conn->prepare(
            'UPDATE events
             SET category = ?, color = ?
             WHERE katid = ? AND deleted = 0'
        );
        $stmtEvents->bind_param('ssi', $katname, $katcolor, $katid);
        if (!$stmtEvents->execute()) {
            $stmtEvents->close();
            $conn->close();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Kategorieänderung konnte nicht auf Termine angewendet werden.']);
            exit;
        }
        $stmtEvents->close();
        $conn->close();

        echo json_encode([
            'success' => true,
            'category' => ['katid' => $katid, 'katname' => $katname, 'katcolor' => $katcolor],
        ]);
        exit;
    }

    if ($action === 'delete') {
        $katid = isset($_POST['katid']) ? $_POST['katid'] : '';

        if (filter_var($katid, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            $conn->close();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Kategorie-ID.']);
            exit;
        }
        $katid = (int)$katid;

        $stmt = $conn->prepare('UPDATE kategorien SET deleted = 1 WHERE katid = ? AND deleted = 0');
        $stmt->bind_param('i', $katid);
        if (!$stmt->execute()) {
            $stmt->close();
            $conn->close();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Kategorie konnte nicht gelöscht werden.']);
            exit;
        }
        if ($stmt->affected_rows < 1) {
            $stmt->close();
            $conn->close();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Kategorie wurde nicht gefunden.']);
            exit;
        }
        $stmt->close();

        $stmtEvents = $conn->prepare('UPDATE events SET katid = NULL WHERE katid = ? AND deleted = 0');
        $stmtEvents->bind_param('i', $katid);
        if (!$stmtEvents->execute()) {
            $stmtEvents->close();
            $conn->close();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Kategorie konnte nicht von Terminen entfernt werden.']);
            exit;
        }
        $stmtEvents->close();
        $conn->close();

        echo json_encode(['success' => true]);
        exit;
    }

    $conn->close();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unbekannte Aktion.']);
    exit;
}

$conn = getDbConnection();
$result = $conn->query(
    'SELECT katid, katname, katcolor
     FROM kategorien
     WHERE deleted = 0
     ORDER BY katname ASC'
);
if ($result === false) {
    $conn->close();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Kategorien konnten nicht geladen werden.']);
    exit;
}

$categories = [];
while ($row = $result->fetch_assoc()) {
    $categories[] = [
        'katid' => (int)$row['katid'],
        'katname' => $row['katname'],
        'katcolor' => normalizeColor($row['katcolor']),
    ];
}
$conn->close();

echo json_encode($categories);
