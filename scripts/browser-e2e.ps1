#requires -Version 5.1
<#
.SYNOPSIS
    Run the real browser regression suite against an already-running stack.
.DESCRIPTION
    Loads the ignored root .env into this process, then runs Playwright from
    frontend. The suite uses the published frontend and backend ports, so it
    exercises Nginx, the real API and the Compose database.
.EXAMPLE
    .\scripts\browser-e2e.ps1
.EXAMPLE
    .\scripts\browser-e2e.ps1 -BaseUrl http://127.0.0.1:5174 -ApiUrl http://127.0.0.1:18080
#>
[CmdletBinding()]
param(
    [string] $BaseUrl,
    [string] $ApiUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $repositoryRoot '.env'

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw 'Missing .env. Run scripts/dev.ps1 init or provide the CI runtime environment first.'
}

Get-Content -LiteralPath $environmentFile | ForEach-Object {
    if ($_ -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
        Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2]
    }
}

if (-not $BaseUrl) {
    $frontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { '5173' }
    $BaseUrl = "http://127.0.0.1:$frontendPort"
}
if (-not $ApiUrl) {
    $appPort = if ($env:APP_PORT) { $env:APP_PORT } else { '8080' }
    $ApiUrl = "http://127.0.0.1:$appPort"
}

$env:E2E_BASE_URL = $BaseUrl.TrimEnd('/')
$env:E2E_API_URL = $ApiUrl.TrimEnd('/')
$frontendRoot = Join-Path $repositoryRoot 'frontend'
$npmCommand = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { 'npm.cmd' } else { 'npm' }

Push-Location -LiteralPath $frontendRoot
try {
    if ($env:CI) {
        & $npmCommand run test:login
    } else {
        & $npmCommand run test:login -- --reporter=list
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Browser regression failed (exit $LASTEXITCODE)."
    }
} finally {
    Pop-Location
}
