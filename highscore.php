<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$legacyFile = __DIR__ . '/scores.json';
$storeFile = __DIR__ . '/scores-v2.json';

function respond(mixed $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readScores(string $path): array
{
    $contents = @file_get_contents($path);
    if ($contents === false || trim($contents) === '') {
        return [];
    }

    $decoded = json_decode($contents, true);
    return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
}

function sortScores(array &$scores): void
{
    usort($scores, static fn(array $a, array $b): int => ((int) ($b['score'] ?? 0)) <=> ((int) ($a['score'] ?? 0)));
}

function cleanWorkplaceName(mixed $value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $clean = trim((string) preg_replace("/[^\\p{L}\\p{N} .,&()'’\\/-]/u", '', $value));
    $clean = (string) preg_replace('/\\s+/u', ' ', $clean);
    if ($clean === '') {
        return null;
    }

    return function_exists('mb_substr') ? mb_substr($clean, 0, 60) : substr($clean, 0, 60);
}

function cleanWorkplaceID(mixed $value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $clean = trim(strtolower($value));
    if ($clean === '' || strlen($clean) > 64 || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $clean)) {
        return null;
    }

    return $clean;
}

function legacyRows(array $scores): array
{
    return array_map(
        static fn(array $row): array => [
            'name' => (string) ($row['name'] ?? ''),
            'score' => (int) ($row['score'] ?? 0),
        ],
        array_slice($scores, 0, 10)
    );
}

function writeJSON(string $path, array $payload): bool
{
    $handle = @fopen($path, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        return false;
    }

    ftruncate($handle, 0);
    rewind($handle);
    $written = fwrite($handle, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    return $written !== false;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $scores = is_file($storeFile) ? readScores($storeFile) : readScores($legacyFile);
    sortScores($scores);

    $scope = $_GET['scope'] ?? 'global';
    if ($scope === 'workplace') {
        $workplaceID = cleanWorkplaceID($_GET['workplace_id'] ?? null);
        if ($workplaceID === null) {
            respond([]);
        }
        $scores = array_values(array_filter(
            $scores,
            static fn(array $row): bool => ($row['workplace_id'] ?? null) === $workplaceID
        ));
    }

    respond(array_slice($scores, 0, 10));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false || strlen($rawInput) > 8192) {
        respond(['success' => false, 'msg' => 'Ugyldig data'], 400);
    }

    $input = json_decode($rawInput, true);
    if (!is_array($input) || !isset($input['name'], $input['score'])) {
        respond(['success' => false, 'msg' => 'Ugyldig data'], 400);
    }

    $name = preg_replace('/[^A-Za-z0-9 _-]/', '', substr((string) $input['name'], 0, 12));
    $score = filter_var($input['score'], FILTER_VALIDATE_INT);
    if ($name === '' || $score === false || $score < 0 || $score > 1000000000) {
        respond(['success' => false, 'msg' => 'Ugyldig data'], 400);
    }

    $workplaceID = cleanWorkplaceID($input['workplace_id'] ?? null);
    $workplaceName = cleanWorkplaceName($input['workplace_name'] ?? null);
    if ($workplaceID === null || $workplaceName === null) {
        $workplaceID = null;
        $workplaceName = null;
    }

    $handle = @fopen($storeFile, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        respond(['success' => false, 'msg' => 'Kunne ikke lagre'], 500);
    }

    rewind($handle);
    $contents = stream_get_contents($handle);
    $scores = $contents !== false && trim($contents) !== ''
        ? json_decode($contents, true)
        : readScores($legacyFile);
    if (!is_array($scores)) {
        $scores = [];
    }

    $entry = ['name' => $name, 'score' => (int) $score];
    if ($workplaceID !== null && $workplaceName !== null) {
        $entry['workplace_id'] = $workplaceID;
        $entry['workplace_name'] = $workplaceName;
    }
    $scores[] = $entry;
    sortScores($scores);
    $scores = array_slice($scores, 0, 5000);

    ftruncate($handle, 0);
    rewind($handle);
    $written = fwrite($handle, json_encode($scores, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    if ($written === false || !writeJSON($legacyFile, legacyRows($scores))) {
        respond(['success' => false, 'msg' => 'Kunne ikke lagre'], 500);
    }

    respond(['success' => true]);
}

respond(['success' => false, 'msg' => 'Ugyldig metode'], 405);
