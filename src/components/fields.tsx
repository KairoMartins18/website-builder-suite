import { useEffect, useState, type ReactNode } from 'react';
import type { Theme } from '../types';
import { colorToHex, THEME_COLOR_KEYS } from '../lib/theme';
import { pickImages } from '../lib/images';
import { FONTS } from '../lib/fonts';
import { Icon } from './Icon';

export function Group({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`fg${open ? ' is-open' : ''}`}>
      <button className="fg-title" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <Icon name="down" size={14} />
      </button>
      {open && <div className="fg-body">{children}</div>}
    </div>
  );
}

export function Field({ label, children, inline }: { label: string; children: ReactNode; inline?: boolean }) {
  return (
    <label className={`field${inline ? ' field-inline' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>;
}

export function TextInput({ value, onChange, placeholder, multiline, rows = 4, mono }: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  mono?: boolean;
}) {
  if (multiline)
    return <textarea className={`input${mono ? ' mono' : ''}`} rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} spellCheck={!mono} />;
  return <input className="input" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

/** Campo numérico que aceita digitação livre e só confirma valores válidos. */
export function NumberInput({ value, onChange, min, max, step = 1, suffix }: {
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => setText(value === undefined ? '' : String(Math.round(value * 100) / 100)), [value]);
  const commit = (raw: string) => {
    let n = Number(raw.replace(',', '.'));
    if (raw.trim() === '' || Number.isNaN(n)) return;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    onChange(n);
  };
  return (
    <div className="num">
      <input
        className="input"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => setText(value === undefined ? '' : String(value))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            commit(String((value ?? 0) + d));
          }
        }}
      />
      {suffix && <span className="num-suffix">{suffix}</span>}
    </div>
  );
}

export function Select<T extends string | number>({ value, options, onChange }: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      className="input"
      value={value === undefined ? '' : String(value)}
      onChange={(e) => {
        const opt = options.find((o) => String(o.value) === e.target.value);
        if (opt) onChange(opt.value);
      }}
    >
      {value === undefined && <option value="">—</option>}
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" />
      <span>{label}</span>
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T | undefined;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} title={o.title} className={o.value === value ? 'is-active' : ''} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="slider">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span>{Math.round(value * 100) / 100}</span>
    </div>
  );
}

/** Seletor de cor com atalhos para as cores do tema. */
export function ColorInput({ value, onChange, theme, allowNone = true }: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  theme: Theme;
  allowNone?: boolean;
}) {
  const themeKey = value?.startsWith('theme:') ? value.slice(6) : null;
  return (
    <div className="color">
      <div className="color-main">
        <input type="color" value={colorToHex(value, theme)} onChange={(e) => onChange(e.target.value)} />
        <input
          className="input"
          value={themeKey ? `Tema: ${THEME_COLOR_KEYS.find((k) => k.key === themeKey)?.label ?? themeKey}` : value ?? ''}
          placeholder="Nenhuma"
          onChange={(e) => onChange(e.target.value || undefined)}
          onFocus={(e) => themeKey && e.target.select()}
        />
      </div>
      <div className="color-swatches">
        {THEME_COLOR_KEYS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            title={`Tema: ${label}`}
            className={themeKey === key ? 'is-active' : ''}
            style={{ background: theme.colors[key] }}
            onClick={() => onChange(`theme:${key}`)}
          />
        ))}
        {allowNone && (
          <button type="button" title="Nenhuma / transparente" className={`color-none${!value ? ' is-active' : ''}`} onClick={() => onChange(undefined)} />
        )}
      </div>
    </div>
  );
}

export function ImageInput({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const isData = value?.startsWith('data:');
  return (
    <div className="img-input">
      {value ? <div className="img-input-preview" style={{ backgroundImage: `url("${value}")` }} /> : <div className="img-input-empty">Sem imagem</div>}
      <div className="img-input-actions">
        <button
          type="button"
          className="btn btn-sm"
          onClick={async () => {
            const [img] = await pickImages(false);
            if (img) onChange(img);
          }}
        >
          <Icon name="image" size={15} /> Enviar imagem
        </button>
        {value && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(undefined)}>
            Remover
          </button>
        )}
      </div>
      <input
        className="input"
        placeholder="ou cole uma URL https://..."
        value={isData ? '' : value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}

export function FontSelect({ value, onChange, theme, allowTheme = true }: {
  value: string | undefined;
  onChange: (v: string) => void;
  theme: Theme;
  allowTheme?: boolean;
}) {
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {value === undefined && <option value="">—</option>}
      {allowTheme && (
        <optgroup label="Fontes do tema">
          <option value="theme:heading">Títulos ({theme.fonts.heading})</option>
          <option value="theme:body">Corpo ({theme.fonts.body})</option>
        </optgroup>
      )}
      <optgroup label="Todas as fontes">
        {FONTS.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
