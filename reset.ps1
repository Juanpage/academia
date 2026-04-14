Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

Write-Host ''
Write-Host '================================================' -ForegroundColor DarkGreen
Write-Host '   ACADEMIA MILITAR DIGITAL - Reset del Stack   ' -ForegroundColor Green
Write-Host '================================================' -ForegroundColor DarkGreen
Write-Host ''

Write-Host '[1/6] Deteniendo PostgreSQL de Windows...' -ForegroundColor Yellow
Stop-Service postgresql* -ErrorAction SilentlyContinue
Write-Host '      OK' -ForegroundColor Gray

Write-Host '[2/6] Bajando contenedores Docker...' -ForegroundColor Yellow
docker compose -f docker-compose.local.yml down --remove-orphans 2>&1 | Out-Null
Write-Host '      OK' -ForegroundColor Gray

Write-Host '[3/6] Eliminando volumenes...' -ForegroundColor Yellow
docker compose -f docker-compose.local.yml down -v 2>&1 | Out-Null
docker volume rm academia_postgres_data academia_moodle_data academia_moodle_datadir 2>&1 | Out-Null
Write-Host '      Volumenes eliminados.' -ForegroundColor Gray

Write-Host '[4/6] Reconstruyendo imagen Moodle (puede tardar 5-10 min)...' -ForegroundColor Yellow
docker compose -f docker-compose.local.yml build --no-cache moodle
if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: Fallo el build de Moodle.' -ForegroundColor Red
    exit 1
}
Write-Host '      Build completado.' -ForegroundColor Gray

Write-Host '[5/6] Iniciando PostgreSQL y Redis...' -ForegroundColor Yellow
docker compose -f docker-compose.local.yml up -d postgres redis

Write-Host '      Esperando PostgreSQL healthy...' -ForegroundColor Gray
$attempts = 0
do {
    Start-Sleep -Seconds 3
    $health = docker inspect academia_postgres --format '{{.State.Health.Status}}' 2>$null
    $attempts++
} while ($health -ne 'healthy' -and $attempts -lt 20)

if ($health -ne 'healthy') {
    Write-Host 'ERROR: PostgreSQL no respondio a tiempo.' -ForegroundColor Red
    docker logs academia_postgres --tail 20
    exit 1
}
Write-Host '      PostgreSQL healthy.' -ForegroundColor Gray

Write-Host '[6/6] Iniciando Moodle...' -ForegroundColor Yellow
docker compose -f docker-compose.local.yml up -d moodle
Write-Host ''
Write-Host 'Siguiendo logs de Moodle (Ctrl+C para salir):' -ForegroundColor Cyan
Write-Host '-------------------------------------------------' -ForegroundColor DarkGray

docker logs academia_moodle -f --tail 0 2>&1 | ForEach-Object {
    $line = $_
    if ($line -match 'WebService configurado|setup completo') {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -match 'ERROR|error') {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match 'ws-setup|entrypoint') {
        Write-Host $line -ForegroundColor Cyan
    } else {
        Write-Host $line -ForegroundColor Gray
    }
}