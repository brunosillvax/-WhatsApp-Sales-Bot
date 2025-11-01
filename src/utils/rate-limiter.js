class RateLimiter {
  constructor() {
    // Armazenar requisições por usuário: { jid: [{ timestamp }] }
    this.requests = new Map();

    // Configurações padrão
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10');
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 1 minuto
    this.blockDurationMs = parseInt(process.env.RATE_LIMIT_BLOCK_MS || '300000'); // 5 minutos

    // Usuários bloqueados: { jid: timestamp }
    this.blocked = new Map();

    // Limpar requisições antigas periodicamente
    this.startCleanup();
  }

  /**
   * Verificar se usuário pode fazer requisição
   */
  checkLimit(jid) {
    const now = Date.now();

    // Verificar se está bloqueado
    const blockedUntil = this.blocked.get(jid);
    if (blockedUntil && now < blockedUntil) {
      const remaining = Math.ceil((blockedUntil - now) / 1000 / 60); // minutos
      return {
        allowed: false,
        blocked: true,
        message: `Você foi temporariamente bloqueado por excesso de mensagens. Aguarde ${remaining} minuto(s).`,
        retryAfter: blockedUntil - now,
      };
    }

    // Se estava bloqueado e o tempo expirou, remover do bloqueio
    if (blockedUntil && now >= blockedUntil) {
      this.blocked.delete(jid);
    }

    // Obter requisições do usuário
    let userRequests = this.requests.get(jid) || [];

    // Remover requisições fora da janela de tempo
    userRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Verificar se excedeu o limite
    if (userRequests.length >= this.maxRequests) {
      // Bloquear usuário
      this.blocked.set(jid, now + this.blockDurationMs);
      this.requests.delete(jid);

      return {
        allowed: false,
        blocked: false,
        message: `Você enviou muitas mensagens. Aguarde ${Math.ceil(this.blockDurationMs / 1000 / 60)} minuto(s).`,
        retryAfter: this.blockDurationMs,
      };
    }

    // Adicionar requisição atual
    userRequests.push(now);
    this.requests.set(jid, userRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - userRequests.length,
      resetAt: userRequests[0] + this.windowMs,
    };
  }

  /**
   * Limpar requisições antigas periodicamente
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();

      // Limpar requisições antigas
      for (const [jid, requests] of this.requests.entries()) {
        const filtered = requests.filter(
          timestamp => now - timestamp < this.windowMs
        );

        if (filtered.length === 0) {
          this.requests.delete(jid);
        } else {
          this.requests.set(jid, filtered);
        }
      }

      // Limpar bloqueios expirados
      for (const [jid, blockedUntil] of this.blocked.entries()) {
        if (now >= blockedUntil) {
          this.blocked.delete(jid);
        }
      }
    }, 60000); // Limpar a cada minuto
  }

  /**
   * Resetar limite para um usuário (útil para testes)
   */
  reset(jid) {
    this.requests.delete(jid);
    this.blocked.delete(jid);
  }

  /**
   * Obter estatísticas do rate limiter
   */
  getStats() {
    return {
      activeUsers: this.requests.size,
      blockedUsers: this.blocked.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      blockDurationMs: this.blockDurationMs,
    };
  }
}

export default new RateLimiter();
