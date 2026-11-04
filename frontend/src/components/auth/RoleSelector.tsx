import type { RoleTab } from '../../types/auth.types';

const TABS: { key: RoleTab; label: string }[] = [
  { key: 'cashier', label: 'Cashier / Sales' },
  { key: 'inventory', label: 'Inventory Staff' },
  { key: 'admin', label: 'Admin / Owner' },
  { key: 'online', label: 'Online Fulfillment' },
];

export default function RoleSelector({ value, onChange }: { value: RoleTab; onChange: (r: RoleTab) => void }) {
  return (
    <div role="tablist" aria-label="Sign in as" className="flex flex-wrap gap-1 rounded-[28px] border border-line bg-field p-1">
      {TABS.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} className="v-tab" onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
