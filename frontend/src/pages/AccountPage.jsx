import { useState } from 'react';
import { User, Settings, Home as HomeIcon, DollarSign } from 'lucide-react';
import { useAuthStore } from '../store';
import { auth } from '../api';

export default function AccountPage() {
  const { user, token, setAuth, logout } = useAuthStore();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [prefs, setPrefs] = useState({ budget: 100, savedBrands: '', dietary: '', allergies: '' });
  const [household, setHousehold] = useState({ size: 2, usageLevel: 'medium' });
  const [msg, setMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const fn = mode === 'login' ? auth.login : auth.register;
      const { data } = await fn(form);
      setAuth(data.user, data.token);
      setMsg('Success!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Auth failed');
    }
  };

  const savePrefs = async () => {
    try {
      await auth.updatePreferences({
        preferences: {
          budget: Number(prefs.budget),
          savedBrands: prefs.savedBrands.split(',').map(s => s.trim()).filter(Boolean),
          dietary: prefs.dietary.split(',').map(s => s.trim()).filter(Boolean),
          allergies: prefs.allergies.split(',').map(s => s.trim()).filter(Boolean)
        }
      });
      setMsg('Preferences saved');
    } catch { setMsg('Login required to save preferences'); }
  };

  const saveHousehold = async () => {
    try {
      await auth.updateHousehold(household);
      setMsg('Household profile saved');
    } catch { setMsg('Login required'); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><User size={24} /> Your Account</h1>

      {!token ? (
        <div className="bg-white border rounded-lg p-6 max-w-md">
          <div className="flex gap-4 mb-4">
            <button onClick={() => setMode('login')} className={`font-bold ${mode === 'login' ? 'amazon-link' : 'text-gray-500'}`}>Sign In</button>
            <button onClick={() => setMode('register')} className={`font-bold ${mode === 'register' ? 'amazon-link' : 'text-gray-500'}`}>Create Account</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            {mode === 'register' && <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Name" required />}
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Email" required />
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Password" required />
            <button type="submit" className="amazon-btn-primary w-full py-2">{mode === 'login' ? 'Sign In' : 'Register'}</button>
          </form>
          {msg && <p className="text-sm mt-3 text-gray-600">{msg}</p>}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-5 flex justify-between items-center">
            <div>
              <p className="font-bold text-lg">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
            <button onClick={logout} className="text-sm amazon-link">Sign Out</button>
          </div>

          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-bold flex items-center gap-2 mb-4"><Settings size={18} /> Preferences</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Budget ($)</label>
                <input type="number" value={prefs.budget} onChange={e => setPrefs({ ...prefs, budget: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Saved Brands (comma-separated)</label>
                <input value={prefs.savedBrands} onChange={e => setPrefs({ ...prefs, savedBrands: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="Colgate, Tide" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Dietary</label>
                <input value={prefs.dietary} onChange={e => setPrefs({ ...prefs, dietary: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="vegetarian" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Allergies</label>
                <input value={prefs.allergies} onChange={e => setPrefs({ ...prefs, allergies: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="peanuts" />
              </div>
            </div>
            <button onClick={savePrefs} className="amazon-btn mt-4">Save Preferences</button>
          </div>

          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-bold flex items-center gap-2 mb-4"><HomeIcon size={18} /> Household Profile</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Household Size</label>
                <input type="number" min="1" value={household.size} onChange={e => setHousehold({ ...household, size: Number(e.target.value) })} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Usage Level</label>
                <select value={household.usageLevel} onChange={e => setHousehold({ ...household, usageLevel: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <button onClick={saveHousehold} className="amazon-btn mt-4">Save Household</button>
          </div>
          {msg && <p className="text-sm text-amazon-green">{msg}</p>}
        </div>
      )}
    </div>
  );
}
