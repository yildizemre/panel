// Heatmaps.tsx dosyasının TAMAMI

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  MapPin,
  BarChart2,
  Calendar,
  Filter,
  Save,
  XCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// Veri tipleri
interface ComparisonStat {
  period: string;
  change: number | null;
}
interface HourlySummary {
  hour: string;
  totalVisitors: number;
  avgDwellTime: number; // saniye cinsinden
  editable_id: number | null;
}
interface OverallStats {
  totalVisitors: number;
  avgDwellTime: number;
  busiestZone: string;
}
interface DwellTimeDistribution {
  range: string;
  count: number;
}
interface ZonePerformance {
  zone: string;
  totalVisitors: number;
  avgDwell: number; // saniye cinsinden
}
interface DailyData {
    overallStats: OverallStats;
    hourlySummary: HourlySummary[];
    dwellTimeDistribution: DwellTimeDistribution[];
    zonePerformance: ZonePerformance[];
    allZones: string[];
    comparisonStats: {
        totalVisitors: ComparisonStat[];
    }
}
type EditableFields = {
    totalVisitors?: number | '';
    avgDwellTime?: number | '';
};

const ComparisonStatCard: React.FC<{ stat: ComparisonStat }> = ({ stat }) => {
    const { change, period } = stat;
    let color = 'text-slate-400';
    let Icon = Minus;
  
    if (change !== null) {
      if (change > 0) {
        color = 'text-green-400';
        Icon = TrendingUp;
      } else if (change < 0) {
        color = 'text-red-400';
        Icon = TrendingDown;
      }
    }
  
    const displayChange = change === null ? 'N/A' : `${change > 0 ? '+' : ''}${change}%`;
  
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 w-20">{period}:</span>
        <div className={`flex items-center font-semibold ${color}`}>
          <Icon className="w-3.5 h-3.5 mr-1" />
          <span>{displayChange}</span>
        </div>
      </div>
    );
};

const ChangeIndicator = ({ change }: { change: number | null }) => {
    if (change === null || isNaN(change) || !isFinite(change)) {
      return <span className="flex items-center text-slate-500"><Minus size={14} /> N/A</span>;
    }
    const isIncrease = change > 0;
    const isDecrease = change < 0;
    const color = isIncrease ? 'text-green-400' : isDecrease ? 'text-red-400' : 'text-slate-400';
    const Icon = isIncrease ? ArrowUp : isDecrease ? ArrowDown : Minus;
  
    return (
      <span className={`flex items-center text-xs font-medium ${color}`}>
        <Icon size={14} className="mr-1" />
        {Math.abs(change).toFixed(1)}%
      </span>
    );
};

const Heatmaps = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  const [editedData, setEditedData] = useState<{ [hour: string]: EditableFields }>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = Object.keys(editedData).length > 0;
  const isEditingDisabled = selectedZone !== 'all';

  const chartColors = { primary: '#3B82F6', secondary: '#F59E0B', accent: '#10B981', purple: '#8B5CF6' };

  const formatDwellTime = (seconds: number) => {
    if (!seconds || seconds < 1) return '0 sn';
    if (seconds < 60) return `${Math.round(seconds)} sn`;
    const minutes = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${minutes} dk ${sec} sn`;
  };

  const fetchDailySummary = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setEditedData({});
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedZone !== 'all') params.append('zone_ids', selectedZone);
      const response = await fetch(apiUrl(`/api/analytics/heatmaps/daily-summary?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDailyData(data);
      } else {
        setDailyData(null);
      }
    } catch (error) {
      console.error('Günlük heatmap özeti çekme hatası:', error);
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
        } catch(e) {
            setIsAdmin(false);
        }
    }
    fetchDailySummary();
  }, [selectedDate, selectedZone, storeRefresh]);
  
  // GÜNCELLEME: Filtrelenmiş ve saat dilimi ayarlanmış veri
  const filteredAndShiftedHourlyData = useMemo(() => {
    if (!dailyData?.hourlySummary) return [];
    
    return dailyData.hourlySummary
      .map(summary => {
          const hour = parseInt(summary.hour, 10);
          const newHour = (hour + 3) % 24;
          return { ...summary, hour: String(newHour).padStart(2, '0') };
      })
      .filter(summary => {
          const hour = parseInt(summary.hour, 10);
          return hour >= 10 && hour <= 22;
      })
      .sort((a, b) => parseInt(a.hour, 10) - parseInt(b.hour, 10));
  }, [dailyData?.hourlySummary]);


  const handleDataChange = (hour: string, field: 'totalVisitors' | 'avgDwellTime', value: string) => {
    const numericValue = value === '' ? '' : field === 'totalVisitors' ? parseInt(value, 10) : parseFloat(value);
    if (value === '' || (!isNaN(numericValue as number) && (numericValue as number) >= 0)) {
        setEditedData(prev => ({ ...prev, [hour]: { ...prev[hour], [field]: numericValue } }));
    }
  };

  const handleCancelChanges = () => setEditedData({});

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('token');
    const updatePromises = Object.entries(editedData).map(([hour, changes]) => {
      const originalHour = String((parseInt(hour, 10) - 3 + 24) % 24).padStart(2, '0');
      const recordId = dailyData?.hourlySummary.find(h => h.hour === originalHour)?.editable_id;
      if (!recordId) return Promise.resolve({ success: false, hour });

      const cleanedChanges: Partial<EditableFields> = {};
      if (changes.totalVisitors !== '' && changes.totalVisitors !== undefined) {
        cleanedChanges.totalVisitors = changes.totalVisitors;
      }
      if (changes.avgDwellTime !== '' && changes.avgDwellTime !== undefined) {
        cleanedChanges.avgDwellTime = changes.avgDwellTime;
      }
      if (Object.keys(cleanedChanges).length === 0) return Promise.resolve({ success: true, hour });

      return fetch(apiUrl(`/api/analytics/heatmaps/record/${recordId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(cleanedChanges)
      }).then(res => res.ok);
    });
    
    await Promise.all(updatePromises);
    setIsSaving(false);
    await fetchDailySummary(false);
  };

  const hourlyDataWithComparison = useMemo(() => {
    return filteredAndShiftedHourlyData.map((current, index) => {
      if (index === 0) return { ...current, visitorChange: null, dwellChange: null };
      const previous = filteredAndShiftedHourlyData[index - 1];
      const visitorChange = previous.totalVisitors > 0 ? ((current.totalVisitors - previous.totalVisitors) / previous.totalVisitors) * 100 : current.totalVisitors > 0 ? Infinity : 0;
      const dwellChange = previous.avgDwellTime > 0 ? ((current.avgDwellTime - previous.avgDwellTime) / previous.avgDwellTime) * 100 : current.avgDwellTime > 0 ? Infinity : 0;
      return { ...current, visitorChange, dwellChange };
    });
  }, [filteredAndShiftedHourlyData]);

  if (loading) {
    return (
      <div className="p-6 text-white text-center flex flex-col justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        {t('heatmap.loading')}
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('heatmap.title')}</h1>
            <p className="text-sm sm:text-base text-slate-400">{t('heatmap.subtitle')}</p>
          </div>
          <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Filter className="w-5 h-5 text-slate-400" />
                </div>
                <select 
                    value={selectedZone} 
                    onChange={(e) => setSelectedZone(e.target.value)} 
                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                    aria-label={t('heatmap.zone')}
                >
                    <option value="all">{t('heatmap.allZones')}</option>
                    {dailyData?.allZones?.map(zone => (<option key={zone} value={zone}>{zone}</option>))}
                </select>
            </div>
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg flex items-center">
                <label htmlFor="date-picker-heatmap" className="pl-3"><Calendar className="w-5 h-5 text-slate-400" /></label>
                <input 
                    type="date" 
                    id="date-picker-heatmap"
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                    className="w-full bg-transparent text-white focus:outline-none p-2.5 [color-scheme:dark]"
                />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-blue-600/20 text-blue-400 rounded-lg"><Users /></div>
                    <div>
                        <p className="text-slate-400 text-sm">{t('heatmap.visitorChange')}</p>
                        {/* GÜNCELLEME: Başlık kartındaki toplam ziyaretçi sayısını kaldırdık, karşılaştırma daha önemli. */}
                    </div>
                </div>
                <div className="flex flex-col gap-1 border-t border-slate-700 pt-3">
                    {(dailyData?.comparisonStats?.totalVisitors ?? []).map(stat => <ComparisonStatCard key={stat.period} stat={stat} />)}
                </div>
            </div>
          <StatCard icon={<Clock />} title={t('heatmap.avgDwell')} value={formatDwellTime(dailyData?.overallStats.avgDwellTime ?? 0)} />
          <StatCard icon={<MapPin />} title={t('heatmap.busiestZone')} value={dailyData?.overallStats.busiestZone ?? 'N/A'} />
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-lg">{t('heatmap.hourlyDetails')}</h3>
            {isAdmin && hasChanges && (
                <div className="flex items-center gap-2">
                    <button onClick={handleCancelChanges} className="flex items-center gap-1 text-sm text-slate-300 hover:text-white px-3 py-1 rounded-md hover:bg-slate-700 transition-colors"><XCircle className="w-4 h-4" /> {t('heatmap.cancel')}</button>
                    <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition-colors disabled:opacity-50">{isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isSaving ? t('heatmap.saving') : t('heatmap.save')}</button>
                </div>
            )}
          </div>
          {isAdmin && isEditingDisabled && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 text-yellow-400 text-sm rounded-lg">
                {t('heatmap.singleZoneEditDisabled')}
              </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3">{t('heatmap.timeRange')}</th>
                  <th scope="col" className="px-6 py-3 text-center">{t('heatmap.avgDwellSec')}</th>
                  <th scope="col" className="px-6 py-3 text-center">{t('heatmap.visitorChangeCol')}</th>
                  <th scope="col" className="px-6 py-3 text-center">{t('heatmap.dwellChange')}</th>
                </tr>
              </thead>
              <tbody>
                {/* GÜNCELLEME: Filtrelenmiş veri üzerinden map yapılıyor */}
                {hourlyDataWithComparison.map((hourData) => {
                  const isEdited = !!editedData[hourData.hour];
                  const editedDwellTime = editedData[hourData.hour]?.avgDwellTime;
                  const currentDwellTime = editedDwellTime !== undefined ? editedDwellTime : hourData.avgDwellTime;

                  return (
                    <tr key={hourData.hour} className={`border-b border-slate-700 hover:bg-slate-700/30 transition-colors ${isEdited ? 'bg-blue-900/30' : ''}`}>
                      <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{`${hourData.hour}:00 - ${hourData.hour}:59`}</td>
                      <td className="px-6 py-4 text-center">
                        <input type="number" value={typeof currentDwellTime === 'number' ? Math.round(currentDwellTime) : currentDwellTime} onChange={e => handleDataChange(hourData.hour, 'avgDwellTime', e.target.value)} className="w-24 bg-slate-800 text-slate-300 text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed" 
                        disabled={!isAdmin || isEditingDisabled || !hourData.editable_id} 
                        title={!isAdmin ? "Bu alanı sadece adminler düzenleyebilir." : isEditingDisabled ? "Tekil bölge verisi düzenlenemez." : (!hourData.editable_id ? "Bu saat diliminde düzenlenecek veri yok." : "")} />
                      </td>
                      <td className="px-6 py-4 text-center"><ChangeIndicator change={hourData.visitorChange} /></td>
                      <td className="px-6 py-4 text-center"><ChangeIndicator change={hourData.dwellChange} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title={t('heatmap.hourlyVisitorDwell')}>
            <ResponsiveContainer width="100%" height={300}>
                {/* GÜNCELLEME: Grafik verisi filtrelenmiş veriden besleniyor */}
                <ComposedChart data={filteredAndShiftedHourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} tickFormatter={(hour) => `${hour}:00`}/>
                    <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} label={{ value: t('heatmap.visitorCount'), angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}/>
                    <YAxis yAxisId="right" orientation="right" stroke={chartColors.secondary} fontSize={12} label={{ value: t('heatmap.dwellTimeSec'), angle: 90, position: 'insideRight', fill: chartColors.secondary }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} formatter={(value: number, name: string) => (name.includes("Bekleme") || name.includes("Dwell")) ? formatDwellTime(value) : value} />
                    <Legend />
                    {/* <Bar yAxisId="left" dataKey="totalVisitors" fill={chartColors.primary} name="Ziyaretçi Sayısı" /> */}
                    <Line yAxisId="right" type="monotone" dataKey="avgDwellTime" stroke={chartColors.secondary} strokeWidth={2} name={t('heatmap.avgDwellChart')} />
                </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t('heatmap.zonePerformance')}>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={dailyData?.zonePerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="zone" stroke="#9CA3AF" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke={chartColors.accent} fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} formatter={(value: number, name: string) => (name.includes("Bekleme") || name.includes("Dwell")) ? formatDwellTime(value) : value} />
                    <Legend />
                    {/* <Bar yAxisId="left" dataKey="totalVisitors" fill={chartColors.primary} name="Toplam Ziyaretçi" /> */}
                    <Line yAxisId="right" type="monotone" dataKey="avgDwell" stroke={chartColors.accent} name={t('heatmap.avgDwellShort')} />
                </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) => (<div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex items-center space-x-4"><div className="p-3 bg-blue-600/20 text-blue-400 rounded-lg">{icon}</div><div><p className="text-slate-400 text-sm">{title}</p><h3 className="text-white font-semibold text-2xl">{value}</h3></div></div>);
const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (<div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50"><h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2"><BarChart2 size={18} /> {title}</h3>{children}</div>);

export default Heatmaps;