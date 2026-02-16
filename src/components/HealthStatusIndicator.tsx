import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, ServerCrash, Loader } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const HealthStatusIndicator: React.FC = () => {
  const { t } = useLanguage();
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'unhealthy' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState<string>(() => '');
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000')}/api/health/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });

        const data = await response.json();

        if (response.ok) {
          setHealthStatus('healthy');
          setStatusMessage(`${t('health.systemActive')}: ${data.message}`);
        } else {
          setHealthStatus('unhealthy');
          setStatusMessage(`${t('health.systemError')}: ${data.message}`);
        }
      } catch (error) {
        setHealthStatus('error');
        setStatusMessage(t('health.connectionFailed'));
        console.error('Health check error:', error);
      }
    };

    setStatusMessage(t('health.checking'));
    fetchHealthStatus();

    // Her 30 saniyede bir durumu tekrar kontrol et
    const interval = setInterval(fetchHealthStatus, 30000);

    // Component unmount olduğunda interval'ı temizle
    return () => clearInterval(interval);
  }, [t]);

  const getStatusStyles = () => {
    switch (healthStatus) {
      case 'healthy':
        return {
          button: 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20',
          dot: 'bg-green-400',
          icon: <HeartPulse className="w-4 h-4" />,
        };
      case 'unhealthy':
      case 'error':
        return {
          button: 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20',
          dot: 'bg-red-400 animate-pulse',
          icon: <ServerCrash className="w-4 h-4" />,
        };
      case 'loading':
      default:
        return {
          button: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20',
          dot: 'bg-yellow-400',
          icon: <Loader className="w-4 h-4 animate-spin" />,
        };
    }
  };

  const styles = getStatusStyles();

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
            <p className="font-semibold mb-1">{t('health.title')}</p>
            <p className="text-slate-300">{statusMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border backdrop-blur-sm transition-all ${styles.button}`}
      >
        {styles.icon}
        <span className="text-sm font-medium">{t('health.status')}</span>
        <span className={`w-2 h-2 rounded-full ${styles.dot}`}></span>
      </motion.button>
    </div>
  );
};

export default HealthStatusIndicator;