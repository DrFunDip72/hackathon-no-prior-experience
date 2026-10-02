import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`tap-target relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 disabled:opacity-50 ${
      checked ? 'bg-success' : 'bg-line'}`
      }>
      
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out ${
        checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`
        } />
      
    </button>);

}