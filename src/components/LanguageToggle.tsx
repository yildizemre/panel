import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <Globe className="w-4 h-4 text-slate-400" />
      <div className="flex bg-slate-700/50 rounded-lg border border-slate-600/50 overflow-hidden">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLanguage('tr')}
          className={`px-3 py-1 text-sm font-medium transition-all ${
            language === 'tr'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
          }`}
        >
          TR
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 text-sm font-medium transition-all ${
            language === 'en'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
          }`}
        >
          EN
        </motion.button>
      </div>
    </div>
  );
};

export default LanguageToggle;
