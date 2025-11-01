import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Criar pasta de logs se não existir
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formato de data para rotação diária
const getLogFileName = () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  return path.join(logsDir, `app-${dateStr}.log`);
};

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'whatsapp-sales-bot' },
  transports: [
    // Arquivo de log diário
    new winston.transports.File({
      filename: getLogFileName(),
      maxsize: 5242880, // 5MB
      maxFiles: 30, // Manter 30 dias de logs
    }),
    // Log de erros separado
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 30,
    }),
    // Console para desenvolvimento
    ...(process.env.NODE_ENV !== 'production'
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            ),
          }),
        ]
      : []),
  ],
});

// Métodos de conveniência
export default {
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },

  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  error: (message, error = null, meta = {}) => {
    const logData = {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
    };
    logger.error(message, logData);
  },

  // Logs específicos para o bot
  logMessage: (jid, text, direction = 'received') => {
    logger.info('Mensagem processada', {
      jid: jid.split('@')[0],
      text: text.substring(0, 100), // Limitar tamanho
      direction,
      timestamp: new Date().toISOString(),
    });
  },

  logProductAction: (action, jid, productId, meta = {}) => {
    logger.info(`Produto ${action}`, {
      jid: jid.split('@')[0],
      productId,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  logCartAction: (action, jid, meta = {}) => {
    logger.info(`Carrinho ${action}`, {
      jid: jid.split('@')[0],
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  logCheckout: (jid, order, meta = {}) => {
    logger.info('Pedido finalizado', {
      jid: jid.split('@')[0],
      orderId: order.id || 'N/A',
      total: order.total,
      itemsCount: order.items?.length || 0,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  logAdminAction: (action, jid, meta = {}) => {
    logger.info(`Admin ${action}`, {
      jid: jid.split('@')[0],
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  logError: (context, error, meta = {}) => {
    logger.error(`Erro em ${context}`, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },
};
