# Claude Code 설정 백업 스크립트 (예시) — 주간·일일 두 작업에서 재사용
#
# 백업 범위:
#   1. 전역 설정 → zip 내부 user\ 아래
#      - %USERPROFILE%\.claude\          (단, .credentials.json 제외 = 토큰 유출 방지)
#      - %USERPROFILE%\.claude.json
#   2. 프로젝트별 설정 → zip 내부 projects\<프로젝트명>\ 아래
#      - <WORKSPACE> 하위 각 프로젝트의 .claude\, .specify\, CLAUDE.md
#   3. 시스템 자원 → zip 내부 system\ 아래
#      - 훅 스크립트 폴더(Scripts), 작업 스케줄러 XML
#      - MCP scheduled-tasks.json (못 찾으면 직전 미러본으로 대체)
#      - 데스크톱 앱 세션 레지스트리 local_*.json (앱 업데이트 시 초기화 대비)
#
# 저장: %USERPROFILE%\Documents\<BACKUP_DIR>\claude-backup-YYYY-MM-DD.zip
# 보관: 최근 N개 zip만 유지 (기본 8, 롤링)
#
# 사용 예:
#   주간: backup-claude-settings.ps1
#   일일: backup-claude-settings.ps1 -DestDir "<BACKUP_DIR>\daily" -Retention 30
#
# 사용 전 <...> placeholder(워크스페이스·백업 폴더·작업명)를 본인 환경에 맞게 수정하세요.

param(
    # 저장 폴더/보관 개수를 바꿔 같은 스크립트를 주간·일일 두 작업에서 재사용한다.
    [string]$DestDir,
    [int]$Retention = 8
)

$ErrorActionPreference = 'Stop'

$userClaudeDir   = Join-Path $env:USERPROFILE '.claude'
$userClaudeJson  = Join-Path $env:USERPROFILE '.claude.json'
$workspaceRoot   = Join-Path $env:USERPROFILE 'Documents\<WORKSPACE>'   # ← 본인 워크스페이스
$scriptsDir      = Join-Path $env:USERPROFILE 'Scripts'
$defaultDestDir  = Join-Path $env:USERPROFILE 'Documents\<BACKUP_DIR>'  # ← 백업 저장 폴더
$destDir         = if ($DestDir) { $DestDir } else { $defaultDestDir }
$logFile         = Join-Path $destDir '_backup.log'
$retention       = $Retention
$stamp           = Get-Date -Format 'yyyy-MM-dd'
$zipPath         = Join-Path $destDir ("claude-backup-{0}.zip" -f $stamp)
$globalExclude   = @('.credentials.json')                              # ← 비밀은 백업 제외
$projectItems    = @('.claude', '.specify', 'CLAUDE.md')
$schedTaskNames  = @('<WEEKLY_BACKUP_TASK>', '<DAILY_BACKUP_TASK>')   # ← 작업 스케줄러 작업명

function Write-Log {
    param([string]$Message)
    $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Out-File -FilePath $logFile -InputObject $line -Append -Encoding utf8
    Write-Host $line
}

try {
    if (-not (Test-Path $userClaudeDir)) { throw "Source not found: $userClaudeDir" }
    if (-not (Test-Path $destDir))       { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

    # 작업용 임시 폴더
    $tempRoot   = Join-Path $env:TEMP ("claude-backup-{0}" -f ([guid]::NewGuid().ToString('N')))
    $userStage  = Join-Path $tempRoot 'user'
    $projStage  = Join-Path $tempRoot 'projects'
    New-Item -ItemType Directory -Path $userStage -Force | Out-Null
    New-Item -ItemType Directory -Path $projStage -Force | Out-Null

    # 1) 전역 .claude 복사 (credentials 제외)
    Copy-Item -Path $userClaudeDir -Destination $userStage -Recurse -Force `
              -Exclude $globalExclude -ErrorAction SilentlyContinue

    # 2) 전역 .claude.json 복사
    if (Test-Path -LiteralPath $userClaudeJson) {
        Copy-Item -LiteralPath $userClaudeJson -Destination $userStage -Force
    }

    # 3) 워크스페이스 내 각 프로젝트에서 Claude 관련 파일 수집
    $projectsCopied = @()
    if (Test-Path -LiteralPath $workspaceRoot) {
        $candidates = Get-ChildItem -LiteralPath $workspaceRoot -Directory -ErrorAction SilentlyContinue
        foreach ($proj in $candidates) {
            $matched = @()
            foreach ($item in $projectItems) {
                $src = Join-Path $proj.FullName $item
                if (Test-Path -LiteralPath $src) { $matched += $src }
            }
            if ($matched.Count -gt 0) {
                $projDest = Join-Path $projStage $proj.Name
                New-Item -ItemType Directory -Path $projDest -Force | Out-Null
                foreach ($src in $matched) {
                    Copy-Item -LiteralPath $src -Destination $projDest -Recurse -Force `
                              -Exclude $globalExclude -ErrorAction SilentlyContinue
                }
                $projectsCopied += $proj.Name
            }
        }
    }

    # 빈 projects/ 폴더는 제거 (해당 프로젝트가 하나도 없을 때)
    if ($projectsCopied.Count -eq 0) {
        Remove-Item $projStage -Force -ErrorAction SilentlyContinue
    }

    # 4) 시스템 자원: Scripts 폴더 + 작업 스케줄러 XML
    $sysStage      = Join-Path $tempRoot 'system'
    $sysScripts    = Join-Path $sysStage 'Scripts'
    $sysSchedTasks = Join-Path $sysStage 'scheduled-tasks'
    $sysCopied     = @()

    if (Test-Path -LiteralPath $scriptsDir) {
        New-Item -ItemType Directory -Path $sysScripts -Force | Out-Null
        Copy-Item -Path (Join-Path $scriptsDir '*') -Destination $sysScripts -Recurse -Force -ErrorAction SilentlyContinue
        $sysCopied += 'Scripts'
    }

    foreach ($taskName in $schedTaskNames) {
        $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($task) {
            if (-not (Test-Path $sysSchedTasks)) { New-Item -ItemType Directory -Path $sysSchedTasks -Force | Out-Null }
            $xml = Export-ScheduledTask -TaskName $taskName
            $xmlPath = Join-Path $sysSchedTasks ("{0}.xml" -f $taskName)
            $utf8Bom = New-Object System.Text.UTF8Encoding($true)
            [System.IO.File]::WriteAllText($xmlPath, $xml, $utf8Bom)
            $sysCopied += "task:$taskName"
        }
    }

    # 4-1) MCP scheduled-tasks 등록 상태 JSON 수집
    #      위치: %APPDATA%\Claude\claude-code-sessions\<sessionId>\<workspaceId>\scheduled-tasks.json
    #      이 파일이 사라지면 ~/.claude/scheduled-tasks/<id>/SKILL.md만 남고 cron 등록이 전부 풀림.
    #      주의: 이 파일은 상시 존재하지 않는다. 2026-07-28 로그 확인 결과 13시 예약 실행분은
    #      4회 연속(06-26, 07-03, 07-10, 07-24) 파일을 못 찾았고, 앱이 떠 있을 때의 수동 실행분
    #      (06-19, 06-30, 07-02, 07-07)에서만 찾았다. 그래서 찾았을 때 미러에 남겨두고,
    #      못 찾으면 미러본을 대신 zip에 넣어 스냅샷 없는 zip이 나가지 않게 한다.
    $mcpSchedRoot  = Join-Path $env:APPDATA 'Claude\claude-code-sessions'
    $mcpMirrorRoot = Join-Path $defaultDestDir '_mcp-sched-mirror'
    $mcpStageRoot  = Join-Path $sysStage 'mcp-scheduled-tasks'
    $mcpSchedCount = 0
    $mcpFromMirror = 0

    if (Test-Path -LiteralPath $mcpSchedRoot) {
        $mcpSchedFiles = Get-ChildItem -LiteralPath $mcpSchedRoot -Recurse -Filter 'scheduled-tasks.json' -ErrorAction SilentlyContinue
        foreach ($f in $mcpSchedFiles) {
            # session/workspace 폴더 구조 유지 (복원 시 매핑 추적용)
            $relPath = $f.FullName.Substring($mcpSchedRoot.Length).TrimStart('\')
            foreach ($base in @($mcpStageRoot, $mcpMirrorRoot)) {
                $destPath = Join-Path $base $relPath
                $destDir2 = Split-Path $destPath -Parent
                if (-not (Test-Path $destDir2)) { New-Item -ItemType Directory -Path $destDir2 -Force | Out-Null }
                Copy-Item -LiteralPath $f.FullName -Destination $destPath -Force
            }
            $mcpSchedCount++
        }
    }

    # 원본을 하나도 못 찾았으면 이전에 보존해 둔 미러본으로 대체
    if ($mcpSchedCount -eq 0 -and (Test-Path -LiteralPath $mcpMirrorRoot)) {
        $mcpMirrored = Get-ChildItem -LiteralPath $mcpMirrorRoot -Recurse -Filter 'scheduled-tasks.json' -ErrorAction SilentlyContinue
        foreach ($f in $mcpMirrored) {
            $relPath = $f.FullName.Substring($mcpMirrorRoot.Length).TrimStart('\')
            $destPath = Join-Path $mcpStageRoot $relPath
            $destDir2 = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir2)) { New-Item -ItemType Directory -Path $destDir2 -Force | Out-Null }
            Copy-Item -LiteralPath $f.FullName -Destination $destPath -Force
            $mcpFromMirror++
        }
    }

    # 결과를 항상 로그에 남긴다 (예전에는 0건일 때 아무 흔적도 안 남아 조용히 누락됐다)
    if ($mcpSchedCount -gt 0) {
        $sysCopied += ("mcp-sched-json:{0}" -f $mcpSchedCount)
    } elseif ($mcpFromMirror -gt 0) {
        $sysCopied += ("mcp-sched-json:mirror:{0}" -f $mcpFromMirror)
    } else {
        $sysCopied += 'mcp-sched-json:NONE'
    }

    # 4-2) 앱 세션 레지스트리(local_*.json) 수집
    #      MSIX(스토어) 설치본은 %APPDATA%\Claude 가 LocalCache 로 가상화돼 있고, LocalCache 는
    #      패키지 업데이트 때 초기화된다. 2026-08-26 실측: 1.34493.1 → 1.37937.0 업데이트 후
    #      Roaming\Claude 하위가 전부 재생성되며 사이드바 세션 목록이 사라졌다.
    #      대화 본문(jsonl)은 ~/.claude 에 남지만 제목·즐겨찾기·cliSessionId 매핑은 이 파일에만 있다.
    $appSessRoots = @()
    $msixPackages = Join-Path $env:LOCALAPPDATA 'Packages'
    if (Test-Path -LiteralPath $msixPackages) {
        $appSessRoots += Get-ChildItem -LiteralPath $msixPackages -Directory -Filter 'Claude_*' -ErrorAction SilentlyContinue |
                         ForEach-Object { Join-Path $_.FullName 'LocalCache\Roaming\Claude\claude-code-sessions' }
    }
    $appSessRoots += $mcpSchedRoot   # 비-MSIX 설치본
    $appSessMirror = Join-Path $defaultDestDir '_app-sessions-mirror'
    $appSessStage  = Join-Path $sysStage 'app-sessions'
    $appSessCount  = 0

    foreach ($root in ($appSessRoots | Sort-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        $appSessFiles = Get-ChildItem -LiteralPath $root -Recurse -Filter 'local_*.json' -ErrorAction SilentlyContinue
        foreach ($f in $appSessFiles) {
            $relPath = $f.FullName.Substring($root.Length).TrimStart('\')
            foreach ($base in @($appSessStage, $appSessMirror)) {
                $destPath = Join-Path $base $relPath
                $destDir2 = Split-Path $destPath -Parent
                if (-not (Test-Path $destDir2)) { New-Item -ItemType Directory -Path $destDir2 -Force | Out-Null }
                Copy-Item -LiteralPath $f.FullName -Destination $destPath -Force
            }
            $appSessCount++
        }
    }

    # 미러는 리셋을 넘겨 누적된다(초기화되면 appSessionId 폴더가 새로 생기므로 옛 폴더가 남는다).
    if (Test-Path -LiteralPath $appSessMirror) {
        $appSessMirrored = Get-ChildItem -LiteralPath $appSessMirror -Recurse -Filter 'local_*.json' -ErrorAction SilentlyContinue
        foreach ($f in $appSessMirrored) {
            $relPath = $f.FullName.Substring($appSessMirror.Length).TrimStart('\')
            $destPath = Join-Path $appSessStage $relPath
            if (Test-Path -LiteralPath $destPath) { continue }
            $destDir2 = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir2)) { New-Item -ItemType Directory -Path $destDir2 -Force | Out-Null }
            Copy-Item -LiteralPath $f.FullName -Destination $destPath -Force
        }
    }

    $sysCopied += ("app-sessions:{0}" -f $appSessCount)

    if ($sysCopied.Count -eq 0) {
        Remove-Item $sysStage -Force -ErrorAction SilentlyContinue
    }

    # 5) 압축
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path (Join-Path $tempRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal

    Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue

    $sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    $projStr = if ($projectsCopied.Count -gt 0) { ($projectsCopied -join ', ') } else { '(none)' }
    $sysStr  = if ($sysCopied.Count -gt 0) { ($sysCopied -join ', ') } else { '(none)' }
    Write-Log ("SUCCESS  {0}  ({1} MB)  projects: {2}  system: {3}" -f (Split-Path $zipPath -Leaf), $sizeMB, $projStr, $sysStr)

    # 6) 보관 정책: 최근 N개만 유지
    $old = Get-ChildItem -Path $destDir -Filter 'claude-backup-*.zip' |
           Sort-Object LastWriteTime -Descending |
           Select-Object -Skip $retention
    foreach ($f in $old) {
        Remove-Item $f.FullName -Force
        Write-Log ("PRUNED   {0}" -f $f.Name)
    }

    # 7) ~/.claude/tasks 잔존물 정리 (30일 이상된 세션 작업 폴더)
    $tasksRoot = Join-Path $userClaudeDir 'tasks'
    if (Test-Path -LiteralPath $tasksRoot) {
        $taskCutoff = (Get-Date).AddDays(-30)
        $staleTasks = Get-ChildItem -LiteralPath $tasksRoot -Directory -ErrorAction SilentlyContinue |
                      Where-Object { $_.LastWriteTime -lt $taskCutoff }
        foreach ($t in $staleTasks) {
            Remove-Item -LiteralPath $t.FullName -Recurse -Force -ErrorAction SilentlyContinue
            Write-Log ("CLEANED  tasks/{0}" -f $t.Name)
        }
    }
}
catch {
    Write-Log ("ERROR    {0}" -f $_.Exception.Message)
    exit 1
}
