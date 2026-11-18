<#
.SYNOPSIS
  Switch the local Craft project between the "dev" and "production" environments.

.DESCRIPTION
  Copies .env.<name> over .env, then clears Craft's caches so devMode and
  allowAdminChanges changes take effect immediately.

    dev         CRAFT_ENVIRONMENT=dev,        devMode ON,  allowAdminChanges ON
    production  CRAFT_ENVIRONMENT=production, devMode OFF, allowAdminChanges OFF

  .env.dev and .env.production are git-ignored (they hold the app ID and security
  key). If one is missing, it is built from the tracked .env.example.<name> template
  with the keys taken from the current .env. DB settings are NOT written to these
  files: DDEV supplies CRAFT_DB_* as container environment variables, and
  environment variables take precedence over .env.

.EXAMPLE
  ./scripts/use-env.ps1 production
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('dev', 'production')]
    [string]$Name
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$target = ".env.$Name"

if (-not (Test-Path $target)) {
    $template = ".env.example.$Name"
    if (-not (Test-Path $template)) { throw "Missing template $template" }
    if (-not (Test-Path '.env')) {
        throw "No .env to take CRAFT_APP_ID / CRAFT_SECURITY_KEY from. Copy .env.example.dev to .env, run 'ddev craft setup/keys', then retry."
    }
    $keys = @{}
    Get-Content .env | ForEach-Object {
        if ($_ -match '^(CRAFT_APP_ID|CRAFT_SECURITY_KEY)=(.+)$') { $keys[$Matches[1]] = $Matches[2] }
    }
    if ($keys.Count -ne 2) { throw "The current .env has no CRAFT_APP_ID / CRAFT_SECURITY_KEY. Run 'ddev craft setup/keys' first." }

    $lines = Get-Content $template | Where-Object { $_ -notmatch '^CRAFT_DB_' } | ForEach-Object {
        if ($_ -match '^(CRAFT_APP_ID|CRAFT_SECURITY_KEY)=') { "$($_.Split('=')[0])=$($keys[$_.Split('=')[0]])" } else { $_ }
    }
    [System.IO.File]::WriteAllLines((Join-Path (Get-Location) $target), $lines, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Created $target from $template"
}

Copy-Item $target .env -Force
Write-Host "Switched .env to '$Name'. Effective settings:"
Get-Content .env | Where-Object { $_ -match '^CRAFT_(ENVIRONMENT|DEV_MODE|ALLOW_ADMIN_CHANGES|DISALLOW_ROBOTS)=' } | ForEach-Object { "  $_" }

if (Get-Command ddev -ErrorAction SilentlyContinue) {
    Write-Host "Clearing Craft caches..."
    ddev craft clear-caches/all | Out-Null
} else {
    Write-Warning "ddev not found on PATH; run 'ddev craft clear-caches/all' yourself."
}
