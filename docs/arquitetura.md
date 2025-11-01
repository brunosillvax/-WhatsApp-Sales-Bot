# 🏗️ Arquitetura do Sistema

## Visão Geral

O WhatsApp Sales Bot é construído com uma arquitetura modular e escalável, seguindo princípios de clean code e separação de responsabilidades.

## Componentes Principais

### 1. Core Layer

#### `whatsapp-core.js`
- Responsável pela comunicação com o WhatsApp via Baileys
- Gerencia envio e recebimento de mensagens
- Implementa rate limiting e agrupamento de mensagens
- Tratamento robusto de erros com retry automático

#### `state-manager.js`
- Gerencia o estado de cada usuário (conversação)
- Mantém histórico de estados
- Integrado com sistema de logs

### 2. Services Layer

#### `product-catalog.js`
- Gerencia catálogo de produtos
- Implementa cache inteligente
- Validação de estoque em tempo real
- CRUD completo de produtos

#### `cart-manager.js`
- Gerencia carrinho de compras
- Suporte a cupons de desconto
- Validação de estoque antes do checkout
- Cálculo automático de totais

#### `coupon-service.js`
- Sistema completo de cupons
- Validação de cupons (validade, uso máximo)
- Aplicação de desconto (percentual ou fixo)

#### `cache-service.js`
- Cache em memória de produtos
- TTL configurável
- Invalidação automática

#### `logging-service.js`
- Sistema de logs estruturado usando Winston
- Rotação diária de logs
- Logs separados por nível

### 3. Handlers Layer

#### `conversation-flow.js`
- Gerencia fluxo de conversação com clientes
- Implementa navegação por menus
- Validação e sanitização de inputs
- Correção automática de erros de digitação

#### `admin-handler.js`
- Gerencia fluxo administrativo
- CRUD de produtos via WhatsApp
- Validação de permissões

### 4. Utils Layer

#### Validadores
- `validators.js` - Validação de dados de entrada
- `sanitizer.js` - Sanitização de inputs

#### Segurança
- `rate-limiter.js` - Proteção anti-spam
- `error-handler.js` - Tratamento de erros

#### UX
- `typo-corrector.js` - Correção de erros de digitação
- `welcome-messages.js` - Mensagens de boas-vindas
- `pagination.js` - Paginação de listas
- `message-batcher.js` - Agrupamento de mensagens

## Fluxo de Dados

```
WhatsApp Message
    ↓
Rate Limiter (proteção)
    ↓
WhatsApp Core (processamento)
    ↓
State Manager (estado atual)
    ↓
Handler (conversation-flow ou admin-handler)
    ↓
Services (product-catalog, cart-manager, coupon-service)
    ↓
Cache Service (performance)
    ↓
Validators & Sanitizers (segurança)
    ↓
Response → WhatsApp Core → WhatsApp
```

## Padrões de Design

1. **Singleton Pattern** - Cache e Rate Limiter
2. **Factory Pattern** - Criação de mensagens
3. **Strategy Pattern** - Diferentes handlers de mensagens
4. **Observer Pattern** - Eventos do WhatsApp

## Escalabilidade

O sistema foi projetado para ser escalável:

- **Cache em memória** reduz carga em operações frequentes
- **Modularidade** permite adicionar novos serviços facilmente
- **Logs estruturados** facilitam debugging e monitoramento
- **Validação em camadas** garante segurança
