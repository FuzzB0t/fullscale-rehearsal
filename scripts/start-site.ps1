# Start the local rehearsal site from cold: Docker Desktop, then DDEV, then a health check that repairs a
# half-started site.
#
#   ./scripts/start-site.ps1
#
# Safe to run when everything is already up. Use it after a restart, or when an MCP sign-in says
# "ECONNREFUSED" (the site is not running) or "Bad Gateway" (the site started but PHP is not running).
# It ends with READY or NOT READY. Anything other than READY needs the printed details to diagnose.
#
# Why a script: Docker Desktop does not start by itself after a restart, and `ddev start` refuses to run
# from a path with a lowercase drive letter ("project root is already set to D:\code\craft-demo"),
# so the script always moves to the uppercase path first.
# DDEV writes progress lines to stderr, which PowerShell 5.1 would treat as errors under 'Stop', so errors are
# checked through exit codes instead.
$ErrorActionPreference = 'Continue'
$docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$ddevDir = Join-Path $env:LOCALAPPDATA 'Programs\DDEV'
if (Test-Path $ddevDir) { $env:Path = "$ddevDir;$env:Path" }
$site = 'https://fullscale-rehearsal.ddev.site'
$webContainer = 'ddev-fullscale-rehearsal-web'

function Fail($message) {
    Write-Output ''
    Write-Output "NOT READY: $message"
    exit 1
}

# 1. Docker Desktop
& $docker ps *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Output 'Starting Docker Desktop...'
    Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    $ready = $false
    for ($i = 1; $i -le 60; $i++) {
        Start-Sleep -Seconds 4
        & $docker ps *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    }
    if (-not $ready) { Fail 'Docker did not become ready within about 4 minutes. Open Docker Desktop and check it.' }
    Write-Output 'Docker is ready.'
} else {
    Write-Output 'Docker is already running.'
}

# 2. DDEV, from the uppercase drive-letter path whatever the caller's casing.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$root = $root.Substring(0, 1).ToUpper() + $root.Substring(1)
Set-Location $root
ddev start 2>&1 | Select-Object -Last 4
if ($LASTEXITCODE -ne 0) { Fail "ddev start failed (exit code $LASTEXITCODE). Run it by hand from $root to see why." }

# 3. Health check: the home page (must be 200) and the MCP endpoint (must answer 401 without a token).
function Test-Site([int]$seconds) {
    $allOk = $true
    $checks = @(
        @{ Name = 'site'; Url = "$site/guides-for-teams"; Expect = 200; Method = 'GET' },
        @{ Name = 'MCP endpoint (401 without a token is correct)'; Url = "$site/admin/mcp/auth"; Expect = 401; Method = 'POST' }
    )
    foreach ($check in $checks) {
        # PHP needs a few seconds after DDEV (re)starts the web container and answers 502 until then.
        $deadline = (Get-Date).AddSeconds($seconds)
        do {
            $code = (curl.exe --ssl-no-revoke -s -o NUL -w '%{http_code}' -X $check.Method $check.Url)
            if ([int]$code -eq $check.Expect) { break }
            Start-Sleep -Seconds 5
        } while ((Get-Date) -lt $deadline)
        $ok = [int]$code -eq $check.Expect
        if (-not $ok) { $allOk = $false }
        # Write-Host, not Write-Output: anything a PowerShell function writes to the output stream becomes part of its
        # return value, and a non-empty list would always read as "true" below.
        Write-Host ("{0,-48} {1}  {2}" -f $check.Name, $code, $(if ($ok) { 'ok' } else { "UNEXPECTED (wanted $($check.Expect))" }))
    }
    return [bool]$allOk
}

$healthy = [bool](Test-Site 45 | Select-Object -Last 1)

# A web container that is up but whose PHP is not running ("Bad Gateway") is what an interrupted or racing start leaves
# behind. `ddev start` does not repair it, but a restart does.
if (-not $healthy) {
    Write-Output ''
    Write-Output 'The site did not come up cleanly. Restarting the DDEV project once to repair a half-started web container...'
    ddev restart 2>&1 | Select-Object -Last 4
    $healthy = [bool](Test-Site 60 | Select-Object -Last 1)
}

if ($healthy) {
    Write-Output ''
    Write-Output "READY: $site"
    exit 0
}

# Still not healthy: print what DDEV and Docker say, so it can be diagnosed from this output alone.
Write-Output ''
Write-Output '--- Web container health (docker):'
& $docker inspect $webContainer --format '{{.State.Status}} / {{.State.Health.Status}}' 2>&1
& $docker inspect $webContainer --format '{{range .State.Health.Log}}{{.Output}}{{end}}' 2>&1 | Select-Object -Last 3
Write-Output '--- ddev describe:'
ddev describe 2>&1 | Select-Object -First 12
Fail 'the site still does not answer correctly after a restart. Send this whole output, not just the last line.'
