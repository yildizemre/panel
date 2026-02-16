// --- START OF FILE DailyFlowAnalytics.tsx ---

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  Calendar, UserPlus, UserMinus, Clock, AlertCircle, BarChart3,
  Thermometer, ChevronLeft, ChevronRight, Save, XCircle, RefreshCw,
  TrendingUp, TrendingDown, Minus, Sun, Cloud, CloudRain
} from 'lucide-react';
import { formatTimeToUTC3 } from '../utils/timeUtils';

// --- Veri Modelleri ---
interface HourlyFlowData {
  entered: number;
  exited: number;
  editable_id: number | null;
}
interface DailySummary {
  total_entered: number;
  total_exited: number;
}
interface FlowData {
  summary: DailySummary;
  hourly_data: { [hour: string]: HourlyFlowData };
}
interface WeatherInfo {
  temp: number;
  description: string;
  icon: JSX.Element;
}
interface EditedData {
    [hour: string]: {
        entered?: string;
        exited?: string;
    };
}
interface ComparisonStat {
  period: string;
  change: number | null;
}

// --- Yardımcı Fonksiyonlar ---
const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeatherInfo = (code: number): { text: string; icon: JSX.Element } => {
    if (code === 0) return { text: 'Açık', icon: <Sun className="w-4 h-4 text-yellow-300" /> };
    if (code >= 1 && code <= 3) return { text: 'Bulutlu', icon: <Cloud className="w-4 h-4 text-slate-300" /> };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { text: 'Yağmurlu', icon: <CloudRain className="w-4 h-4 text-blue-300" /> };
    return { text: 'Bilinmiyor', icon: <Cloud className="w-4 h-4 text-slate-400" /> };
};

const fetchWeatherData = async (date: Date): Promise<{ [hour: string]: WeatherInfo } | null> => {
  const dateStr = formatDateForAPI(date);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=41.0383&longitude=28.9744&hourly=temperature_2m,weathercode&start_date=${dateStr}&end_date=${dateStr}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.hourly || !data.hourly.time) return null;
    const weatherByHour: { [hour: string]: WeatherInfo } = {};
    data.hourly.time.forEach((timeStr: string, index: number) => {
      const hourKey = new Date(timeStr).toTimeString().slice(0, 5);
      const weatherDetails = getWeatherInfo(data.hourly.weathercode[index]);
      weatherByHour[hourKey] = {
        temp: Math.round(data.hourly.temperature_2m[index]),
        description: weatherDetails.text,
        icon: weatherDetails.icon,
      };
    });
    return weatherByHour;
  } catch (error) {
    console.error("Hava durumu API hatası:", error);
    return null;
  }
};

const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

// --- Bileşen Prop Tipleri ---
interface DailyFlowAnalyticsProps {
    onDateChange: (date: Date) => void;
    selectedDate: Date;
    selectedCamera: string;
}

// --- Yardımcı Bileşen: Karşılaştırma Kartı ---
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


// --- Ana Bileşen ---
const DailyFlowAnalytics: React.FC<DailyFlowAnalyticsProps> = ({ onDateChange, selectedDate, selectedCamera }) => {
  const { language } = useLanguage();
  const storeRefresh = useStoreChange();
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [weatherData, setWeatherData] = useState<{ [hour: string]: WeatherInfo } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [comparisonStats, setComparisonStats] = useState<{ entered: ComparisonStat[], exited: ComparisonStat[] } | null>(null);

  const [editedData, setEditedData] = useState<EditedData>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = Object.keys(editedData).length > 0;

  const fetchDataForDate = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    setEditedData({});

    const token = localStorage.getItem('token');
    const dateStr = formatDateForAPI(selectedDate);

    const flowUrl = apiUrl(`/api/analytics/customers/flow-data?date_from=${dateStr}&camera_id=${selectedCamera}`);

    try {
      const [flowResponse, weatherResponse] = await Promise.all([
        fetch(flowUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetchWeatherData(selectedDate)
      ]);

      if (!flowResponse.ok) {
          const errorJson = await flowResponse.json();
          throw new Error(errorJson.error || 'Akış verisi çekme başarısız oldu.');
      }

      const flowJson = await flowResponse.json();
      setFlowData(flowJson.data && flowJson.data[dateStr] ? flowJson.data[dateStr] : null);
      setWeatherData(weatherResponse);
      setComparisonStats(flowJson.comparison_stats || null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
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

    fetchDataForDate();
  }, [selectedDate, selectedCamera, storeRefresh]);

  const displaySummary = useMemo(() => {
    if (!flowData) return { total_entered: 0, total_exited: 0 };
    let totalEntered = 0;
    let totalExited = 0;
    for (const [hourKey, originalHourData] of Object.entries(flowData.hourly_data)) {
        const editedHour = editedData[hourKey];
        const enteredValue = (editedHour?.entered !== undefined) ? (parseInt(editedHour.entered, 10) || 0) : originalHourData.entered;
        const exitedValue = (editedHour?.exited !== undefined) ? (parseInt(editedHour.exited, 10) || 0) : originalHourData.exited;
        totalEntered += enteredValue;
        totalExited += exitedValue;
    }
    return { total_entered: totalEntered, total_exited: totalExited };
  }, [flowData, editedData]);

  const handleDataChange = (hour: string, field: 'entered' | 'exited', value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const originalValue = flowData?.hourly_data[hour]?.[field];
    setEditedData(prev => {
        const newEditedData = { ...prev };
        let newHourData = { ...(newEditedData[hour] || {}) };
        if (originalValue !== undefined && value === String(originalValue)) {
            delete newHourData[field];
        } else {
            newHourData[field] = value;
        }
        if (Object.keys(newHourData).length === 0) {
            delete newEditedData[hour];
        } else {
            newEditedData[hour] = newHourData;
        }
        return newEditedData;
    });
  };

  const handleCancelChanges = () => setEditedData({});

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    const token = localStorage.getItem('token');
    const updatePromises = Object.entries(editedData).map(([hour, changes]) => {
      const recordId = flowData?.hourly_data[hour]?.editable_id;
      if (!recordId) return Promise.resolve({ success: false, hour });
      const payload: { entering?: number; exiting?: number } = {};
      if (changes.entered !== undefined) payload.entering = parseInt(changes.entered, 10) || 0;
      if (changes.exited !== undefined) payload.exiting = parseInt(changes.exited, 10) || 0;
      if (Object.keys(payload).length === 0) return Promise.resolve({ success: true, hour });
      return fetch(apiUrl(`/api/analytics/customers/record/${recordId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      }).then(res => res.json().then(data => ({ success: res.ok, data, hour })));
    });
    try {
      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter(r => !r.success);
      if (failedUpdates.length > 0) throw new Error(`Şu saatler güncellenemedi: ${failedUpdates.map(f => f.hour).join(', ')}`);
      await fetchDataForDate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydetme sırasında bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = event.target.value;
    if (dateString) onDateChange(new Date(dateString + 'T00:00:00'));
  };
  const handlePreviousDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); onDateChange(d); };
  const handleNextDay = () => { if (isToday(selectedDate)) return; const d = new Date(selectedDate); d.setDate(d.getDate() + 1); onDateChange(d); };

  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  const filteredHourlyData = useMemo(() => {
      if (!flowData?.hourly_data) return [];
      return Object.entries(flowData.hourly_data)
          .filter(([hour]) => {
              const hourValue = parseInt(hour.split(':')[0], 10);
              // Filtreleme hala UTC'ye göre yapılır, bu doğru.
              // 10:00-22:00 (UTC+3) aralığını göstermek için 07:00-21:00 (UTC) arasını seçeriz.
              return hourValue >= 7 && hourValue <= 18;
          })
          .sort(([hourA], [hourB]) => hourA.localeCompare(hourB));
  }, [flowData]);


  return (
    <motion.div variants={item} className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h3 className="text-white font-semibold text-base lg:text-lg">Günlük Akış Analizi</h3>
        <div className="flex items-center gap-2 sm:gap-4 bg-slate-900/50 p-2 rounded-lg border border-slate-700">
            <button onClick={handlePreviousDay} className="p-2 rounded-md hover:bg-slate-700" aria-label="Önceki Gün"><ChevronLeft className="w-5 h-5 text-slate-300" /></button>
            <div className="relative flex items-center">
                <label htmlFor="date-picker" className="flex items-center cursor-pointer gap-2"><Calendar className="w-5 h-5 text-slate-400" /><span className="text-white font-medium text-center text-sm w-36 sm:w-auto">{isToday(selectedDate) ? "Bugün" : selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span></label>
                <input type="date" id="date-picker" value={formatDateForAPI(selectedDate)} max={formatDateForAPI(new Date())} onChange={handleDateInputChange} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
            </div>
            <button onClick={handleNextDay} disabled={isToday(selectedDate)} className="p-2 rounded-md hover:bg-slate-700 disabled:opacity-50" aria-label="Sonraki Gün"><ChevronRight className="w-5 h-5 text-slate-300" /></button>
        </div>
      </div>

      {loading ? ( <div className="text-center py-10"><RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-400" /></div> )
      : error ? ( <div className="text-center py-10 text-red-400 flex flex-col items-center"><AlertCircle className="w-12 h-12 mb-4" /><p className="font-semibold">Hata Oluştu</p><p className="text-sm">{error}</p></div> )
      : !flowData || filteredHourlyData.length === 0 ? ( <div className="text-center py-10 text-slate-400 flex flex-col items-center"><BarChart3 className="w-12 h-12 mb-4" /><p className="font-semibold">Veri Bulunamadı</p><p className="text-sm">{selectedDate.toLocaleDateString()} için gösterilecek saat aralığında veri yok.</p></div> )
      : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
             <div className="bg-slate-700/30 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="p-3 bg-green-500/20 rounded-full shrink-0"><UserPlus className="w-6 h-6 text-green-400"/></div>
                <div className="flex-grow">
                    <p className="text-slate-400 text-sm">Giren Müşteri</p>
                    <p className="text-white text-2xl font-bold">{displaySummary.total_entered}</p>
                </div>
                {comparisonStats?.entered && (
                    <div className="flex flex-col items-start sm:items-end gap-1 border-l border-slate-600 pl-4 w-full sm:w-auto">
                        {comparisonStats.entered.map(stat => <ComparisonStatCard key={stat.period} stat={stat} />)}
                    </div>
                )}
             </div>
             <div className="bg-slate-700/30 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="p-3 bg-red-500/20 rounded-full shrink-0"><UserMinus className="w-6 h-6 text-red-400"/></div>
                <div className="flex-grow">
                    <p className="text-slate-400 text-sm">Çıkan Müşteri</p>
                    <p className="text-white text-2xl font-bold">{displaySummary.total_exited}</p>
                </div>
                {comparisonStats?.exited && (
                    <div className="flex flex-col items-start sm:items-end gap-1 border-l border-slate-600 pl-4 w-full sm:w-auto">
                        {comparisonStats.exited.map(stat => <ComparisonStatCard key={stat.period} stat={stat} />)}
                    </div>
                )}
             </div>
          </div>

          <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white font-semibold">Saatlik Döküm (10:00 - 22:00)</h4>
                {isAdmin && hasChanges && (
                    <div className="flex items-center gap-2">
                        <button onClick={handleCancelChanges} className="flex items-center gap-1 text-sm px-3 py-1 rounded-md hover:bg-slate-700"><XCircle className="w-4 h-4 text-slate-300" /> <span className="text-slate-300">İptal</span></button>
                        <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md disabled:opacity-50">{isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isSaving ? 'Kaydediliyor' : 'Kaydet'}</button>
                    </div>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto bg-slate-900/50 rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-800 z-10">
                        <tr>
                            <th className="text-left text-white py-3 px-4 font-medium"><Clock className="w-4 h-4 inline mr-2"/>Saat Aralığı</th>
                            <th className="text-center text-white py-3 px-4 font-medium"><UserPlus className="w-4 h-4 inline mr-2 text-green-400"/>Giren</th>
                            <th className="text-center text-white py-3 px-4 font-medium"><UserMinus className="w-4 h-4 inline mr-2 text-red-400"/>Çıkan</th>
                            <th className="text-left text-white py-3 px-4 font-medium"><Thermometer className="w-4 h-4 inline mr-2 text-orange-400"/>Hava</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredHourlyData.map(([hour, data]) => {
                            const editedHourData = editedData[hour] || {};
                            const currentEntering = editedHourData.entered ?? data.entered;
                            const currentExiting = editedHourData.exited ?? data.exited;
                            const isEdited = !!editedData[hour];
                            const weather = weatherData ? weatherData[hour] : null;

                            const startTimeUTC3 = formatTimeToUTC3(hour);
                            const startHourValue = parseInt(startTimeUTC3.split(':')[0], 10);
                            const endHourValue = (startHourValue + 1);
                            const endTimeUTC3 = `${endHourValue.toString().padStart(2, '0')}:00`;
                            const timeRange = `${startTimeUTC3} - ${endTimeUTC3}`;

                            // GÜNCELLEME: Düzenlemenin ne zaman devre dışı kalacağını belirleyen değişken
                            const isEditingDisabled = !isAdmin || !data.editable_id || selectedCamera === 'all';

                            // GÜNCELLEME: Neden devre dışı olduğunu açıklayan dinamik başlık
                            const disabledTitle = selectedCamera === 'all'
                                ? "Veri düzenlemek için lütfen belirli bir kamera seçin."
                                : !isAdmin
                                ? "Bu alanı sadece adminler düzenleyebilir."
                                : !data.editable_id
                                ? "Bu saatte düzenlenecek veri yok."
                                : "";

                            return (
                                <tr key={hour} className={`hover:bg-slate-700/30 transition-colors ${isEdited ? 'bg-blue-900/30' : ''}`}>
                                    <td className="py-2 px-4 text-white font-mono">{timeRange}</td>
                                    <td className="py-2 px-4 text-center">
                                        <input
                                            type="text"
                                            value={currentEntering}
                                            onChange={(e) => handleDataChange(hour, 'entered', e.target.value)}
                                            className="w-20 bg-slate-800 text-green-400 font-semibold text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                                            disabled={isEditingDisabled} // GÜNCELLEME
                                            title={isEditingDisabled ? disabledTitle : "Giren müşteri sayısını düzenle"} // GÜNCELLEME
                                        />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                        <input
                                            type="text"
                                            value={currentExiting}
                                            onChange={(e) => handleDataChange(hour, 'exited', e.target.value)}
                                            className="w-20 bg-slate-800 text-red-400 font-semibold text-center rounded-md border border-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                                            disabled={isEditingDisabled} // GÜNCELLEME
                                            title={isEditingDisabled ? disabledTitle : "Çıkan müşteri sayısını düzenle"} // GÜNCELLEME
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-slate-300">
                                        {weather ? (<div className="flex items-center gap-2">{weather.icon}<span>{`${weather.temp}°C, ${weather.description}`}</span></div>) : (<span>-</span>)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DailyFlowAnalytics;