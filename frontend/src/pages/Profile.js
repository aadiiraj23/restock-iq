import React, { useState } from 'react';
import { User, Save, Home, Heart, DollarSign, Users } from 'lucide-react';
import { useAuthStore } from '../store';
import { updatePreferences, updateHousehold, updateBudget } from '../api';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile() {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const [prefs, setPrefs] = useState({
    savedBrands: user?.preferences?.savedBrands?.join(', ') || '',
    dietary: user?.preferences?.dietary?.join(', ') || '',
    allergies: user?.preferences?.allergies?.join(', ') || '',
    budget: user?.preferences?.budget || 100,
    deliveryDefault: user?.preferences?.deliveryDefault || 'express'
  });
  const [household, setHousehold] = useState({
    size: user?.household?.size || 1,
    usageLevel: user?.household?.usageLevel || 'medium'
  });
  const [monthlyBudget, setMonthlyBudget] = useState(user?.monthlyBudget || 150);

  const handleSavePrefs = async () => {
    try {
      const data = {
        preferences: {
          savedBrands: prefs.savedBrands.split(',').map(s => s.trim()).filter(Boolean),
          dietary: prefs.dietary.split(',').map(s => s.trim()).filter(Boolean),
          allergies: prefs.allergies.split(',').map(s => s.trim()).filter(Boolean),
          budget: Number(prefs.budget),
          deliveryDefault: prefs.deliveryDefault
        }
      };
      const res = await updatePreferences(data);
      updateUser({ ...user, preferences: res.data.preferences });
      toast.success('Preferences saved!');
    } catch (err) {
      toast.error('Failed to save preferences');
    }
  };

  const handleSaveHousehold = async () => {
    try {
      const res = await updateHousehold(household);
      updateUser({ ...user, household: res.data.household });
      toast.success('Household settings saved!');
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  const handleSaveBudget = async () => {
    try {
      await updateBudget({ monthlyBudget });
      updateUser({ ...user, monthlyBudget });
      toast.success('Budget updated!');
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="profile-page container">
      <h1><User size={24} /> Profile & Settings</h1>

      <div className="profile-grid">
        {/* Account Info */}
        <div className="profile-section card">
          <h3><User size={18} /> Account</h3>
          <div className="profile-info">
            <div className="info-row">
              <span>Name</span>
              <strong>{user?.name}</strong>
            </div>
            <div className="info-row">
              <span>Email</span>
              <strong>{user?.email}</strong>
            </div>
          </div>
        </div>

        {/* Shopping Preferences */}
        <div className="profile-section card">
          <h3><Heart size={18} /> Shopping Preferences</h3>
          <div className="pref-form">
            <div className="pref-field">
              <label>Preferred Brands (comma separated)</label>
              <input value={prefs.savedBrands} onChange={e => setPrefs({ ...prefs, savedBrands: e.target.value })} placeholder="Colgate, Tide, Nike..." />
            </div>
            <div className="pref-field">
              <label>Dietary Preferences</label>
              <input value={prefs.dietary} onChange={e => setPrefs({ ...prefs, dietary: e.target.value })} placeholder="Vegan, Gluten-free..." />
            </div>
            <div className="pref-field">
              <label>Allergies</label>
              <input value={prefs.allergies} onChange={e => setPrefs({ ...prefs, allergies: e.target.value })} placeholder="Peanuts, Dairy..." />
            </div>
            <div className="pref-field">
              <label>Max Budget per Trip ($)</label>
              <input type="number" value={prefs.budget} onChange={e => setPrefs({ ...prefs, budget: e.target.value })} />
            </div>
            <div className="pref-field">
              <label>Default Delivery</label>
              <select value={prefs.deliveryDefault} onChange={e => setPrefs({ ...prefs, deliveryDefault: e.target.value })}>
                <option value="express">Express (10-30 mins)</option>
                <option value="today">Today (within 2 hours)</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleSavePrefs}>
              <Save size={16} /> Save Preferences
            </button>
          </div>
        </div>

        {/* Household */}
        <div className="profile-section card">
          <h3><Users size={18} /> Household Profile</h3>
          <p className="section-desc">This adjusts AI predictions for ReStock</p>
          <div className="pref-form">
            <div className="pref-field">
              <label>Household Size</label>
              <input type="number" min="1" max="10" value={household.size} onChange={e => setHousehold({ ...household, size: Number(e.target.value) })} />
            </div>
            <div className="pref-field">
              <label>Usage Level</label>
              <select value={household.usageLevel} onChange={e => setHousehold({ ...household, usageLevel: e.target.value })}>
                <option value="low">Low (conservative use)</option>
                <option value="medium">Medium (average)</option>
                <option value="high">High (heavy use)</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleSaveHousehold}>
              <Save size={16} /> Save Household
            </button>
          </div>
        </div>

        {/* Budget */}
        <div className="profile-section card">
          <h3><DollarSign size={18} /> Monthly Budget</h3>
          <div className="pref-form">
            <div className="pref-field">
              <label>Monthly Restock Budget ($)</label>
              <input type="number" value={monthlyBudget} onChange={e => setMonthlyBudget(Number(e.target.value))} />
            </div>
            <button className="btn btn-primary" onClick={handleSaveBudget}>
              <Save size={16} /> Set Budget
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
