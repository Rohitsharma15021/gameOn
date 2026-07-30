import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, TextareaHTMLAttributes } from 'react';

export function Button({
  variant = 'primary',
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'danger' }) {
  const base: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.6 : 1,
    border: '1px solid transparent',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: '#16a34a', color: '#fff' },
    outline: { background: 'transparent', color: '#16a34a', borderColor: '#16a34a' },
    danger: { background: '#d03b3b', color: '#fff' },
  };
  return <button {...props} style={{ ...base, ...variants[variant], ...style }} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #e1e0d9',
        fontSize: 14,
        ...props.style,
      }}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #e1e0d9',
        fontSize: 14,
        minHeight: 70,
        fontFamily: 'inherit',
        ...props.style,
      }}
    />
  );
}

export function Field({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#52514e' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: React.CSSProperties }>) {
  return (
    <div
      style={{
        background: '#fcfcfb',
        border: '1px solid rgba(11,11,11,0.1)',
        borderRadius: 12,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatTile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'brand' }) {
  return (
    <div
      style={{
        background: tone === 'brand' ? '#dcfce7' : '#fcfcfb',
        border: '1px solid rgba(11,11,11,0.1)',
        borderRadius: 12,
        padding: '18px 20px',
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 13, color: '#52514e', fontWeight: 600 }}>{label}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: tone === 'brand' ? '#15803d' : '#0b0b0b',
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'brand' | 'danger' | 'warning' }>) {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { background: '#f0efec', color: '#52514e' },
    brand: { background: '#dcfce7', color: '#15803d' },
    danger: { background: '#fde8e8', color: '#d03b3b' },
    warning: { background: '#fff4de', color: '#a05a00' },
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        ...tones[tone],
      }}
    >
      {children}
    </span>
  );
}

export function money(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
