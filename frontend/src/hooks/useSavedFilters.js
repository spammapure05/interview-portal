import { useState, useEffect, useCallback } from "react";
import api from "../api";

/**
 * Hook per gestire filtri salvabili per una pagina specifica
 * @param {string} pageKey - Chiave univoca per la pagina (es. "candidates", "requests")
 * @param {object} defaultFilters - Filtri di default
 */
export function useSavedFilters(pageKey, defaultFilters = {}) {
  const [filters, setFilters] = useState(defaultFilters);
  const [savedPresets, setSavedPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carica filtri salvati dal server
  useEffect(() => {
    const loadSavedFilters = async () => {
      // Solo se c'è un token (utente loggato)
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get("/preferences");
        if (res.data.saved_filters && res.data.saved_filters[pageKey]) {
          const pageFilters = res.data.saved_filters[pageKey];

          // Carica i preset salvati
          if (pageFilters.presets) {
            setSavedPresets(pageFilters.presets);
          }

          // Carica l'ultimo filtro attivo se esiste
          if (pageFilters.lastActive) {
            setFilters(prev => ({ ...prev, ...pageFilters.lastActive }));
          }
        }
      } catch (err) {
        console.error("Error loading saved filters:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedFilters();
  }, [pageKey]);

  // Salva filtro come preset
  const savePreset = useCallback(async (presetName) => {
    if (!presetName.trim()) return false;

    const newPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };

    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);

    try {
      await api.patch("/preferences/filters", {
        filter_name: pageKey,
        filter_value: {
          presets: updatedPresets,
          lastActive: filters
        }
      });
      return true;
    } catch (err) {
      console.error("Error saving preset:", err);
      // Rollback
      setSavedPresets(savedPresets);
      return false;
    }
  }, [filters, savedPresets, pageKey]);

  // Applica un preset salvato
  const applyPreset = useCallback((presetId) => {
    const preset = savedPresets.find(p => p.id === presetId);
    if (preset) {
      setFilters(preset.filters);
      setActivePreset(presetId);
    }
  }, [savedPresets]);

  // Elimina un preset
  const deletePreset = useCallback(async (presetId) => {
    const updatedPresets = savedPresets.filter(p => p.id !== presetId);
    setSavedPresets(updatedPresets);

    if (activePreset === presetId) {
      setActivePreset(null);
    }

    try {
      await api.patch("/preferences/filters", {
        filter_name: pageKey,
        filter_value: {
          presets: updatedPresets,
          lastActive: filters
        }
      });
      return true;
    } catch (err) {
      console.error("Error deleting preset:", err);
      // Rollback
      setSavedPresets(savedPresets);
      return false;
    }
  }, [savedPresets, activePreset, filters, pageKey]);

  // Aggiorna un filtro singolo
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Se cambia il filtro, non è più il preset attivo
      setActivePreset(null);
      return newFilters;
    });
  }, []);

  // Aggiorna più filtri contemporaneamente
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => {
      const merged = { ...prev, ...newFilters };
      setActivePreset(null);
      return merged;
    });
  }, []);

  // Reset ai filtri di default
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setActivePreset(null);
  }, [defaultFilters]);

  // Salva i filtri correnti come "ultimo usato" quando cambiano
  useEffect(() => {
    if (isLoading) return;

    // Solo se c'è un token (utente loggato)
    const token = localStorage.getItem("token");
    if (!token) return;

    const saveLastActive = async () => {
      try {
        await api.patch("/preferences/filters", {
          filter_name: pageKey,
          filter_value: {
            presets: savedPresets,
            lastActive: filters
          }
        });
      } catch (err) {
        // Silently fail - non critico
      }
    };

    // Debounce per evitare troppe richieste
    const timeout = setTimeout(saveLastActive, 1000);
    return () => clearTimeout(timeout);
  }, [filters, isLoading, pageKey, savedPresets]);

  // Verifica se ci sono filtri attivi (diversi dai default)
  const hasActiveFilters = Object.keys(filters).some(key => {
    const defaultValue = defaultFilters[key];
    const currentValue = filters[key];
    return currentValue !== defaultValue && currentValue !== "" && currentValue !== null;
  });

  return {
    filters,
    setFilters,
    updateFilter,
    updateFilters,
    resetFilters,
    savedPresets,
    activePreset,
    savePreset,
    applyPreset,
    deletePreset,
    hasActiveFilters,
    isLoading
  };
}

export default useSavedFilters;
