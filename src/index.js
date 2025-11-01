import { default as makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import WhatsAppCore from './core/whatsapp-core.js';
import StateManager from './core/state-manager.js';
import ConversationFlow from './handlers/conversation-flow.js';
import AdminHandler from './handlers/admin-handler.js';
import ProductCatalog from './services/product-catalog.js';
import CartManager from './services/cart-manager.js';
import loggingService from './services/logging-service.js';
import rateLimiter from './utils/rate-limiter.js';

dotenv.config();

// Logger configurado para mostrar apenas erros importantes do Baileys
const logger = pino({ level: 'error' });

// Evitar múltiplos listeners SIGINT
let isShuttingDown = false;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 10000; // 10 segundos

// Armazenar timeouts para limpeza
const activeTimeouts = new Set();
function safeSetTimeout(callback, delay) {
  const timeout = setTimeout(() => {
    activeTimeouts.delete(timeout);
    callback();
  }, delay);
  activeTimeouts.add(timeout);
  return timeout;
}

function clearAllTimeouts() {
  activeTimeouts.forEach(timeout => clearTimeout(timeout));
  activeTimeouts.clear();
}

async function startBot() {
  // Evitar múltiplas conexões simultâneas
  if (isConnecting) {
    console.log('⏳ Conexão já em andamento. Aguardando...');
    return;
  }

  isConnecting = true;
  console.log('🚀 Iniciando WhatsApp Sales Bot...\n');
  loggingService.info('Bot iniciando', { timestamp: new Date().toISOString() });

  // Inicializar serviços
  const stateManager = new StateManager();
  const productCatalog = new ProductCatalog('./produtos.json');
  const cartManager = new CartManager();
  const conversationFlow = new ConversationFlow(productCatalog, cartManager, stateManager);
  const adminHandler = new AdminHandler(productCatalog, stateManager);

  // Carregar números de admin
  adminHandler.loadAdminNumbers();

  // Carregar catálogo de produtos
  try {
    await productCatalog.loadProducts();
    console.log('✅ Catálogo de produtos carregado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao carregar catálogo:', error.message);
    loggingService.error('Erro fatal ao carregar catálogo', error);
    isConnecting = false;
    console.log('💡 Verifique se o arquivo produtos.json existe e está no formato correto.\n');
    safeSetTimeout(() => {
      isConnecting = false;
      startBot();
    }, 10000);
    return;
  }

  // Configurar autenticação do WhatsApp
  let state, saveCreds;
  try {
    const authResult = await useMultiFileAuthState('auth_info_baileys');
    state = authResult.state;
    saveCreds = authResult.saveCreds;
  } catch (error) {
    console.error('❌ Erro ao configurar autenticação:', error.message);
    loggingService.error('Erro ao configurar autenticação', error);
    isConnecting = false;
    console.log('💡 Tente remover a pasta "auth_info_baileys" e execute novamente.\n');
    safeSetTimeout(() => {
      isConnecting = false;
      startBot();
    }, 5000);
    return;
  }

  // Verificar se já há credenciais salvas
  const hasCredentials = state?.creds?.registered;
  if (hasCredentials) {
    console.log('🔐 Credenciais encontradas. Tentando reconectar...');
    console.log('💡 Se o QR code não aparecer e houver erro, remova a pasta "auth_info_baileys" e execute novamente.\n');
  } else {
    console.log('📱 Nenhuma credencial encontrada.');
    console.log('📱 QR Code será gerado automaticamente em alguns segundos...\n');
  }

  // Buscar versão mais recente do Baileys (recomendado)
  let version;
  try {
    console.log('🔄 Buscando versão mais recente do WhatsApp...');
    const versionInfo = await fetchLatestBaileysVersion();
    version = versionInfo.version;
    console.log(`📦 Versão do WhatsApp: ${version.join('.')} ${versionInfo.isLatest ? '(mais recente)' : '(atualizando...)'}`);
  } catch (error) {
    console.warn('⚠️ Não foi possível buscar versão mais recente. Usando versão padrão...');
    loggingService.warn('Erro ao buscar versão do Baileys', error);
    version = undefined; // Baileys usará versão padrão
  }

  // Criar socket do WhatsApp
  let sock;
  try {
    sock = makeWASocket({
      auth: state,
      logger,
      ...(version && { version }),
      browser: ['WhatsApp Sales Bot', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
    });
  } catch (error) {
    console.error('❌ Erro ao criar socket do WhatsApp:', error.message);
    loggingService.error('Erro ao criar socket', error);
    isConnecting = false;
    safeSetTimeout(() => {
      isConnecting = false;
      startBot();
    }, 5000);
    return;
  }

  if (!sock) {
    console.error('❌ Socket não foi criado corretamente.');
    isConnecting = false;
    safeSetTimeout(() => {
      isConnecting = false;
      startBot();
    }, 5000);
    return;
  }

  // Inicializar core do WhatsApp
  const whatsappCore = new WhatsAppCore(sock, conversationFlow);

  // Configurar handlers
  conversationFlow.setWhatsAppCore(whatsappCore);
  adminHandler.setWhatsAppCore(whatsappCore);
  whatsappCore.setAdminHandler(adminHandler);

  // Evento de credenciais atualizadas
  try {
    sock.ev.on('creds.update', saveCreds);
  } catch (error) {
    loggingService.error('Erro ao registrar listener de credenciais', error);
  }

  // Variável para evitar múltiplas exibições do QR
  let qrDisplayed = false;

  // Evento de conexão - DEVE ser registrado ANTES de qualquer outra coisa
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Debug: mostrar todos os updates recebidos
    if (qr || connection) {
      console.log(`[DEBUG] connection.update recebido - connection: ${connection}, qr: ${qr ? 'SIM' : 'NÃO'}`);
    }

    // Exibir QR code quando disponível
    if (qr && !qrDisplayed) {
      qrDisplayed = true;
      console.clear(); // Limpar tela
      console.log('\n\n');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📱 ESCANEIE O QR CODE COM SEU WHATSAPP');
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n1. Abra o WhatsApp no seu celular');
      console.log('2. Vá em Configurações > Aparelhos conectados');
      console.log('3. Toque em "Conectar um aparelho"');
      console.log('4. Escaneie o QR Code abaixo:\n');
      console.log('───────────────────────────────────────────────────────\n');
      // Usar small: true para QR code menor e mais fácil de escanear
      qrcode.generate(qr, { small: true });
      console.log('\n───────────────────────────────────────────────────────');
      console.log('⏳ Aguardando escaneamento...');
      console.log('💡 Dica: Aproxime o celular da tela para escanear\n');
    }

    // Tratar diferentes estados de conexão
    if (connection === 'close') {
      isConnecting = false; // Permitir nova tentativa de conexão
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      // Log detalhado do erro
      console.log('\n⚠️ Conexão fechada:');
      console.log(`   Status Code: ${statusCode}`);
      console.log(`   Razão: ${DisconnectReason[statusCode] || 'Desconhecida'}`);
      if (lastDisconnect?.error?.message) {
        console.log(`   Mensagem: ${lastDisconnect.error.message}`);
      }

      // Verificar se é connectionReplaced (440) - múltiplas conexões
      if (statusCode === 440 || statusCode === DisconnectReason.connectionReplaced) {
        reconnectAttempts++;
        console.log('\n⚠️ MÚLTIPLAS CONEXÕES DETECTADAS!');
        console.log('💡 Verifique se:');
        console.log('   - Não há outro bot rodando ao mesmo tempo');
        console.log('   - WhatsApp Web não está aberto em outro lugar');
        console.log('   - Não há múltiplas instâncias do Node.js rodando\n');

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log('❌ Muitas tentativas de reconexão. Encerrando para evitar loop infinito.');
          console.log('💡 Reinicie o bot manualmente e verifique se não há outras instâncias rodando.\n');
          process.exit(1);
        }

        // Delay maior para connectionReplaced (30 segundos)
        console.log(`🔄 Tentando reconectar em 30 segundos... (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})\n`);
        qrDisplayed = false;
        safeSetTimeout(() => {
          isConnecting = false;
          startBot();
        }, 30000);
        return;
      }

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('\n❌ Você foi desconectado do WhatsApp.');
        console.log('💡 Para reconectar, remova a pasta auth_info_baileys e execute o bot novamente.\n');
        reconnectAttempts = 0;
        process.exit(0);
      }

      if (statusCode === DisconnectReason.restartRequired) {
        reconnectAttempts = 0; // Reset em restart
        console.log('🔄 Reconexão necessária. Reiniciando em 10 segundos...');
        qrDisplayed = false;
        safeSetTimeout(() => {
          isConnecting = false;
          startBot();
        }, 10000);
        return;
      }

      if (statusCode === DisconnectReason.badSession) {
        reconnectAttempts++;
        console.log('🔧 Sessão inválida.');
        console.log('💡 Se isso persistir, remova a pasta auth_info_baileys manualmente.\n');
        if (reconnectAttempts >= 3) {
          console.log('❌ Muitas tentativas com sessão inválida. Remova auth_info_baileys e tente novamente.\n');
          process.exit(1);
        }
        qrDisplayed = false;
        safeSetTimeout(() => {
          isConnecting = false;
          startBot();
        }, 15000);
        return;
      }

      if (shouldReconnect) {
        reconnectAttempts++;
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log('❌ Muitas tentativas de reconexão. Encerrando...');
          console.log('💡 Verifique sua conexão com a internet e tente novamente.\n');
          process.exit(1);
        }
        console.log(`⚠️ Tentando reconectar em ${RECONNECT_DELAY / 1000} segundos... (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})\n`);
        qrDisplayed = false;
        safeSetTimeout(() => {
          isConnecting = false;
          startBot();
        }, RECONNECT_DELAY);
      } else {
        console.log('❌ Não foi possível reconectar. Encerrando...');
        reconnectAttempts = 0;
        process.exit(1);
      }
    } else if (connection === 'open') {
      isConnecting = false;
      reconnectAttempts = 0; // Reset contador quando conecta com sucesso
      console.clear();
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ CONECTADO AO WHATSAPP COM SUCESSO!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🤖 Bot pronto para receber mensagens!\n');
      qrDisplayed = false; // Reset para futuras reconexões
    } else if (connection === 'connecting') {
      if (!hasCredentials && !qrDisplayed) {
        console.log('🔄 Conectando ao WhatsApp...');
        console.log('⏳ Aguardando geração do QR Code...\n');
      }
    }
  });

  // Evento de mensagens recebidas
  try {
    sock.ev.on('messages.upsert', async (m) => {
      try {
        if (!whatsappCore || !m) {
          return;
        }
        await whatsappCore.handleIncomingMessages(m);
      } catch (error) {
        loggingService.error('Erro ao processar mensagens', error);
        // Não deixar erro quebrar o bot
        console.error('⚠️ Erro ao processar mensagem:', error.message);
      }
    });
  } catch (error) {
    loggingService.error('Erro ao registrar listener de mensagens', error);
  }

  // Processar mensagens pendentes (apenas uma vez)
  if (!isShuttingDown) {
    isShuttingDown = true;
    process.on('SIGINT', () => {
      console.log('\n👋 Encerrando bot...');
      clearAllTimeouts();
      try {
        if (sock) {
          sock.end();
        }
      } catch (error) {
        loggingService.error('Erro ao encerrar socket', error);
      }
      process.exit(0);
    });

    // Tratar erros não capturados
    process.on('unhandledRejection', (reason, promise) => {
      loggingService.error('Unhandled Rejection', new Error(String(reason)), {
        promise: String(promise)
      });
      console.error('⚠️ Erro não tratado:', reason);
    });

    process.on('uncaughtException', (error) => {
      loggingService.error('Uncaught Exception', error);
      console.error('❌ Erro crítico não tratado:', error);
      clearAllTimeouts();
      try {
        if (sock) {
          sock.end();
        }
      } catch (e) {
        // Ignorar erros ao tentar fechar
      }
      process.exit(1);
    });
  }
}

// Iniciar o bot
startBot().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
