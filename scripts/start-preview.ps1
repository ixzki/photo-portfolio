$ErrorActionPreference = 'Stop'
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $projectPath
$statePath = Join-Path $projectPath '.local-preview'
New-Item -ItemType Directory -Force -Path $statePath | Out-Null
$listener = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $command = (Get-CimInstance Win32_Process -Filter "ProcessId=$($listener[0].OwningProcess)").CommandLine
    if ($command -and $command.Contains($projectPath) -and $command.Contains('next')) {
        Write-Output 'Preview is already running: http://127.0.0.1:3100'
        exit 0
    }
    throw 'Port 3100 is occupied by another process. No process was changed.'
}
$nodePath = (Get-Command node).Source
$nextPath = Join-Path $projectPath 'node_modules\next\dist\bin\next'
$arguments = '"' + $nextPath + '" dev --hostname 127.0.0.1 --port 3100'
$process = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $projectPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $statePath 'stdout.log') -RedirectStandardError (Join-Path $statePath 'stderr.log')
$process.Id | Set-Content -LiteralPath (Join-Path $statePath 'process.pid')
Write-Output "Preview starting: http://127.0.0.1:3100 (PID $($process.Id))"
