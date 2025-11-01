# 🧪 Guia de Testes - WhatsApp Sales Bot

## ✅ Checklist de Testes Completos

### 📱 **1. TESTES BÁSICOS DE COMUNICAÇÃO**

#### Teste 1.1: Mensagem Inicial
- **Ação:** Envie qualquer mensagem para o bot (ex: "oi", "olá", "hello")
- **Esperado:**
  - ✅ Bot responde com mensagem de boas-vindas
  - ✅ Menu principal aparece com 5 botões
  - ✅ Botões: Ver Produtos, Ofertas, Suporte, Loja Física, Falar com Equipe

#### Teste 1.2: Botões do Menu
- **Ação:** Clique nos botões do menu ou digite os números (1, 2, 3, 4, 5)
- **Esperado:** Cada botão deve abrir a seção correspondente

---

### 🛍️ **2. TESTES DE NAVEGAÇÃO DE PRODUTOS**

#### Teste 2.1: Ver Produtos (Opção 1)
- **Ação:** Clique em "1️⃣ Ver Produtos" ou digite "1"
- **Esperado:**
  - ✅ Aparece menu com categorias (Smartphones, Acessórios)
  - ✅ Botão "Voltar ao Menu" funciona

#### Teste 2.2: Navegar Categorias - Smartphones
- **Ação:** Selecione "📱 Smartphones"
- **Esperado:**
  - ✅ Aparece menu de sub-categorias (Android, iPhone)
  - ✅ Botão "Voltar" funciona

#### Teste 2.3: Ver Produtos Android
- **Ação:** Selecione "🤖 Android"
- **Esperado:**
  - ✅ Lista produtos Android:
    - Samsung Galaxy S25 Ultra (A01) - R$ 8.999,90
    - Google Pixel 9 Pro (A02) - R$ 7.500,00
  - ✅ Cada produto mostra: nome, descrição, preço, código, estoque
  - ✅ Imagens aparecem (se disponíveis)

#### Teste 2.4: Ver Produtos iPhone
- **Ação:** Selecione "🍎 iPhone"
- **Esperado:**
  - ✅ Lista produtos iPhone:
    - iPhone 16 Pro Max (I01) - R$ 12.999,90
    - iPhone 15 (I02) - R$ 6.999,90 (EM OFERTA)

#### Teste 2.5: Navegar Acessórios
- **Ação:** Volte e selecione "🎧 Acessórios"
- **Esperado:**
  - ✅ Menu de sub-categorias (Cabos, Carregadores, Fones)

#### Teste 2.6: Ver Acessórios - Cabos
- **Ação:** Selecione "🔌 Cabos"
- **Esperado:**
  - ✅ Mostra: Cabo USB-C Premium 2m (C01) - R$ 49,90

#### Teste 2.7: Ver Acessórios - Carregadores
- **Ação:** Selecione "🔋 Carregadores"
- **Esperado:**
  - ✅ Mostra: Carregador Wireless Samsung (C02) - R$ 199,90

#### Teste 2.8: Ver Acessórios - Fones
- **Ação:** Selecione "🎧 Fones"
- **Esperado:**
  - ✅ Mostra:
    - AirPods Pro 2 (F01) - R$ 2.299,90
    - Galaxy Buds2 Pro (F02) - R$ 899,90 (EM OFERTA)

---

### 🛒 **3. TESTES DE CARRINHO**

#### Teste 3.1: Adicionar Produto ao Carrinho
- **Ação:** Após ver produtos, digite o código (ex: "A01")
- **Esperado:**
  - ✅ Mensagem de confirmação: "Samsung Galaxy S25 Ultra adicionado ao seu carrinho!"
  - ✅ Instrução para finalizar ou continuar

#### Teste 3.2: Adicionar Múltiplos Produtos
- **Ação:** Adicione mais produtos (ex: "I02", "F01")
- **Esperado:**
  - ✅ Cada produto é adicionado individualmente
  - ✅ Confirmações aparecem para cada item

#### Teste 3.3: Ver Carrinho
- **Ação:** Digite "carrinho" ou "Carrinho"
- **Esperado:**
  - ✅ Mostra resumo do carrinho com:
    - Lista de itens
    - Quantidade de cada item
    - Preço unitário
    - Subtotal por item
    - **Total geral**
  - ✅ Botões: Finalizar Pedido, Limpar Carrinho, Voltar ao Menu

#### Teste 3.4: Limpar Carrinho
- **Ação:** Clique em "🗑️ Limpar carrinho"
- **Esperado:**
  - ✅ Mensagem de confirmação
  - ✅ Retorna ao menu principal
  - ✅ Carrinho fica vazio

---

### 💰 **4. TESTES DE OFERTAS**

#### Teste 4.1: Ver Ofertas
- **Ação:** No menu principal, selecione "2️⃣ Ofertas da Semana"
- **Esperado:**
  - ✅ Lista produtos em oferta:
    - iPhone 15 (I02) - R$ 6.999,90
    - Galaxy Buds2 Pro (F02) - R$ 899,90
  - ✅ Produtos marcados como oferta

---

### ✅ **5. TESTES DE CHECKOUT**

#### Teste 5.1: Finalizar Pedido
- **Ação:**
  1. Adicione produtos ao carrinho
  2. Vá ao carrinho
  3. Clique em "✅ Sim, finalizar agora"
- **Esperado:**
  - ✅ Mensagem de confirmação do pedido
  - ✅ Resumo completo do pedido
  - ✅ Mensagem: "Seu pedido foi reservado! Um vendedor entrará em contato..."
  - ✅ Carrinho é limpo automaticamente
  - ✅ Estado muda para "TRANSFERRED_TO_HUMAN"

#### Teste 5.2: Notificação para Vendedor (se configurado)
- **Verificar:** Se `VENDEDOR_HUMANO_JID` está configurado no `.env`
- **Esperado:**
  - ✅ Vendedor recebe notificação com:
    - Dados do cliente
    - Itens do pedido
    - Quantidades
    - Total do pedido

---

### 📞 **6. TESTES DE INFORMAÇÕES**

#### Teste 6.1: Suporte
- **Ação:** No menu, selecione "3️⃣ Manutenção / Suporte"
- **Esperado:**
  - ✅ Informações de contato:
    - Email
    - WhatsApp
    - Site
  - ✅ Botão para falar com equipe

#### Teste 6.2: Loja Física
- **Ação:** No menu, selecione "4️⃣ Nossa Loja Física"
- **Esperado:**
  - ✅ Endereço completo
  - ✅ Horário de funcionamento
  - ✅ Telefone

#### Teste 6.3: Falar com Equipe
- **Ação:** No menu, selecione "5️⃣ Falar com a Equipe"
- **Esperado:**
  - ✅ Mensagem de transferência
  - ✅ Se configurado, vendedor recebe notificação
  - ✅ Estado muda para "TRANSFERRED_TO_HUMAN"

---

### ⬅️ **7. TESTES DE NAVEGAÇÃO E VOLTAR**

#### Teste 7.1: Voltar em Cada Etapa
- **Ação:** Em cada menu/tela, tente voltar:
  - Digite "V" ou "voltar"
  - Clique em botões "⬅️ Voltar"
- **Esperado:**
  - ✅ Navegação funciona corretamente
  - ✅ Retorna para tela anterior
  - ✅ Estado é atualizado corretamente

---

### ⚠️ **8. TESTES DE ERROS E VALIDAÇÕES**

#### Teste 8.1: Código de Produto Inválido
- **Ação:** Digite um código que não existe (ex: "XXX")
- **Esperado:**
  - ✅ Mensagem de erro amigável
  - ✅ Instrução para tentar novamente

#### Teste 8.2: Produto Fora de Estoque
- **Ação:** (Se houver produto com estoque 0)
- **Esperado:**
  - ✅ Mensagem: "Produto está fora de estoque"

#### Teste 8.3: Carrinho Vazio ao Finalizar
- **Ação:** Tente finalizar pedido com carrinho vazio
- **Esperado:**
  - ✅ Mensagem de erro
  - ✅ Retorna ao menu

---

### 🔄 **9. TESTES DE FLUXO COMPLETO**

#### Teste 9.1: Fluxo Completo de Compra
1. Envie "oi" → Menu aparece
2. Selecione "Ver Produtos"
3. Escolha "Smartphones" → "Android"
4. Adicione produto "A01" ao carrinho
5. Adicione produto "A02" ao carrinho
6. Digite "carrinho"
7. Finalize o pedido
- **Esperado:**
  - ✅ Todo o fluxo funciona sem erros
  - ✅ Informações corretas em cada etapa

#### Teste 9.2: Múltiplas Sessões
- **Ação:** Adicione produtos, vá ao menu, adicione mais produtos
- **Esperado:**
  - ✅ Carrinho mantém itens anteriores
  - ✅ Não perde dados ao navegar

---

### 👤 **10. TESTES DE ADMIN (se aplicável)**

#### Teste 10.1: Comando Admin
- **Ação:** Se você é admin, digite "admin" ou "/admin"
- **Esperado:**
  - ✅ Menu administrativo aparece
  - ✅ Opções para gerenciar produtos

---

### 📊 **11. TESTES DE PERFORMANCE**

#### Teste 11.1: Resposta Rápida
- **Verificar:** Bot responde em menos de 2 segundos
- **Ação:** Envie múltiplas mensagens rapidamente
- **Esperado:**
  - ✅ Não trava
  - ✅ Processa todas as mensagens

#### Teste 11.2: Múltiplos Produtos
- **Ação:** Navegue e veja todos os produtos
- **Esperado:**
  - ✅ Produtos carregam rapidamente
  - ✅ Imagens aparecem (se disponíveis)

---

## 📝 **CHECKLIST RÁPIDO DE VALIDAÇÃO**

Marque quando testar:

### Funcionalidades Principais
- [ ] Mensagem inicial e menu
- [ ] Ver produtos por categoria
- [ ] Adicionar ao carrinho
- [ ] Ver carrinho
- [ ] Finalizar pedido
- [ ] Ofertas da semana
- [ ] Informações de suporte
- [ ] Informações da loja
- [ ] Falar com equipe

### Navegação
- [ ] Voltar funciona em todos os menus
- [ ] Botões funcionam corretamente
- [ ] Texto funciona além dos botões

### Validações
- [ ] Código inválido gera erro amigável
- [ ] Produto sem estoque é bloqueado
- [ ] Carrinho vazio não permite finalizar

### Fluxo Completo
- [ ] Compra completa funciona end-to-end
- [ ] Múltiplas sessões mantêm dados
- [ ] Notificações para vendedor (se configurado)

---

## 🎯 **RESULTADO ESPERADO**

Após todos os testes, o bot deve:
- ✅ Responder todas as mensagens corretamente
- ✅ Navegar entre menus sem problemas
- ✅ Adicionar produtos ao carrinho
- ✅ Mostrar resumo correto do carrinho
- ✅ Finalizar pedidos com sucesso
- ✅ Manter estado entre navegações
- ✅ Tratar erros de forma amigável

---

## 🐛 **Se Encontrar Problemas**

1. **Verifique os logs:**
   ```bash
   # Ver logs em tempo real
   tail -f logs/app-$(date +%Y-%m-%d).log
   ```

2. **Verifique o arquivo de produtos:**
   - Arquivo: `produtos.json`
   - Deve ter pelo menos 8 produtos

3. **Verifique configurações:**
   - Arquivo: `.env`
   - `ADMIN_NUMBERS` (opcional)
   - `VENDEDOR_HUMANO_JID` (opcional)

4. **Reinicie o bot se necessário:**
   - Pressione `Ctrl+C` para parar
   - Execute `npm start` novamente

---

## ✅ **TESTE RÁPIDO (5 minutos)**

Se você só tem 5 minutos, teste pelo menos:

1. ✅ Envie "oi" → Menu aparece
2. ✅ Clique em "Ver Produtos" → Categorias aparecem
3. ✅ Escolha uma categoria → Produtos aparecem
4. ✅ Adicione um produto (digite código) → Confirmação
5. ✅ Digite "carrinho" → Resumo aparece
6. ✅ Finalize pedido → Confirmação

**Se esses 6 passos funcionarem, o bot está operacional!** 🎉
