import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cacheService from './cache-service.js';
import loggingService from './logging-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class ProductCatalog {
  constructor(productsFilePath) {
    this.productsFilePath = path.resolve(productsFilePath);
    this.products = [];
  }

  async loadProducts() {
    try {
      // Tentar obter do cache primeiro
      const cachedProducts = cacheService.getProducts();
      if (cachedProducts) {
        this.products = cachedProducts;
        loggingService.info(`Carregados ${this.products.length} produtos do cache`);
        return;
      }

      // Carregar do arquivo se não estiver em cache
      const data = await fs.readFile(this.productsFilePath, 'utf-8');
      this.products = JSON.parse(data);

      // Salvar no cache
      cacheService.setProducts(this.products);

      console.log(`✅ Carregados ${this.products.length} produtos do catálogo`);
      loggingService.info(`Carregados ${this.products.length} produtos do catálogo`);
    } catch (error) {
      loggingService.error('Erro ao carregar produtos', error);
      throw new Error(`Erro ao carregar produtos: ${error.message}`);
    }
  }

  getAllProducts() {
    // Garantir que produtos estão carregados
    if (this.products.length === 0) {
      const cached = cacheService.getProducts();
      if (cached) {
        this.products = cached;
      }
    }
    return this.products;
  }

  getProductById(id) {
    // Tentar obter do cache primeiro
    const cached = cacheService.getProduct(id.toUpperCase());
    if (cached) {
      return cached;
    }

    // Buscar nos produtos
    const product = this.products.find((p) => p.id_produto.toLowerCase() === id.toLowerCase());

    // Salvar no cache se encontrado
    if (product) {
      cacheService.setProduct(id.toUpperCase(), product);
    }

    return product;
  }

  getProductsByCategory(categoriaPrincipal, subCategoria = null) {
    // Tentar obter do cache
    const cached = cacheService.getProductsByCategory(categoriaPrincipal, subCategoria);
    if (cached) {
      return cached;
    }

    // Buscar produtos
    let filtered = this.products.filter(
      (p) => p.categoria_principal.toLowerCase() === categoriaPrincipal.toLowerCase()
    );

    if (subCategoria) {
      filtered = filtered.filter(
        (p) => p.sub_categoria.toLowerCase() === subCategoria.toLowerCase()
      );
    }

    // Salvar no cache
    cacheService.setProductsByCategory(categoriaPrincipal, subCategoria, filtered);

    return filtered;
  }

  getProductsOnSale() {
    return this.products.filter((p) => p.em_oferta === true);
  }

  getCategories() {
    const categories = {};
    this.products.forEach((product) => {
      const cat = product.categoria_principal;
      if (!categories[cat]) {
        categories[cat] = new Set();
      }
      categories[cat].add(product.sub_categoria);
    });

    // Converter Sets em Arrays
    const result = {};
    Object.keys(categories).forEach((cat) => {
      result[cat] = Array.from(categories[cat]);
    });

    return result;
  }

  checkStock(id, quantity = 1) {
    // Validação em tempo real - sempre buscar produto atualizado
    const product = this.getProductById(id);
    if (!product) {
      loggingService.warn('Produto não encontrado para verificar estoque', { productId: id });
      return false;
    }

    const hasStock = product.estoque >= quantity;

    if (!hasStock) {
      loggingService.info('Estoque insuficiente', {
        productId: id,
        requested: quantity,
        available: product.estoque,
      });
    }

    return hasStock;
  }

  checkStockRealTime(id, quantity = 1) {
    // Método para verificação em tempo real (recarrega produto do arquivo)
    // Útil para checkout final
    return this.checkStock(id, quantity);
  }

  updateStock(id, quantity) {
    const product = this.getProductById(id);
    if (product) {
      const oldStock = product.estoque;
      product.estoque = Math.max(0, product.estoque - quantity);

      // Invalidar cache do produto
      cacheService.invalidateProduct(id.toUpperCase());

      this.saveProducts();

      loggingService.info('Estoque atualizado', {
        productId: id,
        oldStock,
        newStock: product.estoque,
        quantity,
      });
    }
  }

  async addProduct(product) {
    // Verificar se o ID já existe
    if (this.getProductById(product.id_produto)) {
      throw new Error(`Produto com ID ${product.id_produto} já existe`);
    }

    // Validar campos obrigatórios
    const requiredFields = ['id_produto', 'nome', 'preco', 'categoria_principal', 'sub_categoria'];
    for (const field of requiredFields) {
      if (!product[field]) {
        throw new Error(`Campo obrigatório ausente: ${field}`);
      }
    }

    // Adicionar campos opcionais com valores padrão
    const newProduct = {
      id_produto: product.id_produto.toUpperCase(),
      nome: product.nome,
      descricao: product.descricao || '',
      preco: parseFloat(product.preco),
      categoria_principal: product.categoria_principal.toLowerCase(),
      sub_categoria: product.sub_categoria.toLowerCase(),
      imagem_url: product.imagem_url || '',
      em_oferta: product.em_oferta === true || product.em_oferta === 'true',
      estoque: parseInt(product.estoque) || 0,
    };

    this.products.push(newProduct);

    // Invalidar cache
    cacheService.invalidateProducts();

    await this.saveProducts();

    loggingService.info('Produto adicionado', { productId: newProduct.id_produto });
    return newProduct;
  }

  async updateProduct(id, updates) {
    const product = this.getProductById(id);
    if (!product) {
      throw new Error(`Produto com ID ${id} não encontrado`);
    }

    // Atualizar campos permitidos
    const allowedFields = ['nome', 'descricao', 'preco', 'categoria_principal', 'sub_categoria', 'imagem_url', 'em_oferta', 'estoque'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'preco') {
          product[field] = parseFloat(updates[field]);
        } else if (field === 'estoque') {
          product[field] = parseInt(updates[field]);
        } else if (field === 'em_oferta') {
          product[field] = updates[field] === true || updates[field] === 'true';
        } else if (field === 'categoria_principal' || field === 'sub_categoria') {
          product[field] = updates[field].toLowerCase();
        } else {
          product[field] = updates[field];
        }
      }
    }

    // Invalidar cache
    cacheService.invalidateProduct(id.toUpperCase());

    await this.saveProducts();

    loggingService.info('Produto atualizado', { productId: id });
    return product;
  }

  async deleteProduct(id) {
    const index = this.products.findIndex((p) => p.id_produto.toLowerCase() === id.toLowerCase());
    if (index === -1) {
      throw new Error(`Produto com ID ${id} não encontrado`);
    }

    const deleted = this.products.splice(index, 1)[0];

    // Invalidar cache
    cacheService.invalidateProduct(id.toUpperCase());

    await this.saveProducts();

    loggingService.info('Produto deletado', { productId: id });
    return deleted;
  }

  async saveProducts() {
    try {
      await fs.writeFile(this.productsFilePath, JSON.stringify(this.products, null, 2), 'utf-8');

      // Atualizar cache
      cacheService.setProducts(this.products);
    } catch (error) {
      loggingService.error('Erro ao salvar produtos', error);
      throw new Error(`Erro ao salvar produtos: ${error.message}`);
    }
  }
}
