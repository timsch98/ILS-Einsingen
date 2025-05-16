<?php
header("Content-Type: application/json");

// DB-Zugangsdaten
$host = 'localhost';
$dbname = 'deine_datenbank';  // anpassen
$user = 'root';               // anpassen
$password = '';               // anpassen

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'DB-Verbindung fehlgeschlagen: ' . $e->getMessage()]);
    exit;
}

// JSON-Daten vom POST-Request einlesen
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['status' => 'error', 'message' => 'Keine gültigen JSON-Daten empfangen.']);
    exit;
}

// Daten extrahieren (mit Fallbacks)
$ort = trim($data['ort'] ?? '');
$strasse = trim($data['strasse'] ?? '');
$hausnummer = trim($data['hausnummer'] ?? '');
$beschreibung = trim($data['beschreibung'] ?? '');
$fahrzeugIds = $data['fahrzeuge'] ?? [];
$koordinaten = $data['koordinaten'] ?? null; // optionales Array [lat, lng]

// Validierung
if (empty($beschreibung)) {
    echo json_encode(['status' => 'error', 'message' => 'Beschreibung ist erforderlich.']);
    exit;
}

if (empty($ort) && empty($strasse) && empty($hausnummer) && !$koordinaten) {
    echo json_encode(['status' => 'error', 'message' => 'Adresse oder Koordinaten müssen angegeben werden.']);
    exit;
}

// Zeitstempel jetzt
$zeit = date('Y-m-d H:i:s');

try {
    // Einsatz speichern
    $stmt = $pdo->prepare("INSERT INTO einsaetze (ort, strasse, hausnummer, beschreibung, zeit, lat, lng) VALUES (:ort, :strasse, :hausnummer, :beschreibung, :zeit, :lat, :lng)");

    $lat = $koordinaten[0] ?? null;
    $lng = $koordinaten[1] ?? null;

    $stmt->execute([
        ':ort' => $ort,
        ':strasse' => $strasse,
        ':hausnummer' => $hausnummer,
        ':beschreibung' => $beschreibung,
        ':zeit' => $zeit,
        ':lat' => $lat,
        ':lng' => $lng
    ]);

    $einsatzId = $pdo->lastInsertId();

    // Fahrzeuge verknüpfen (Zwischentabelle einsatz_fahrzeuge)
    if (is_array($fahrzeugIds)) {
        $stmtFz = $pdo->prepare("INSERT INTO einsatz_fahrzeuge (einsatz_id, fahrzeug_id) VALUES (:einsatz_id, :fahrzeug_id)");

        foreach ($fahrzeugIds as $fahrzeugId) {
            // Sicherheitscheck: fahrzeugId sollte numerisch sein
            if (!is_numeric($fahrzeugId)) continue;

            $stmtFz->execute([
                ':einsatz_id' => $einsatzId,
                ':fahrzeug_id' => intval($fahrzeugId)
            ]);
        }
    }

    echo json_encode(['status' => 'ok', 'einsatzId' => $einsatzId]);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Fehler beim Speichern: ' . $e->getMessage()]);
}
