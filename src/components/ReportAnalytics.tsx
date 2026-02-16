// --- START OF FULLY UPDATED FILE ReportAnalytics.tsx ---

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Calendar, 
  BarChart3, 
  Plus,
  Users,
  MapPin,
  Clock,
  Zap, // Yeni ikon
  X,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';

// Rapor arayüzünü güncelleyelim
interface AiReport {
  id: string;
  name: string;
  analysis_type: 'customer' | 'heatmap' | 'queue';
  result: string;
  status: 'completed' | 'processing' | 'failed';
  createdAt: string;
}

const ReportAnalytics = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();

  // State'leri basitleştirelim
  const [analysisType, setAnalysisType] = useState<'customer' | 'heatmap' | 'queue' | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reports, setReports] = useState<AiReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tarihleri varsayılan olarak ayarla
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    fetchReports();
  }, [storeRefresh]);

  const analysisOptions = [
    { id: 'customer', label: t('report.customerAnalysis'), icon: Users },
    { id: 'heatmap', label: t('report.heatmapAnalysis'), icon: MapPin },
    { id: 'queue', label: t('report.queueAnalysis'), icon: Clock }
  ];

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/analytics/reports'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Raporlar getirilemedi:", err);
    }
  };

  const createAnalysis = async () => {
    if (!analysisType || !dateFrom || !dateTo) {
      setError(t('report.selectTypeAndDate'));
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/analytics/create-report'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ analysisType, dateFrom, dateTo })
      });

      if (response.ok) {
        const result = await response.json();
        setReports(prev => [result.report, ...prev]);
        setAnalysisType(null); // Seçimi sıfırla
      } else {
        const errorData = await response.json();
        setError(errorData.error || t('report.errorCreating'));
      }
    } catch (err) {
      setError(t('report.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="p-6 min-h-screen bg-slate-900">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item}>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('report.title')}</h1>
          <p className="text-sm sm:text-base text-slate-400">{t('report.subtitle')}</p>
        </motion.div>

        {/* Analiz Oluşturma Formu */}
        <motion.div variants={item} className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center"><Plus className="w-5 h-5 mr-2 text-blue-400" /> {t('report.newAnalysis')}</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('report.selectType')}</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisOptions.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button key={opt.id} onClick={() => setAnalysisType(opt.id as any)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center space-y-2 ${
                        analysisType === opt.id ? 'bg-blue-500/20 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <Icon className={`w-8 h-8 ${analysisType === opt.id ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="font-medium text-white">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('report.selectDateRange')}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>

            {error && <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm rounded-lg p-3">{error}</div>}

            <button onClick={createAnalysis} disabled={loading || !analysisType}
              className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              {loading ? (
                <> <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> {t('report.creatingAnalysis')} </>
              ) : (
                <> <Zap className="w-4 h-4 mr-2" /> {t('report.createAnalysis')} </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Mevcut Analizler */}
        <motion.div variants={item} className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-green-400" /> {t('report.createdAnalyses')}</h3>
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="text-center py-8 text-slate-400">{t('report.noAnalyses')}</div>
            ) : (
              reports.map(report => (
                <div key={report.id} className="bg-slate-700/30 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white">{report.name}</h4>
                      <p className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleString('tr-TR')}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/20 text-green-400">{report.status === 'completed' ? t('report.completed') : report.status === 'processing' ? t('report.processing') : report.status === 'failed' ? t('report.failed') : report.status}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-600/50">
                    <p className="text-slate-200 text-sm whitespace-pre-wrap font-sans">{report.result}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ReportAnalytics;
// --- END OF FULLY UPDATED FILE ReportAnalytics.tsx ---