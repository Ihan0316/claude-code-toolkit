# SessionStart 훅 — 세션 시작 시 현재 상태를 3~5줄로 주입
# 출력: 사용자 화면 + Claude 컨텍스트
# 등록: settings.json > hooks > SessionStart, matcher "startup|resume"
#
# 표시 항목: ① 마지막 일일보고 ② 최근 메모리 변경 ③ 백업 상태 ④ 다음 자동 백업
# 경로 하드코딩 없이 $env:USERPROFILE 기준 + cwd 기반 메모리 자동 탐지.

$ErrorActionPreference = 'SilentlyContinue'

# 훅 호출 시 콘솔 인코딩이 CP949면 한글 깨짐 → UTF-8 강제
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# SessionStart stdin(JSON)에서 cwd 추출 — 실패 시 현재 위치로 폴백
$cwd = $null
try {
    try { [Console]::InputEncoding = [System.Text.Encoding]::UTF8 } catch {}
    $rawInput = [Console]::In.ReadToEnd()
    if ($rawInput) {
        $payload = $rawInput | ConvertFrom-Json -ErrorAction Stop
        if ($payload.cwd) { $cwd = [string]$payload.cwd }
    }
} catch { }
if (-not $cwd) { $cwd = (Get-Location).Path }

function Format-Age {
    param([datetime]$Time)
    $diff = (Get-Date) - $Time
    if ($diff.TotalMinutes -lt 60)   { return "{0}분 전" -f [int]$diff.TotalMinutes }
    if ($diff.TotalHours   -lt 24)   { return "{0}시간 전" -f [int]$diff.TotalHours }
    return "{0}일 전" -f [int]$diff.TotalDays
}

$lines = @('[세션 컨텍스트]')

# 1. 마지막 일일보고 (워크스페이스 루트의 일일보고 폴더 재귀 탐색)
#    <WORKSPACE>, <DAILY_LOG_DIR> 를 본인 컨벤션에 맞게 수정하세요.
$dailyRoot = "$env:USERPROFILE\Documents\workspace\일일일지"
if (Test-Path -LiteralPath $dailyRoot) {
    $latest = Get-ChildItem -LiteralPath $dailyRoot -Filter '*.md' -Recurse |
              Sort-Object LastWriteTime -Descending |
              Select-Object -First 1
    if ($latest) {
        $lines += "- 일일보고: {0} ({1})" -f $latest.BaseName, (Format-Age $latest.LastWriteTime)
    }
}

# 2. 메모리 최근 변경 — cwd를 Claude projects 인코딩 규칙(영숫자 외 → '-')으로
#    변환한 뒤, 상위로 거슬러 올라가며 projects/<인코딩>/memory 가 있는 첫 폴더 사용.
$projectsRoot = "$env:USERPROFILE\.claude\projects"
$memDir   = $null
$projName = $null
$probe = $cwd
while ($probe) {
    $encoded   = $probe -replace '[^A-Za-z0-9]', '-'
    $candidate = Join-Path $projectsRoot (Join-Path $encoded 'memory')
    if (Test-Path -LiteralPath $candidate) {
        $memDir   = $candidate
        $projName = Split-Path -Leaf $probe
        break
    }
    $parent = Split-Path -Parent $probe
    if (-not $parent -or $parent -eq $probe) { break }
    $probe = $parent
}
if ($memDir) {
    $recent = Get-ChildItem -LiteralPath $memDir -File -Filter '*.md' |
              Where-Object { $_.Name -ne 'MEMORY.md' } |
              Sort-Object LastWriteTime -Descending |
              Select-Object -First 1
    if ($recent) {
        $lines += "- 메모리 최근: {0} ({1}, {2})" -f $recent.Name, (Format-Age $recent.LastWriteTime), $projName
    }
}

# 3. 백업 상태 (<BACKUP_DIR> 본인 백업 폴더로 수정)
$backupDir = "$env:USERPROFILE\Documents\클로드 셋업 백업"
if (Test-Path -LiteralPath $backupDir) {
    $lastZip = Get-ChildItem -LiteralPath $backupDir -Filter 'claude-backup-*.zip' |
               Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($lastZip) {
        $age = (Get-Date) - $lastZip.LastWriteTime
        $warn = if ($age.Days -gt 8) { ' ⚠️' } else { '' }
        $lines += "- 백업: {0}{1}" -f (Format-Age $lastZip.LastWriteTime), $warn
    }
}

# 4. 다음 자동 백업 (작업 스케줄러 작업명 <BACKUP_TASK_NAME> 으로 수정)
$nextTask = Get-ScheduledTask -TaskName 'Claude Settings Weekly Backup' -ErrorAction SilentlyContinue
if ($nextTask) {
    $nextRun = (Get-ScheduledTaskInfo $nextTask).NextRunTime
    if ($nextRun) {
        $lines += "- 다음 자동 백업: {0:MM-dd HH:mm}" -f $nextRun
    }
}

$lines -join "`n"
