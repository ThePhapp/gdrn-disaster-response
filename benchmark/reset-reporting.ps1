#requires -Version 5.1
<##
.SYNOPSIS
    Reset only reporting rows in a disposable benchmark database.

.DESCRIPTION
    This intentionally uses psql against a database container supplied by the
    caller. It never targets the application's normal database implicitly. The
    caller must explicitly confirm the destructive operation.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ComposeFile,
    [Parameter(Mandatory = $true)][string]$EnvFile,
    [Parameter(Mandatory = $true)][string]$ProjectName,
    [string]$Service = 'database',
    [string]$Database,
    [string]$Username,
    [switch]$ConfirmReset
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $ConfirmReset) {
    throw 'Reset is destructive. Re-run with -ConfirmReset against a disposable benchmark database.'
}
if (-not (Test-Path -LiteralPath $ComposeFile)) { throw "Compose file not found: $ComposeFile" }
if (-not (Test-Path -LiteralPath $EnvFile)) { throw "Environment file not found: $EnvFile" }
if ($ProjectName -notmatch '(?i)(bench|test|ci|kaggle)') {
    throw "Refusing project '$ProjectName'; use a name containing bench, test, ci or kaggle."
}

function Read-Env([string]$path) {
    $values = @{}
    Get-Content -LiteralPath $path | ForEach-Object {
        if ($_ -match '^([A-Z][A-Z0-9_]*)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
    }
    return $values
}

$values = Read-Env $EnvFile
if (-not $Database) { $Database = $values['POSTGRES_DB'] }
if (-not $Username) { $Username = $values['POSTGRES_USER'] }
$password = $values['POSTGRES_PASSWORD']
if (-not $Database -or -not $Username -or -not $password) {
    throw 'POSTGRES_DB, POSTGRES_USER and POSTGRES_PASSWORD are required in the benchmark env file.'
}
if ($Database -notmatch '(?i)(bench|test|ci|kaggle)') {
    throw "Refusing to reset database '$Database'; use a name containing bench, test, ci or kaggle."
}

$container = (& docker compose --project-name $ProjectName --env-file $EnvFile -f $ComposeFile ps -q $Service).Trim()
if ($LASTEXITCODE -ne 0 -or -not $container) { throw "The database service '$Service' is not running." }

$sql = 'TRUNCATE TABLE reporting_reports RESTART IDENTITY CASCADE;'
& docker exec -e "PGPASSWORD=$password" $container psql -v ON_ERROR_STOP=1 -U $Username -d $Database -c $sql
if ($LASTEXITCODE -ne 0) { throw 'Reporting reset failed.' }
Write-Output "Reset reporting_reports in disposable database '$Database'."
