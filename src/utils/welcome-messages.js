import loggingService from '../services/logging-service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Armazenar usuários que já foram recebidos: { jid: timestamp }
const greetedUsers = new Map();
const GREET_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

// Arquivo para persistir usuários recebidos
const greetedUsersFile = path.join(rootDir, 'data', 'greeted-users.json');

// Carregar usuários recebidos ao iniciar
function loadGreetedUsers() {
  try {
    if (fs.existsSync(greetedUsersFile)) {
      const data = fs.readFileSync(greetedUsersFile, 'utf-8');
      const users = JSON.parse(data);

      const now = Date.now();
      for (const [jid, timestamp] of Object.entries(users)) {
        // Só manter se não expirou
        if (now - timestamp < GREET_EXPIRATION_MS) {
          greetedUsers.set(jid, timestamp);
        }
      }
    }
  } catch (error) {
    loggingService.error('Erro ao carregar usuários recebidos', error);
  }
}

// Salvar usuários recebidos
function saveGreetedUsers() {
  try {
    const dataDir = path.dirname(greetedUsersFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const users = Object.fromEntries(greetedUsers);
    fs.writeFileSync(greetedUsersFile, JSON.stringify(users, null, 2));
  } catch (error) {
    loggingService.error('Erro ao salvar usuários recebidos', error);
  }
}

// Carregar ao inicializar
loadGreetedUsers();

export default {
  /**
   * Verificar se usuário já foi recebido
   */
  isFirstInteraction(jid) {
    return !greetedUsers.has(jid);
  },

  /**
   * Marcar usuário como recebido
   */
  markAsGreeted(jid) {
    greetedUsers.set(jid, Date.now());
    saveGreetedUsers();
  },

  /**
   * Gerar mensagem de boas-vindas personalizada
   */
  generateWelcomeMessage(jid, productCatalog) {
    const isFirst = this.isFirstInteraction(jid);
    const botName = process.env.BOT_NAME || 'WhatsApp Sales Bot';

    let message = '';

    if (isFirst) {
      message += `Olá! 👋 Bem-vindo à ${botName}!\n\n`;
      message += `É a primeira vez que você nos visita? Ficamos felizes em tê-lo(a) aqui! 🎉\n\n`;
    } else {
      message += `Olá! 👋 Bem-vindo de volta à ${botName}!\n\n`;
      message += `Que bom ter você aqui novamente! 😊\n\n`;
    }

    // Adicionar informações sobre ofertas
    try {
      const offers = productCatalog?.getProductsOnSale() || [];
      if (offers.length > 0) {
        message += `🎉 *Promoção Especial!*\n`;
        message += `Temos ${offers.length} produto(s) em oferta hoje!\n\n`;
      }
    } catch (error) {
      loggingService.error('Erro ao verificar ofertas na mensagem de boas-vindas', error);
    }

    // Não incluir "Como posso ajudar" - os botões do menu já mostram as opções
    // A mensagem será completada com os botões no showMainMenu

    // Marcar como recebido
    if (isFirst) {
      this.markAsGreeted(jid);
      loggingService.info('Usuário recebido pela primeira vez', {
        jid: jid.split('@')[0],
      });
    }

    return message;
  },

  /**
   * Obter nome do usuário se disponível (do JID)
   */
  getUserName(jid) {
    // Extrair número do JID
    const number = jid.split('@')[0];

    // Tentar extrair nome se estiver no formato esperado
    // Por enquanto, retornar apenas o número formatado
    const formatted = number.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');

    return formatted || number;
  },
};
