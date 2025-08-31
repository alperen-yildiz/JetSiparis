param(
  [switch]$Release
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $root

# Ensure Rust and Node env are available
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw 'Rust (cargo) not found in PATH.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js not found in PATH.' }

# Install Tauri CLI if missing
if (-not (Get-Command tauri -ErrorAction SilentlyContinue)) {
  Write-Host 'Installing @tauri-apps/cli...' -ForegroundColor Yellow
  npm i -D @tauri-apps/cli | Out-Null
}

# Determine build mode without using ternary (compat with Windows PowerShell 5.1)
if ($Release.IsPresent) { $mode = 'release' } else { $mode = 'debug' }
Write-Host "Building JetSiparis installer ($mode)..." -ForegroundColor Cyan

# Build with NSIS target
$env:TAURI_SIGNING_PRIVATE_KEY = ''
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''

npm run tauri build

$distDir = Join-Path $root 'src-tauri' | Join-Path -ChildPath 'target' | Join-Path -ChildPath 'release'
$bundleDir = Join-Path $distDir 'bundle' | Join-Path -ChildPath 'nsis'

$outDir = Join-Path $root 'installer' | Join-Path -ChildPath 'output'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$setup = Get-ChildItem $bundleDir -Filter '*-setup.exe' -File -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $setup) { throw "NSIS setup.exe not found under $bundleDir" }

$dest = Join-Path $outDir 'JetSiparis-setup.exe'
Copy-Item $setup.FullName $dest -Force

# Copy signature if exists
$sig = [IO.Path]::ChangeExtension($setup.FullName, '.sig')
if (Test-Path $sig) { Copy-Item $sig (Join-Path $outDir 'JetSiparis-setup.exe.sig') -Force }

Write-Host "Setup exported to $dest" -ForegroundColor Green