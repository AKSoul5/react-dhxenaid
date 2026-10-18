# What the Shajarah icon runs: starts Docker Desktop and the database if
# needed, starts the app in the background, and opens it in a window of its
# own. Closing that window stops the app and the database again.

. (Join-Path $PSScriptRoot 'common.ps1')
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$serverLog = Join-Path $LogDir 'server.log'
$serverErr = Join-Path $LogDir 'server-errors.log'

# A small "Starting..." window, so a slow start (Docker) is not a blank wait.
$splash = New-Object System.Windows.Forms.Form
$splash.Text = 'Shajarah'
$splash.Size = New-Object System.Drawing.Size(360, 120)
$splash.StartPosition = 'CenterScreen'
$splash.FormBorderStyle = 'FixedDialog'
$splash.MaximizeBox = $false
$splash.MinimizeBox = $false
$iconFile = Join-Path $PSScriptRoot 'shajarah.ico'
if (Test-Path $iconFile) { $splash.Icon = New-Object System.Drawing.Icon($iconFile) }
$label = New-Object System.Windows.Forms.Label
$label.Dock = 'Fill'
$label.TextAlign = 'MiddleCenter'
$label.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$splash.Controls.Add($label)
$tick = { [System.Windows.Forms.Application]::DoEvents() }
function Show-Status([string]$Text) {
  $label.Text = $Text
  if (-not $splash.Visible) { $splash.Show() }
  & $tick
}
function Fail([string]$Text) {
  $splash.Hide()
  [System.Windows.Forms.MessageBox]::Show("$Text`n`nDetails are in $LogDir", 'Shajarah', 'OK', 'Error') | Out-Null
  exit 1
}

# Shajarah already open (a second click on the icon): just open another window.
$startedHere = $null
if (-not (Test-Server)) {
  if (-not (Test-Path (Join-Path $App '.next\BUILD_ID'))) {
    Fail 'Shajarah is not set up yet. Double-click "Install Shajarah" in the desktop\windows folder first.'
  }
  Show-Status 'Starting Docker...'
  if (-not (Start-DockerEngine $tick)) { Fail 'Docker Desktop did not start. Open it by hand, wait until it is running, then try again.' }
  Show-Status 'Starting the database...'
  if (-not (Start-Database)) { Fail 'The database did not start.' }
  Show-Status 'Starting Shajarah...'
  $node = (Get-Command node -ErrorAction SilentlyContinue)
  if (-not $node) { Fail 'Node.js was not found. Install it from https://nodejs.org.' }
  $next = Join-Path $App 'node_modules\next\dist\bin\next'
  $startedHere = Start-Process -FilePath $node.Source -ArgumentList "`"$next`" start -p $Port" `
    -WorkingDirectory $App -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $serverLog -RedirectStandardError $serverErr
  if (-not (Wait-Until { Test-Server } 90 $tick)) {
    if (-not $startedHere.HasExited) { & taskkill /PID $startedHere.Id /T /F | Out-Null }
    Fail 'Shajarah did not start.'
  }
}

$edge = Find-Edge
$splash.Hide()
if (-not $edge) {
  # No Edge: the default browser. The app keeps running until Windows restarts.
  Start-Process $Url
  exit 0
}
# A profile of its own gives the Shajarah window its own Edge processes,
# separate from any other Edge windows, and lets us tell when it is closed.
$windowProfile = Join-Path $DataDir 'window'
Start-Process -FilePath $edge -ArgumentList @(
  "--app=$Url", "--user-data-dir=`"$windowProfile`"", '--window-size=1400,900', '--no-first-run'
) | Out-Null
if (-not $startedHere) { exit 0 }

# This click started the app: stop it once every Shajarah window is closed,
# i.e. no Edge process is left using the Shajarah profile.
function Test-WindowOpen {
  $procs = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" -ErrorAction SilentlyContinue
  return [bool]($procs | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($windowProfile) })
}
Wait-Until { Test-WindowOpen } 30 | Out-Null
while (Test-WindowOpen) { Start-Sleep -Seconds 2 }
if (-not $startedHere.HasExited) { & taskkill /PID $startedHere.Id /T /F | Out-Null }
Stop-Database
