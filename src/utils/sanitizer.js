export default {
  /**
   * Remove caracteres perigosos e limita tamanho
   */
  sanitizeText(text, maxLength = 500) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Remover caracteres de controle e caracteres perigosos
    let sanitized = text
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
      .replace(/[<>]/g, '') // Remove < e >
      .trim();

    // Limitar tamanho
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  },

  /**
   * Sanitiza nome de produto
   */
  sanitizeProductName(name) {
    if (!name || typeof name !== 'string') {
      return '';
    }

    // Remover caracteres perigosos, mas manter acentuação e espaços
    let sanitized = name
      .replace(/[<>{}[\]]/g, '')
      .replace(/\s+/g, ' ') // Múltiplos espaços em um
      .trim();

    // Limitar a 100 caracteres
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    return sanitized;
  },

  /**
   * Sanitiza descrição
   */
  sanitizeDescription(description) {
    if (!description || typeof description !== 'string') {
      return '';
    }

    // Permitir mais caracteres na descrição, mas remover perigosos
    let sanitized = description
      .replace(/[<>{}[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Limitar a 1000 caracteres
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }

    return sanitized;
  },

  /**
   * Sanitiza URL
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const trimmed = url.trim();

    // Validar formato básico de URL
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      // Se não for URL válida, retornar vazio
      return '';
    }
  },

  /**
   * Sanitiza entrada do usuário para comandos
   */
  sanitizeUserInput(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remover caracteres perigosos, mas manter básicos
    return input
      .replace(/[<>{}[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200); // Limitar tamanho
  },

  /**
   * Sanitiza código de produto
   */
  sanitizeProductCode(code) {
    if (!code || typeof code !== 'string') {
      return '';
    }

    // Apenas letras e números, maiúsculas
    return code
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .substring(0, 10);
  },

  /**
   * Sanitiza número de telefone do JID
   */
  sanitizeJid(jid) {
    if (!jid || typeof jid !== 'string') {
      return '';
    }

    // Extrair apenas o número antes do @
    const number = jid.split('@')[0];
    return number.replace(/[^0-9]/g, '').substring(0, 20);
  },
};
