$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\Wohlstandsgenerator\Documents\AI\svworldcup"
$sv = "C:\Users\Wohlstandsgenerator\Documents\AI\_Serververwaltung"
$key = "C:\Users\Wohlstandsgenerator\dominik_key"
$envFile = Join-Path $sv ".env"
$askpass = Join-Path $sv "askpass_helper.cmd"
$serverUser = "dominik"
$serverIP = "46.224.220.87"
$remotePath = "/opt/svworldcup"
$zipFile = Join-Path $env:TEMP "svworldcup_deploy.zip"

Write-Host "[1/8] Loading SSH passphrase..." -ForegroundColor Cyan
$line = Get-Content $envFile | Where-Object { $_ -match '^SSH_PASSPHRASE\s*=' } | Select-Object -First 1
$pass = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")

$env:SSH_PASSPHRASE = $pass
$env:SSH_ASKPASS = $askpass
$env:SSH_ASKPASS_REQUIRE = "force"
$env:DISPLAY = "1"

Write-Host "[2/8] Creating deploy archive..." -ForegroundColor Cyan
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

$staging = Join-Path $env:TEMP "svworldcup_staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$filesToDeploy = @(
    "docker-compose.yml",
    "Dockerfile",
    ".env",
    ".dockerignore",
    "README.md"
)
foreach ($f in $filesToDeploy) {
    Copy-Item (Join-Path $projectRoot $f) (Join-Path $staging $f) -Force
}

$dirs = @("web", "server", "db", "architecture", "tools")
foreach ($d in $dirs) {
    $src = Join-Path $projectRoot $d
    $dst = Join-Path $staging $d
    Copy-Item $src $dst -Recurse -Force
}

$pathsToPrune = @(
    (Join-Path $staging "web\node_modules"),
    (Join-Path $staging "server\node_modules"),
    (Join-Path $staging "node_modules"),
    (Join-Path $staging "web\dist"),
    (Join-Path $staging "server\dist"),
    (Join-Path $staging ".tmp"),
    (Join-Path $staging "coverage")
)

foreach ($pathToPrune in $pathsToPrune) {
    if (Test-Path $pathToPrune) {
        Remove-Item $pathToPrune -Recurse -Force
    }
}

Compress-Archive -Path "$staging\*" -DestinationPath $zipFile -Force
Remove-Item $staging -Recurse -Force

$zipSize = (Get-Item $zipFile).Length / 1KB
Write-Host "   Archive: $zipFile ($([math]::Round($zipSize))KB)" -ForegroundColor Gray

Write-Host "[3/8] Creating remote directory..." -ForegroundColor Cyan
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "sudo mkdir -p ${remotePath} && sudo chown ${serverUser}:${serverUser} ${remotePath}"

Write-Host "[4/8] Uploading archive..." -ForegroundColor Cyan
scp -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL $zipFile "${serverUser}@${serverIP}:/tmp/svworldcup_deploy.zip"

Write-Host "[5/8] Extracting on server..." -ForegroundColor Cyan
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "cd ${remotePath} && unzip -o /tmp/svworldcup_deploy.zip && rm /tmp/svworldcup_deploy.zip && sudo mkdir -p /var/lib/svworldcup/db"

Write-Host "[6/8] Building and starting Docker stack..." -ForegroundColor Cyan
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "cd ${remotePath} && docker compose build --no-cache && docker compose up -d"

Write-Host "[7/8] Applying database migrations..." -ForegroundColor Cyan
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "cd ${remotePath} && sh tools/apply-migrations.sh"

Write-Host "[8/8] Verifying..." -ForegroundColor Cyan
Start-Sleep -Seconds 10
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "docker ps --filter name=svworldcup --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Public site: https://worldcup.svtool.info" -ForegroundColor Yellow
Write-Host "Health: https://worldcup.svtool.info/api/public/health" -ForegroundColor Yellow

if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
