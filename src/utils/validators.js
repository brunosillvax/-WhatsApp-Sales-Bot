export default {
  /**
   * Valida ID de produto (ex: A01, I02, C03)
   */
  validateProductId(id) {
    if (!id || typeof id !== 'string') {
      return { valid: false, error: 'ID do produto é obrigatório' };
    }

    const trimmed = id.trim().toUpperCase();

    // Formato: letra seguida de 2 dígitos (A01, I02, etc)
    const pattern = /^[A-Z][0-9]{2}$/;

    if (!pattern.test(trimmed)) {
      return { valid: false, error: 'ID do produto deve ter formato válido (ex: A01, I02)' };
    }

    return { valid: true, value: trimmed };
  },

  /**
   * Valida preço (deve ser número positivo)
   */
  validatePrice(price) {
    if (price === undefined || price === null || price === '') {
      return { valid: false, error: 'Preço é obrigatório' };
    }

    const num = typeof price === 'string'
      ? parseFloat(price.replace(',', '.'))
      : parseFloat(price);

    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: 'Preço deve ser um número válido' };
    }

    if (num < 0) {
      return { valid: false, error: 'Preço não pode ser negativo' };
    }

    // Limitar a 10 milhões
    if (num > 10000000) {
      return { valid: false, error: 'Preço excede o valor máximo permitido' };
    }

    return { valid: true, value: num };
  },

  /**
   * Valida quantidade (deve ser inteiro positivo)
   */
  validateQuantity(quantity) {
    if (quantity === undefined || quantity === null || quantity === '') {
      return { valid: false, error: 'Quantidade é obrigatória' };
    }

    const num = parseInt(quantity);

    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: 'Quantidade deve ser um número inteiro válido' };
    }

    if (num < 1) {
      return { valid: false, error: 'Quantidade deve ser maior que zero' };
    }

    // Limitar a 1000 unidades por vez
    if (num > 1000) {
      return { valid: false, error: 'Quantidade máxima por pedido é 1000 unidades' };
    }

    return { valid: true, value: num };
  },

  /**
   * Valida código de cupom
   */
  validateCouponCode(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Código do cupom é obrigatório' };
    }

    const trimmed = code.trim().toUpperCase();

    // Alfanumérico, 3-20 caracteres
    const pattern = /^[A-Z0-9]{3,20}$/;

    if (!pattern.test(trimmed)) {
      return { valid: false, error: 'Código do cupom deve conter apenas letras e números (3-20 caracteres)' };
    }

    return { valid: true, value: trimmed };
  },

  /**
   * Valida categoria principal
   */
  validateMainCategory(category) {
    const validCategories = ['smartphones', 'acessorios'];
    const normalized = category?.toLowerCase().trim();

    if (!normalized || !validCategories.includes(normalized)) {
      return { valid: false, error: `Categoria deve ser uma das: ${validCategories.join(', ')}` };
    }

    return { valid: true, value: normalized };
  },

  /**
   * Valida sub-categoria baseado na categoria principal
   */
  validateSubCategory(subCategory, mainCategory) {
    const normalized = subCategory?.toLowerCase().trim();
    const validSubs = {
      smartphones: ['android', 'iphone'],
      acessorios: ['cabos', 'carregadores', 'fones'],
    };

    const validForCategory = validSubs[mainCategory] || [];

    if (!normalized || !validForCategory.includes(normalized)) {
      return {
        valid: false,
        error: `Sub-categoria deve ser uma das: ${validForCategory.join(', ')}`
      };
    }

    return { valid: true, value: normalized };
  },

  /**
   * Valida estoque (inteiro não-negativo)
   */
  validateStock(stock) {
    if (stock === undefined || stock === null || stock === '') {
      return { valid: false, error: 'Estoque é obrigatório' };
    }

    const num = parseInt(stock);

    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: 'Estoque deve ser um número inteiro válido' };
    }

    if (num < 0) {
      return { valid: false, error: 'Estoque não pode ser negativo' };
    }

    return { valid: true, value: num };
  },

  /**
   * Valida número de página
   */
  validatePageNumber(page, maxPages) {
    const num = parseInt(page);

    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: 'Número de página inválido' };
    }

    if (num < 1) {
      return { valid: false, error: 'Página deve ser maior que zero' };
    }

    if (maxPages && num > maxPages) {
      return { valid: false, error: `Página não pode ser maior que ${maxPages}` };
    }

    return { valid: true, value: num };
  },
};
