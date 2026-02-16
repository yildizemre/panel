// QueueAnalysis.tsx dosyasının TAMAMI

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  Timer,
  BarChart2,
  Calendar,
  Filter,
  Save,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
} from 'recharts';

interface HourlySummary {
  hour: string;
  totalCustomers: number;
  avgWaitTime: number;
  minWaitTime: number;
  maxWaitTime: number;
  editable_id: number | null;
}
interface OverallStats {
  totalCustomers: number;
  avgWaitTime: number;
  maxWaitTime: number;
}
interface WaitTimeDistribution {
  range: string;
  count: number;
}
interface CashierPerformance {
  cashier: string;
  avgWait: number;
  totalCustomers: number;
}

type EditableFields = {
    totalCustomers?: number | '';
    avgWaitTime?: number | '';
};

const QueueAnalysis = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  
  const [dailyData, setDailyData] = useState<{
    overallStats: OverallStats;
    hourlySummary: HourlySummary[];
    waitTimeDistribution: WaitTimeDistribution[];
    cashierPerformance: CashierPerformance[];
    allCashiers: string[];
    availableCashiers: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  const [editedData, setEditedData] = useState<{ [hour: string]: EditableFields }>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = Object.keys(editedData).length > 0;
  const isEditingDisabled = selectedCashier !== 'all'; 

  const chartColors = { primary: '#3B82F6', secondary: '#10B981', accent: '#F59E0B', danger: '#EF4444', purple: '#8B5CF6' };

  const formatWaitTime = (waitTimeInSeconds: number) => {
    if (!waitTimeInSeconds || waitTimeInSeconds < 1) return '0 sn';
    if (waitTimeInSeconds < 60) return `${Math.round(waitTimeInSeconds)} sn`;
    const minutes = Math.floor(waitTimeInSeconds / 60);
    const seconds = Math.round(waitTimeInSeconds % 60);
    return `${minutes} dk ${seconds} sn`;
  };

  const fetchDailySummary = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setEditedData({});
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedCashier !== 'all') {
        params.append('cashier_ids', selectedCashier);
      }
      const response = await fetch(apiUrl(`/api/analytics/queues/daily-summary?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDailyData(data);
      } else {
        setDailyData(null);
      }
    } catch (error) {
      console.error('Günlük kuyruk özeti çekme hatası:', error);
      setDailyData(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
        try {
            const user = JSON.parse(userString);
            setIsAdmin(user && user.role === 'admin');
        } catch (e) {
            setIsAdmin(false);
        }
    }
    fetchDailySummary();
  }, [selectedDate, selectedCashier, storeRefresh]);

  const handleDataChange = (hour: string, field: 'avgWaitTime' | 'totalCustomers', value: string) => {
    if (value === '') {
      setEditedData(prev => ({ ...prev, [hour]: { ...prev[hour], [field]: '' } }));
      return;
    }
    const numericValue = field === 'totalCustomers' ? parseInt(value, 10) : parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setEditedData(prev => ({ ...prev, [hour]: { ...prev[hour], [field]: numericValue } }));
    }
  };

  const handleCancelChanges = () => {
    setEditedData({});
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('token');

    const updatePromises = Object.entries(editedData).map(([hour, changes]) => {
      const recordId = filteredAndShiftedDailyData?.find(h => h.hour === hour)?.editable_id;
      if (!recordId) return Promise.resolve({ success: false, hour });

      const cleanedChanges: Partial<EditableFields> = {};
      if (changes.totalCustomers !== '' && changes.totalCustomers !== undefined) {
        cleanedChanges.totalCustomers = changes.totalCustomers;
      }
      if (changes.avgWaitTime !== '' && changes.avgWaitTime !== undefined) {
        cleanedChanges.avgWaitTime = changes.avgWaitTime;
      }

      if (Object.keys(cleanedChanges).length === 0) {
        return Promise.resolve({ success: true, hour });
      }

      return fetch(apiUrl(`/api/analytics/queues/record/${recordId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(cleanedChanges)
      }).then(res => res.ok);
    });
    
    await Promise.all(updatePromises);
    setIsSaving(false);
    await fetchDailySummary(false);
  };
  
  const shiftHour = (hourString: string): string => {
    const hour = parseInt(hourString, 10);
    if (isNaN(hour)) return hourString;
    const newHour = (hour + 3) % 24;
    return String(newHour).padStart(2, '0');
  };

  // GÜNCELLEME: Filtrelenmiş ve saat dilimi ayarlanmış veri
  const filteredAndShiftedDailyData = useMemo(() => {
    if (!dailyData) return [];
    return dailyData.hourlySummary
      .map(summary => ({ ...summary, hour: shiftHour(summary.hour) }))
      .filter(summary => {
          const hour = parseInt(summary.hour, 10);
          return hour >= 10 && hour <= 22;
      })
      .sort((a, b) => parseInt(a.hour, 10) - parseInt(b.hour, 10));
  }, [dailyData]);

  if (loading) {
    return (<div className="p-6 text-white text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>{t('queue.loading')}</div>);
  }

  return (
    <div className="p-6">
      <motion.div initial="hidden" animate="show" className="space-y-6">
        <motion.div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div><h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('queue.title')}</h1><p className="text-sm sm:text-base text-slate-400">{t('queue.subtitle')}</p></div>
          <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Filter className="w-5 h-5 text-slate-400" />
              </div>
              <select 
                id="cashier-filter" 
                value={selectedCashier} 
                onChange={(e) => setSelectedCashier(e.target.value)} 
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              >
                <option value="all">{t('queue.allCashiers')}</option>
                {(dailyData?.availableCashiers ?? dailyData?.allCashiers ?? []).map(cashierId => (<option key={cashierId} value={cashierId}>{cashierId}</option>))}
              </select>
            </div>
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg flex items-center">
              <label htmlFor="date-picker-queue" className="pl-3"><Calendar className="w-5 h-5 text-slate-400" /></label>
              <input 
                type="date" 
                id="date-picker-queue"
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="w-full bg-transparent text-white focus:outline-none p-2.5 [color-scheme:dark]" 
              />
            </div>
          </div>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard icon={<Users />} title={t('queue.totalCustomers')} value={dailyData?.overallStats.totalCustomers.toLocaleString() ?? '0'} /><StatCard icon={<Clock />} title={t('queue.avgWait')} value={formatWaitTime(dailyData?.overallStats.avgWaitTime ?? 0)} /><StatCard icon={<Timer />} title={t('queue.maxWait')} value={formatWaitTime(dailyData?.overallStats.maxWaitTime ?? 0)} /></motion.div>
        
        <motion.div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-lg">{t('queue.hourlyDetails')}</h3>
            {isAdmin && hasChanges && (
                <div className="flex items-center gap-2"><button onClick={handleCancelChanges} className="flex items-center gap-1 text-sm text-slate-300 hover:text-white px-3 py-1 rounded-md hover:bg-slate-700 transition-colors"><XCircle className="w-4 h-4" /> {t('queue.cancel')}</button><button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition-colors disabled:opacity-50">{isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isSaving ? t('queue.saving') : t('queue.save')}</button></div>
            )}
          </div>
          {isAdmin && isEditingDisabled && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 text-yellow-400 text-sm rounded-lg">
                {t('queue.singleCashierEditDisabled')}
              </div>
          )}
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-400 uppercase bg-slate-700/50"><tr><th scope="col" className="px-6 py-3">{t('queue.timeRange')}</th><th scope="col" className="px-6 py-3 text-center">{t('queue.totalCustomersCol')}</th><th scope="col" className="px-6 py-3 text-center">{t('queue.avgWaitSec')}</th><th scope="col" className="px-6 py-3 text-center">{t('queue.minWait')}</th><th scope="col" className="px-6 py-3 text-center">{t('queue.maxWaitCol')}</th></tr></thead>
              <tbody>
                {/* GÜNCELLEME: Filtrelenmiş veri üzerinden map yapılıyor */}
                {filteredAndShiftedDailyData.map((hourData, index) => {
                  const isEdited = !!editedData[hourData.hour];
                  const editedTotalCustomers = editedData[hourData.hour]?.totalCustomers;
                  const editedAvgWaitTime = editedData[hourData.hour]?.avgWaitTime;
                  
                  const currentTotalCustomers = editedTotalCustomers !== undefined ? editedTotalCustomers : hourData.totalCustomers;
                  const currentAvgWait = editedAvgWaitTime !== undefined ? editedAvgWaitTime : hourData.avgWaitTime;

                  return (
                    <tr key={`${hourData.hour}-${index}`} className={`border-b border-slate-700 hover:bg-slate-700/30 transition-colors ${isEdited ? 'bg-blue-900/30' : ''}`}>
                      <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{`${hourData.hour}:00 - ${hourData.hour}:59`}</td>
                      <td className="px-6 py-4 text-center">
                        <input 
                          type="number" 
                          value={currentTotalCustomers}
                          onChange={e => handleDataChange(hourData.hour, 'totalCustomers', e.target.value)} 
                          className="w-20 bg-slate-800 text-slate-300 text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed" 
                          disabled={!isAdmin || isEditingDisabled || !hourData.editable_id}
                          title={!isAdmin ? t('queue.adminOnlyEdit') : isEditingDisabled ? t('queue.singleCashierNoEdit') : (!hourData.editable_id ? t('queue.noDataThisSlot') : '')}
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input 
                          type="number" 
                          value={typeof currentAvgWait === 'number' ? Math.round(currentAvgWait) : currentAvgWait}
                          onChange={e => handleDataChange(hourData.hour, 'avgWaitTime', e.target.value)} 
                          className="w-20 bg-slate-800 text-slate-300 text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed" 
                          disabled={!isAdmin || isEditingDisabled || !hourData.editable_id} 
                          title={!isAdmin ? t('queue.adminOnlyEdit') : isEditingDisabled ? t('queue.singleCashierNoEdit') : (!hourData.editable_id ? t('queue.noDataThisSlot') : '')} 
                        />
                      </td>
                      <td className="px-6 py-4 text-center text-green-400">{formatWaitTime(hourData.minWaitTime)}</td>
                      <td className="px-6 py-4 text-center text-red-400">{formatWaitTime(hourData.maxWaitTime)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title={t('queue.hourlyChart')}><ResponsiveContainer width="100%" height={300}><ComposedChart data={filteredAndShiftedDailyData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} tickFormatter={(hour) => `${hour}:00`}/><YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} /><YAxis yAxisId="right" orientation="right" stroke={chartColors.accent} fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} formatter={(value: number, name: string) => (name.includes("Bekleme") || name.includes("Wait")) ? formatWaitTime(value) : value} /><Legend /><Bar yAxisId="left" dataKey="totalCustomers" fill={chartColors.primary} name={t('queue.customerCount')} /><Line yAxisId="right" type="monotone" dataKey="avgWaitTime" stroke={chartColors.accent} strokeWidth={2} name={t('queue.avgWaitSec')} /></ComposedChart></ResponsiveContainer></ChartCard>
          <ChartCard title={t('queue.waitDistribution')}><ResponsiveContainer width="100%" height={300}><BarChart data={dailyData?.waitTimeDistribution}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="range" stroke="#9CA3AF" fontSize={12} /><YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} /><Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} /><Bar dataKey="count" fill={chartColors.purple} name={t('queue.customerCount')} /></BarChart></ResponsiveContainer></ChartCard>
        </motion.div>

        <motion.div><ChartCard title={t('queue.cashierPerformance')}><ResponsiveContainer width="100%" height={300}><BarChart data={dailyData?.cashierPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis type="number" stroke="#9CA3AF" fontSize={12} /><YAxis type="category" dataKey="cashier" stroke="#9CA3AF" fontSize={12} width={80} /><Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} formatter={(value: number, name: string) => (name.includes("Bekleme") || name.includes("Wait")) ? formatWaitTime(value) : value} /><Legend /><Bar dataKey="totalCustomers" fill={chartColors.primary} name={t('queue.totalCustomers')} /><Bar dataKey="avgWait" fill={chartColors.secondary} name={t('queue.avgWait')} /></BarChart></ResponsiveContainer></ChartCard></motion.div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) => (<div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex items-center space-x-4"><div className="p-3 bg-blue-600/20 text-blue-400 rounded-lg">{icon}</div><div><p className="text-slate-400 text-sm">{title}</p><h3 className="text-white font-semibold text-2xl">{value}</h3></div></div>);
const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (<div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50"><h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2"><BarChart2 size={18} /> {title}</h3>{children}</div>);

export default QueueAnalysis;