param(
    [ValidateSet("test", "production")]
    [string]$Environment = "test",
    [string]$AppEnvFile
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$projectRoot = "C:\Users\Wohlstandsgenerator\Documents\AI\svworldcup"
$sv = "C:\Users\Wohlstandsgenerator\Documents\AI\_Serververwaltung"
$key = "C:\Users\Wohlstandsgenerator\dominik_key"
$serverManagementEnvFile = Join-Path $sv ".env"
$askpass = Join-Path $sv "askpass_helper.cmd"
$serverUser = "dominik"
$serverIP = "46.224.220.87"

$environmentConfigs = @{
    test = @{
        EnvFile = ".env"
        RemotePath = "/opt/svworldcup"
        PublicSite = "https://worldcup.svtool.info"
        DbVolumePath = "/var/lib/svworldcup/db"
    }
    production = @{
        EnvFile = ".env.production"
        RemotePath = "/opt/svworldcup-event"
        PublicSite = "https://event.svtool.info"
        DbVolumePath = "/var/lib/svworldcup-event/db"
    }
}

function Get-EnvValue {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Default
    )

    $line = Get-Content $Path | Where-Object { $_ -match "^\s*$([regex]::Escape($Key))\s*=" } | Select-Object -First 1
    if (-not $line) { return $Default }

    $value = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
    if ([string]::IsNullOrWhiteSpace($value)) { return $Default }

    return $value
}

$config = $environmentConfigs[$Environment]
if (-not $AppEnvFile) {
    $AppEnvFile = Join-Path $projectRoot $config.EnvFile
} elseif (-not [System.IO.Path]::IsPathRooted($AppEnvFile)) {
    $AppEnvFile = Join-Path $projectRoot $AppEnvFile
}

if (-not (Test-Path $AppEnvFile)) {
    throw "App env file not found: $AppEnvFile"
}

$remotePath = $config.RemotePath
$remoteZipFile = "/tmp/svworldcup_${Environment}_deploy.zip"
$dbVolumePath = Get-EnvValue -Path $AppEnvFile -Key "DB_VOLUME_PATH" -Default $config.DbVolumePath
$publicSite = Get-EnvValue -Path $AppEnvFile -Key "PUBLIC_WEB_URL" -Default $config.PublicSite
$zipFile = Join-Path $env:TEMP "svworldcup_${Environment}_deploy.zip"

Write-Host "[1/8] Loading SSH passphrase..." -ForegroundColor Cyan
$line = Get-Content $serverManagementEnvFile | Where-Object { $_ -match '^SSH_PASSPHRASE\s*=' } | Select-Object -First 1
$pass = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")

$env:SSH_PASSPHRASE = $pass
$env:SSH_ASKPASS = $askpass
$env:SSH_ASKPASS_REQUIRE = "force"
$env:DISPLAY = "1"

Write-Host "[2/8] Creating deploy archive..." -ForegroundColor Cyan
Write-Host "   Environment: $Environment" -ForegroundColor Gray
Write-Host "   App env file: $AppEnvFile" -ForegroundColor Gray
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

$staging = Join-Path $env:TEMP "svworldcup_${Environment}_staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$filesToDeploy = @(
    "docker-compose.yml",
    "Dockerfile",
    ".dockerignore",
    "README.md"
)
foreach ($f in $filesToDeploy) {
    Copy-Item (Join-Path $projectRoot $f) (Join-Path $staging $f) -Force
}
Copy-Item $AppEnvFile (Join-Path $staging ".env") -Force

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
scp -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL $zipFile "${serverUser}@${serverIP}:${remoteZipFile}"

Write-Host "[5/8] Extracting on server..." -ForegroundColor Cyan
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "cd ${remotePath} && unzip -o ${remoteZipFile} && rm ${remoteZipFile} && sudo mkdir -p ${dbVolumePath}"

Write-Host "[6/8] Building and starting Docker stack..." -ForegroundColor Cyan
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "cd ${remotePath} && docker compose build --no-cache && docker compose up -d"

Write-Host "[7/8] Applying database migrations..." -ForegroundColor Cyan
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "cd ${remotePath} && sh tools/apply-migrations.sh"

Write-Host "[8/8] Verifying..." -ForegroundColor Cyan
Start-Sleep -Seconds 10
ssh -i $key -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL "${serverUser}@${serverIP}" "docker ps --filter name=svworldcup --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Public site: $publicSite" -ForegroundColor Yellow
Write-Host "Health: $publicSite/api/public/health" -ForegroundColor Yellow

if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
