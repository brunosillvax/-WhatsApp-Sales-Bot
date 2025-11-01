export default {
  /**
   * Paginar array de itens
   */
  paginate(items, page = 1, itemsPerPage = 5) {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
    };
  },

  /**
   * Gerar texto de navegação de paginação
   */
  getPaginationText(pagination) {
    return `Página ${pagination.currentPage} de ${pagination.totalPages} (${pagination.totalItems} item(s))`;
  },

  /**
   * Gerar botões de paginação
   */
  getPaginationButtons(pagination, baseCommand = '') {
    const buttons = [];

    if (pagination.hasPrev) {
      buttons.push({
        id: `${baseCommand}_prev`,
        text: `⬅️ Anterior (Pág ${pagination.currentPage - 1})`,
      });
    }

    if (pagination.hasNext) {
      buttons.push({
        id: `${baseCommand}_next`,
        text: `Próxima (Pág ${pagination.currentPage + 1}) ➡️`,
      });
    }

    // Botão para ir para página específica (se tiver mais de 3 páginas)
    if (pagination.totalPages > 3) {
      buttons.push({
        id: `${baseCommand}_page_menu`,
        text: `📄 Ir para página`,
      });
    }

    return buttons;
  },

  /**
   * Processar comando de paginação
   */
  processPaginationCommand(text, currentPage, totalPages) {
    const normalized = text.toLowerCase().trim();

    // Comandos de navegação
    if (normalized.includes('proxima') || normalized.includes('next') || normalized.includes('>')) {
      return Math.min(currentPage + 1, totalPages);
    }

    if (normalized.includes('anterior') || normalized.includes('prev') || normalized.includes('<')) {
      return Math.max(1, currentPage - 1);
    }

    // Ir para página específica: "pagina 2" ou "página 3"
    const pageMatch = normalized.match(/pag[iaí]n[ao]\s*(\d+)/i) ||
                     normalized.match(/p[ág]\s*(\d+)/i) ||
                     normalized.match(/^\s*(\d+)\s*$/);

    if (pageMatch && pageMatch[1]) {
      const page = parseInt(pageMatch[1]);
      if (page >= 1 && page <= totalPages) {
        return page;
      }
    }

    return null;
  },
};
