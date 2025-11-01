import NodeCache from 'node-cache';

class CacheService {
  constructor() {
    // Cache com TTL de 1 hora
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hora em segundos
      checkperiod: 600, // Verificar expiração a cada 10 minutos
      useClones: false, // Usar referências para melhor performance
    });
  }

  /**
   * Obter produtos do cache
   */
  getProducts() {
    return this.cache.get('products') || null;
  }

  /**
   * Salvar produtos no cache
   */
  setProducts(products) {
    this.cache.set('products', products);
  }

  /**
   * Obter produto específico do cache
   */
  getProduct(id) {
    return this.cache.get(`product_${id}`) || null;
  }

  /**
   * Salvar produto específico no cache
   */
  setProduct(id, product) {
    this.cache.set(`product_${id}`, product);
  }

  /**
   * Obter produtos por categoria do cache
   */
  getProductsByCategory(category, subCategory = null) {
    const key = subCategory
      ? `products_${category}_${subCategory}`
      : `products_${category}`;
    return this.cache.get(key) || null;
  }

  /**
   * Salvar produtos por categoria no cache
   */
  setProductsByCategory(category, subCategory, products) {
    const key = subCategory
      ? `products_${category}_${subCategory}`
      : `products_${category}`;
    this.cache.set(key, products);
  }

  /**
   * Invalidar cache de produtos (quando produto é editado/criado/deletado)
   */
  invalidateProducts() {
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.startsWith('product_') || key.startsWith('products')) {
        this.cache.del(key);
      }
    });
  }

  /**
   * Invalidar cache de um produto específico
   */
  invalidateProduct(id) {
    this.cache.del(`product_${id}`);
    // Invalidar também caches de categorias
    this.invalidateProducts();
  }

  /**
   * Limpar todo o cache
   */
  clear() {
    this.cache.flushAll();
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    return this.cache.getStats();
  }
}

export default new CacheService();
