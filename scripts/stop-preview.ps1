$ErrorActionPreference = 'Stop'
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listener = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) { Write-Output 'Preview is not running.'; exit 0 }
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener[0].OwningProcess)"
if (-not $process.CommandLine.Contains($projectPath) -or -not $process.CommandLine.Contains('next')) {
    throw 'Port 3100 does not belong to this project. No process was stopped.'
}
Stop-Process -Id $process.ProcessId
$pidFile = Join-Path $projectPath '.local-preview\process.pid'
if (Test-Path -LiteralPath $pidFile) {
    $launcherId = [int](Get-Content -LiteralPath $pidFile)
    $launcher = Get-CimInstance Win32_Process -Filter "ProcessId=$launcherId" -ErrorAction SilentlyContinue
    if ($launcher -and $launcher.CommandLine.Contains($projectPath) -and $launcher.CommandLine.Contains('next')) {Stop-Process -Id $launcherId -ErrorAction SilentlyContinue}
    Remove-Item -LiteralPath $pidFile
}
Write-Output 'Local preview stopped.'
