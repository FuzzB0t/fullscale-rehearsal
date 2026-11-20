# Start the local rehearsal site from cold: Docker Desktop, then DDEV, then a health check.
#
#   ./scripts/start-site.ps1
#
# Safe to run when everything is already up. Use it after a restart, or when an MCP sign-in says
# "ECONNREFUSED" (that means the site is not running).
#
# Why a script: Docker Desktop does not start by itself after a restart, and `ddev start` refuses to run
# from a path with a lowercase drive letter ("project root is already set to D:\code\craft-demo"),
# so the script always moves to the uppercase path first.
# DDEV writes progress lines to stderr, which PowerShell 5.1 would treat as errors under 'Stop', so errors are
# checked through exit codes below instead.
$ErrorActionPreference = 'Continue'
$docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$ddevDir = Join-Path $env:LOCALAPPDATA 'Programs\DDEV'
if (Test-Path $ddevDir) { $env:Path = "$ddevDir;$env:Path" }

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
    if (-not $ready) { throw 'Docker did not become ready within about 4 minutes. Open Docker Desktop and check it.' }
    Write-Output 'Docker is ready.'
} else {
    Write-Output 'Docker is already running.'
}

# Uppercase drive letter, whatever the caller's casing.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$root = $root.Substring(0, 1).ToUpper() + $root.Substring(1)
Set-Location $root
ddev start 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) { throw "ddev start failed (exit code $LASTEXITCODE). Run it by hand from $root to see why." }

# Health check: the home page and the MCP endpoint (which must answer 401 without a token).
$site = 'https://fullscale-rehearsal.ddev.site'
foreach ($check in @(@{ Name = 'site'; Url = "$site/guides-for-teams"; Expect = 200; Method = 'GET' },
                     @{ Name = 'MCP endpoint (401 without a token is correct)'; Url = "$site/admin/mcp/auth"; Expect = 401; Method = 'POST' })) {
    # PHP needs a few seconds after DDEV (re)starts the web container, and answers 502 until then. Wait up to a minute.
    for ($try = 1; $try -le 12; $try++) {
        $code = (curl.exe --ssl-no-revoke -s -o NUL -w '%{http_code}' -X $check.Method $check.Url)
        if ([int]$code -eq $check.Expect) { break }
        Start-Sleep -Seconds 5
    }
    $ok = if ([int]$code -eq $check.Expect) { 'ok' } else { "UNEXPECTED (wanted $($check.Expect))" }
    Write-Output ("{0,-48} {1}  {2}" -f $check.Name, $code, $ok)
}
