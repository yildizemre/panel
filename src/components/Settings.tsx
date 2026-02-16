// --- START OF FULLY UPDATED FILE Settings.tsx ---

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';
import { useStoreChange } from '../hooks/useStoreChange';
import { 
  User, 
  Camera,
  Database,
  Eye,
  X,
  Mail, // Yeni ikon
  Trash2, // Yeni ikon
  KeyRound, // Yeni ikon
  RefreshCw, // Yeni ikon
  CheckCircle, // Yeni ikon
  AlertTriangle // Yeni ikon
} from 'lucide-react';

// Arayüzler
interface CameraModalProps {
  camera: CameraInfo | null;
  onClose: () => void;
}

interface CameraInfo {
  id: number;
  name: string;
  type: string;
  rtsp: string;
  imageUrl: string;
}

// GÜNCELLENDİ: Rapor alıcısı için yeni arayüz
interface ReportRecipient {
    id: number;
    email: string;
}

// Kamera Görüntüleme Modalı
const CameraViewModal: React.FC<CameraModalProps & { t: (k: string) => string }> = ({ camera, onClose, t }) => {
  if (!camera) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-xl p-4 md:p-6 max-w-2xl w-full mx-4 border border-slate-700"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">{camera.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>
          {camera.imageUrl ? (
            <img 
              src={camera.imageUrl} 
              alt={`${camera.name} görüntüsü`}
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg bg-black"
            />
          ) : (
            <div className="w-full h-48 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">{t('settings.noImage')}</div>
          )}
          <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
            <p className="text-sm text-slate-400">RTSP Adresi:</p>
            <p className="text-xs text-slate-200 font-mono break-all">{camera.rtsp}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


const Settings = () => {
  const { t } = useLanguage();
  const storeRefresh = useStoreChange();
  const [activeTab, setActiveTab] = useState('profile');
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<CameraInfo | null>(null);

  const [profile, setProfile] = useState<{ username: string; email: string; full_name: string | null } | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Rapor gönderimi için state'ler
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // GÜNCELLENDİ: Şifre değiştirme için state'ler
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // GÜNCELLENDİ: Sekme listesi
  const tabs = [
    { id: 'profile', label: t('settings.profileTab'), icon: User },
    { id: 'cameras', label: t('settings.camerasTab'), icon: Camera },
    { id: 'reporting', label: t('settings.reportingTab'), icon: Mail },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  // Profil verilerini API'den çek
  useEffect(() => {
    if (activeTab === 'profile') {
      const fetchProfile = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(apiUrl('/api/settings/profile'), { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
            setProfileForm({ full_name: data.full_name || '', email: data.email || '' });
          }
        } catch {
          setProfile(null);
        }
      };
      fetchProfile();
    }
  }, [activeTab]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    setIsSavingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/settings/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: profileForm.full_name, email: profileForm.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ type: 'success', text: t('settings.profileUpdated') });
        setProfile(data);
      } else {
        setProfileMessage({ type: 'error', text: data.error || t('settings.updateFailed') });
      }
    } catch {
      setProfileMessage({ type: 'error', text: t('settings.serverError') });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Kamera verilerini API'den çek
  useEffect(() => {
    if (activeTab === 'cameras') {
      const fetchCameras = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(apiUrl('/api/settings/cameras'), { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setSiteName(data.site_name || null);
            setCameras((data.cameras || []).map((c: { id: number; name: string; type: string; rtsp: string; imageUrl: string }) => ({
              id: c.id,
              name: c.name,
              type: c.type || 'Kapı',
              rtsp: c.rtsp || '',
              imageUrl: c.imageUrl || '',
            })));
          }
        } catch {
          setCameras([]);
        }
      };
      fetchCameras();
    }
  }, [activeTab, storeRefresh]);

  // Rapor alıcılarını çeken fonksiyon
  useEffect(() => {
    if (activeTab === 'reporting') {
      const fetchRecipients = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(apiUrl('/api/settings/report-recipients'), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setRecipients(data.recipients || data || []);
          }
        } catch (error) {
          console.error("Alıcılar çekilemedi:", error);
        }
      };
      fetchRecipients();
    }
  }, [activeTab]);

  // YENİ: E-posta ekleme fonksiyonu
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!newEmail) {
      setEmailError('E-posta adresi boş olamaz.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/settings/report-recipients'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setRecipients([data, ...recipients]);
        setNewEmail('');
      } else {
        setEmailError(data.error || 'Bir hata oluştu.');
      }
    } catch (error) {
      setEmailError('Sunucuya bağlanılamadı.');
    }
  };

  // YENİ: E-posta silme fonksiyonu
  const handleDeleteEmail = async (id: number) => {
    if (!window.confirm("Bu e-posta adresini silmek istediğinizden emin misiniz?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/settings/report-recipients/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setRecipients(recipients.filter(r => r.id !== id));
      } else {
        alert(t('settings.deleteFailed'));
      }
    } catch (error) {
      alert(t('settings.serverError'));
    }
  };
  
  // YENİ: Şifre değiştirme fonksiyonu
  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordMessage({ type: '', text: '' });
      if (passwordData.newPassword !== passwordData.confirmPassword) {
          setPasswordMessage({ type: 'error', text: t('settings.passwordsMismatch') });
          return;
      }
      if (passwordData.newPassword.length < 6) {
          setPasswordMessage({ type: 'error', text: t('settings.passwordMinLength') });
          return;
      }
      setIsSavingPassword(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(apiUrl('/api/settings/password'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            })
        });
        const data = await response.json();
        if (response.ok) {
            setPasswordMessage({ type: 'success', text: data.message });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } else {
            setPasswordMessage({ type: 'error', text: data.error || t('settings.passwordUpdateFailed') });
        }
      } catch (error) {
          setPasswordMessage({ type: 'error', text: t('settings.passwordError') });
      } finally {
          setIsSavingPassword(false);
      }
  };

  // Sekme içeriğini render eden fonksiyon
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">{t('settings.profileInfo')}</h3>
                <form onSubmit={handleProfileSave} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.username')}</label>
                    <input type="text" value={profile?.username ?? ''} readOnly className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed" />
                    <p className="text-xs text-slate-500 mt-1">{t('settings.usernameReadonly')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.fullName')}</label>
                    <input type="text" value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} placeholder={t('settings.fullNamePlaceholder')} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.email')}</label>
                    <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder={t('settings.emailPlaceholder')} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white" required />
                  </div>
                  {profileMessage.text && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${profileMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {profileMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      {profileMessage.text}
                    </div>
                  )}
                  <button type="submit" disabled={isSavingProfile} className="flex items-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-slate-600">
                    {isSavingProfile ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    {t('settings.saveProfile')}
                  </button>
                </form>
            </div>
            <div className="border-t border-slate-700 pt-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><KeyRound className="w-5 h-5"/> {t('settings.changePassword')}</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.currentPassword')}</label>
                        <input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.newPassword')}</label>
                        <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.newPasswordConfirm')}</label>
                        <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white" required />
                    </div>
                    {passwordMessage.text && (
                        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${passwordMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {passwordMessage.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                            {passwordMessage.text}
                        </div>
                    )}
                    <button type="submit" disabled={isSavingPassword} className="w-full flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-slate-600">
                        {isSavingPassword ? <RefreshCw className="w-5 h-5 animate-spin"/> : t('settings.updatePassword')}
                    </button>
                </form>
            </div>
          </motion.div>
        );

      case 'cameras':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-white">{t('settings.cameraFlows')}</h3>
              {siteName && <span className="text-slate-400 text-sm">{t('settings.setup')}: {siteName}</span>}
            </div>
            <p className="text-slate-400 text-sm -mt-2 mb-4">{t('settings.cameraSetupDesc')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3">{t('settings.cameraName')}</th>
                    <th className="px-4 py-3">{t('settings.type')}</th>
                    <th className="px-4 py-3">{t('settings.rtspAddress')}</th>
                    <th className="px-4 py-3 text-right">{t('settings.action')}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {cameras.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{t('settings.noCameras')}</td></tr>}
                  {cameras.map((camera) => (
                    <tr key={camera.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-white">{camera.name}</td>
                      <td className="px-4 py-3">{camera.type}</td>
                      <td className="px-4 py-3 font-mono text-xs">{camera.rtsp}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => setSelectedCamera(camera)}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4" /> {t('settings.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );

      // YENİ: Rapor gönderimi sekmesi
      case 'reporting':
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-4">{t('settings.reportRecipients')}</h3>
                <p className="text-slate-400 -mt-4 mb-6">{t('settings.reportRecipientsDesc')}</p>
                <form onSubmit={handleAddEmail} className="flex gap-2 items-start">
                    <div className="flex-grow">
                        <input 
                            type="email" 
                            value={newEmail} 
                            onChange={e => setNewEmail(e.target.value)} 
                            placeholder={t('settings.addEmailPlaceholder')} 
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white" 
                        />
                         {emailError && <p className="text-red-400 text-sm mt-1">{emailError}</p>}
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">{t('settings.add')}</button>
                </form>

                <div className="border-t border-slate-700 pt-6">
                    <h4 className="text-md font-semibold text-white mb-3">{t('settings.currentRecipients')}</h4>
                    <ul className="space-y-2">
                        {recipients.map(recipient => (
                            <li key={recipient.id} className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg">
                                <span className="text-slate-200">{recipient.email}</span>
                                <button onClick={() => handleDeleteEmail(recipient.id)} className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-500/10">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                        {recipients.length === 0 && <p className="text-slate-500 text-center py-4">{t('settings.noRecipients')}</p>}
                    </ul>
                </div>
            </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <CameraViewModal camera={selectedCamera} onClose={() => setSelectedCamera(null)} t={t} />
      <div className="p-6">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item}>
            <h1 className="text-2xl font-bold text-white mb-2">{t('settings.title')}</h1>
            <p className="text-slate-400">{t('settings.subtitleFull')}</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            <motion.div variants={item} className="lg:col-span-1 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-fit">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left ${
                        activeTab === tab.id
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </motion.div>

            <motion.div variants={item} className="lg:col-span-3 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 min-h-[400px]">
              {renderTabContent()}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Settings;

// --- END OF FULLY UPDATED FILE Settings.tsx ---