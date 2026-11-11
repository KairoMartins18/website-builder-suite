import type { DeviceMode } from '../types';
import { Icon } from './Icon';

const DEVICES: { value: DeviceMode; label: string; icon: string }[] = [
  { value: 'desktop', label: 'Computador', icon: 'desktop' },
  { value: 'tablet', label: 'Tablet', icon: 'tablet' },
  { value: 'mobile', label: 'Celular', icon: 'mobile' },
];

export function DeviceSwitch({ value, onChange }: { value: DeviceMode; onChange: (d: DeviceMode) => void }) {
  return (
    <div className="seg seg-dark" role="radiogroup" aria-label="Dispositivo">
      {DEVICES.map((d) => (
        <button key={d.value} role="radio" aria-checked={value === d.value} className={value === d.value ? 'is-active' : ''} onClick={() => onChange(d.value)} title={d.label}>
          <Icon name={d.icon} size={17} />
        </button>
      ))}
    </div>
  );
}
