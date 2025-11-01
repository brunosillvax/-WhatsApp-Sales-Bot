/**
 * Script de Testes Automatizados - WhatsApp Sales Bot
 *
 * Este script testa automaticamente todas as funcionalidades principais do bot
 * sem precisar interagir manualmente pelo WhatsApp.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ProductCatalog from '../src/services/product-catalog.js';
import CartManager from '../src/services/cart-manager.js';
import StateManager from '../src/core/state-manager.js';
import ConversationFlow from '../src/handlers/conversation-flow.js';
import AdminHandler from '../src/handlers/admin-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Mock do WhatsAppCore para testes
class MockWhatsAppCore {
  constructor() {
    this.sentMessages = [];
    this.sentButtons = [];
    this.sentImages = [];
    this.sentLists = [];
  }

  async sendMessage(jid, text, options = {}) {
    this.sentMessages.push({ jid, text, options, timestamp: Date.now() });
    console.log(`  📤 [MENSAGEM] ${text.substring(0, 50)}...`);
    return Promise.resolve();
  }

  async sendMessageWithButtons(jid, text, buttons, options = {}) {
    this.sentButtons.push({ jid, text, buttons, options, timestamp: Date.now() });
    console.log(`  📤 [BOTÕES] ${buttons.length} botão(ões) enviados`);
    return Promise.resolve();
  }

  async sendMessageWithImage(jid, imageUrl, caption, options = {}) {
    this.sentImages.push({ jid, imageUrl, caption, options, timestamp: Date.now() });
    console.log(`  📤 [IMAGEM] ${caption?.substring(0, 50) || 'Sem legenda'}...`);
    return Promise.resolve();
  }

  async sendMessageWithList(jid, text, title, buttonText, sections, options = {}) {
    this.sentLists.push({ jid, text, title, buttonText, sections, options, timestamp: Date.now() });
    console.log(`  📤 [LISTA] ${title || text?.substring(0, 50) || ''}...`);
    return Promise.resolve();
  }

  setWhatsAppCore() {}
}

// Resultados dos testes
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

// Utilitários
function logTest(testName) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}🧪 TESTE: ${testName}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    console.log(`${colors.green}  ✅ PASSOU: ${message}${colors.reset}`);
    return true;
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    console.log(`${colors.red}  ❌ FALHOU: ${message}${colors.reset}`);
    return false;
  }
}

function assertMessageContains(messages, searchText, description) {
  if (!messages || messages.length === 0) {
    return assert(false, `${description} - Nenhuma mensagem encontrada`);
  }
  const found = messages.some(msg =>
    msg.text && msg.text.toLowerCase().includes(searchText.toLowerCase())
  );
  return assert(found, `${description} - Esperado texto contendo "${searchText}"`);
}

function assertButtonsCount(buttons, expectedCount, description) {
  const actualCount = buttons?.length || 0;
  return assert(
    actualCount === expectedCount,
    `${description} - Esperado ${expectedCount} botão(ões), encontrado ${actualCount}`
  );
}

// Função para simular envio de mensagem
async function simulateMessage(conversationFlow, whatsappCore, jid, text) {
  const originalMsg = {
    key: {
      remoteJid: jid,
      fromMe: false,
      id: `test_${Date.now()}_${Math.random()}`,
    },
    message: {
      conversation: text,
    },
  };

  await conversationFlow.handleMessage(jid, text.toLowerCase(), originalMsg);

  // Pequeno delay para simular processamento
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Testes principais
async function testarFluxoCompleto() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset} ${colors.yellow}🧪 INICIANDO TESTES AUTOMATIZADOS - WhatsApp Sales Bot${colors.reset} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);

  try {
    // Inicializar serviços
    console.log(`\n${colors.blue}📦 Carregando serviços...${colors.reset}`);
    const productCatalog = new ProductCatalog('./produtos.json');
    await productCatalog.loadProducts();

    const cartManager = new CartManager();
    const stateManager = new StateManager();
    const whatsappCore = new MockWhatsAppCore();
    const conversationFlow = new ConversationFlow(productCatalog, cartManager, stateManager);
    conversationFlow.setWhatsAppCore(whatsappCore);

    const jid = '5511999999999@s.whatsapp.net'; // JID de teste
    const adminJid = '5511888888888@s.whatsapp.net';

    // Limpar mensagens anteriores
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];
    whatsappCore.sentImages = [];

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 1: Mensagem Inicial e Menu
    // ────────────────────────────────────────────────────────────────────────
    logTest('1. Mensagem Inicial - Menu Principal');
    await simulateMessage(conversationFlow, whatsappCore, jid, 'oi');

    // Verificar mensagem ou botões (pode estar em qualquer um)
    const hasWelcome = whatsappCore.sentMessages.some(msg =>
      msg.text && msg.text.toLowerCase().includes('bem-vindo')
    ) || whatsappCore.sentButtons.some(btn =>
      btn.text && btn.text.toLowerCase().includes('bem-vindo')
    );
    assert(hasWelcome || whatsappCore.sentButtons.length > 0, 'Menu inicial deve aparecer');
    assertButtonsCount(
      whatsappCore.sentButtons[whatsappCore.sentButtons.length - 1]?.buttons,
      5,
      'Menu principal deve ter 5 botões'
    );
    const state1 = stateManager.getState(jid);
    assert(state1.state === 'MAIN_MENU', 'Estado deve ser MAIN_MENU');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 2: Ver Produtos - Categorias
    // ────────────────────────────────────────────────────────────────────────
    logTest('2. Ver Produtos - Mostrar Categorias');
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, '1');

    // Verificar se mostrou categorias (pode estar em mensagem ou botões)
    const hasCategories = whatsappCore.sentMessages.some(msg =>
      msg.text && (msg.text.toLowerCase().includes('produtos') || msg.text.toLowerCase().includes('categoria'))
    ) || whatsappCore.sentButtons.length > 0;
    assert(hasCategories, 'Deve mostrar categorias de produtos');
    assertButtonsCount(
      whatsappCore.sentButtons[whatsappCore.sentButtons.length - 1]?.buttons,
      3,
      'Categorias devem ter 3 botões (Smartphones, Acessórios, Voltar)'
    );
    const state2 = stateManager.getState(jid);
    assert(state2.state === 'VIEWING_CATEGORIES', 'Estado deve ser VIEWING_CATEGORIES');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 3: Selecionar Smartphones
    // ────────────────────────────────────────────────────────────────────────
    logTest('3. Selecionar Categoria - Smartphones');
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, 'smartphones');

    // Verificar se mostrou sub-categorias
    const hasSubCategories = whatsappCore.sentButtons.length > 0 ||
      whatsappCore.sentMessages.some(msg => msg.text && msg.text.toLowerCase().includes('marcas'));
    assert(hasSubCategories, 'Deve mostrar sub-categorias de smartphones');
    const state3 = stateManager.getState(jid);
    assert(state3.state === 'VIEWING_SUB_CATEGORIES', 'Estado deve ser VIEWING_SUB_CATEGORIES');
    assert(state3.data?.categoriaPrincipal === 'smartphones', 'Categoria principal deve ser smartphones');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 4: Selecionar Android
    // ────────────────────────────────────────────────────────────────────────
    logTest('4. Selecionar Sub-categoria - Android');
    await simulateMessage(conversationFlow, whatsappCore, jid, 'android');

    // Deve mostrar produtos Android (A01 e A02)
    const products = productCatalog.getProductsByCategory('smartphones', 'android');
    assert(products.length >= 2, `Deve ter pelo menos 2 produtos Android, encontrado ${products.length}`);

    // Verificar se produtos foram enviados
    const productMessages = whatsappCore.sentMessages.filter(msg =>
      msg.text && (msg.text.includes('Samsung') || msg.text.includes('Pixel') || msg.text.includes('A01') || msg.text.includes('A02'))
    );
    assert(productMessages.length > 0, 'Produtos Android devem ser mostrados');

    const state4 = stateManager.getState(jid);
    assert(state4.state === 'VIEWING_PRODUCTS', 'Estado deve ser VIEWING_PRODUCTS');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 5: Adicionar Produto ao Carrinho
    // ────────────────────────────────────────────────────────────────────────
    logTest('5. Adicionar Produto ao Carrinho');
    whatsappCore.sentMessages = []; // Limpar mensagens anteriores
    await simulateMessage(conversationFlow, whatsappCore, jid, 'A01');

    assertMessageContains(whatsappCore.sentMessages, 'adicionado', 'Produto adicionado ao carrinho');
    const cart = cartManager.getCart(jid);
    assert(cart.itens.length === 1, 'Carrinho deve ter 1 item');
    assert(cart.itens[0].id_produto === 'A01', 'Produto no carrinho deve ser A01');

    const state5 = stateManager.getState(jid);
    assert(state5.state === 'ADDING_TO_CART', 'Estado deve ser ADDING_TO_CART');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 6: Ver Carrinho
    // ────────────────────────────────────────────────────────────────────────
    logTest('6. Ver Carrinho');
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, 'carrinho');

    // Verificar carrinho (pode estar em mensagem ou botões)
    const cartSummary = cartManager.getCartSummary(jid);
    const hasCart = whatsappCore.sentMessages.length > 0 || whatsappCore.sentButtons.length > 0;
    assert(hasCart, 'Deve mostrar carrinho');

    // Verificar se tem itens no carrinho
    const cartData = cartManager.getCart(jid);
    assert(cartData.itens.length > 0, 'Carrinho deve ter itens');
    assert(cartData.itens.some(item => item.id_produto === 'A01'), 'Carrinho deve conter produto A01');

    assertButtonsCount(
      whatsappCore.sentButtons[whatsappCore.sentButtons.length - 1]?.buttons,
      3,
      'Carrinho deve ter 3 botões (Finalizar, Limpar, Voltar)'
    );

    const state6 = stateManager.getState(jid);
    assert(state6.state === 'VIEWING_CART', 'Estado deve ser VIEWING_CART');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 7: Navegação - Voltar
    // ────────────────────────────────────────────────────────────────────────
    logTest('7. Navegação - Voltar');
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, 'voltar');

    const state7 = stateManager.getState(jid);
    assert(state7.state === 'MAIN_MENU', 'Voltar deve retornar ao MAIN_MENU');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 8: Ofertas
    // ────────────────────────────────────────────────────────────────────────
    logTest('8. Ver Ofertas');
    whatsappCore.sentMessages = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, 'ofertas');

    const offers = productCatalog.getProductsOnSale();
    assert(offers.length > 0, `Deve ter produtos em oferta, encontrado ${offers.length}`);
    assertMessageContains(whatsappCore.sentMessages, 'ofertas', 'Mostrar ofertas');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 9: Acessórios
    // ────────────────────────────────────────────────────────────────────────
    logTest('9. Navegar Acessórios');
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];

    // Voltar ao menu e selecionar acessórios
    stateManager.setState(jid, 'INITIAL');
    await simulateMessage(conversationFlow, whatsappCore, jid, 'oi');
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, '1'); // Ver produtos
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, 'acessorios'); // Acessórios

    // Verificar se mostrou opções de acessórios
    const lastButtons = whatsappCore.sentButtons[whatsappCore.sentButtons.length - 1];
    const hasAcessorios = lastButtons && (
      lastButtons.buttons?.some(btn => btn.text && btn.text.toLowerCase().includes('cabos')) ||
      lastButtons.buttons?.some(btn => btn.text && btn.text.toLowerCase().includes('carregador')) ||
      lastButtons.buttons?.some(btn => btn.text && btn.text.toLowerCase().includes('fones'))
    );
    assert(hasAcessorios || whatsappCore.sentButtons.length > 0, 'Deve mostrar opções de acessórios');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 10: Validação de Estoque
    // ────────────────────────────────────────────────────────────────────────
    logTest('10. Validação de Estoque');
    const product = productCatalog.getProductById('A01');
    const originalStock = product?.estoque || 0;

    // Verificar se produto existe e tem estoque
    assert(product !== null, 'Produto A01 deve existir');
    assert(product.estoque > 0, 'Produto A01 deve ter estoque');
    assert(productCatalog.checkStock('A01', 1), 'Deve permitir adicionar 1 unidade do A01');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 11: Produto Inválido
    // ────────────────────────────────────────────────────────────────────────
    logTest('11. Produto Inválido');
    whatsappCore.sentMessages = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, 'oi');
    await simulateMessage(conversationFlow, whatsappCore, jid, '1');
    await simulateMessage(conversationFlow, whatsappCore, jid, 'smartphones');
    await simulateMessage(conversationFlow, whatsappCore, jid, 'android');

    whatsappCore.sentMessages = [];
    await simulateMessage(conversationFlow, whatsappCore, jid, 'XXX999');

    assertMessageContains(whatsappCore.sentMessages, 'inválido', 'Deve mostrar erro para código inválido');

    // ────────────────────────────────────────────────────────────────────────
    // TESTE 12: Reconhecimento de Intenções
    // ────────────────────────────────────────────────────────────────────────
    logTest('12. Reconhecimento de Intenções');
    whatsappCore.sentMessages = [];
    whatsappCore.sentButtons = [];

    // Resetar estado
    stateManager.setState(jid, 'INITIAL');

    await simulateMessage(conversationFlow, whatsappCore, jid, 'Quero comprar celular');

    // Verificar se reconheceu intenção (pode estar em mensagem ou botões)
    const hasProducts = whatsappCore.sentMessages.some(msg =>
      msg.text && msg.text.toLowerCase().includes('produtos')
    ) || whatsappCore.sentButtons.length > 0;
    assert(hasProducts, 'Deve reconhecer intenção de comprar e mostrar produtos');

    const state12 = stateManager.getState(jid);
    assert(
      state12.state === 'VIEWING_CATEGORIES' || state12.state === 'VIEWING_SUB_CATEGORIES' || state12.state === 'MAIN_MENU',
      'Deve navegar para categorias ou menu ao mencionar comprar celular'
    );

    // ────────────────────────────────────────────────────────────────────────
    // RESUMO DOS TESTES
    // ────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset} ${colors.yellow}📊 RESUMO DOS TESTES${colors.reset} ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);

    const total = testResults.passed + testResults.failed;
    const passRate = ((testResults.passed / total) * 100).toFixed(1);

    console.log(`\n${colors.green}✅ Testes Passaram: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Testes Falharam: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.blue}📊 Total: ${total} testes${colors.reset}`);
    console.log(`${colors.yellow}📈 Taxa de Sucesso: ${passRate}%${colors.reset}`);

    if (testResults.errors.length > 0) {
      console.log(`\n${colors.red}⚠️  ERROS ENCONTRADOS:${colors.reset}`);
      testResults.errors.forEach((error, index) => {
        console.log(`${colors.red}  ${index + 1}. ${error}${colors.reset}`);
      });
    }

    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Retornar código de saída baseado nos resultados
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(`\n${colors.red}❌ ERRO CRÍTICO NOS TESTES:${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// Executar testes
testarFluxoCompleto();
