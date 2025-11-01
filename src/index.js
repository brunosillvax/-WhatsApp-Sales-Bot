import { default as makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
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

const logger = pino({ level: 'silent' });

async function startBot() {
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
    process.exit(1);
  }

  // Configurar autenticação do WhatsApp
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  // Criar socket do WhatsApp
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger,
    browser: ['WhatsApp Sales Bot', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
  });

  // Inicializar core do WhatsApp
  const whatsappCore = new WhatsAppCore(sock, conversationFlow);

  // Configurar handlers
  conversationFlow.setWhatsAppCore(whatsappCore);
  adminHandler.setWhatsAppCore(whatsappCore);
  whatsappCore.setAdminHandler(adminHandler);

  // Evento de credenciais atualizadas
  sock.ev.on('creds.update', saveCreds);

  // Evento de conexão
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR Code abaixo com o WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexão fechada:', lastDisconnect?.error, ', reconectando:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp com sucesso!');
      console.log('🤖 Bot pronto para receber mensagens!\n');
    }
  });

  // Evento de mensagens recebidas
  sock.ev.on('messages.upsert', async (m) => {
    try {
      await whatsappCore.handleIncomingMessages(m);
    } catch (error) {
      loggingService.error('Erro ao processar mensagens', error);
    }
  });

  // Processar mensagens pendentes
  process.on('SIGINT', () => {
    console.log('\n👋 Encerrando bot...');
    sock.end();
    process.exit(0);
  });
}

// Iniciar o bot
startBot().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
