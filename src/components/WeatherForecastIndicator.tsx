import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const WeatherForecastIndicator: React.FC = () => {
  const { t } = useLanguage();
  const [forecast, setForecast] = useState<{
    isRainExpected: boolean;
    nextRainyDay: string | null;
  }>({
    isRainExpected: false,
    nextRainyDay: null,
  });
  const [loading, setLoading] = useState(true);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  useEffect(() => {
    const fetchWeatherForecast = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000')}/api/weather/forecast`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });

        if (response.ok) {
          const data = await response.json();
          setForecast(data);
        }
      } catch (error) {
        console.error('Weather forecast fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherForecast();
    // Hava durumu tahmini günde bir kez yeterlidir, bu yüzden interval kurmuyoruz.
    // Sayfa yenilendiğinde tekrar çeker.
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    // YYYY-MM-DD formatını DD.MM.YYYY formatına çevir
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };

  // Eğer yükleniyorsa veya yağmur beklenmiyorsa, hiçbir şey gösterme
  if (loading || !forecast.isRainExpected) {
    return null;
  }

  return (
    <div
      className="fixed bottom-16 right-4 z-50" // HealthStatusIndicator'ın hemen üstünde
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
            <p className="font-semibold mb-1">{t('weatherAlert.title')}</p>
            <p className="text-slate-300">
              {t('weatherAlert.message')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border backdrop-blur-sm transition-all bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
      >
        <CloudRain className="w-4 h-4" />
        <span className="text-sm font-medium">
          Yakın Tarihli Yağış: {formatDate(forecast.nextRainyDay)}
        </span>
      </motion.button>
    </div>
  );
};

export default WeatherForecastIndicator;
