import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import HealthStatusIndicator from './HealthStatusIndicator';
import ServiceHeartbeatIndicator from './ServiceHeartbeatIndicator';
import WeatherForecastIndicator from './WeatherForecastIndicator';
import StoreSwitcher from './StoreSwitcher';
import {
  Activity,
  Home,
  Users,
  UserCheck,
  Map,
  Clock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  BarChart3,
  Shield,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();

  // Kullanıcı adı ve rolünü al
  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.full_name || user.username || '');
        setUserRole(user.role || 'user');
        setShowStoreSwitcher(user.role === 'brand_manager' && (user.managed_stores?.length ?? 0) > 0);
      } catch {
        setUserName('');
        setUserRole('user');
      }
    }
    if (!userStr) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserRole(payload.role || 'user');
          setUserName(payload.username || '');
        } catch {
          setUserRole('user');
        }
      }
    }
  }, []);

  const roleLabel = userRole === 'admin' ? t('role.admin') : userRole === 'brand_manager' ? t('role.brandManager') : t('role.storeManager');

  const baseMenuItems = [
    { icon: Home, label: t('nav.dashboard'), path: '/dashboard' },
    { icon: Users, label: t('nav.customerAnalytics'), path: '/customer-analytics' },
    { icon: UserCheck, label: t('nav.staffManagement'), path: '/staff-management' },
    { icon: Map, label: t('nav.heatmaps'), path: '/heatmaps' },
    { icon: Clock, label: t('nav.queueAnalysis'), path: '/queue-analysis' },
    { icon: BarChart3, label: t('nav.reportAnalytics'), path: '/report-analytics' },
    ...(userRole === 'admin' ? [{ icon: Shield, label: t('nav.userManagement'), path: '/admin/users' }] : []),
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
  ];
  const menuItems = baseMenuItems;

  const currentTime = new Date().toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <motion.div
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="bg-slate-800/80 backdrop-blur-xl border-r border-slate-700/50 relative z-10 lg:block hidden"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <motion.div
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            className="flex items-center space-x-3"
          >
            <Activity className="w-8 h-8 text-blue-400" />
            {!isCollapsed && (
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                VISLIVIS
              </h1>
            )}
          </motion.div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </motion.button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-4 left-4 right-4">
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">{t('nav.logout')}</span>}
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: isCollapsed ? -280 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-280 bg-slate-800/95 backdrop-blur-xl border-r border-slate-700/50"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                     <div className="flex items-center space-x-3">
             <Activity className="w-8 h-8 text-blue-400" />
             <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
               VISLIVIS
             </h1>
           </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <motion.button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsCollapsed(true);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-4 left-4 right-4">
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{t('nav.logout')}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsCollapsed(false)}
                className="lg:hidden p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <h2 className="text-xl font-semibold text-white">
                {menuItems.find(item => item.path === location.pathname)?.label || t('nav.dashboard')}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-6">
              {showStoreSwitcher && <StoreSwitcher />}
              {/* Language Toggle */}
              <LanguageToggle />
              
              {/* Date & Time */}
              <div className="hidden md:flex items-center space-x-2 text-slate-300">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{currentTime.split(',')[0]}</span>
                <Clock className="w-4 h-4 ml-2" />
                <span className="text-sm">{currentTime.split(',')[1]}</span>
              </div>

              {/* User Profile */}
              <div className="hidden lg:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{userName || '-'}</p>
                  <p className="text-xs text-slate-400">{roleLabel}</p>
                </div>
              </div>
              <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer"
                >
                  <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </motion.div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto px-2 lg:px-0">
          {children}
        </main>
      </div>
      <WeatherForecastIndicator />
      <div className="fixed bottom-4 right-4 z-50 flex flex-row gap-2 items-center">
        <ServiceHeartbeatIndicator />
        <HealthStatusIndicator />
      </div>
    </div>
  );
};

export default Layout;