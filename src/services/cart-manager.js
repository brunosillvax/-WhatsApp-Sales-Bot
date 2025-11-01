import loggingService from './logging-service.js';
import couponService from './coupon-service.js';

export default class CartManager {
  constructor() {
    // Carrinhos de cada usuário: { jid: { itens: [], total: 0, desconto: 0, cupom: null } }
    this.carts = new Map();
  }

  getCart(jid) {
    const cart = this.carts.get(jid);
    if (!cart) {
      return { itens: [], total: 0, totalOriginal: 0, desconto: 0, cupom: null };
    }
    return cart;
  }

  addItem(jid, product, quantity = 1, productCatalog = null) {
    const cart = this.getCart(jid);

    // Validar estoque em tempo real se productCatalog fornecido
    if (productCatalog) {
      const hasStock = productCatalog.checkStockRealTime(product.id_produto, quantity);
      if (!hasStock) {
        loggingService.warn('Tentativa de adicionar produto sem estoque', {
          jid: jid.split('@')[0],
          productId: product.id_produto,
          quantity,
        });
        throw new Error(`Produto ${product.nome} não tem estoque suficiente. Disponível: ${product.estoque || 0} unidade(s)`);
      }
    }

    const existingItemIndex = cart.itens.findIndex(
      (item) => item.id_produto === product.id_produto
    );

    if (existingItemIndex >= 0) {
      // Item já existe, incrementar quantidade
      const newQuantity = cart.itens[existingItemIndex].quantidade + quantity;

      // Validar estoque total após incremento
      if (productCatalog) {
        const hasStock = productCatalog.checkStockRealTime(product.id_produto, newQuantity);
        if (!hasStock) {
          throw new Error(`Quantidade solicitada (${newQuantity}) excede o estoque disponível (${product.estoque || 0})`);
        }
      }

      cart.itens[existingItemIndex].quantidade = newQuantity;
    } else {
      // Novo item
      cart.itens.push({
        id_produto: product.id_produto,
        nome: product.nome,
        preco: product.preco,
        quantidade: quantity,
      });
    }

    this.calculateTotal(cart);
    this.carts.set(jid, cart);

    loggingService.logCartAction('item_adicionado', jid, {
      productId: product.id_produto,
      quantity,
    });

    return cart;
  }

  removeItem(jid, productId) {
    const cart = this.getCart(jid);
    cart.itens = cart.itens.filter((item) => item.id_produto !== productId);
    this.calculateTotal(cart);
    this.carts.set(jid, cart);

    loggingService.logCartAction('item_removido', jid, { productId });
    return cart;
  }

  clearCart(jid) {
    this.carts.delete(jid);
    loggingService.logCartAction('carrinho_limpo', jid);
    return { itens: [], total: 0, totalOriginal: 0, desconto: 0, cupom: null };
  }

  calculateTotal(cart) {
    // Calcular total original
    cart.totalOriginal = cart.itens.reduce(
      (sum, item) => sum + item.preco * item.quantidade,
      0
    );

    // Aplicar cupom de desconto se existir
    if (cart.cupom) {
      try {
        const couponResult = couponService.applyCoupon(cart.cupom, cart.totalOriginal);
        if (couponResult.success) {
          cart.desconto = couponResult.desconto;
          cart.total = couponResult.novoTotal;
        } else {
          // Cupom inválido, remover
          cart.cupom = null;
          cart.desconto = 0;
          cart.total = cart.totalOriginal;
        }
      } catch (error) {
        loggingService.error('Erro ao aplicar cupom', error, { cupom: cart.cupom });
        cart.cupom = null;
        cart.desconto = 0;
        cart.total = cart.totalOriginal;
      }
    } else {
      cart.desconto = 0;
      cart.total = cart.totalOriginal;
    }

    return cart.total;
  }

  /**
   * Aplicar cupom de desconto
   */
  applyCoupon(jid, couponCode) {
    const cart = this.getCart(jid);

    if (cart.itens.length === 0) {
      throw new Error('Carrinho está vazio. Adicione produtos antes de aplicar um cupom.');
    }

    // Calcular total original primeiro se não existir
    if (!cart.totalOriginal) {
      cart.totalOriginal = cart.itens.reduce(
        (sum, item) => sum + item.preco * item.quantidade,
        0
      );
    }

    const result = couponService.applyCoupon(couponCode, cart.totalOriginal);

    if (!result.success) {
      throw new Error(result.error);
    }

    cart.cupom = couponCode.toUpperCase();
    this.calculateTotal(cart);
    this.carts.set(jid, cart);

    loggingService.info('Cupom aplicado ao carrinho', {
      jid: jid.split('@')[0],
      cupom: couponCode,
      desconto: result.desconto,
    });

    return result;
  }

  /**
   * Remover cupom de desconto
   */
  removeCoupon(jid) {
    const cart = this.getCart(jid);
    cart.cupom = null;
    this.calculateTotal(cart);
    this.carts.set(jid, cart);

    loggingService.info('Cupom removido do carrinho', {
      jid: jid.split('@')[0],
    });
  }

  /**
   * Validar estoque de todos os itens do carrinho em tempo real
   */
  validateCartStock(jid, productCatalog) {
    const cart = this.getCart(jid);
    const errors = [];

    for (const item of cart.itens) {
      const hasStock = productCatalog.checkStockRealTime(item.id_produto, item.quantidade);
      if (!hasStock) {
        const product = productCatalog.getProductById(item.id_produto);
        const available = product?.estoque || 0;
        errors.push({
          productId: item.id_produto,
          productName: item.nome,
          requested: item.quantidade,
          available,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getCartSummary(jid) {
    const cart = this.getCart(jid);
    if (cart.itens.length === 0) {
      return '🛒 Seu carrinho está vazio.';
    }

    let summary = '🛒 *Seu Carrinho:*\n\n';
    cart.itens.forEach((item, index) => {
      const subtotal = item.preco * item.quantidade;
      summary += `${index + 1}. ${item.nome} (${item.id_produto})\n`;
      summary += `   Quantidade: ${item.quantidade}x\n`;
      summary += `   Valor: R$ ${item.preco.toFixed(2)}\n`;
      summary += `   Subtotal: R$ ${subtotal.toFixed(2)}\n\n`;
    });

    // Mostrar desconto se houver
    if (cart.cupom && cart.desconto > 0) {
      summary += `💰 *Subtotal: R$ ${(cart.totalOriginal || cart.total).toFixed(2)}*\n`;
      summary += `🎟️ *Cupom ${cart.cupom}: -R$ ${cart.desconto.toFixed(2)}*\n`;
    }

    summary += `\n*Total: R$ ${cart.total.toFixed(2)}*`;
    return summary;
  }
}
