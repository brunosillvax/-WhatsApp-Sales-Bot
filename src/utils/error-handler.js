import loggingService from '../services/logging-service.js';

class ErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.initialDelay = 1000; // 1 segundo
    this.maxDelay = 10000; // 10 segundos
  }

  /**
   * Executar função com retry automático
   */
  async withRetry(fn, context = 'operacao', maxRetries = this.maxRetries) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Log do erro
        loggingService.error(
          `Erro na tentativa ${attempt}/${maxRetries} em ${context}`,
          error,
          { attempt, maxRetries }
        );

        // Se não for a última tentativa, aguardar antes de retry
        if (attempt < maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);

          loggingService.info(
            `Tentando novamente ${context} após ${delay}ms`,
            { attempt: attempt + 1, maxRetries }
          );
        }
      }
    }

    // Todas as tentativas falharam
    loggingService.error(
      `Todas as tentativas falharam em ${context}`,
      lastError,
      { maxRetries }
    );

    throw lastError;
  }

  /**
   * Calcular delay com backoff exponencial
   */
  calculateDelay(attempt) {
    // Backoff exponencial: delay = initialDelay * (2 ^ (attempt - 1))
    const exponentialDelay = this.initialDelay * Math.pow(2, attempt - 1);

    // Adicionar jitter aleatório (0-50% do delay)
    const jitter = exponentialDelay * 0.5 * Math.random();

    const totalDelay = exponentialDelay + jitter;

    // Limitar ao máximo
    return Math.min(totalDelay, this.maxDelay);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrapper para funções assíncronas com retry
   */
  wrapWithRetry(fn, context) {
    return async (...args) => {
      return this.withRetry(() => fn(...args), context);
    };
  }

  /**
   * Tratar erro de envio de mensagem especificamente
   */
  async handleMessageSendError(error, jid, message) {
    // Erros comuns do WhatsApp e como tratá-los
    const errorMessage = error.message || error.toString();

    if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET')) {
      // Erro de conexão - tentar novamente
      loggingService.warn('Erro de conexão ao enviar mensagem', {
        jid: jid.split('@')[0],
        error: errorMessage,
      });
      return { shouldRetry: true, delay: 2000 };
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      // Rate limit do WhatsApp - aguardar mais tempo
      loggingService.warn('Rate limit do WhatsApp atingido', {
        jid: jid.split('@')[0],
        error: errorMessage,
      });
      return { shouldRetry: true, delay: 5000 };
    }

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      // Usuário não encontrado - não tentar novamente
      loggingService.warn('Usuário não encontrado', {
        jid: jid.split('@')[0],
        error: errorMessage,
      });
      return { shouldRetry: false };
    }

    // Outros erros - tentar novamente
    return { shouldRetry: true, delay: 1000 };
  }
}

export default new ErrorHandler();
