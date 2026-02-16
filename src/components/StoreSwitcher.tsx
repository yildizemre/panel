import React, { useState, useEffect } from 'react';
import { Store, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getSelectedStoreId } from '../lib/api';

interface ManagedStore {
  id: number;
  username: string;
  full_name?: string;
}

const StoreSwitcher: React.FC = () => {
  const { t } = useLanguage();
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      const list = user.managed_stores || [];
      setStores(list);
      setSelectedId(getSelectedStoreId());
    } catch {
      setStores([]);
    }
  }, []);

  if (stores.length === 0) return null;

  const handleSelect = (id: number | null) => {
    if (id === null) {
      sessionStorage.removeItem('selectedStoreId');
      setSelectedId(null);
    } else {
      sessionStorage.setItem('selectedStoreId', String(id));
      setSelectedId(String(id));
    }
    setOpen(false);
    window.dispatchEvent(new Event('store-changed'));
  };

  const selectedStore = stores.find((s) => String(s.id) === selectedId);
  const label = selectedId
    ? selectedStore?.username || selectedStore?.full_name || String(selectedId)
    : t('storeSwitcher.all');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-200 hover:bg-slate-600/50 text-sm"
      >
        <Store className="w-4 h-4" />
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[180px]">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700/50 ${!selectedId ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'}`}
            >
              {t('storeSwitcher.all')}
            </button>
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700/50 ${selectedId === String(s.id) ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'}`}
              >
                {s.username}
                {s.full_name && s.full_name !== s.username && (
                  <span className="text-slate-500 ml-1">({s.full_name})</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StoreSwitcher;
