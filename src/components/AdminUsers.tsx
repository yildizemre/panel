import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  User as UserIcon,
  Search,
  Video,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/api';

interface UserItem {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
  camera_count?: number;
  site_name?: string;
  managed_store_ids?: number[];
}

const AdminUsers: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    full_name: '',
    managed_store_ids: [] as number[],
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token')?.trim();
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      const res = await fetch(apiUrl(`/api/admin/users?${params}`), {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert(t('admin.sessionExpired'));
      return;
    }
    const path = modal === 'add' ? '/api/admin/users' : `/api/admin/users/${editingUser?.id}`;
    const method = modal === 'add' ? 'POST' : 'PUT';
    const body: Record<string, unknown> = {
      username: form.username,
      email: form.email,
      role: form.role,
      full_name: form.full_name,
    };
    if (form.password) (body as Record<string, string>).password = form.password;
    if (form.role === 'brand_manager') body.managed_store_ids = form.managed_store_ids;

    const res = await fetch(apiUrl(path), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setModal(null);
      setEditingUser(null);
      setForm({ username: '', email: '', password: '', role: 'user', full_name: '', managed_store_ids: [] });
      fetchUsers();
    } else if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    } else {
      let msg = 'Hata oluştu';
      try {
        const err = await res.json();
        msg = err.error || err.message || msg;
      } catch (_) {}
      alert(`${msg} (${res.status})`);
    }
  };

  const handleImpersonate = async (u: UserItem) => {
    const token = localStorage.getItem('token')?.trim();
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${u.id}/impersonate`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || t('admin.error'));
        return;
      }
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (e) {
      console.error(e);
      alert(t('admin.connectionError'));
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`"${username}" ${t('admin.deleteConfirm')}`)) return;
    const token = localStorage.getItem('token')?.trim();
    const res = await fetch(apiUrl(`/api/admin/users/${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token || ''}` },
    });
    if (res.ok) fetchUsers();
    else {
      const err = await res.json();
      alert(err.error || t('admin.error'));
    }
  };

  const openEdit = (u: UserItem) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      email: u.email,
      password: '',
      role: u.role,
      full_name: u.full_name || '',
      managed_store_ids: u.managed_store_ids || [],
    });
    setModal('edit');
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t('admin.title')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('admin.subtitle')}
            </p>
          </div>
          <button
            onClick={() => {
              setForm({ username: '', email: '', password: '', role: 'user', full_name: '', managed_store_ids: [] });
              setEditingUser(null);
              setModal('add');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('admin.newUser')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('admin.searchUsers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 w-full max-w-xs"
          />
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              {t('common.loading')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-4 px-4 text-slate-400 font-medium">
                      {t('admin.user')}
                    </th>
                    <th className="text-left py-4 px-4 text-slate-400 font-medium">Email</th>
                    <th className="text-left py-4 px-4 text-slate-400 font-medium">
                      {t('admin.role')}
                    </th>
                    <th className="text-left py-4 px-4 text-slate-400 font-medium">
                      {t('admin.setup')}
                    </th>
                    <th className="text-right py-4 px-4 text-slate-400 font-medium">
                      {t('admin.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            {u.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-white" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{u.username}</p>
                            {u.full_name && (
                              <p className="text-xs text-slate-400">{u.full_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">{u.email}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-slate-600/50 text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                          <span className="flex items-center gap-1">
                            <Video className="w-4 h-4 text-slate-500" />
                            {(u.camera_count ?? 0)} {t('admin.cameras')}
                          </span>
                          {u.site_name && u.site_name !== '-' && (
                            <span className="text-slate-500">•</span>
                          )}
                          <span className="text-slate-400 truncate max-w-[120px]" title={u.site_name}>
                            {u.site_name ?? '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={() => handleImpersonate(u)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-sm font-medium"
                            title={t('admin.goToPanel')}
                          >
                            <ExternalLink className="w-4 h-4" />
                            {t('admin.goToPanel')}
                          </button>
                          {u.username !== 'admin' && (
                            <>
                              <button
                                onClick={() => openEdit(u)}
                                className="p-2 rounded-lg hover:bg-slate-600/50 text-slate-400 hover:text-blue-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(u.id, u.username)}
                                className="p-2 rounded-lg hover:bg-slate-600/50 text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500">
          {total} {t('admin.usersCount')}
        </p>
      </motion.div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4">
              {modal === 'add'
                ? t('admin.newUser')
                : t('admin.editUser')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {t('settings.username')}
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                  disabled={modal === 'edit'}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {t('login.password')}
                  {modal === 'edit' && ` (${t('admin.leaveEmptyNoChange')})`}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={modal === 'add'}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {t('admin.role')}
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="user">user</option>
                  <option value="brand_manager">{t('admin.brandManager')}</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              {form.role === 'brand_manager' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('admin.managedStores')}</label>
                  <select
                    multiple
                    value={form.managed_store_ids.map(String)}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions, (o) => parseInt(o.value, 10));
                      setForm((f) => ({ ...f, managed_store_ids: opts }));
                    }}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white min-h-[120px]"
                  >
                    {users
                      .filter((u) => u.role === 'user' && u.id !== editingUser?.id && u.username !== 'admin')
                      .map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.username} {u.full_name ? `(${u.full_name})` : ''}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Ctrl/Cmd ile birden fazla seçin</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {t('settings.fullName')}
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setEditingUser(null);
                  }}
                  className="flex-1 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
