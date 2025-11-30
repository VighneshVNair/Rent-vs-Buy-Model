import React from 'react';

interface InputGroupProps {
  label: string;
  children: React.ReactNode;
}

export const InputGroup: React.FC<InputGroupProps> = ({ label, children }) => (
  <div className="mb-6">
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}

export const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, prefix, suffix, step = 1 }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <div className="relative rounded-md shadow-sm">
      {prefix && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-slate-500 sm:text-sm">{prefix}</span>
        </div>
      )}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        className={`block w-full rounded-md border-0 py-2 text-black bg-white ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
      />
      {suffix && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-slate-500 sm:text-sm">{suffix}</span>
        </div>
      )}
    </div>
  </div>
);

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <span className="flex-grow flex flex-col">
      <span className="text-sm font-medium text-slate-900">{label}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${
        checked ? 'bg-blue-600' : 'bg-slate-200'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);