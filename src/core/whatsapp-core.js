import errorHandler from '../utils/error-handler.js';
import messageBatcher from '../utils/message-batcher.js';
import loggingService from '../services/logging-service.js';
import rateLimiter from '../utils/rate-limiter.js';

export default class WhatsAppCore {
  constructor(sock, conversationFlow) {
    this.sock = sock;
    this.conversationFlow = conversationFlow;
    this.adminHandler = null;
    this.useBatching = process.env.USE_MESSAGE_BATCHING !== 'false'; // Ativado por padrão
  }

  setAdminHandler(adminHandler) {
    this.adminHandler = adminHandler;
  }

  async handleIncomingMessages(m) {
    const messages = m.messages || [];

    for (const msg of messages) {
      try {
        // Ignorar mensagens próprias e status
        if (msg.key.fromMe || !msg.message) continue;

        const jid = msg.key.remoteJid;
        const messageType = Object.keys(msg.message)[0];

        // Processar apenas mensagens de texto e interações de botões
        if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
          const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

          // Log da mensagem recebida
          loggingService.logMessage(jid, text, 'received');

          await this.processMessage(jid, text, msg);
        } else if (messageType === 'templateButtonReplyMessage') {
          // Interação com botão
          const buttonId = msg.message.templateButtonReplyMessage.selectedId;
          await this.processMessage(jid, buttonId, msg);
        } else if (messageType === 'buttonsResponseMessage') {
          // Interação com botões interativos
          const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
          await this.processMessage(jid, buttonId, msg);
        } else if (messageType === 'listResponseMessage') {
          // Interação com lista
          const selectedId = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
          await this.processMessage(jid, selectedId, msg);
        }
      } catch (error) {
        loggingService.logError('Erro ao processar mensagem', error, {
          jid: msg.key.remoteJid?.split('@')[0],
        });
        await this.sendMessage(msg.key.remoteJid, '❌ Desculpe, ocorreu um erro. Tente novamente.', { urgent: true });
      }
    }
  }

  async processMessage(jid, text, originalMsg) {
    // Verificar rate limiting
    const rateLimitCheck = rateLimiter.checkLimit(jid);
    if (!rateLimitCheck.allowed) {
      loggingService.warn('Rate limit excedido', {
        jid: jid.split('@')[0],
        blocked: rateLimitCheck.blocked,
      });

      if (rateLimitCheck.blocked) {
        await this.sendMessage(jid, `⚠️ ${rateLimitCheck.message}`, { urgent: true });
      } else {
        await this.sendMessage(jid, `⚠️ ${rateLimitCheck.message}`, { urgent: true });
      }
      return;
    }

    const normalizedText = text.trim().toLowerCase();

    // Verificar se é mensagem de admin primeiro
    if (this.adminHandler && (normalizedText === 'admin' || normalizedText === '/admin')) {
      await this.adminHandler.handleMessage(jid, normalizedText, originalMsg);
      return;
    }

    // Tentar processar como admin se estiver no estado admin
    if (this.adminHandler) {
      const wasProcessed = await this.adminHandler.handleMessage(jid, normalizedText, originalMsg);
      if (wasProcessed) {
        return; // Foi processado pelo admin handler
      }
    }

    // Processar fluxo de conversa normal
    await this.conversationFlow.handleMessage(jid, normalizedText, originalMsg);
  }

  async sendMessage(jid, text, options = {}) {
    // Sanitizar entrada
    const sanitizedText = text || '';

    // Se batching estiver ativo e não for urgente, adicionar ao buffer
    if (this.useBatching && !options.urgent) {
      messageBatcher.addMessage(jid, sanitizedText, options);

      // Retornar promise que será resolvida quando mensagem for enviada
      return Promise.resolve();
    }

    // Enviar imediatamente ou se batching estiver desativado
    return errorHandler.withRetry(async () => {
      await this.sock.sendMessage(jid, { text: sanitizedText }, options);
      loggingService.logMessage(jid, sanitizedText, 'sent');
    }, `enviar mensagem para ${jid.split('@')[0]}`).catch(async (error) => {
      // Tratar erro específico de envio
      const errorInfo = await errorHandler.handleMessageSendError(error, jid, sanitizedText);

      if (errorInfo.shouldRetry && !options.urgent) {
        // Tentar novamente com delay
        await errorHandler.sleep(errorInfo.delay || 2000);
        return errorHandler.withRetry(async () => {
          await this.sock.sendMessage(jid, { text: sanitizedText }, options);
        }, `retry enviar mensagem para ${jid.split('@')[0]}`);
      }

      loggingService.logError('Erro ao enviar mensagem', error, { jid: jid.split('@')[0] });
      throw error;
    });
  }

  /**
   * Forçar envio de todas as mensagens pendentes no buffer
   */
  async flushPendingMessages(jid) {
    const batchedMessage = messageBatcher.flush(jid);

    if (batchedMessage && batchedMessage.text) {
      return this.sendMessage(jid, batchedMessage.text, { ...batchedMessage.options, urgent: true });
    }

    return Promise.resolve();
  }

  async sendMessageWithImage(jid, imageUrl, caption, options = {}) {
    // Imagens sempre enviadas imediatamente (não usar batching)
    return errorHandler.withRetry(async () => {
      const message = {
        image: { url: imageUrl },
        caption: caption || '',
      };
      await this.sock.sendMessage(jid, message, options);
      loggingService.logMessage(jid, `[IMAGEM] ${caption || ''}`, 'sent');
    }, `enviar imagem para ${jid.split('@')[0]}`).catch(async (error) => {
      loggingService.logError('Erro ao enviar imagem', error, { jid: jid.split('@')[0] });
      // Se falhar, enviar apenas o texto
      await this.sendMessage(jid, caption || '', { ...options, urgent: true });
    });
  }

  async sendMessageWithButtons(jid, text, buttons, options = {}) {
    // Botões sempre enviados imediatamente (não usar batching)
    return errorHandler.withRetry(async () => {
      const buttonRows = buttons.map((btn, index) => ({
        title: btn.text,
        id: btn.id || `btn_${index}`,
      }));

      const message = {
        text: text || '',
        buttons: buttonRows,
        headerType: 1,
      };

      await this.sock.sendMessage(jid, message, options);
      loggingService.logMessage(jid, `[BOTÕES] ${text || ''}`, 'sent');
    }, `enviar botões para ${jid.split('@')[0]}`).catch(async (error) => {
      loggingService.logError('Erro ao enviar botões', error, { jid: jid.split('@')[0] });
      // Se falhar, enviar apenas o texto
      await this.sendMessage(jid, text || '', { ...options, urgent: true });
    });
  }

  async sendMessageWithList(jid, text, title, buttonText, sections, options = {}) {
    // Listas sempre enviadas imediatamente (não usar batching)
    return errorHandler.withRetry(async () => {
      const message = {
        text: text || '',
        title: title || '',
        buttonText: buttonText || '',
        sections: sections || [],
      };

      await this.sock.sendMessage(jid, message, options);
      loggingService.logMessage(jid, `[LISTA] ${text || ''}`, 'sent');
    }, `enviar lista para ${jid.split('@')[0]}`).catch(async (error) => {
      loggingService.logError('Erro ao enviar lista', error, { jid: jid.split('@')[0] });
      // Se falhar, enviar apenas o texto
      await this.sendMessage(jid, text || '', { ...options, urgent: true });
    });
  }

  async notifyVendedorHumano(jidCliente, nomeCliente, pedido) {
    const vendedorJid = process.env.VENDEDOR_HUMANO_JID;

    if (!vendedorJid) {
      console.log('⚠️ VENDEDOR_HUMANO_JID não configurado. Pedido não será notificado.');
      return;
    }

    try {
      let mensagemPedido = `🛒 *NOVO PEDIDO RECEBIDO!*\n\n`;
      mensagemPedido += `Cliente: ${nomeCliente}\n`;
      mensagemPedido += `WhatsApp: ${jidCliente}\n\n`;
      mensagemPedido += `*Itens do Pedido:*\n`;

      pedido.itens.forEach((item, index) => {
        mensagemPedido += `${index + 1}. ${item.nome} (${item.id_produto})\n`;
        mensagemPedido += `   Quantidade: ${item.quantidade}x\n`;
        mensagemPedido += `   Valor unitário: R$ ${item.preco.toFixed(2)}\n`;
        mensagemPedido += `   Subtotal: R$ ${(item.preco * item.quantidade).toFixed(2)}\n\n`;
      });

      mensagemPedido += `*Total do Pedido: R$ ${pedido.total.toFixed(2)}*\n\n`;
      mensagemPedido += `Entre em contato com o cliente para confirmar pagamento e entrega.`;

      await this.sendMessage(vendedorJid, mensagemPedido, { urgent: true });
      loggingService.logCheckout(jidCliente, pedido);
    } catch (error) {
      loggingService.logError('Erro ao notificar vendedor', error, {
        jid: jidCliente.split('@')[0],
      });
    }
  }
}
