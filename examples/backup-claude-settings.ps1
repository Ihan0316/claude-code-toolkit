# Claude Code 설정 주간 백업 스크립트 (예시)
#
# 백업 범위:
#   1. 전역 설정 → zip 내부 user\ 아래
#      - %USERPROFILE%\.claude\          (단, .credentials.json 제외 = 토큰 유출 방지)
#      - %USERPROFILE%\.claude.json
#   2. 프로젝트별 설정 → zip 내부 projects\<프로젝트명>\ 아래
#      - <WORKSPACE> 하위 각 프로젝트의 .claude\, .specify\, CLAUDE.md
#   3. 시스템 자원 → zip 내부 system\ 아래
#      - 훅 스크립트 폴더(Scripts), 작업 스케줄러 XML, MCP scheduled-tasks.json
#
# 저장: %USERPROFILE%\<BACKUP_DIR>\claude-backup-YYYY-MM-DD.zip
# 보관: 최근 8개 zip만 유지 (롤링)
#
# 사용 전 아래 <...> 4곳을 본인 환경에 맞게 수정하세요.

$ErrorActionPreference = 'Stop'

$userClaudeDir   = Join-Path $env:USERPROFILE '.claude'
$userClaudeJson  = Join-Path $env:USERPROFILE '.claude.json'
$workspaceRoot   = Join-Path $env:USERPROFILE 'Documents\<WORKSPACE>'   # ← 본인 워크스페이스
$scriptsDir      = Join-Path $env:USERPROFILE 'Scripts'                 # ← 훅 스크립트 폴더
$destDir         = Join-Path $env:USERPROFILE 'Documents\<BACKUP_DIR>'  # ← 백업 저장 폴더
$logFile         = Join-Path $destDir '_backup.log'
$retention       = 8
$stamp           = Get-Date -Format 'yyyy-MM-dd'
$zipPath         = Join-Path $destDir ("claude-backup-{0}.zip" -f $stamp)
$globalExclude   = @('.credentials.json')                              # ← 비밀은 백업 제외
$projectItems    = @('.claude', '.specify', 'CLAUDE.md')
$schedTaskNames  = @('<BACKUP_TASK_NAME>')                             # ← 작업 스케줄러 작업명

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
    #      이 파일이 사라지면 ~/.claude/scheduled-tasks/<id>/SKILL.md만 남고 cron 등록이 전부 풀린다.
    $mcpSchedRoot = Join-Path $env:APPDATA 'Claude\claude-code-sessions'
    if (Test-Path -LiteralPath $mcpSchedRoot) {
        $mcpSchedFiles = Get-ChildItem -LiteralPath $mcpSchedRoot -Recurse -Filter 'scheduled-tasks.json' -ErrorAction SilentlyContinue
        $mcpSchedCount = 0
        foreach ($f in $mcpSchedFiles) {
            $relPath  = $f.FullName.Substring($mcpSchedRoot.Length).TrimStart('\')
            $destPath = Join-Path (Join-Path $sysStage 'mcp-scheduled-tasks') $relPath
            $destDir2 = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir2)) { New-Item -ItemType Directory -Path $destDir2 -Force | Out-Null }
            Copy-Item -LiteralPath $f.FullName -Destination $destPath -Force
            $mcpSchedCount++
        }
        if ($mcpSchedCount -gt 0) { $sysCopied += ("mcp-sched-json:{0}" -f $mcpSchedCount) }
    }
    if ($sysCopied.Count -eq 0) {
        Remove-Item $sysStage -Force -ErrorAction SilentlyContinue
    }

    # 5) 압축
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path (Join-Path $tempRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
    Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue

    $sizeMB  = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
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
}
catch {
    Write-Log ("ERROR    {0}" -f $_.Exception.Message)
    exit 1
}
