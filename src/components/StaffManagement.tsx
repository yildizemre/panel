import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  BarChart3,
  UserPlus,
  UserMinus,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MapPin,
  Camera,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const StaffManagement = () => {
  const { t, language } = useLanguage();
  const storeRefresh = useStoreChange();
  
  // Kullanıcı yetkisini kontrol et
  const [userRole, setUserRole] = useState<string>('');
  const [hasPermission, setHasPermission] = useState(false);
  
  // useEffect(() => {
  //   // LocalStorage'dan kullanıcı rolünü al
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     try {
  //       // JWT token'dan kullanıcı bilgilerini çıkar
  //       const payload = JSON.parse(atob(token.split('.')[1]));
  //       const role = payload.role || 'user';
  //       setUserRole(role);
        
  //       // Sadece 'admin' rolüne sahip kullanıcılar erişebilir
  //       setHasPermission(role === 'admin');
  //     } catch (error) {
  //       console.error('Token parse hatası:', error);
  //       setHasPermission(false);
  //     }
  //   } else {
  //     setHasPermission(false);
  //   }
  // }, []);
  
  const [staffData, setStaffData] = useState({
    totalStaff: 0,
    activeStaff: 0,
    avgEfficiency: 0,
    totalHours: 0,
    staffList: [] as Array<{
      id: string;
      name: string; 
      position: string; 
      status: string; 
      efficiency: number; 
      hours: number; 
      colorCode: string;
      currentLocation: string;
      lastImage?: string;
      lastImageTime?: string;
    }>,
    pagination: {
      currentPage: 1,
      perPage: 10,
      totalCount: 0,
      totalPages: 0
    },
    // Chart data
    positionDistribution: [] as Array<{position: string, count: number, percentage: number}>,
    efficiencyDistribution: [] as Array<{range: string, count: number, percentage: number}>,
    workHoursVsEfficiency: [] as Array<{name: string, hours: number, efficiency: number, position: string}>
  });
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Pagination and filtering states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Chart colors
  const chartColors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#F97316',
    teal: '#14B8A6',
    indigo: '#6366F1',
    emerald: '#059669'
  };

  // Backend'den personel verilerini çek
  const fetchStaffData = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: itemsPerPage.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (positionFilter) params.append('position', positionFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const response = await fetch(apiUrl(`/api/analytics/staff?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Staff data received:', data);
        // Ensure all required fields are present
        const processedData = {
          totalStaff: data.totalStaff || 0,
          activeStaff: data.activeStaff || 0,
          avgEfficiency: data.avgEfficiency || 0,
          totalHours: data.totalHours || 0,
          staffList: data.staffList || [],
          pagination: data.pagination || {
            currentPage: 1,
            perPage: 10,
            totalCount: 0,
            totalPages: 0
          },
          positionDistribution: data.positionDistribution || [],
          efficiencyDistribution: data.efficiencyDistribution || [],
          workHoursVsEfficiency: data.workHoursVsEfficiency || []
        };
        setStaffData(processedData);
        setCurrentPage(page);
      } else {
        console.error('Personel veri çekme hatası:', response.status);
      }
    } catch (error) {
      console.error('Personel veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Component mount olduğunda ve her 30 saniyede bir veri çek
  useEffect(() => {
    fetchStaffData();
    const interval = setInterval(() => fetchStaffData(), 30 * 1000); // 30 saniye
    return () => clearInterval(interval);
  }, [storeRefresh]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const handleStaffRowClick = async (staff: any) => {
    setSelectedStaff(staff);
    setShowImageModal(true);
  };

  const captureStaffImage = async (staffId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/staff/capture-image'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ staff_id: staffId })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update the staff data with new image
        setStaffData(prev => ({
          ...prev,
          staffList: prev.staffList.map(staff => 
            staff.id === staffId 
              ? { ...staff, lastImage: data.image_url, lastImageTime: new Date().toLocaleTimeString() }
              : staff
          )
        }));
      }
    } catch (error) {
      console.error('Görüntü çekme hatası:', error);
    }
  };

  const handleSearch = () => {
    fetchStaffData(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPositionFilter('');
    setDateFrom('');
    setDateTo('');
    fetchStaffData(1);
  };

  const handlePageChange = (page: number) => {
    fetchStaffData(page);
  };

  const handleItemsPerPageChange = (perPage: number) => {
    setItemsPerPage(perPage);
    fetchStaffData(1);
  };

  const getColorText = (colorCode: string) => {
    const keyMap: Record<string, string> = {
      red: 'color.red', blue: 'color.blue', green: 'color.green', yellow: 'color.yellow',
      purple: 'color.purple', orange: 'color.orange', pink: 'color.pink', cyan: 'color.cyan'
    };
    const key = keyMap[colorCode];
    return key ? t(key) : colorCode;
  };

  // Yetki kontrolü
  if (!hasPermission) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="bg-red-600/20 border border-red-600/30 rounded-full p-4 mb-6">
            <Users className="w-16 h-16 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Erişim Reddedildi</h1>
          <p className="text-slate-400 text-lg mb-6 max-w-md">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Sadece yönetici kullanıcılar personel yönetimi sayfasına erişebilir.
          </p>
          {/* <div className="bg-slate-800/50 backdrop-blur-xl p-4 rounded-xl border border-slate-700/50">
            <p className="text-slate-300 text-sm">
              <strong>Mevcut Rol:</strong> {userRole || 'Belirlenemedi'}<br/>
              <strong>Gerekli Rol:</strong> admin
            </p>
          </div> */}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={item} className="flex flex-col xl:flex-row justify-between items-start xl:items-center space-y-4 xl:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('staff.title')}</h1>
            <p className="text-sm sm:text-base text-slate-400">{t('staff.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">{new Date().toLocaleDateString('tr-TR')}</span>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="text-white font-semibold text-lg lg:text-xl mb-1">{staffData.totalStaff}</h3>
            <p className="text-slate-400 text-sm">{t('staff.totalStaff')}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-600 rounded-lg">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="text-white font-semibold text-lg lg:text-xl mb-1">{staffData.activeStaff}</h3>
            <p className="text-slate-400 text-sm">{t('staff.activeStaff')}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="text-white font-semibold text-lg lg:text-xl mb-1">%{staffData.avgEfficiency.toFixed(2)}</h3>
            <p className="text-slate-400 text-sm">{t('staff.avgEfficiency')}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-600 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="text-white font-semibold text-lg lg:text-xl mb-1">{staffData.totalHours}</h3>
            <p className="text-slate-400 text-sm">{t('staff.efficientHours')}</p>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div variants={item} className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Personel ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="break">Mola</option>
                <option value="inactive">Pasif</option>
              </select>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Pozisyonlar</option>
                <option value="Satış Danışmanı">Satış Danışmanı</option>
                <option value="Kasiyer">Kasiyer</option>
                <option value="Yönetici">Yönetici</option>
                <option value="Güvenlik">Güvenlik</option>
                <option value="Temizlik">Temizlik</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Ara
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Temizle
              </button>
            </div>
          </div>

          {/* Date Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 self-center">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 Kayıt</option>
                <option value={10}>10 Kayıt</option>
                <option value={20}>20 Kayıt</option>
                <option value={50}>50 Kayıt</option>
              </select>
            </div>
          </div>

          {/* Staff Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-3 text-slate-400 font-medium">Personel</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Pozisyon</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Durum</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Verimlilik</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Verimli Saat</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Renk Kodu</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Konum</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Görüntü</th>
                </tr>
              </thead>
              <tbody>
                {staffData.staffList.map((staff) => (
                  <tr key={staff.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/30 cursor-pointer" onClick={() => handleStaffRowClick(staff)}>
                    <td className="p-3 text-white">{staff.name}</td>
                    <td className="p-3 text-white">{staff.position}</td>
                    <td className={`p-3 font-medium ${
                      staff.status === 'active' ? 'text-green-400' :
                      staff.status === 'break' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {staff.status === 'active' ? t('staff.statusActive') : 
                       staff.status === 'break' ? t('staff.statusBreak') : t('staff.statusInactive')}
                    </td>
                    <td className="p-3 text-white">%{staff.efficiency.toFixed(2)}</td>
                    <td className="p-3 text-white">{staff.hours} {t('staff.hours')}</td>
                    <td className="p-3 text-white">{getColorText(staff.colorCode)}</td>
                    <td className="p-3 text-white">{staff.currentLocation}</td>
                    <td className="p-3">
                      {staff.lastImage ? (
                        <button className="text-blue-500 hover:text-blue-400 transition-colors">
                          {t('staff.view')}
                        </button>
                      ) : (
                        <span className="text-slate-500">{t('staff.none')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {staffData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-slate-400 text-sm">
                {language === 'tr'
                  ? `${staffData.pagination.totalCount} ${t('staff.recordsFrom')} ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, staffData.pagination.totalCount)} ${t('staff.showingRange')}`
                  : `${t('staff.paginationShowing')} ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, staffData.pagination.totalCount)} ${t('staff.paginationOf')} ${staffData.pagination.totalCount} ${t('staff.records')}`}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white text-sm">
                  {t('staff.pageOf')} {currentPage} / {staffData.pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === staffData.pagination.totalPages}
                  className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Charts Section */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Position Distribution Pie Chart */}
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-white font-semibold text-base lg:text-lg mb-4">{t('staff.positionDistribution')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={staffData.positionDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ position, percentage }) => `${position} ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="percentage"
                >
                  {staffData.positionDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={[
                        chartColors.primary, 
                        chartColors.secondary, 
                        chartColors.accent, 
                        chartColors.purple,
                        chartColors.pink,
                        chartColors.orange,
                        chartColors.teal,
                        chartColors.indigo
                      ][index % 8]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Efficiency Distribution Bar Chart */}
          <div className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-white font-semibold text-base lg:text-lg mb-4">Personel Verimlilik Oranı Dağılımı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={staffData.efficiencyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="range" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill={chartColors.secondary}
                  name="Personel Sayısı"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Work Hours vs Efficiency Scatter Plot */}
        <motion.div variants={item} className="bg-slate-800/50 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-slate-700/50">
          <h3 className="text-white font-semibold text-base lg:text-lg mb-4">Çalışma Saati vs. Verimlilik</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={staffData.workHoursVsEfficiency}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                dataKey="hours" 
                name="Çalışma Saati"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                type="number" 
                dataKey="efficiency" 
                name="Verimlilik (%)"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value, name, props) => [
                  `${props.payload.name} - ${props.payload.position}`,
                  `${name}: ${value}${name === 'Verimlilik (%)' ? '%' : ' saat'}`
                ]}
              />
              <Legend />
              <Scatter 
                dataKey="efficiency" 
                fill={chartColors.primary}
                name="Personel"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Image Modal */}
      {showImageModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">{selectedStaff.name} - Görüntü</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Pozisyon:</span>
                  <span className="text-white ml-2">{selectedStaff.position}</span>
                </div>
                <div>
                  <span className="text-slate-400">Durum:</span>
                  <span className="text-white ml-2">{selectedStaff.status === 'active' ? 'Aktif' : selectedStaff.status === 'break' ? 'Mola' : 'Pasif'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Verimlilik:</span>
                  <span className="text-white ml-2">%{selectedStaff.efficiency.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Konum:</span>
                  <span className="text-white ml-2">{selectedStaff.currentLocation}</span>
                </div>
              </div>
              {selectedStaff.lastImage ? (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <img
                    src={selectedStaff.lastImage}
                    alt={`${selectedStaff.name} görüntüsü`}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  {selectedStaff.lastImageTime && (
                    <p className="text-slate-400 text-sm mt-2">Çekim Zamanı: {selectedStaff.lastImageTime}</p>
                  )}
                </div>
              ) : (
                <div className="bg-slate-700/30 rounded-lg p-8 text-center">
                  <p className="text-slate-400">Görüntü bulunamadı</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
