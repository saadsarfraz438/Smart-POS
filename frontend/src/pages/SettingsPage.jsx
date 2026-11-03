import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import SectionCard from '../components/SectionCard.jsx';
import SettingSwitch from '../components/SettingSwitch.jsx';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../lib/auth.js';

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  const handleSave = () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('lumensoft:settings'));
    Swal.fire('Saved', 'Settings updated successfully.', 'success');
  };

  return (
    <div className="row g-4">
      <div className="col-12 col-xl-6">
        <SectionCard title="Company Settings" footer={<button className="btn btn-primary" onClick={handleSave}>Save Settings</button>}>
          <div className="mb-3">
            <label className="form-label">Company Name</label>
            <input className="form-control" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Currency</label>
            <input className="form-control" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Tax Rate (%)</label>
            <input type="number" className="form-control" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })} />
          </div>
        </SectionCard>
      </div>
      <div className="col-12 col-xl-6">
        <SectionCard title="System Preferences">
          <SettingSwitch label="Notifications"description="Allow to see the Notifications" checked={settings.notificationsEnabled} onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })} />
          <SettingSwitch label=" Recent Sales "description="Turn on to see Recent Sales Chart" checked={settings.showRecentSalesChart} onChange={(e) => setSettings({ ...settings, showRecentSalesChart: e.target.checked })} />
          <SettingSwitch label="Receipt Printing"description="Turn it on for Recipet Printing" checked={settings.printEnabled} onChange={(e) => setSettings({ ...settings, printEnabled: e.target.checked })} />
          <SettingSwitch label=" Item Discounts" description="Turn this on to allow discounts in the POS Screen." checked={settings.discountEnabled} onChange={(e) => setSettings({ ...settings, discountEnabled: e.target.checked })} />
          <SettingSwitch label="Dark Mode" description="Switch the app between light and Dark themes." checked={settings.darkMode} onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })} />
          <div className="mb-3">
            <label className="form-label">Default discount type</label>
            <select className="form-select" value={settings.discountMode || 'percentage'} onChange={(e) => setSettings({ ...settings, discountMode: e.target.value })}>
              <option value="percentage">Percentage</option>
              <option value="cash">Cash / Fixed amount</option>
            </select>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
