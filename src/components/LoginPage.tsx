import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Activity, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorHint(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000')}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        const token = String(data.access_token || '').trim();
        if (!token) {
          setError(t('msg.tokenError'));
          return;
        }
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin();
      } else {
        setError(t('login.errorWrongCredentials'));
        setErrorHint(t('login.errorHint'));
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('msg.serverError'));
      setErrorHint(t('msg.adminAccount'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
    >
      {/* Language Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageToggle />
      </div>

      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full opacity-20"
            animate={{
              x: [Math.random() * 100, Math.random() * 100],
              y: [Math.random() * 100, Math.random() * 100],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50 relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center mb-8"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Activity className="w-8 h-8 text-blue-400" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-purple-500 rounded-full"
              />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              {t('login.title')}
            </h1>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-slate-300 text-center mb-8"
        >
          {t('login.subtitle')}
        </motion.p>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-red-300 text-sm font-medium">{error}</p>
                {errorHint && (
                  <p className="text-slate-400 text-xs mt-1.5">{errorHint}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setError(null); setErrorHint(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('login.email')}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); setErrorHint(null); }}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-400"
              placeholder={t('login.usernameOrEmail')}
              required
              autoComplete="username"
            />
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); setErrorHint(null); }}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-400 pr-12"
                placeholder={t('login.password')}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-between"
          >
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-slate-600 bg-slate-700" />
              <span className="ml-2 text-sm text-slate-300">{t('login.rememberMe')}</span>
            </label>
            {/* <a href="#" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              {t('login.forgotPassword')}
            </a> */}
          </motion.div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all transform"
          >
            {t('login.signIn')}
          </motion.button>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center"
        >
          {/* <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400 font-medium mb-2">Demo Hesap</p>
            <div className="text-xs text-slate-300 space-y-1">
              <p>admin@admin.com / admin</p>
            </div>
          </div> */}
          {/* <p className="text-xs text-slate-400">
            {t('login.poweredBy')}
          </p> */}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;
