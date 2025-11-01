export default class AdminHandler {
  constructor(productCatalog, stateManager) {
    this.productCatalog = productCatalog;
    this.stateManager = stateManager;
    this.whatsappCore = null;
    this.adminNumbers = []; // Será carregado do .env
  }

  setWhatsAppCore(whatsappCore) {
    this.whatsappCore = whatsappCore;
  }

  loadAdminNumbers() {
    // Carregar números de admin do .env (separados por vírgula)
    const adminEnv = process.env.ADMIN_NUMBERS || '';
    if (adminEnv) {
      this.adminNumbers = adminEnv.split(',').map(num => num.trim());
    }
    console.log(`✅ ${this.adminNumbers.length} administrador(es) configurado(s)`);
  }

  isAdmin(jid) {
    // Extrair número do JID (formato: 5511999999999@s.whatsapp.net)
    const phoneNumber = jid.split('@')[0];

    // Remover código do país se necessário e normalizar
    const normalizedNumber = phoneNumber.replace(/^55/, '');

    return this.adminNumbers.some(adminNum => {
      const normalizedAdmin = adminNum.replace(/^55/, '');
      return phoneNumber === adminNum || normalizedNumber === normalizedAdmin || phoneNumber.includes(adminNum) || adminNum.includes(phoneNumber);
    });
  }

  async handleMessage(jid, text, originalMsg) {
    const userState = this.stateManager.getState(jid);
    const state = userState.state;
    const data = userState.data;

    // Comando especial para entrar no modo admin
    if (text === 'admin' || text === '/admin') {
      await this.showAdminMenu(jid);
      return;
    }

    // Verificar se está no modo admin
    if (!state.startsWith('ADMIN_')) {
      return false; // Não é mensagem de admin
    }

    // Processar comandos admin
    switch (state) {
      case 'ADMIN_MENU':
        await this.handleAdminMenu(jid, text);
        break;

      case 'ADMIN_CADASTRO_ID':
        await this.handleCadastroId(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_NOME':
        await this.handleCadastroNome(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_DESCRICAO':
        await this.handleCadastroDescricao(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_PRECO':
        await this.handleCadastroPreco(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_CATEGORIA':
        await this.handleCadastroCategoria(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_SUBCATEGORIA':
        await this.handleCadastroSubCategoria(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_ESTOQUE':
        await this.handleCadastroEstoque(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_IMAGEM':
        await this.handleCadastroImagem(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_OFERTA':
        await this.handleCadastroOferta(jid, text, data);
        break;

      case 'ADMIN_CADASTRO_CONFIRMACAO':
        await this.handleCadastroConfirmacao(jid, text, data);
        break;

      case 'ADMIN_EDITAR_SELECIONAR':
        await this.handleEditarSelecionar(jid, text, data);
        break;

      case 'ADMIN_DELETAR_SELECIONAR':
        await this.handleDeletarSelecionar(jid, text, data);
        break;

      case 'ADMIN_DELETAR_CONFIRMACAO':
        await this.handleDeletarConfirmacao(jid, text, data);
        break;

      default:
        await this.showAdminMenu(jid);
        break;
    }

    return true; // Mensagem processada
  }

  async showAdminMenu(jid) {
    if (!this.isAdmin(jid)) {
      await this.whatsappCore.sendMessage(
        jid,
        '❌ Você não tem permissão para acessar o painel administrativo.'
      );
      return;
    }

    const message = `🔐 *Painel Administrativo*\n\n`;
    const message2 = `Escolha uma opção:\n\n`;
    const message3 = `1️⃣ Cadastrar Produto\n`;
    const message4 = `2️⃣ Listar Produtos\n`;
    const message5 = `3️⃣ Editar Produto\n`;
    const message6 = `4️⃣ Deletar Produto\n`;
    const message7 = `5️⃣ Sair do Modo Admin`;

    const buttons = [
      { id: 'cadastrar', text: '1️⃣ Cadastrar' },
      { id: 'listar', text: '2️⃣ Listar' },
      { id: 'editar', text: '3️⃣ Editar' },
      { id: 'deletar', text: '4️⃣ Deletar' },
      { id: 'sair', text: '5️⃣ Sair' },
    ];

    await this.whatsappCore.sendMessage(jid, message + message2 + message3 + message4 + message5 + message6 + message7);
    await this.whatsappCore.sendMessageWithButtons(jid, '', buttons);
    this.stateManager.setState(jid, 'ADMIN_MENU');
  }

  async handleAdminMenu(jid, text) {
    if (text.includes('1') || text.includes('cadastrar') || text === 'cadastrar') {
      await this.iniciarCadastro(jid);
    } else if (text.includes('2') || text.includes('listar') || text === 'listar') {
      await this.listarProdutos(jid);
    } else if (text.includes('3') || text.includes('editar') || text === 'editar') {
      await this.iniciarEdicao(jid);
    } else if (text.includes('4') || text.includes('deletar') || text === 'deletar') {
      await this.iniciarDelecao(jid);
    } else if (text.includes('5') || text.includes('sair') || text === 'sair') {
      await this.sairAdmin(jid);
    } else {
      await this.showAdminMenu(jid);
    }
  }

  async iniciarCadastro(jid) {
    await this.whatsappCore.sendMessage(
      jid,
      '📝 *Cadastro de Produto*\n\nDigite o *ID do produto* (ex: A03, I03, C03):'
    );
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_ID', { produtoNovo: {} });
  }

  async handleCadastroId(jid, text, data) {
    const id = text.trim().toUpperCase();

    // Verificar se já existe
    if (this.productCatalog.getProductById(id)) {
      await this.whatsappCore.sendMessage(
        jid,
        `❌ O ID ${id} já existe. Digite outro ID:`
      );
      return;
    }

    data.produtoNovo.id_produto = id;
    this.stateManager.updateData(jid, data);

    await this.whatsappCore.sendMessage(jid, '✅ ID válido!\n\nDigite o *nome do produto*:');
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_NOME');
  }

  async handleCadastroNome(jid, text, data) {
    data.produtoNovo.nome = text.trim();
    this.stateManager.updateData(jid, data);

    await this.whatsappCore.sendMessage(jid, '✅ Nome registrado!\n\nDigite a *descrição do produto* (ou envie "pular" para deixar vazio):');
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_DESCRICAO');
  }

  async handleCadastroDescricao(jid, text, data) {
    if (text.toLowerCase() !== 'pular') {
      data.produtoNovo.descricao = text.trim();
    }
    this.stateManager.updateData(jid, data);

    await this.whatsappCore.sendMessage(jid, '✅ Descrição registrada!\n\nDigite o *preço* do produto (ex: 99.90):');
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_PRECO');
  }

  async handleCadastroPreco(jid, text, data) {
    const preco = parseFloat(text.replace(',', '.'));

    if (isNaN(preco) || preco <= 0) {
      await this.whatsappCore.sendMessage(jid, '❌ Preço inválido. Digite um valor válido (ex: 99.90):');
      return;
    }

    data.produtoNovo.preco = preco;
    this.stateManager.updateData(jid, data);

    await this.whatsappCore.sendMessage(
      jid,
      '✅ Preço registrado!\n\nDigite a *categoria principal* (smartphones ou acessorios):'
    );
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_CATEGORIA');
  }

  async handleCadastroCategoria(jid, text, data) {
    const categoria = text.trim().toLowerCase();

    if (categoria !== 'smartphones' && categoria !== 'acessorios') {
      await this.whatsappCore.sendMessage(
        jid,
        '❌ Categoria inválida. Digite "smartphones" ou "acessorios":'
      );
      return;
    }

    data.produtoNovo.categoria_principal = categoria;
    this.stateManager.updateData(jid, data);

    let subMessage = '✅ Categoria registrada!\n\n';

    if (categoria === 'smartphones') {
      subMessage += 'Digite a *sub-categoria* (android ou iphone):';
    } else {
      subMessage += 'Digite a *sub-categoria* (cabos, carregadores ou fones):';
    }

    await this.whatsappCore.sendMessage(jid, subMessage);
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_SUBCATEGORIA');
  }

  async handleCadastroSubCategoria(jid, text, data) {
    const subCategoria = text.trim().toLowerCase();
    const categoriaPrincipal = data.produtoNovo.categoria_principal;

    let validSubs = [];
    if (categoriaPrincipal === 'smartphones') {
      validSubs = ['android', 'iphone'];
    } else {
      validSubs = ['cabos', 'carregadores', 'fones'];
    }

    if (!validSubs.includes(subCategoria)) {
      await this.whatsappCore.sendMessage(
        jid,
        `❌ Sub-categoria inválida. Digite uma das opções: ${validSubs.join(', ')}:`
      );
      return;
    }

    data.produtoNovo.sub_categoria = subCategoria;
    this.stateManager.updateData(jid, data);

    await this.whatsappCore.sendMessage(jid, '✅ Sub-categoria registrada!\n\nDigite a *quantidade em estoque* (número inteiro):');
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_ESTOQUE');
  }

  async handleCadastroEstoque(jid, text, data) {
    const estoque = parseInt(text.trim());

    if (isNaN(estoque) || estoque < 0) {
      await this.whatsappCore.sendMessage(jid, '❌ Estoque inválido. Digite um número inteiro (ex: 10):');
      return;
    }

    data.produtoNovo.estoque = estoque;
    this.stateManager.updateData(jid, data);

    await this.whatsappCore.sendMessage(
      jid,
      '✅ Estoque registrado!\n\nDigite a *URL da imagem* do produto (ou envie "pular" para deixar vazio):'
    );
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_IMAGEM');
  }

  async handleCadastroImagem(jid, text, data) {
    if (text.toLowerCase() !== 'pular') {
      data.produtoNovo.imagem_url = text.trim();
    }
    this.stateManager.updateData(jid, data);

    await this.whatsappCore.sendMessage(
      jid,
      '✅ Imagem registrada!\n\nO produto está *em oferta*? (sim/não):'
    );
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_OFERTA');
  }

  async handleCadastroOferta(jid, text, data) {
    const emOferta = text.toLowerCase().includes('sim') || text.toLowerCase().includes('s');
    data.produtoNovo.em_oferta = emOferta;
    this.stateManager.updateData(jid, data);

    // Mostrar resumo
    const produto = data.produtoNovo;
    let resumo = `📋 *Resumo do Produto*\n\n`;
    resumo += `ID: ${produto.id_produto}\n`;
    resumo += `Nome: ${produto.nome}\n`;
    resumo += `Descrição: ${produto.descricao || '(vazio)'}\n`;
    resumo += `Preço: R$ ${produto.preco.toFixed(2)}\n`;
    resumo += `Categoria: ${produto.categoria_principal}\n`;
    resumo += `Sub-categoria: ${produto.sub_categoria}\n`;
    resumo += `Estoque: ${produto.estoque}\n`;
    resumo += `Imagem: ${produto.imagem_url || '(vazio)'}\n`;
    resumo += `Em Oferta: ${produto.em_oferta ? 'Sim' : 'Não'}\n\n`;
    resumo += `Confirma o cadastro? (sim/não):`;

    await this.whatsappCore.sendMessage(jid, resumo);
    this.stateManager.setState(jid, 'ADMIN_CADASTRO_CONFIRMACAO');
  }

  async handleCadastroConfirmacao(jid, text, data) {
    const confirmar = text.toLowerCase().includes('sim') || text.toLowerCase().includes('s');

    if (confirmar) {
      try {
        const produto = await this.productCatalog.addProduct(data.produtoNovo);
        await this.whatsappCore.sendMessage(
          jid,
          `✅ Produto *${produto.nome}* cadastrado com sucesso!\n\nID: ${produto.id_produto}`
        );
        await this.showAdminMenu(jid);
      } catch (error) {
        await this.whatsappCore.sendMessage(jid, `❌ Erro ao cadastrar: ${error.message}`);
        await this.showAdminMenu(jid);
      }
    } else {
      await this.whatsappCore.sendMessage(jid, '❌ Cadastro cancelado.');
      await this.showAdminMenu(jid);
    }
  }

  async listarProdutos(jid) {
    const produtos = this.productCatalog.getAllProducts();

    if (produtos.length === 0) {
      await this.whatsappCore.sendMessage(jid, '📦 Nenhum produto cadastrado.');
      await this.showAdminMenu(jid);
      return;
    }

    await this.whatsappCore.sendMessage(jid, `📦 *Total de produtos: ${produtos.length}*\n\n`);

    // Listar produtos em grupos
    for (let i = 0; i < produtos.length; i += 5) {
      const grupo = produtos.slice(i, i + 5);
      let lista = '';

      grupo.forEach((produto) => {
        lista += `${produto.id_produto} - ${produto.nome}\n`;
        lista += `   Preço: R$ ${produto.preco.toFixed(2)} | Estoque: ${produto.estoque}\n\n`;
      });

      await this.whatsappCore.sendMessage(jid, lista);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await this.showAdminMenu(jid);
  }

  async iniciarEdicao(jid) {
    await this.whatsappCore.sendMessage(
      jid,
      '✏️ *Editar Produto*\n\nDigite o *ID do produto* que deseja editar:'
    );
    this.stateManager.setState(jid, 'ADMIN_EDITAR_SELECIONAR');
  }

  async handleEditarSelecionar(jid, text, data) {
    if (!data.produtoEditando) {
      // Primeira vez - selecionar produto
      if (text.toLowerCase() === 'cancelar') {
        await this.showAdminMenu(jid);
        return;
      }

      const id = text.trim().toUpperCase();
      const produto = this.productCatalog.getProductById(id);

      if (!produto) {
        await this.whatsappCore.sendMessage(jid, `❌ Produto com ID ${id} não encontrado. Digite outro ID ou "cancelar":`);
        return;
      }

      // Mostrar produto atual e opções de edição
      let mensagem = `📝 *Produto Encontrado*\n\n`;
      mensagem += `ID: ${produto.id_produto}\n`;
      mensagem += `Nome: ${produto.nome}\n`;
      mensagem += `Descrição: ${produto.descricao || '(vazio)'}\n`;
      mensagem += `Preço: R$ ${produto.preco.toFixed(2)}\n`;
      mensagem += `Estoque: ${produto.estoque}\n`;
      mensagem += `Em Oferta: ${produto.em_oferta ? 'Sim' : 'Não'}\n\n`;
      mensagem += `*Para editar, use os comandos:*\n`;
      mensagem += `editar nome [novo nome]\n`;
      mensagem += `editar preco [valor]\n`;
      mensagem += `editar estoque [quantidade]\n`;
      mensagem += `editar descricao [nova descrição]\n`;
      mensagem += `editar oferta [sim/não]\n`;
      mensagem += `finalizar - Salvar e voltar\n`;
      mensagem += `cancelar - Cancelar edição`;

      await this.whatsappCore.sendMessage(jid, mensagem);
      this.stateManager.setState(jid, 'ADMIN_EDITAR_SELECIONAR', { produtoEditando: id });
    } else {
      // Já tem produto selecionado - processar comandos de edição
      const id = data.produtoEditando;

      if (text.toLowerCase() === 'cancelar') {
        await this.showAdminMenu(jid);
        return;
      }

      if (text.toLowerCase() === 'finalizar') {
        await this.whatsappCore.sendMessage(jid, '✅ Edição finalizada!');
        await this.showAdminMenu(jid);
        return;
      }

      // Processar comandos de edição
      const parts = text.split(' ').map(p => p.trim()).filter(p => p);
      const comando = parts[0]?.toLowerCase();

      if (comando === 'editar' && parts.length >= 3) {
        const campo = parts[1].toLowerCase();
        const valor = parts.slice(2).join(' ');

        try {
          const updates = {};

          if (campo === 'nome') {
            updates.nome = valor;
          } else if (campo === 'preco') {
            updates.preco = parseFloat(valor.replace(',', '.'));
            if (isNaN(updates.preco)) {
              await this.whatsappCore.sendMessage(jid, '❌ Preço inválido. Use um número (ex: 99.90)');
              return;
            }
          } else if (campo === 'estoque') {
            updates.estoque = parseInt(valor);
            if (isNaN(updates.estoque)) {
              await this.whatsappCore.sendMessage(jid, '❌ Estoque inválido. Use um número inteiro');
              return;
            }
          } else if (campo === 'descricao') {
            updates.descricao = valor;
          } else if (campo === 'oferta') {
            updates.em_oferta = valor.toLowerCase().includes('sim') || valor.toLowerCase().includes('s');
          } else {
            await this.whatsappCore.sendMessage(jid, '❌ Campo inválido. Use: nome, preco, estoque, descricao ou oferta');
            return;
          }

          await this.productCatalog.updateProduct(id, updates);
          await this.whatsappCore.sendMessage(jid, `✅ ${campo} atualizado com sucesso!`);

          // Mostrar produto atualizado
          const produto = this.productCatalog.getProductById(id);
          let mensagem = `📝 *Produto Atualizado*\n\n`;
          mensagem += `ID: ${produto.id_produto}\n`;
          mensagem += `Nome: ${produto.nome}\n`;
          mensagem += `Descrição: ${produto.descricao || '(vazio)'}\n`;
          mensagem += `Preço: R$ ${produto.preco.toFixed(2)}\n`;
          mensagem += `Estoque: ${produto.estoque}\n`;
          mensagem += `Em Oferta: ${produto.em_oferta ? 'Sim' : 'Não'}\n\n`;
          mensagem += `Continue editando ou digite "finalizar" para salvar.`;

          await this.whatsappCore.sendMessage(jid, mensagem);
        } catch (error) {
          await this.whatsappCore.sendMessage(jid, `❌ Erro ao editar: ${error.message}`);
        }
      } else {
        await this.whatsappCore.sendMessage(
          jid,
          '❌ Comando inválido. Use: editar [campo] [valor] ou "finalizar" ou "cancelar"'
        );
      }
    }
  }

  async iniciarDelecao(jid) {
    await this.whatsappCore.sendMessage(
      jid,
      '🗑️ *Deletar Produto*\n\n⚠️ ATENÇÃO: Esta ação não pode ser desfeita!\n\nDigite o *ID do produto* que deseja deletar (ou "cancelar"):'
    );
    this.stateManager.setState(jid, 'ADMIN_DELETAR_SELECIONAR');
  }

  async handleDeletarSelecionar(jid, text, data) {
    if (text.toLowerCase() === 'cancelar') {
      await this.showAdminMenu(jid);
      return;
    }

    const id = text.trim().toUpperCase();
    const produto = this.productCatalog.getProductById(id);

    if (!produto) {
      await this.whatsappCore.sendMessage(jid, `❌ Produto com ID ${id} não encontrado. Digite outro ID ou "cancelar":`);
      return;
    }

    // Confirmar deleção
    const mensagem = `⚠️ *Confirmar Deleção*\n\n`;
    const mensagem2 = `Produto: ${produto.nome} (${produto.id_produto})\n\n`;
    const mensagem3 = `Digite *CONFIRMAR* para deletar ou *cancelar* para voltar:`;

    await this.whatsappCore.sendMessage(jid, mensagem + mensagem2 + mensagem3);
    this.stateManager.setState(jid, 'ADMIN_DELETAR_CONFIRMACAO', { produtoDeletar: id });
  }

  async handleDeletarConfirmacao(jid, text, data) {
    if (text.toLowerCase() === 'cancelar') {
      await this.showAdminMenu(jid);
      return;
    }

    if (text.toUpperCase() !== 'CONFIRMAR') {
      await this.whatsappCore.sendMessage(
        jid,
        '❌ Digite *CONFIRMAR* para deletar ou *cancelar* para voltar:'
      );
      return;
    }

    const id = data.produtoDeletar;

    try {
      const produtoDeletado = await this.productCatalog.deleteProduct(id);
      await this.whatsappCore.sendMessage(
        jid,
        `✅ Produto *${produtoDeletado.nome}* (${produtoDeletado.id_produto}) deletado com sucesso!`
      );
      await this.showAdminMenu(jid);
    } catch (error) {
      await this.whatsappCore.sendMessage(jid, `❌ Erro ao deletar: ${error.message}`);
      await this.showAdminMenu(jid);
    }
  }

  async sairAdmin(jid) {
    await this.whatsappCore.sendMessage(jid, '👋 Saindo do modo admin. Até logo!');
    this.stateManager.resetToMenu(jid);
  }
}
