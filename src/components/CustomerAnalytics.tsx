// --- START OF FILE CustomerAnalytics.tsx ---

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart as PieChartIcon,
  RefreshCw,
  AlertCircle,
  Camera // Yeni ikon
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';

import DailyFlowAnalytics from './DailyFlowAnalytics';
import { formatTimeToUTC3 } from '../utils/timeUtils';

// Tarih formatlama yardımcısı
const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const CustomerAnalytics = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();

  const [selectedDate, setSelectedDate] = useState(new Date());
  // YENİ: Kamera filtresi için state'ler
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [allCameras, setAllCameras] = useState<string[]>([]);

  const [analyticsData, setAnalyticsData] = useState({
    demographics: {
      ageGroupsChart: [] as { name: string; value: number }[],
      genderDistributionChart: [] as { gender: string; value: number }[],
    },
    hourlyCustomerFlow: [] as { hour: string; entering: number; exiting: number }[],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartColors = {
    primary: '#3B82F6',
    pink: '#EC4899',
    purple: '#8B5CF6',
    accent: '#F59E0B',
    secondary: '#10B981',
    danger: '#EF4444',
  };
  const PIE_COLORS = [chartColors.primary, chartColors.accent, chartColors.secondary, chartColors.purple, chartColors.pink];

  // Backend'den müşteri verilerini çek (Kamera filtresi eklendi)
  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const dateStr = formatDateForAPI(selectedDate);

        const url = apiUrl(`/api/analytics/customers?date=${dateStr}&camera_id=${selectedCamera}`);

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Veri çekme başarısız oldu.');
        }

        const data = await response.json();
        const hourlyFlow = data.hourlyCustomerFlow || [];
        const filteredHourlyFlow = Array.isArray(hourlyFlow)
          ? hourlyFlow.filter((item: { hour?: string }) => {
              const h = item?.hour || '00:00';
              const hourValue = parseInt(String(h).split(':')[0], 10);
              return hourValue >= 7 && hourValue <= 19;
            })
          : [];

        setAnalyticsData({
          demographics: data.demographics || {
            ageGroupsChart: [],
            genderDistributionChart: [],
          },
          hourlyCustomerFlow: filteredHourlyFlow,
        });

        if (selectedCamera === 'all' && Array.isArray(data.all_cameras)) {
          setAllCameras(data.all_cameras);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [selectedDate, selectedCamera, storeRefresh]);


  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="p-6 min-h-screen bg-slate-900">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header ve Kamera Filtresi */}
        <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {t('analytics.title')}
            </h1>
            <p className="text-sm sm:text-base text-slate-400">
              {t('analytics.subtitle')}
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Camera className="w-5 h-5 text-slate-400" />
            </div>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              aria-label="Kamera Seçimi"
            >
              <option value="all">Tüm Kameralar</option>
              {allCameras.map(camera => (
                <option key={camera} value={camera}>{camera}</option>
              ))}
            </select>
          </div>
        </motion.div>

        <DailyFlowAnalytics
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedCamera={selectedCamera}
        />

        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-400" /></div>
        ) : error ? (
            <div className="text-center py-10 text-red-400 flex flex-col items-center">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p className="font-semibold">Hata Oluştu</p>
              <p className="text-sm">{error}</p>
            </div>
        ) : (
          <>
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
                <h3 className="text-white font-semibold text-base lg:text-lg mb-4">{t('analytics.ageDistribution')}</h3>
                {(analyticsData.demographics?.ageGroupsChart ?? []).reduce((sum, item) => sum + (item?.value ?? 0), 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.demographics?.ageGroupsChart ?? []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(analyticsData.demographics?.ageGroupsChart ?? []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          formatter={(value: number, name: string) => [value, name]}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-500">
                    <PieChartIcon className="w-8 h-8 mr-2"/> Veri yok
                  </div>
                )}
              </div>

              <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
                <h3 className="text-white font-semibold text-base lg:text-lg mb-4">{t('analytics.genderDistribution')}</h3>
                 {(analyticsData.demographics?.genderDistributionChart ?? []).reduce((sum, item) => sum + (item?.value ?? 0), 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.demographics?.genderDistributionChart ?? []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" stroke="#9CA3AF" />
                            <YAxis type="category" dataKey="gender" stroke="#9CA3AF" width={60} />
                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                            <Bar dataKey="value" name="Sayı" fill={chartColors.pink} />
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-500">
                    <PieChartIcon className="w-8 h-8 mr-2"/> Veri yok
                  </div>
                 )}
              </div>
            </motion.div>

            <motion.div variants={item} className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
              <h3 className="text-white font-semibold text-base lg:text-lg mb-4">
                {selectedDate.toLocaleDateString('tr-TR')} Tarihli Saatlik Müşteri Akışı (10:00 - 22:00)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                {/* GÜNCELLEME: Grafik verisi filtrelenmiş analyticsData.hourlyCustomerFlow'dan besleniyor */}
                <ComposedChart data={analyticsData.hourlyCustomerFlow ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} tickFormatter={(hour) => formatTimeToUTC3(hour)} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelFormatter={(label) => `Saat: ${formatTimeToUTC3(label)}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="entering" stroke={chartColors.secondary} name="Giren" />
                  <Line type="monotone" dataKey="exiting" stroke={chartColors.danger} name="Çıkan" />
                </ComposedChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CustomerAnalytics;