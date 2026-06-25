# PreToolUse(Bash|PowerShell) 훅 — 비가역·위험 명령 차단
# 등록: settings.json > hooks > PreToolUse, matcher "Bash|PowerShell"
# 동작: 위험 패턴 매칭 시 exit 2 (실행 차단) + stderr에 사유 출력. 통과는 exit 0.
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

if ($payload.tool_name -ne 'Bash' -and $payload.tool_name -ne 'PowerShell') { exit 0 }
$cmd = [string]$payload.tool_input.command
if (-not $cmd) { exit 0 }

$normalized = $cmd -replace '\s+', ' '

$rules = @(
    @{ Pattern = '(^|[\s;&|])rm\s+-[a-zA-Z]*r[a-zA-Z]*f';            Reason = 'rm -rf 차단: 재귀·강제 삭제는 사용자 확인 필요' },
    @{ Pattern = '(^|[\s;&|])Remove-Item\b.*-Recurse.*-Force';       Reason = 'Remove-Item -Recurse -Force 차단: 사용자 확인 필요' },
    @{ Pattern = '(^|[\s;&|])git\s+push\b.*(-f\b|--force\b)';        Reason = 'git push --force 차단: 원격 히스토리 덮어쓰기는 사용자 확인 필요' },
    @{ Pattern = '(^|[\s;&|])git\s+reset\b.*--hard\b';               Reason = 'git reset --hard 차단: 작업물 손실 가능, 사용자 확인 필요' },
    @{ Pattern = '(^|[\s;&|])git\s+clean\b.*-[a-zA-Z]*f';            Reason = 'git clean -f 차단: 추적되지 않은 파일 손실 가능' },
    @{ Pattern = '(^|[\s;&|])git\s+branch\b.*-D\b';                  Reason = 'git branch -D 차단: 머지 안 된 브랜치 강제 삭제는 확인 필요' },
    @{ Pattern = '(^|[\s;&|])(npm|yarn|pnpm)\s+uninstall\b';         Reason = 'npm/yarn/pnpm uninstall 차단: 의존성 제거는 사용자 확인 필요' },
    @{ Pattern = '(^|[\s;&|])pip\s+uninstall\b';                     Reason = 'pip uninstall 차단: 의존성 제거는 사용자 확인 필요' },
    @{ Pattern = '(^|[\s;&|])shutdown\b';                            Reason = 'shutdown 차단: 시스템 종료 명령은 사용자가 직접 실행' },
    @{ Pattern = '(^|[\s;&|])(Stop-Computer|Restart-Computer)\b';    Reason = '시스템 종료/재시작 차단: 사용자가 직접 실행' }
)

foreach ($rule in $rules) {
    if ($normalized -match $rule.Pattern) {
        [Console]::Error.WriteLine("[guard-dangerous-bash] $($rule.Reason)")
        [Console]::Error.WriteLine("[guard-dangerous-bash] 차단된 명령: $cmd")
        [Console]::Error.WriteLine("[guard-dangerous-bash] 사용자에게 확인을 받고 직접 실행하세요.")
        exit 2
    }
}

exit 0
