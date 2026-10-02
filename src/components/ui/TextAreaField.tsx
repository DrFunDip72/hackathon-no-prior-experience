import React, { useId } from 'react';

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export function TextAreaField({ label, value, onChange, hint, rows = 3, placeholder, className = '' }: TextAreaFieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-muted/70 transition-colors duration-150 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20" />
      
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>);

}