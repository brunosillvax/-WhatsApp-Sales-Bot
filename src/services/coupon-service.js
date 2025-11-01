import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import loggingService from './logging-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const couponsFile = path.join(rootDir, 'data', 'cupons.json');

class CouponService {
  constructor() {
    this.coupons = new Map();
    this.loadCoupons();
  }

  /**
   * Carregar cupons do arquivo
   */
  loadCoupons() {
    try {
      if (fs.existsSync(couponsFile)) {
        const data = fs.readFileSync(couponsFile, 'utf-8');
        const couponsArray = JSON.parse(data);

        this.coupons.clear();
        couponsArray.forEach(coupon => {
          this.coupons.set(coupon.codigo.toUpperCase(), coupon);
        });

        loggingService.info(`Carregados ${this.coupons.size} cupom(ns) de desconto`);
      } else {
        // Criar arquivo vazio se não existir
        this.saveCoupons();
      }
    } catch (error) {
      loggingService.error('Erro ao carregar cupons', error);
      this.coupons.clear();
    }
  }

  /**
   * Salvar cupons no arquivo
   */
  saveCoupons() {
    try {
      const dataDir = path.dirname(couponsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const couponsArray = Array.from(this.coupons.values());
      fs.writeFileSync(couponsFile, JSON.stringify(couponsArray, null, 2));
    } catch (error) {
      loggingService.error('Erro ao salvar cupons', error);
      throw error;
    }
  }

  /**
   * Criar novo cupom
   */
  createCoupon(coupon) {
    const code = coupon.codigo.toUpperCase();

    if (this.coupons.has(code)) {
      throw new Error(`Cupom ${code} já existe`);
    }

    const newCoupon = {
      codigo: code,
      tipo: coupon.tipo || 'percentual', // 'percentual' ou 'fixo'
      valor: parseFloat(coupon.valor),
      descricao: coupon.descricao || '',
      valido_de: coupon.valido_de || null,
      valido_ate: coupon.valido_ate || null,
      uso_maximo: coupon.uso_maximo || null, // null = ilimitado
      usado: 0,
      ativo: coupon.ativo !== false,
      criado_em: new Date().toISOString(),
    };

    this.coupons.set(code, newCoupon);
    this.saveCoupons();

    loggingService.info('Cupom criado', { codigo: code });
    return newCoupon;
  }

  /**
   * Validar cupom
   */
  validateCoupon(code, currentDate = new Date()) {
    const coupon = this.coupons.get(code.toUpperCase());

    if (!coupon) {
      return { valid: false, error: 'Cupom não encontrado' };
    }

    if (!coupon.ativo) {
      return { valid: false, error: 'Cupom está inativo' };
    }

    // Verificar validade
    if (coupon.valido_de) {
      const validFrom = new Date(coupon.valido_de);
      if (currentDate < validFrom) {
        return { valid: false, error: 'Cupom ainda não é válido' };
      }
    }

    if (coupon.valido_ate) {
      const validUntil = new Date(coupon.valido_ate);
      if (currentDate > validUntil) {
        return { valid: false, error: 'Cupom expirado' };
      }
    }

    // Verificar uso máximo
    if (coupon.uso_maximo && coupon.usado >= coupon.uso_maximo) {
      return { valid: false, error: 'Cupom atingiu limite de uso' };
    }

    return { valid: true, coupon };
  }

  /**
   * Aplicar cupom ao valor total
   */
  applyCoupon(code, total) {
    const validation = this.validateCoupon(code);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const coupon = validation.coupon;
    let desconto = 0;
    let novoTotal = total;

    if (coupon.tipo === 'percentual') {
      // Desconto percentual
      desconto = total * (coupon.valor / 100);
      novoTotal = total - desconto;

      // Limitar desconto máximo se especificado
      if (coupon.desconto_maximo) {
        desconto = Math.min(desconto, coupon.desconto_maximo);
        novoTotal = total - desconto;
      }
    } else {
      // Desconto fixo
      desconto = coupon.valor;
      novoTotal = Math.max(0, total - desconto);
      desconto = total - novoTotal; // Ajustar se desconto for maior que total
    }

    return {
      success: true,
      desconto: parseFloat(desconto.toFixed(2)),
      totalOriginal: total,
      novoTotal: parseFloat(novoTotal.toFixed(2)),
      coupon,
    };
  }

  /**
   * Registrar uso do cupom
   */
  recordUsage(code) {
    const coupon = this.coupons.get(code.toUpperCase());

    if (coupon) {
      coupon.usado = (coupon.usado || 0) + 1;
      this.saveCoupons();

      loggingService.info('Uso de cupom registrado', { codigo: code, usado: coupon.usado });
    }
  }

  /**
   * Obter todos os cupons
   */
  getAllCoupons() {
    return Array.from(this.coupons.values());
  }

  /**
   * Obter cupom por código
   */
  getCoupon(code) {
    return this.coupons.get(code.toUpperCase()) || null;
  }

  /**
   * Ativar/Desativar cupom
   */
  toggleCoupon(code, ativo) {
    const coupon = this.coupons.get(code.toUpperCase());

    if (!coupon) {
      throw new Error(`Cupom ${code} não encontrado`);
    }

    coupon.ativo = ativo;
    this.saveCoupons();

    loggingService.info('Cupom atualizado', { codigo: code, ativo });
    return coupon;
  }

  /**
   * Deletar cupom
   */
  deleteCoupon(code) {
    const deleted = this.coupons.delete(code.toUpperCase());

    if (deleted) {
      this.saveCoupons();
      loggingService.info('Cupom deletado', { codigo: code });
    }

    return deleted;
  }
}

export default new CouponService();
