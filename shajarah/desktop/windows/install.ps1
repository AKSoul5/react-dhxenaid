# One-time setup (run it again after updating the code):
# installs the app's packages, prepares the database, builds the app and
# puts a "Shajarah" icon on the desktop and in the Start menu.

. (Join-Path $PSScriptRoot 'common.ps1')

function Step([string]$Text) { Write-Host ''; Write-Host "==> $Text" -ForegroundColor Cyan }
function Fail([string]$Text) {
  Write-Host ''
  Write-Host "Setup stopped: $Text" -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}

Write-Host 'Shajarah setup' -ForegroundColor Green
Write-Host "App folder: $App"

Step 'Checking Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Fail 'Node.js is not installed. Install the LTS version from https://nodejs.org and run this again.' }
$version = (& node --version).TrimStart('v')
$major = [int]($version.Split('.')[0])
if ($major -lt 18) { Fail "Node.js $version is too old. Install the LTS version from https://nodejs.org." }
Write-Host "Node.js $version"

Step 'Checking Docker Desktop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail 'Docker Desktop is not installed. Install it from https://www.docker.com/products/docker-desktop and run this again.'
}
Write-Host 'Starting Docker Desktop if needed (this can take a minute)...'
if (-not (Start-DockerEngine)) { Fail 'Docker Desktop did not start. Open it once by hand, wait until it says it is running, then run this again.' }

Set-Location $App

Step 'Installing packages (a few minutes the first time)'
& npm install
if ($LASTEXITCODE -ne 0) { Fail 'npm install failed (see the messages above).' }

Step 'Preparing the database'
if (-not (Test-Path (Join-Path $App '.env'))) { Copy-Item (Join-Path $App '.env.example') (Join-Path $App '.env') }
if (-not (Start-Database)) { Fail 'The database container did not start (docker compose up -d).' }
# The database accepts connections a few seconds after its container starts.
$migrated = $false
for ($i = 0; $i -lt 15 -and -not $migrated; $i++) {
  & npx prisma migrate deploy
  if ($LASTEXITCODE -eq 0) { $migrated = $true } else { Start-Sleep -Seconds 3 }
}
if (-not $migrated) { Fail 'Setting up the database tables failed (see the messages above).' }

Step 'Building the app (a minute or two)'
& npm run build
if ($LASTEXITCODE -ne 0) { Fail 'The build failed (see the messages above).' }

Step 'Creating the Shajarah icons'
$launcher = Join-Path $PSScriptRoot 'launch.ps1'
$icon = Join-Path $PSScriptRoot 'shajarah.ico'
$shell = New-Object -ComObject WScript.Shell
foreach ($folder in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $link = $shell.CreateShortcut((Join-Path $folder 'Shajarah.lnk'))
  $link.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $link.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
  $link.WorkingDirectory = $App
  $link.IconLocation = "$icon,0"
  $link.WindowStyle = 7   # minimised: no console window flashes up
  $link.Description = 'Shajarah family tree posters'
  $link.Save()
  Write-Host "Created $(Join-Path $folder 'Shajarah.lnk')"
}

Stop-Database
Write-Host ''
Write-Host 'Done. Open Shajarah from the icon on your desktop or in the Start menu.' -ForegroundColor Green
Read-Host 'Press Enter to close'
