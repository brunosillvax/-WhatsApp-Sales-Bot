import welcomeMessages from '../utils/welcome-messages.js';
import typoCorrector from '../utils/typo-corrector.js';
import pagination from '../utils/pagination.js';
import sanitizer from '../utils/sanitizer.js';
import validators from '../utils/validators.js';
import loggingService from '../services/logging-service.js';

export default class ConversationFlow {
  constructor(productCatalog, cartManager, stateManager) {
    this.productCatalog = productCatalog;
    this.cartManager = cartManager;
    this.stateManager = stateManager;
    this.whatsappCore = null;
  }

  setWhatsAppCore(whatsappCore) {
    this.whatsappCore = whatsappCore;
  }

  async handleMessage(jid, text, originalMsg) {
    // Se ainda não tiver o WhatsAppCore, não processar
    if (!this.whatsappCore) {
      // Será definido após a inicialização
      return;
    }

    const userState = this.stateManager.getState(jid);
    const state = userState.state;
    const data = userState.data;

    // Processar mensagem baseado no estado atual
    switch (state) {
      case 'INITIAL':
        await this.handleInitial(jid, text);
        break;

      case 'MAIN_MENU':
        await this.handleMainMenu(jid, text);
        break;

      case 'VIEWING_CATEGORIES':
        await this.handleCategories(jid, text);
        break;

      case 'VIEWING_SUB_CATEGORIES':
        await this.handleSubCategories(jid, text, data);
        break;

      case 'VIEWING_PRODUCTS':
        await this.handleProducts(jid, text, data);
        break;

      case 'ADDING_TO_CART':
        await this.handleAddingToCart(jid, text);
        break;

      case 'VIEWING_CART':
        await this.handleCart(jid, text);
        break;

      case 'CHECKOUT':
        await this.handleCheckout(jid, text);
        break;

      case 'TRANSFERRED_TO_HUMAN':
        // Usuário já foi transferido, não processar mais mensagens
        return;

      default:
        await this.handleInitial(jid, text);
        break;
    }
  }

  async handleInitial(jid, text) {
    // Sanitizar entrada
    const sanitizedText = sanitizer.sanitizeUserInput(text);

    // Mensagens iniciais que disparam o menu
    const greetings = ['oi', 'olá', 'ola', 'hello', 'hi', 'iniciar', 'start', 'menu'];

    if (greetings.some((g) => sanitizedText.toLowerCase().includes(g))) {
      await this.showMainMenu(jid);
    } else {
      // Qualquer outra mensagem também inicia o fluxo
      await this.showMainMenu(jid);
    }
  }

  async showMainMenu(jid) {
    // Mensagem de boas-vindas personalizada
    let message = welcomeMessages.generateWelcomeMessage(jid, this.productCatalog);

    // Adicionar instruções para escolher opção
    message += '\n\n*Escolha uma opção abaixo:*';

    const buttons = [
      { id: 'ver_produtos', text: '1️⃣ Ver Produtos' },
      { id: 'ofertas', text: '2️⃣ Ofertas da Semana' },
      { id: 'suporte', text: '3️⃣ Manutenção / Suporte' },
      { id: 'loja', text: '4️⃣ Nossa Loja Física' },
      { id: 'equipe', text: '5️⃣ Falar com a Equipe' },
    ];

    // Enviar mensagem e botões juntos
    await this.whatsappCore.sendMessageWithButtons(jid, message, buttons);
    this.stateManager.setState(jid, 'MAIN_MENU');
  }

  async handleMainMenu(jid, text) {
    const normalizedText = text.toLowerCase();

    // Reconhecer intenção de ver/comprar produtos
    if (
      normalizedText.includes('1') ||
      normalizedText.includes('ver') ||
      normalizedText.includes('produtos') ||
      normalizedText.includes('comprar') ||
      normalizedText.includes('celular') ||
      normalizedText.includes('smartphone') ||
      normalizedText.includes('iphone') ||
      normalizedText.includes('android') ||
      normalizedText === 'ver_produtos'
    ) {
      await this.showCategories(jid);
    } else if (
      normalizedText.includes('2') ||
      normalizedText.includes('ofertas') ||
      normalizedText.includes('promoção') ||
      normalizedText.includes('promocao') ||
      normalizedText === 'ofertas'
    ) {
      await this.showOffers(jid);
    } else if (
      normalizedText.includes('3') ||
      normalizedText.includes('suporte') ||
      normalizedText.includes('manutenção') ||
      normalizedText.includes('manutencao') ||
      normalizedText.includes('ajuda') ||
      normalizedText === 'suporte'
    ) {
      await this.showSupport(jid);
    } else if (
      normalizedText.includes('4') ||
      normalizedText.includes('loja') ||
      normalizedText.includes('física') ||
      normalizedText.includes('fisica') ||
      normalizedText.includes('endereço') ||
      normalizedText.includes('endereco') ||
      normalizedText === 'loja'
    ) {
      await this.showStoreInfo(jid);
    } else if (
      normalizedText.includes('5') ||
      normalizedText.includes('equipe') ||
      normalizedText.includes('falar') ||
      normalizedText.includes('atendente') ||
      normalizedText.includes('vendedor') ||
      normalizedText === 'equipe'
    ) {
      await this.transferToHuman(jid);
    } else if (normalizedText.includes('v') || normalizedText.includes('voltar')) {
      // Voltar ao menu principal
      await this.showMainMenu(jid);
    } else {
      // Entrada inválida, mostrar menu novamente com ajuda
      await this.whatsappCore.sendMessage(
        jid,
        '🤔 Não entendi. Use os botões acima ou digite:\n\n' +
        '• "1" ou "produtos" para ver produtos\n' +
        '• "2" ou "ofertas" para ver promoções\n' +
        '• "3" ou "suporte" para ajuda\n' +
        '• "4" ou "loja" para informações\n' +
        '• "5" ou "equipe" para falar com alguém'
      );
      await this.showMainMenu(jid);
    }
  }

  async showCategories(jid) {
    const message = 'Quais produtos você gostaria de ver?';

    const buttons = [
      { id: 'categoria_smartphones', text: '📱 Smartphones' },
      { id: 'categoria_acessorios', text: '🎧 Acessórios' },
      { id: 'voltar_menu', text: '⬅️ Voltar ao Menu' },
    ];

    await this.whatsappCore.sendMessageWithButtons(jid, message, buttons);
    this.stateManager.setState(jid, 'VIEWING_CATEGORIES');
  }

  async handleCategories(jid, text) {
    const normalizedText = text.toLowerCase().trim();

    // Reconhecer números dos botões ou nomes
    if (
      normalizedText === '1' ||
      normalizedText.includes('smartphone') ||
      normalizedText.includes('celular') ||
      normalizedText === 'categoria_smartphones'
    ) {
      await this.showSubCategories(jid, 'smartphones');
    } else if (
      normalizedText === '2' ||
      normalizedText.includes('acessorios') ||
      normalizedText.includes('acessório') ||
      normalizedText === 'categoria_acessorios'
    ) {
      await this.showSubCategories(jid, 'acessorios');
    } else if (normalizedText.includes('v') || normalizedText.includes('voltar') || normalizedText === 'voltar_menu') {
      await this.showMainMenu(jid);
    } else {
      // Se não reconheceu, mostrar menu de categorias novamente com ajuda
      await this.whatsappCore.sendMessage(
        jid,
        '🤔 Não entendi. Escolha uma opção:\n\n' +
        '*1.* Smartphones\n' +
        '*2.* Acessórios\n\n' +
        'Ou digite *V* para voltar.'
      );
      await this.showCategories(jid);
    }
  }

  async showSubCategories(jid, categoriaPrincipal) {
    const categories = this.productCatalog.getCategories();
    const subCategorias = categories[categoriaPrincipal] || [];

    let message = '';
    if (categoriaPrincipal === 'smartphones') {
      message = 'Temos as melhores marcas. Qual você prefere?';
    } else if (categoriaPrincipal === 'acessorios') {
      message = 'Escolha uma categoria de acessórios:';
    }

    const buttons = [];

    if (categoriaPrincipal === 'smartphones') {
      if (subCategorias.includes('android')) {
        buttons.push({ id: 'sub_android', text: '🤖 Android' });
      }
      if (subCategorias.includes('iphone')) {
        buttons.push({ id: 'sub_iphone', text: '🍎 iPhone' });
      }
    } else if (categoriaPrincipal === 'acessorios') {
      if (subCategorias.includes('cabos')) {
        buttons.push({ id: 'sub_cabos', text: '🔌 Cabos' });
      }
      if (subCategorias.includes('carregadores')) {
        buttons.push({ id: 'sub_carregadores', text: '🔋 Carregadores' });
      }
      if (subCategorias.includes('fones')) {
        buttons.push({ id: 'sub_fones', text: '🎧 Fones' });
      }
    }

    buttons.push({ id: 'voltar_categorias', text: '⬅️ Voltar' });

    await this.whatsappCore.sendMessageWithButtons(jid, message, buttons);
    this.stateManager.setState(jid, 'VIEWING_SUB_CATEGORIES', { categoriaPrincipal });
  }

  async handleSubCategories(jid, text, data) {
    const categoriaPrincipal = data.categoriaPrincipal || 'smartphones';
    const normalizedText = text.toLowerCase().trim();
    let subCategoria = null;

    // Obter sub-categorias disponíveis
    const categories = this.productCatalog.getCategories();
    const subCategorias = categories[categoriaPrincipal] || [];

    // Reconhecer por número (1 = primeira sub-categoria, 2 = segunda, etc.)
    if (normalizedText === '1' && subCategorias.length > 0) {
      subCategoria = subCategorias[0]; // Primeira sub-categoria
    } else if (normalizedText === '2' && subCategorias.length > 1) {
      subCategoria = subCategorias[1]; // Segunda sub-categoria
    } else if (normalizedText === '3' && subCategorias.length > 2) {
      subCategoria = subCategorias[2]; // Terceira sub-categoria
    }
    // Reconhecer por nome
    else if (normalizedText.includes('android') || normalizedText === 'sub_android') {
      subCategoria = 'android';
    } else if (normalizedText.includes('iphone') || normalizedText === 'sub_iphone') {
      subCategoria = 'iphone';
    } else if (normalizedText.includes('cabos') || normalizedText === 'sub_cabos') {
      subCategoria = 'cabos';
    } else if (normalizedText.includes('carregador') || normalizedText === 'sub_carregadores') {
      subCategoria = 'carregadores';
    } else if (normalizedText.includes('fones') || normalizedText === 'sub_fones') {
      subCategoria = 'fones';
    } else if (normalizedText.includes('v') || normalizedText.includes('voltar') || normalizedText === 'voltar_categorias') {
      await this.showCategories(jid);
      return;
    } else {
      // Se não reconheceu, mostrar menu novamente com ajuda
      await this.whatsappCore.sendMessage(
        jid,
        '🤔 Não entendi. Escolha uma opção das opções acima ou digite *V* para voltar.'
      );
      await this.showSubCategories(jid, categoriaPrincipal);
      return;
    }

    // Só mostrar produtos se encontrou sub-categoria válida
    if (subCategoria) {
      await this.showProducts(jid, categoriaPrincipal, subCategoria);
    } else {
      await this.showSubCategories(jid, categoriaPrincipal);
    }
  }

  async showProducts(jid, categoriaPrincipal, subCategoria) {
    const products = this.productCatalog.getProductsByCategory(categoriaPrincipal, subCategoria);

    if (products.length === 0) {
      await this.whatsappCore.sendMessage(
        jid,
        '❌ Não encontramos produtos nesta categoria no momento. Tente outra categoria.'
      );
      await this.showSubCategories(jid, categoriaPrincipal);
      return;
    }

    // Enviar cada produto individualmente
    for (const product of products) {
      let productMessage = `📱 *${product.nome}*\n\n`;
      productMessage += `${product.descricao}\n\n`;
      productMessage += `💰 *Valor: R$ ${product.preco.toFixed(2)}*\n`;

      if (product.em_oferta) {
        productMessage += `🏷️ *EM OFERTA!*\n`;
      }

      productMessage += `\n🔖 *Código: ${product.id_produto}*`;
      productMessage += `\n📦 Estoque: ${product.estoque} unidades`;

      // Enviar imagem se disponível
      if (product.imagem_url && product.imagem_url.trim() !== '') {
        await this.whatsappCore.sendMessageWithImage(
          jid,
          product.imagem_url,
          productMessage
        );
      } else {
        await this.whatsappCore.sendMessage(jid, productMessage);
      }

      // Pequeno delay entre produtos
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Mensagem final com instruções
    const finalMessage = `\n✨ Para adicionar ao carrinho, digite o *Código do produto* (ex: ${products[0].id_produto}).\n\n`;
    const finalMessage2 = `Digite *V* para voltar.`;

    await this.whatsappCore.sendMessage(jid, finalMessage);
    await this.whatsappCore.sendMessage(jid, finalMessage2);

    this.stateManager.setState(jid, 'VIEWING_PRODUCTS', { categoriaPrincipal, subCategoria });
  }

  async handleProducts(jid, text, data) {
    // Verificar se é um código de produto
    const productId = text.trim().toUpperCase();
    const product = this.productCatalog.getProductById(productId);

    if (product) {
      // Adicionar ao carrinho
      if (!this.productCatalog.checkStock(productId, 1)) {
        await this.whatsappCore.sendMessage(
          jid,
          `❌ Desculpe, o produto ${product.nome} está fora de estoque.`
        );
        return;
      }

      this.cartManager.addItem(jid, product, 1);
      await this.whatsappCore.sendMessage(
        jid,
        `✅ ${product.nome} adicionado ao seu carrinho!\n\nDigite *carrinho* para finalizar ou continue navegando.`
      );

      this.stateManager.setState(jid, 'ADDING_TO_CART');
    } else if (text.includes('v') || text.includes('voltar')) {
      const categoriaPrincipal = data.categoriaPrincipal || 'smartphones';
      await this.showSubCategories(jid, categoriaPrincipal);
    } else if (text.includes('carrinho')) {
      await this.showCart(jid);
    } else {
      await this.whatsappCore.sendMessage(
        jid,
        '❌ Código de produto inválido. Digite o código do produto (ex: A01) ou V para voltar.'
      );
    }
  }

  async handleAddingToCart(jid, text) {
    if (text.includes('carrinho')) {
      await this.showCart(jid);
    } else if (text.includes('v') || text.includes('voltar')) {
      await this.showMainMenu(jid);
    } else {
      // Tentar processar como código de produto novamente
      const productId = text.trim().toUpperCase();
      const product = this.productCatalog.getProductById(productId);

      if (product) {
        if (!this.productCatalog.checkStock(productId, 1)) {
          await this.whatsappCore.sendMessage(
            jid,
            `❌ Desculpe, o produto ${product.nome} está fora de estoque.`
          );
          return;
        }

        this.cartManager.addItem(jid, product, 1);
        await this.whatsappCore.sendMessage(
          jid,
          `✅ ${product.nome} adicionado ao seu carrinho!\n\nDigite *carrinho* para finalizar ou continue navegando.`
        );
      } else {
        await this.whatsappCore.sendMessage(
          jid,
          'Digite o *código do produto* para adicionar, *carrinho* para finalizar ou *V* para voltar ao menu.'
        );
      }
    }
  }

  async showCart(jid) {
    const cart = this.cartManager.getCart(jid);

    if (cart.itens.length === 0) {
      await this.whatsappCore.sendMessage(
        jid,
        '🛒 Seu carrinho está vazio. Navegue pelos produtos para adicionar itens.'
      );
      await this.showMainMenu(jid);
      return;
    }

    const summary = this.cartManager.getCartSummary(jid);
    const message = summary + '\n\nDeseja finalizar o pedido?';

    const buttons = [
      { id: 'finalizar_pedido', text: '✅ Sim, finalizar agora' },
      { id: 'limpar_carrinho', text: '🗑️ Limpar carrinho' },
      { id: 'voltar_menu', text: '⬅️ Voltar ao Menu' },
    ];

    await this.whatsappCore.sendMessageWithButtons(jid, message, buttons);
    this.stateManager.setState(jid, 'VIEWING_CART');
  }

  async handleCart(jid, text) {
    if (text.includes('finalizar') || text === 'finalizar_pedido') {
      await this.showCheckout(jid);
    } else if (text.includes('limpar') || text === 'limpar_carrinho') {
      this.cartManager.clearCart(jid);
      await this.whatsappCore.sendMessage(
        jid,
        '🗑️ Carrinho limpo com sucesso!'
      );
      await this.showMainMenu(jid);
    } else if (text.includes('v') || text.includes('voltar') || text === 'voltar_menu') {
      await this.showMainMenu(jid);
    } else {
      await this.showCart(jid);
    }
  }

  async showCheckout(jid) {
    const cart = this.cartManager.getCart(jid);

    if (cart.itens.length === 0) {
      await this.whatsappCore.sendMessage(
        jid,
        '❌ Seu carrinho está vazio. Não é possível finalizar o pedido.'
      );
      await this.showMainMenu(jid);
      return;
    }

    const summary = this.cartManager.getCartSummary(jid);
    const message = summary + '\n\n✅ Seu pedido foi reservado! Um vendedor da nossa equipe já foi notificado e entrará em contato por aqui para confirmar os detalhes de pagamento e entrega.\n\nObrigado pela preferência! 🎉';

    await this.whatsappCore.sendMessage(jid, message);

    // Notificar vendedor humano
    const pedido = {
      itens: cart.itens,
      total: cart.total,
      timestamp: new Date().toISOString(),
    };

    // Obter nome do cliente (se disponível)
    const nomeCliente = jid.split('@')[0];
    await this.whatsappCore.notifyVendedorHumano(jid, nomeCliente, pedido);

    // Limpar carrinho e mudar estado
    this.cartManager.clearCart(jid);
    this.stateManager.setState(jid, 'TRANSFERRED_TO_HUMAN');
  }

  async handleCheckout(jid, text) {
    // Após checkout, não processar mais mensagens automáticas
    // O vendedor humano assumirá o atendimento
    await this.whatsappCore.sendMessage(
      jid,
      '👋 Aguarde o contato do nosso vendedor. Ele entrará em contato em breve!'
    );
  }

  async showOffers(jid) {
    const offers = this.productCatalog.getProductsOnSale();

    if (offers.length === 0) {
      await this.whatsappCore.sendMessage(
        jid,
        '📢 Não temos ofertas especiais no momento. Mas temos produtos incríveis esperando por você!'
      );
      await this.showMainMenu(jid);
      return;
    }

    await this.whatsappCore.sendMessage(
      jid,
      `🎉 *Ofertas da Semana!*\n\nTemos ${offers.length} produtos em promoção:\n`
    );

    for (const product of offers) {
      let productMessage = `🏷️ *${product.nome}*\n`;
      productMessage += `💰 *Valor: R$ ${product.preco.toFixed(2)}*\n`;
      productMessage += `🔖 *Código: ${product.id_produto}*\n\n`;

      await this.whatsappCore.sendMessage(jid, productMessage);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    await this.whatsappCore.sendMessage(
      jid,
      'Digite o *código do produto* para adicionar ao carrinho ou *V* para voltar ao menu.'
    );

    this.stateManager.setState(jid, 'ADDING_TO_CART');
  }

  async showSupport(jid) {
    const message = `🔧 *Manutenção / Suporte*\n\n`;
    const message2 = `Nossa equipe de suporte está pronta para ajudar!\n\n`;
    const message3 = `Entre em contato conosco através das seguintes opções:\n\n`;
    const message4 = `📧 Email: suporte@loja.com\n`;
    const message5 = `📱 WhatsApp: +55 11 99999-9999\n`;
    const message6 = `🌐 Site: www.loja.com/suporte\n\n`;
    const message7 = `Ou escolha uma opção abaixo:`;

    const buttons = [
      { id: 'equipe', text: '👤 Falar com Equipe' },
      { id: 'voltar_menu', text: '⬅️ Voltar ao Menu' },
    ];

    await this.whatsappCore.sendMessage(
      jid,
      message + message2 + message3 + message4 + message5 + message6 + message7
    );
    await this.whatsappCore.sendMessageWithButtons(jid, '', buttons);

    this.stateManager.setState(jid, 'MAIN_MENU');
  }

  async showStoreInfo(jid) {
    const message = `🏪 *Nossa Loja Física*\n\n`;
    const message2 = `Venha nos visitar!\n\n`;
    const message3 = `📍 *Endereço:*\n`;
    const message4 = `Rua Exemplo, 123\n`;
    const message5 = `Centro - São Paulo/SP\n`;
    const message6 = `CEP: 01000-000\n\n`;
    const message7 = `🕐 *Horário de Funcionamento:*\n`;
    const message8 = `Segunda a Sexta: 9h às 18h\n`;
    const message9 = `Sábado: 9h às 13h\n`;
    const message10 = `Domingo: Fechado\n\n`;
    const message11 = `📞 *Telefone:* (11) 3333-4444`;

    await this.whatsappCore.sendMessage(
      jid,
      message + message2 + message3 + message4 + message5 + message6 + message7 + message8 + message9 + message10 + message11
    );

    const buttons = [
      { id: 'voltar_menu', text: '⬅️ Voltar ao Menu' },
    ];

    await this.whatsappCore.sendMessageWithButtons(jid, 'O que deseja fazer?', buttons);
    this.stateManager.setState(jid, 'MAIN_MENU');
  }

  async transferToHuman(jid) {
    const message = `👤 *Falar com a Equipe*\n\n`;
    const message2 = `Você será transferido para um de nossos vendedores. Aguarde um momento...\n\n`;
    const message3 = `Em breve um membro da nossa equipe entrará em contato!`;

    await this.whatsappCore.sendMessage(jid, message + message2 + message3);

    // Notificar vendedor humano sobre transferência
    const vendedorJid = process.env.VENDEDOR_HUMANO_JID;
    if (vendedorJid) {
      await this.whatsappCore.sendMessage(
        vendedorJid,
        `🔄 *NOVA TRANSFERÊNCIA*\n\nCliente ${jid.split('@')[0]} solicitou falar com a equipe.\nEntre em contato!`
      );
    }

    this.stateManager.setState(jid, 'TRANSFERRED_TO_HUMAN');
  }
}
