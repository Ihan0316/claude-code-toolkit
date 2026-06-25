# PostToolUse(Write|Edit) 훅 — 저장된 .ps1에 UTF-8 BOM 자동 부여
# 한국어 Windows(PowerShell 5.1)는 BOM 없는 UTF-8을 CP949로 오해석 → 한글 깨짐.
# 등록: settings.json > hooks > PostToolUse, matcher "Write|Edit"
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

try {
    $raw = [Console]::In.ReadToEnd()
    if (-not $raw) { exit 0 }
    $payload = $raw | ConvertFrom-Json -ErrorAction Stop
} catch {
    exit 0
}

$toolName = $payload.tool_name
if ($toolName -ne 'Write' -and $toolName -ne 'Edit') { exit 0 }

$filePath = $payload.tool_input.file_path
if (-not $filePath) { exit 0 }

# .ps1 만 대상 (부작용 최소화)
if ($filePath -notmatch '\.ps1$') { exit 0 }
if (-not (Test-Path -LiteralPath $filePath)) { exit 0 }

try {
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
} catch {
    exit 0
}

# 이미 BOM 있으면 멱등 통과
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    exit 0
}

try {
    $content = [System.IO.File]::ReadAllText($filePath, [System.Text.UTF8Encoding]::new($false))
    $utf8WithBom = [System.Text.UTF8Encoding]::new($true)
    [System.IO.File]::WriteAllText($filePath, $content, $utf8WithBom)
    [Console]::Error.WriteLine("[ensure-utf8-bom] BOM added to $filePath")
} catch {
    [Console]::Error.WriteLine("[ensure-utf8-bom] failed: $_")
}

exit 0
