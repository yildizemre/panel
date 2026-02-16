// --- START OF FILE Dashboard.tsx ---

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Target,
  ShoppingCart,
  UserCheck,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Line
} from 'recharts';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const storeRefresh = useStoreChange();
  
  const [dashboardData, setDashboardData] = useState({
    weeklyStats: {
      customersEntered: 0,
      customersExited: 0,
      ageDistribution: { mostDominantGroup: 'N/A' },
      genderDistribution: { male: 0, female: 0 },
      avgQueueTime: 0,
      busiestCashier: { name: 'N/A', weeklyCustomers: 0, avgWaitTime: 0 },
    },
    dailyCustomerFlow: [],
    dailyGenderChartData: [],
    dailyAgeChartData: [],
    hourlyQueueStaff: [],
  });

  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  // YENİ: Haftalık veri aralığını tutmak için state
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });

  const chartColors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#F97316',
    teal: '#14B8A6',
  };

  const formatSecondsToMinutes = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '0.00';
    return (seconds / 60).toFixed(2);
  };

  // YENİ: Tarih aralığını formatlamak için yardımcı fonksiyon
  const formatDateForRange = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Aylar 0'dan başlar
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/dashboard/weekly-overview'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();

        const totals = data.totals ?? {};
        const customers = totals.customers ?? {};
        const queues = totals.queues ?? {};
        const timeseries = data.timeseries ?? {};

        // GÜNCELLENDİ: API'den gelen veriden tarih aralığını çıkar
        if (timeseries.daily_customer_flow && timeseries.daily_customer_flow.length > 0) {
          const firstDay = timeseries.daily_customer_flow[0].date;
          const lastDay = timeseries.daily_customer_flow[timeseries.daily_customer_flow.length - 1].date;
          setDateRange({ start: firstDay, end: lastDay });
        }

        const transformedData = {
          weeklyStats: {
            customersEntered: customers.total_entered ?? 0,
            customersExited: customers.total_exited ?? 0,
            ageDistribution: { mostDominantGroup: customers.busiest_age_group ?? 'N/A' },
            genderDistribution: {
              male: customers.male ?? 0,
              female: customers.female ?? 0,
            },
            avgQueueTime: queues.avg_wait_time ?? 0,
            busiestCashier: { 
              name: 'Kasa 3', 
              weeklyCustomers: queues.total_queues ?? 0, 
              avgWaitTime: queues.avg_wait_time ?? 0 
            },
          },
          dailyCustomerFlow: (timeseries.daily_customer_flow ?? []).map((item: any) => ({
            ...item,
            date: new Date(item.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          })),
          dailyGenderChartData: (timeseries.daily_gender ?? []).map((item: any) => ({
            ...item,
            date: new Date(item.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          })),
          dailyAgeChartData: (timeseries.daily_age ?? []).map((item: any) => ({
            ...item,
            date: new Date(item.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          })),
          hourlyQueueStaff: [],
        };
        
        setDashboardData(transformedData);
      }
    } catch (error) {
      console.error('Dashboard veri çekme sırasında kritik hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [language, storeRefresh]);

  useEffect(() => {
    const dateInterval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(dateInterval);
  }, []);

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    return currentDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', options);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (<div key={i} className="h-32 bg-slate-800 rounded-xl"></div>))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* GÜNCELLENDİ: Başlık bölümüne tarih aralığı eklendi */}
        <motion.div variants={item} className="flex flex-col xl:flex-row justify-between items-start xl:items-center space-y-4 xl:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
            <div className="flex items-center space-x-3">
              <p className="text-sm sm:text-base text-slate-400">{t('dashboard.weeklyOverview')}</p>
              {dateRange.start && dateRange.end && (
                 <span className="text-xs sm:text-sm text-slate-500 bg-slate-800/60 px-2 py-1 rounded-md">
                   {formatDateForRange(dateRange.start)} - {formatDateForRange(dateRange.end)}
                 </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">{getFormattedDate()}</span>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-600 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
              <span className="text-xs text-slate-400">Haftalık</span>
            </div>
            <h3 className="text-white font-semibold text-lg lg:text-xl mb-1">{dashboardData.weeklyStats.customersEntered.toLocaleString()}</h3>
            <p className="text-slate-400 text-sm">{t('dashboard.customersEntered')}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-600 rounded-lg"><TrendingDown className="w-5 h-5 text-white" /></div>
              <span className="text-xs text-slate-400">Haftalık</span>
            </div>
            <h3 className="text-white font-semibold text-lg lg:text-xl mb-1">{dashboardData.weeklyStats.customersExited.toLocaleString()}</h3>
            <p className="text-slate-400 text-sm">{t('dashboard.customersExited')}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-600 rounded-lg"><Target className="w-5 h-5 text-white" /></div>
              <span className="text-xs text-slate-400">En Yoğun Grup</span>
            </div>
            <h3 className="text-white font-semibold text-lg lg:text-xl mb-1">{dashboardData.weeklyStats.ageDistribution.mostDominantGroup}</h3>
            <p className="text-slate-400 text-sm">{t('dashboard.ageDistribution')}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-pink-600 rounded-lg"><UserCheck className="w-5 h-5 text-white" /></div>
              <span className="text-xs text-slate-400">Haftalık</span>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="text-white font-semibold text-lg">{dashboardData.weeklyStats.genderDistribution.male.toLocaleString()}</h3>
                <p className="text-slate-400 text-sm">{t('chart.male')}</p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">{dashboardData.weeklyStats.genderDistribution.female.toLocaleString()}</h3>
                <p className="text-slate-400 text-sm">{t('chart.female')}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-600 rounded-lg"><Clock className="w-5 h-5 text-white" /></div>
              <span className="text-xs text-slate-400">Haftalık Ortalama</span>
            </div>
            <h3 className="text-white font-semibold text-lg lg:text-xl mb-1">
              {formatSecondsToMinutes(dashboardData.weeklyStats.avgQueueTime)} dk
            </h3>
            <p className="text-slate-400 text-sm">{t('dashboard.avgQueueTime')}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-teal-600 rounded-lg"><ShoppingCart className="w-5 h-5 text-white" /></div>
              <span className="text-xs text-slate-400">Haftanın Lideri</span>
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">{dashboardData.weeklyStats.busiestCashier.name}</h3>
            <p className="text-slate-400 text-sm">
                {dashboardData.weeklyStats.busiestCashier.weeklyCustomers.toLocaleString()} {t('dashboard.weeklyCustomers')} - 
                Ort. {formatSecondsToMinutes(dashboardData.weeklyStats.busiestCashier.avgWaitTime)} dk
            </p>
          </div>
        </motion.div>
        
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-white font-semibold text-base lg:text-lg mb-4">{t('dashboard.dailyCustomerFlowTrend')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={dashboardData.dailyCustomerFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Legend />
                {/* DÜZELTME: dataKey'ler backend'den gelen doğru isimlerle değiştirildi. */}
                <Line type="monotone" dataKey="entered" stroke={chartColors.secondary} name={t('dashboard.enteringCustomers')} />
                <Line type="monotone" dataKey="exited" stroke={chartColors.danger} name={t('dashboard.exitingCustomers')} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-white font-semibold text-base lg:text-lg mb-4">{t('dashboard.dailyGenderDistribution')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.dailyGenderChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Legend />
                <Bar dataKey="male" fill={chartColors.primary} name={t('chart.male')} />
                <Bar dataKey="female" fill={chartColors.pink} name={t('chart.female')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-white font-semibold text-base lg:text-lg mb-4">{t('dashboard.dailyAgeDistribution')}</h3>
            <ResponsiveContainer width="100%" height={300}>
               <BarChart data={dashboardData.dailyAgeChartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                 <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                 <YAxis stroke="#9CA3AF" fontSize={12}/>
                 <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                 <Legend />
                 <Bar dataKey="age_18_30" stackId="a" fill={chartColors.purple} name="18-30 Yaş" />
                 <Bar dataKey="age_30_50" stackId="a" fill={chartColors.accent} name="30-50 Yaş" />
                 <Bar dataKey="age_50_plus" stackId="a" fill={chartColors.secondary} name="50+ Yaş" />
               </BarChart>
            </ResponsiveContainer>
          </div>
          {/* <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-white font-semibold text-base lg:text-lg mb-4">{t('dashboard.queueLengthVsStaffRelationship')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={dashboardData.hourlyQueueStaff}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Legend />
                <Line type="monotone" dataKey="queueLength" stroke={chartColors.orange} name={t('dashboard.queueLength')} />
                <Line type="monotone" dataKey="staffCount" stroke={chartColors.teal} name={t('dashboard.staffCount')} />
              </ComposedChart>
            </ResponsiveContainer>
          </div> */}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;