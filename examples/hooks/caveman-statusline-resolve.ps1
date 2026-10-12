# caveman statusline 해석기
# 목적: settings.json 이 플러그인 캐시 커밋 해시를 하드코딩하면 플러그인이
#       업데이트될 때 경로가 사라져 statusline 이 조용히 깨진다.
#       여기서 해시 폴더를 동적으로 찾아 실행한다.
# 캐시: 매 렌더마다 재귀 탐색하지 않도록 해석 결과를 파일에 저장하고,
#       경로가 유효하지 않을 때만 다시 탐색한다.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$Root      = Join-Path $ClaudeDir "plugins\cache\caveman\caveman"
$CacheFile = Join-Path $ClaudeDir ".caveman-statusline-path"

function Resolve-StatuslineScript {
    if (-not (Test-Path -LiteralPath $Root)) { return $null }
    $found = Get-ChildItem -Path $Root -Recurse -Filter "caveman-statusline.ps1" -File -ErrorAction SilentlyContinue |
             Sort-Object LastWriteTime -Descending |
             Select-Object -First 1
    if ($null -eq $found) { return $null }
    return $found.FullName
}

# 1) 캐시된 경로가 아직 유효하면 그대로 사용
$Script = $null
if (Test-Path -LiteralPath $CacheFile) {
    try {
        $cached = (Get-Content -LiteralPath $CacheFile -TotalCount 1 -ErrorAction Stop).Trim().TrimStart([char]0xFEFF)
        if ($cached -and (Test-Path -LiteralPath $cached)) { $Script = $cached }
    } catch { }
}

# 2) 없으면 재탐색 후 캐시 갱신
if (-not $Script) {
    $Script = Resolve-StatuslineScript
    if ($Script) {
        try { Set-Content -LiteralPath $CacheFile -Value $Script -Encoding utf8 -ErrorAction Stop } catch { }
    }
}

# 3) 못 찾으면 조용히 종료 (statusline 만 비고, 오류 출력 안 함)
if (-not $Script) { exit 0 }

& $Script
