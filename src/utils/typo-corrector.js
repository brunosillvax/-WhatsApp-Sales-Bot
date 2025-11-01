import { findBestMatch } from 'string-similarity';

class TypoCorrector {
  /**
   * Corrigir código de produto com erro de digitação
   */
  correctProductCode(inputCode, availableProducts) {
    if (!inputCode || !availableProducts || availableProducts.length === 0) {
      return null;
    }

    const input = inputCode.trim().toUpperCase();

    // Se o código exato existe, retornar
    const exactMatch = availableProducts.find(
      p => p.id_produto.toUpperCase() === input
    );
    if (exactMatch) {
      return { product: exactMatch, confidence: 1.0 };
    }

    // Buscar melhor correspondência usando similaridade de strings
    const productCodes = availableProducts.map(p => p.id_produto.toUpperCase());
    const matches = findBestMatch(input, productCodes);

    if (matches.bestMatch.rating >= 0.5) {
      // Similaridade de pelo menos 50%
      const matchedProduct = availableProducts.find(
        p => p.id_produto.toUpperCase() === matches.bestMatch.target
      );

      if (matchedProduct) {
        return {
          product: matchedProduct,
          confidence: matches.bestMatch.rating,
          suggestions: matches.ratings
            .slice(0, 3)
            .filter(r => r.rating >= 0.3)
            .map(r => availableProducts.find(p => p.id_produto.toUpperCase() === r.target))
            .filter(p => p),
        };
      }
    }

    return null;
  }

  /**
   * Corrigir comando com erro de digitação
   */
  correctCommand(inputCommand, availableCommands) {
    if (!inputCommand || !availableCommands || availableCommands.length === 0) {
      return null;
    }

    const input = inputCommand.trim().toLowerCase();

    // Se o comando exato existe, retornar
    if (availableCommands.includes(input)) {
      return { command: input, confidence: 1.0 };
    }

    // Buscar melhor correspondência
    const matches = findBestMatch(input, availableCommands);

    if (matches.bestMatch.rating >= 0.6) {
      // Similaridade de pelo menos 60% para comandos
      return {
        command: matches.bestMatch.target,
        confidence: matches.bestMatch.rating,
      };
    }

    return null;
  }

  /**
   * Sugerir produtos similares quando não encontrar
   */
  suggestProducts(searchTerm, availableProducts, maxSuggestions = 3) {
    if (!searchTerm || !availableProducts || availableProducts.length === 0) {
      return [];
    }

    const search = searchTerm.toLowerCase().trim();

    // Buscar no nome e descrição dos produtos
    const scoredProducts = availableProducts.map(product => {
      const name = (product.nome || '').toLowerCase();
      const description = (product.descricao || '').toLowerCase();
      const code = (product.id_produto || '').toLowerCase();

      // Calcular similaridade
      const nameMatch = findBestMatch(search, [name]);
      const descMatch = findBestMatch(search, [description]);
      const codeMatch = findBestMatch(search, [code]);

      // Score combinado (nome tem mais peso)
      const score = (
        nameMatch.bestMatch.rating * 0.5 +
        descMatch.bestMatch.rating * 0.3 +
        codeMatch.bestMatch.rating * 0.2
      );

      return { product, score };
    });

    // Ordenar por score e retornar top N
    return scoredProducts
      .filter(sp => sp.score >= 0.2) // Mínimo de 20% de similaridade
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(sp => sp.product);
  }

  /**
   * Normalizar entrada do usuário para busca
   */
  normalizeInput(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9\s]/gi, '') // Remover caracteres especiais
      .replace(/\s+/g, ' '); // Normalizar espaços
  }
}

export default new TypoCorrector();
