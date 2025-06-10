<?php
header('Content-Type: application/json');
$file = __DIR__.'/highscores.json';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = @file_get_contents($file);
    echo $data ?: '[]';
    exit;
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['name'],$input['score'])) {
        echo json_encode(['success'=>false,'msg'=>'Ugyldig data']); exit;
    }
    $name = preg_replace('/[^A-Za-z0-9 _-]/','',substr($input['name'],0,12));
    $score = intval($input['score']);
    $scores = json_decode(@file_get_contents($file), true) ?: [];
    $scores[] = ['name'=>$name,'score'=>$score];
    usort($scores, fn($a,$b)=>$b['score'] - $a['score']);
    $scores = array_slice($scores, 0, 10);
    $fp = fopen($file, 'c+');
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp,0);
        fwrite($fp, json_encode($scores, JSON_PRETTY_PRINT));
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    echo json_encode(['success'=>true]);
    exit;
}
echo json_encode(['success'=>false,'msg'=>'Ugyldig metode']);
exit;