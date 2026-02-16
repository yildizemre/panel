import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertTriangle, Loader } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';

const ServiceHeartbeatIndicator: React.FC = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'loading' | 'alive' | 'dead'>('loading');
  const [message, setMessage] = useState<string>('');
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token')?.trim();
        if (!token) {
          setStatus('dead');
          setMessage(t('serviceHeartbeat.error'));
          return;
        }
        const res = await fetch(apiUrl('/api/health/heartbeat/status'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          setStatus(data.is_alive ? 'alive' : 'dead');
          setMessage(
            data.is_alive
              ? t('serviceHeartbeat.alive')
              : data.last_ping_at
                ? t('serviceHeartbeat.dead')
                : t('serviceHeartbeat.noData')
          );
        } else {
          setStatus('loading');
          setMessage(t('serviceHeartbeat.error'));
        }
      } catch {
        setStatus('dead');
        setMessage(t('serviceHeartbeat.error'));
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Her 30 sn kontrol
    return () => clearInterval(interval);
  }, [t]);

  const getStyles = () => {
    switch (status) {
      case 'alive':
        return {
          button: 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20',
          dot: 'bg-green-400',
          icon: <Zap className="w-4 h-4" />,
        };
      case 'dead':
        return {
          button: 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20',
          dot: 'bg-red-400 animate-pulse',
          icon: <AlertTriangle className="w-4 h-4" />,
        };
      default:
        return {
          button: 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20',
          dot: 'bg-slate-400',
          icon: <Loader className="w-4 h-4 animate-spin" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      <AnimatePresence>
        {isTooltipVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full right-0 mb-2 w-64 bg-slate-700 text-white text-sm rounded-lg p-3 shadow-lg border border-slate-600"
          >
            <p className="font-semibold mb-1">{t('serviceHeartbeat.title')}</p>
            <p className="text-slate-300">{message || (status === 'loading' ? t('serviceHeartbeat.checking') : '')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border backdrop-blur-sm transition-all ${styles.button}`}
      >
        {styles.icon}
        <span className="text-sm font-medium">{t('serviceHeartbeat.label')}</span>
        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
      </motion.button>
    </div>
  );
};

export default ServiceHeartbeatIndicator;
