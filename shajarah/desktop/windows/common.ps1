# Shared helpers for the Windows launcher (install.ps1, launch.ps1).
# Written for Windows PowerShell 5.1, which every Windows 10/11 has.

$ErrorActionPreference = 'Continue'   # native tools report failure through $LASTEXITCODE
$App = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path   # the shajarah folder
$Port = 3210
$Url = "http://localhost:$Port"
$DataDir = Join-Path $env:LOCALAPPDATA 'Shajarah'
$LogDir = Join-Path $DataDir 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Runs a command line through cmd, hiding its output; returns the exit code.
# (Redirecting a native program's stderr in PowerShell 5.1 turns it into errors.)
function Invoke-Quiet([string]$CommandLine) {
  cmd /c "$CommandLine >nul 2>&1"
  return $LASTEXITCODE
}

# The first of these paths (each a base folder and a path under it) that
# exists; base folders that are not set (32-bit Windows has no
# "Program Files (x86)") are skipped.
function Find-File([object[]]$Pairs) {
  foreach ($pair in $Pairs) {
    if ($pair[0] -and (Test-Path (Join-Path $pair[0] $pair[1]))) { return (Join-Path $pair[0] $pair[1]) }
  }
  return $null
}

function Test-Server {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Test-Docker { return (Invoke-Quiet 'docker info') -eq 0 }

# Waits up to $Seconds for $Check to succeed, calling $Tick between tries
# (the launcher keeps its "Starting..." window responsive there).
function Wait-Until([scriptblock]$Check, [int]$Seconds, [scriptblock]$Tick = {}) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (& $Check) { return $true }
    & $Tick
    Start-Sleep -Milliseconds 700
  }
  return (& $Check)
}

# Starts Docker Desktop when its engine is not running, and waits for it.
function Start-DockerEngine([scriptblock]$Tick = {}) {
  if (Test-Docker) { return $true }
  $exe = Find-File @(
    ,@($env:ProgramFiles, 'Docker\Docker\Docker Desktop.exe')
    ,@($env:LOCALAPPDATA, 'Docker\Docker Desktop.exe')
  )
  if (-not $exe) { return $false }
  Start-Process -FilePath $exe | Out-Null
  return (Wait-Until { Test-Docker } 180 $Tick)
}

# Starts the database container (docker-compose.yml in the app folder).
function Start-Database {
  Push-Location $App
  try { return (Invoke-Quiet 'docker compose up -d') -eq 0 } finally { Pop-Location }
}

function Stop-Database {
  Push-Location $App
  try { Invoke-Quiet 'docker compose stop' | Out-Null } finally { Pop-Location }
}

# Microsoft Edge, which opens the app in a window of its own (no tabs or address bar).
function Find-Edge {
  return (Find-File @(
    ,@(${env:ProgramFiles(x86)}, 'Microsoft\Edge\Application\msedge.exe')
    ,@($env:ProgramFiles, 'Microsoft\Edge\Application\msedge.exe')
    ,@($env:LOCALAPPDATA, 'Microsoft\Edge\Application\msedge.exe')
  ))
}
