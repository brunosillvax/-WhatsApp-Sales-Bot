class MessageBatcher {
  constructor() {
    // Buffer de mensagens por usuário: { jid: [{ text, options, delay }] }
    this.buffers = new Map();

    // Tempo de espera antes de enviar grupo (ms)
    this.batchDelay = parseInt(process.env.MESSAGE_BATCH_DELAY || '500');

    // Tamanho máximo do batch
    this.maxBatchSize = parseInt(process.env.MESSAGE_BATCH_SIZE || '3');
  }

  /**
   * Adicionar mensagem ao buffer
   */
  addMessage(jid, text, options = {}) {
    if (!this.buffers.has(jid)) {
      this.buffers.set(jid, []);
    }

    const buffer = this.buffers.get(jid);
    buffer.push({ text, options, timestamp: Date.now() });

    // Se atingir tamanho máximo, enviar imediatamente
    if (buffer.length >= this.maxBatchSize) {
      return this.flush(jid);
    }

    // Agendar envio após delay
    this.scheduleFlush(jid);
  }

  /**
   * Agendar envio do buffer
   */
  scheduleFlush(jid) {
    // Limpar timeout anterior se existir
    if (this.timeouts && this.timeouts.has(jid)) {
      clearTimeout(this.timeouts.get(jid));
    }

    if (!this.timeouts) {
      this.timeouts = new Map();
    }

    const timeout = setTimeout(() => {
      this.flush(jid);
      if (this.timeouts) {
        this.timeouts.delete(jid);
      }
    }, this.batchDelay);

    this.timeouts.set(jid, timeout);
  }

  /**
   * Enviar todas as mensagens do buffer de uma vez
   */
  flush(jid) {
    const buffer = this.buffers.get(jid);

    if (!buffer || buffer.length === 0) {
      return null;
    }

    // Limpar timeout se existir
    if (this.timeouts && this.timeouts.has(jid)) {
      clearTimeout(this.timeouts.get(jid));
      this.timeouts.delete(jid);
    }

    // Pegar mensagens do buffer
    const messages = buffer.splice(0);
    this.buffers.delete(jid);

    // Agrupar mensagens em uma única
    if (messages.length === 1) {
      return messages[0];
    }

    // Combinar múltiplas mensagens
    const combinedText = messages
      .map(msg => msg.text)
      .join('\n\n');

    return {
      text: combinedText,
      options: messages[0]?.options || {},
      wasBatched: true,
      originalCount: messages.length,
    };
  }

  /**
   * Forçar envio imediato de todas as mensagens pendentes
   */
  flushAll() {
    const results = [];
    for (const jid of this.buffers.keys()) {
      const result = this.flush(jid);
      if (result) {
        results.push({ jid, message: result });
      }
    }
    return results;
  }

  /**
   * Limpar buffer de um usuário
   */
  clear(jid) {
    this.buffers.delete(jid);
    if (this.timeouts && this.timeouts.has(jid)) {
      clearTimeout(this.timeouts.get(jid));
      this.timeouts.delete(jid);
    }
  }

  /**
   * Limpar todos os buffers
   */
  clearAll() {
    this.buffers.clear();
    if (this.timeouts) {
      for (const timeout of this.timeouts.values()) {
        clearTimeout(timeout);
      }
      this.timeouts.clear();
    }
  }

  /**
   * Verificar se há mensagens pendentes
   */
  hasPending(jid) {
    const buffer = this.buffers.get(jid);
    return buffer && buffer.length > 0;
  }
}

export default new MessageBatcher();
