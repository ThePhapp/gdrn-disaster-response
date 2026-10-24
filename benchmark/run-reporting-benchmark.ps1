#requires -Version 5.1
<##
.SYNOPSIS
    Run one or more reproducible D3 reporting benchmark repetitions.

.DESCRIPTION
    The runner keeps every repetition in its own result directory and records
    the commit/configuration without writing credentials to disk. Dataset reset
    and seed are opt-in because reset is destructive and must target a separate
    benchmark database.
#>
[CmdletBinding()]
param(
    [ValidateSet('write', 'read-page', 'read-radius', 'mixed')]
    [string]$Workload = 'read-page',
    [int]$Vus = 10,
    [string]$Duration = '30s',
    [string]$Warmup = '10s',
    [string]$RampDown = '10s',
    [int]$Repetitions = 1,
    [int]$DatasetSize = 1000,
    [int]$Seed = 20261024,
    [int]$SeedConcurrency = 8,
    [string]$BaseUrl = $env:BASE_URL,
    [string]$Email = $env:BENCHMARK_EMAIL,
    [string]$Password = $env:BENCHMARK_PASSWORD,
    [ValidateSet('native', 'docker')]
    [string]$K6Mode = 'native',
    [string]$K6Executable = 'k6',
    [string]$ComposeFile,
    [string]$BenchmarkEnvFile,
    [string]$ProjectName = 'gdrn-benchmark',
    [switch]$Reset,
    [switch]$SeedData,
    [switch]$CollectDockerStats,
    [string[]]$Container = @('backend', 'database')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repositoryRoot 'benchmark/k6/reporting.js'
$resultsRoot = Join-Path $repositoryRoot 'benchmark/results'
$python = if (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { 'py' }

function Convert-DurationToSeconds([string]$value) {
    if ($value -notmatch '^(\d+(?:\.\d+)?)(ms|s|m|h)$') { throw "Unsupported duration '$value'." }
    $amount = [double]$Matches[1]
    switch ($Matches[2]) {
        'ms' { return $amount / 1000 }
        's' { return $amount }
        'm' { return $amount * 60 }
        'h' { return $amount * 3600 }
    }
}

function Require-Value([string]$name, [string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { throw "$name is required through a parameter or environment variable." }
}

Require-Value 'BASE_URL' $BaseUrl
Require-Value 'BENCHMARK_EMAIL' $Email
Require-Value 'BENCHMARK_PASSWORD' $Password
if ($Repetitions -lt 1 -or $Vus -lt 1 -or $DatasetSize -lt 1) { throw 'Repetitions, Vus and DatasetSize must be positive.' }
if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Workload script not found: $scriptPath" }
if ($Reset -and (-not $ComposeFile -or -not $BenchmarkEnvFile)) {
    throw '-Reset requires both -ComposeFile and -BenchmarkEnvFile for the disposable benchmark stack.'
}
if ($SeedData -and -not (Get-Command $python -ErrorAction SilentlyContinue)) {
    throw 'Python is required for -SeedData.'
}
if ($K6Mode -eq 'docker' -and -not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker is required for -K6Mode docker.'
}

$durationSeconds = [math]::Ceiling((Convert-DurationToSeconds $Duration) + (Convert-DurationToSeconds $Warmup) + (Convert-DurationToSeconds $RampDown) + 5)
$runStarted = Get-Date
$commit = (& git -C $repositoryRoot rev-parse HEAD).Trim()
$oldEnvironment = @{}
$environmentNames = @('BASE_URL', 'BENCHMARK_EMAIL', 'BENCHMARK_PASSWORD', 'WORKLOAD', 'VUS', 'DURATION', 'WARMUP', 'RAMP_DOWN', 'DATA_SEED', 'DATASET_SIZE')
foreach ($name in $environmentNames) { $oldEnvironment[$name] = [Environment]::GetEnvironmentVariable($name) }

try {
    $env:BASE_URL = $BaseUrl.TrimEnd('/')
    $env:BENCHMARK_EMAIL = $Email
    $env:BENCHMARK_PASSWORD = $Password
    $env:WORKLOAD = $Workload
    $env:VUS = "$Vus"
    $env:DURATION = $Duration
    $env:WARMUP = $Warmup
    $env:RAMP_DOWN = $RampDown
    $env:DATASET_SIZE = "$DatasetSize"

    for ($repetition = 1; $repetition -le $Repetitions; $repetition++) {
        $runId = '{0:yyyyMMdd-HHmmss}-{1:D2}' -f (Get-Date), $repetition
        $runDirectory = Join-Path $resultsRoot $runId
        New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
        $seedPath = Join-Path $runDirectory 'seed.json'
        $rawPath = Join-Path $runDirectory 'raw.json'
        $summaryPath = Join-Path $runDirectory 'summary.json'
        $statsPath = Join-Path $runDirectory 'docker-stats.csv'
        $runManifestPath = Join-Path $runDirectory 'run.json'
        $manifest = [ordered]@{
            kind = 'gdrn-reporting-benchmark-run'
            runId = $runId
            commit = $commit
            workload = $Workload
            vus = $Vus
            warmup = $Warmup
            duration = $Duration
            rampDown = $RampDown
            datasetSize = $DatasetSize
            dataSeed = $Seed
            repetition = $repetition
            baseUrl = $BaseUrl.TrimEnd('/')
            startedAt = (Get-Date).ToUniversalTime().ToString('o')
            k6Mode = $K6Mode
            rawResult = $rawPath
            summaryResult = $summaryPath
            resourceResult = if ($CollectDockerStats) { $statsPath } else { $null }
        }

        if ($Reset) {
            & (Join-Path $repositoryRoot 'benchmark/reset-reporting.ps1') `
                -ComposeFile $ComposeFile -EnvFile $BenchmarkEnvFile -ProjectName $ProjectName -ConfirmReset
        }
        if ($SeedData) {
            & $python (Join-Path $repositoryRoot 'benchmark/generate_reports.py') `
                --count $DatasetSize --seed $Seed --output $seedPath --concurrency $SeedConcurrency
            if ($LASTEXITCODE -ne 0) { throw "Seed failed for repetition $repetition." }
        }

        $collector = $null
        if ($CollectDockerStats) {
            $collectorArgs = @((Join-Path $repositoryRoot 'benchmark/collect-docker-stats.py'), '--duration-seconds', "$durationSeconds", '--output', $statsPath)
            foreach ($name in $Container) { $collectorArgs += @('--container', $name) }
            $collector = Start-Process -FilePath $python -ArgumentList $collectorArgs -PassThru -WindowStyle Hidden
        }

        if ($K6Mode -eq 'native') {
            & $K6Executable run --out "json=$rawPath" --summary-export $summaryPath $scriptPath
        } else {
            $dockerBaseUrl = $BaseUrl -replace '^(http://)(localhost|127\.0\.0\.1)(:)', '$1host.docker.internal$3'
            $relativeRaw = 'benchmark/results/' + $runId + '/raw.json'
            $relativeSummary = 'benchmark/results/' + $runId + '/summary.json'
            & docker run --rm --add-host host.docker.internal:host-gateway `
                -e "BASE_URL=$dockerBaseUrl" -e BENCHMARK_EMAIL -e BENCHMARK_PASSWORD `
                -e WORKLOAD -e VUS -e DURATION -e WARMUP -e RAMP_DOWN -e DATA_SEED `
                -v "${repositoryRoot}:/work" -w /work grafana/k6:latest run `
                --out "json=/work/$relativeRaw" --summary-export "/work/$relativeSummary" /work/benchmark/k6/reporting.js
        }
        $k6ExitCode = $LASTEXITCODE
        if ($collector) { Wait-Process -Id $collector.Id -ErrorAction SilentlyContinue }
        $manifest.finishedAt = (Get-Date).ToUniversalTime().ToString('o')
        $manifest.exitCode = $k6ExitCode
        $manifest | ConvertTo-Json | Set-Content -LiteralPath $runManifestPath -Encoding UTF8
        if ($k6ExitCode -ne 0) { throw "k6 failed for repetition $repetition. See $runDirectory." }
        Write-Output "Completed $Workload repetition $repetition/${Repetitions}: $runDirectory"
    }
} finally {
    foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $oldEnvironment[$name]) }
}

Write-Output "Benchmark completed. Results are under $resultsRoot and are ignored by Git; attach them to the D3 handoff when reporting measurements."
