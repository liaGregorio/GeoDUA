import { useCallback } from 'react';

export const useNavigationHistory = (userId) => {
  const getStorageKey = useCallback(() => {
    return userId ? `userHistory_${userId}` : 'userHistory';
  }, [userId]);

  const addToHistory = useCallback((bookId, bookName, chapterId, chapterName) => {
    try {
      const storageKey = getStorageKey();
      // Obter histórico atual
      const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Criar nova entrada
      const newEntry = {
        bookId,
        bookName,
        chapterId,
        chapterName,
        timestamp: new Date().toISOString()
      };

      // Verificar se já existe entrada idêntica recente (últimos 5 minutos)
      const recentDuplicate = history.find(item => 
        item.bookId === bookId && 
        item.chapterId === chapterId &&
        (new Date() - new Date(item.timestamp)) < 5 * 60 * 1000
      );

      if (!recentDuplicate) {
        // Adicionar no início do array
        history.unshift(newEntry);
        
        // Limitar a 100 entradas mais recentes
        const limitedHistory = history.slice(0, 100);
        
        // Salvar no localStorage
        localStorage.setItem(storageKey, JSON.stringify(limitedHistory));
      }
    } catch (error) {
      console.error('Erro ao adicionar ao histórico:', error);
    }
  }, [getStorageKey]);

  const getHistory = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      return [];
    }
  }, [getStorageKey]);

  const clearHistory = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
    }
  }, [getStorageKey]);

  return {
    addToHistory,
    getHistory,
    clearHistory
  };
};
