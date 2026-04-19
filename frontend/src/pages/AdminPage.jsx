import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { adminAPI } from '../services/api';
import { ShieldCheck, Users, FileText, Search, Loader, CheckCircle, XCircle, Trash2, Plus, ChevronDown } from 'lucide-react';

const ROLES = ['client', 'vendor', 'staff', 'admin'];
const roleColors = {
  admin: 'bg-[#FBE9E7] text-[#BF360C]',
  staff: 'bg-[#E8F5EE] text-[#4A7C59]',
  client: 'bg-[#E3F2FD] text-[#1565C0]',
  vendor: 'bg-[#FFF8E1] text-[#C9A84C]',
};

function UserRow({ user, onUpdate, onDelete }) {
  const [changing, setChanging] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const handleRoleChange = async (newRole) => {
    if (newRole === user.role) { setRoleOpen(false); return; }
    setChanging(true);
    setRoleOpen(false);
    try {
      const { data } = await adminAPI.updateUser(user.user_id, { role: newRole });
      onUpdate({ ...user, role: data.role ?? newRole });
    } catch (e) {
      console.error(e);
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-[#F5F0E8] last:border-0 hover:bg-[#F5F0E8]" data-testid="user-row">
      <div className="w-9 h-9 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-bold">{user.name?.charAt(0)?.toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#2D2D2D] truncate">{user.name}</p>
        <p className="text-xs text-[#5C5C5C] truncate">{user.email}</p>
      </div>

      {/* Role badge — click to open dropdown */}
      <div className="relative">
        <button
          onClick={() => setRoleOpen(!roleOpen)}
          disabled={changing}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-opacity ${roleColors[user.role] || 'bg-gray-100 text-gray-600'} ${changing ? 'opacity-50' : 'hover:opacity-80'}`}
          data-testid={`role-btn-${user.user_id}`}
        >
          {changing ? <Loader size={11} className="animate-spin" /> : user.role}
          <ChevronDown size={11} />
        </button>
        {roleOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#EBE5DB] rounded-xl shadow-lg z-20 overflow-hidden w-28" data-testid={`role-dropdown-${user.user_id}`}>
            {ROLES.map(r => (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                className={`w-full text-left px-3 py-2 text-xs font-medium capitalize hover:bg-[#F5F0E8] transition-colors ${r === user.role ? 'text-[#C9A84C] font-semibold' : 'text-[#2D2D2D]'}`}
                data-testid={`role-option-${r}`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {user.is_active ? <CheckCircle size={16} className="text-[#4A7C59]" /> : <XCircle size={16} className="text-[#D9534F]" />}
      </div>
      <button
        onClick={() => onDelete(user.user_id)}
        className="p-1.5 rounded-lg hover:bg-[#FBE9E7] text-[#5C5C5C] hover:text-[#D9534F] transition-colors"
        data-testid={`delete-user-${user.user_id}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function AuditRow({ log }) {
  const actionColors = { login: 'bg-green-100 text-green-700', logout: 'bg-gray-100 text-gray-600', create: 'bg-blue-100 text-blue-700', update: 'bg-yellow-100 text-yellow-700', delete: 'bg-red-100 text-red-700' };
  const actionKey = Object.keys(actionColors).find(k => log.action?.includes(k)) || 'create';
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F5F0E8] last:border-0 text-sm" data-testid="audit-row">
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${actionColors[actionKey]}`}>{log.action}</span>
      <span className="text-[#5C5C5C] flex-1 truncate">{log.user_email}</span>
      <span className="text-[#5C5C5C] capitalize">{log.resource}</span>
      <span className="text-[#5C5C5C] text-xs">{new Date(log.timestamp).toLocaleString()}</span>
    </div>
  );
}

function AddUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await adminAPI.createUser(form);
      onSave(data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in" data-testid="add-user-modal">
        <div className="p-6 border-b border-[#EBE5DB]">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>Create User</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Full Name</label>
            <input className="input-wedding" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required data-testid="new-user-name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Email</label>
            <input className="input-wedding" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required data-testid="new-user-email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Password</label>
            <input className="input-wedding" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required data-testid="new-user-password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Role</label>
            <select className="input-wedding" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} data-testid="new-user-role">
              <option value="client">Client</option>
              <option value="vendor">Vendor</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-[#D9534F]" data-testid="create-user-error">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold h-11 flex items-center justify-center text-sm" data-testid="create-user-submit">
              {loading ? <Loader size={16} className="animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useLang();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [uRes, lRes, sRes] = await Promise.all([adminAPI.users(), adminAPI.auditLogs(), adminAPI.stats()]);
        setUsers(uRes.data.users || []);
        setLogs(lRes.data.logs || []);
        setStats(sRes.data || {});
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter(u => u.user_id !== userId));
    } catch (e) { console.error(e); }
  };

  const handleUpdateUser = (updated) => {
    setUsers(users.map(u => u.user_id === updated.user_id ? updated : u));
  };

  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredLogs = logs.filter(l => l.user_email?.includes(logSearch) || l.action?.includes(logSearch));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('admin.title')}</h1>
          <p className="text-[#5C5C5C] text-sm mt-1">System administration and audit console</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Users', value: stats.total_users || 0 },
          { label: 'Events', value: stats.total_events || 0 },
          { label: 'Inventory', value: stats.total_inventory || 0 },
          { label: 'Transactions', value: stats.total_transactions || 0 },
          { label: 'Vendors', value: stats.total_vendors || 0 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#EBE5DB] p-4 text-center" data-testid={`admin-stat-${s.label.toLowerCase()}`}>
            <p className="text-2xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{s.value}</p>
            <p className="text-xs text-[#5C5C5C] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-[#EBE5DB] p-1 w-fit mb-6">
        {[{k:'users', l: t('admin.users'), icon: Users},{k:'logs', l: t('admin.audit_logs'), icon: FileText}].map(({k,l,icon:Icon}) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === k ? 'bg-[#C9A84C] text-white' : 'text-[#5C5C5C] hover:bg-[#F5F0E8]'}`} data-testid={`admin-tab-${k}`}>
            <Icon size={16} />{l}
          </button>
        ))}
      </div>

      {tab === 'users' ? (
        <div className="bg-white rounded-2xl border border-[#EBE5DB] overflow-hidden">
          <div className="p-4 border-b border-[#EBE5DB] flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
              <input className="input-wedding pl-9 h-9 text-sm" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} data-testid="user-search" />
            </div>
            <button onClick={() => setShowAddUser(true)} className="btn-gold px-4 py-2 text-sm flex items-center gap-1.5" data-testid="add-user-btn">
              <Plus size={16} /> Add User
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : (
            filteredUsers.map(u => <UserRow key={u.user_id} user={u} onUpdate={handleUpdateUser} onDelete={handleDeleteUser} />)
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EBE5DB] overflow-hidden">
          <div className="p-4 border-b border-[#EBE5DB]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
              <input className="input-wedding pl-9 h-9 text-sm" placeholder="Search audit logs..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} data-testid="log-search" />
            </div>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-[#5C5C5C]"><FileText size={40} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No audit logs found</p></div>
          ) : (
            filteredLogs.map(l => <AuditRow key={l.log_id} log={l} />)
          )}
        </div>
      )}
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onSave={(u) => { setUsers([u, ...users]); setShowAddUser(false); }} />}
    </div>
  );
}
