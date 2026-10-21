#requires -Version 5.1
<##
.SYNOPSIS
    Replace local demo business data with a small, realistic response scenario.

.DESCRIPTION
    This command is intentionally explicit because it removes existing disasters,
    reports and missions from the local demo database. Identity accounts are kept.
    It creates a data-only backup in the system temporary directory before writing.

.EXAMPLE
    .\scripts\refresh-demo-data.ps1 -Force
#>
[CmdletBinding()]
param([switch]$Force)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$environmentPath = Join-Path $repositoryRoot '.env'
$templatePath = Join-Path $PSScriptRoot 'refresh-demo-data.sql'
if (-not (Test-Path -LiteralPath $environmentPath)) {
    throw 'Missing .env. Run scripts/local.ps1 -Action setup first.'
}
if (-not (Test-Path -LiteralPath $templatePath)) {
    throw 'Missing scripts/refresh-demo-data.sql.'
}

$values = @{}
Get-Content -LiteralPath $environmentPath | ForEach-Object {
    if ($_ -match '^([A-Z][A-Z0-9_]*)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
}
foreach ($key in @('POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD',
        'DEMO_CITIZEN_ONE_EMAIL', 'DEMO_CITIZEN_TWO_EMAIL', 'DEMO_AUTHORITY_EMAIL')) {
    if (-not $values[$key]) { throw "Missing $key in .env." }
}
if (-not $Force) {
    throw 'This replaces local demo disasters, reports and missions. Re-run with -Force when that is intended.'
}

function Sql-Literal([string]$value) {
    return "'" + $value.Replace("'", "''") + "'"
}

$container = (& docker compose --env-file $environmentPath ps -q database).Trim()
if (-not $container) { throw 'The database container is not running.' }

$backupPath = Join-Path ([IO.Path]::GetTempPath()) ("gdrn-demo-data-{0}.sql" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
& docker exec -e "PGPASSWORD=$($values.POSTGRES_PASSWORD)" $container pg_dump `
    --data-only --column-inserts `
    -U $values.POSTGRES_USER -d $values.POSTGRES_DB `
    -t rescue_teams -t disasters -t reporting_reports -t rescue_missions `
    > $backupPath
if ($LASTEXITCODE -ne 0) { throw "Could not create database backup at $backupPath." }

$sql = [IO.File]::ReadAllText($templatePath, [Text.UTF8Encoding]::new($false))
$sql = $sql.Replace('__CITIZEN_ONE__', (Sql-Literal $values['DEMO_CITIZEN_ONE_EMAIL']))
$sql = $sql.Replace('__CITIZEN_TWO__', (Sql-Literal $values['DEMO_CITIZEN_TWO_EMAIL']))
$sql = $sql.Replace('__AUTHORITY__', (Sql-Literal $values['DEMO_AUTHORITY_EMAIL']))

$sqlPath = Join-Path ([IO.Path]::GetTempPath()) ("gdrn-refresh-demo-{0}.sql" -f [guid]::NewGuid())
[IO.File]::WriteAllText($sqlPath, $sql, [Text.UTF8Encoding]::new($false))
$containerSqlPath = $container + ':/tmp/gdrn-refresh-demo.sql'
try {
    & docker cp $sqlPath $containerSqlPath
    if ($LASTEXITCODE -ne 0) { throw 'Could not copy the UTF-8 demo SQL into the database container.' }
    & docker exec -e "PGPASSWORD=$($values.POSTGRES_PASSWORD)" $container psql `
        -v ON_ERROR_STOP=1 -U $values.POSTGRES_USER -d $values.POSTGRES_DB -f /tmp/gdrn-refresh-demo.sql
    if ($LASTEXITCODE -ne 0) { throw 'Demo data refresh failed. The transaction was rolled back.' }
} finally {
    & docker exec $container rm -f /tmp/gdrn-refresh-demo.sql 2>$null
    Remove-Item -LiteralPath $sqlPath -Force -ErrorAction SilentlyContinue
}

Write-Output "Demo data refreshed. Backup: $backupPath"
