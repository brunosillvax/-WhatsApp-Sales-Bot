# Script para verificar e fechar conexões duplicadas
Write-Host "🔍 Verificando processos Node.js..." -ForegroundColor Cyan

$processes = Get-Process node -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "📋 Processos Node.js encontrados:" -ForegroundColor Yellow
    $processes | Format-Table Id, ProcessName, StartTime -AutoSize

    Write-Host "`n💡 Para fechar todos os processos Node.js, execute:" -ForegroundColor Green
    Write-Host "   Stop-Process -Name node -Force" -ForegroundColor White
} else {
    Write-Host "✅ Nenhum processo Node.js encontrado rodando." -ForegroundColor Green
}

Write-Host "`n📱 Verifique também:" -ForegroundColor Cyan
Write-Host "   - WhatsApp Web aberto no navegador?" -ForegroundColor White
Write-Host "   - Outro terminal com o bot rodando?" -ForegroundColor White
Write-Host "   - Aplicativos WhatsApp conectados?" -ForegroundColor White
