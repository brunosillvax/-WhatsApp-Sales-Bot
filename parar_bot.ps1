# Script para parar o bot
Write-Host "🛑 Parando todos os processos Node.js..." -ForegroundColor Yellow

$processes = Get-Process node -ErrorAction SilentlyContinue
if ($processes) {
    $count = $processes.Count
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "✅ $count processo(s) Node.js foram encerrados." -ForegroundColor Green
} else {
    Write-Host "✅ Nenhum processo Node.js encontrado." -ForegroundColor Green
}
