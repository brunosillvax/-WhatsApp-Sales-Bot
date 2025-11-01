# Script para iniciar o bot corretamente
Write-Host "🔄 Parando processos Node.js existentes..." -ForegroundColor Yellow

# Fechar todos os processos Node.js
$processes = Get-Process node -ErrorAction SilentlyContinue
if ($processes) {
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✅ Processos anteriores encerrados." -ForegroundColor Green
} else {
    Write-Host "✅ Nenhum processo anterior encontrado." -ForegroundColor Green
}

Write-Host "`n🚀 Iniciando bot..." -ForegroundColor Cyan
Write-Host "💡 Pressione Ctrl+C para parar o bot quando necessário.`n" -ForegroundColor Yellow

# Iniciar bot
cd "C:\Users\bruno\OneDrive\Imagens\Nova pasta"
node src/index.js
