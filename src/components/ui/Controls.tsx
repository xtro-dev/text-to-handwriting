import React from 'react';
import { Info } from 'lucide-react';
import type { ColorSwatch } from '../../constants/papers';

export const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="relative inline-flex items-center group/tip">
    <span
      tabIndex={0}
      role="note"
      aria-label={text}
      title={text}
      className="inline-flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-help focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-full"
    >
      <Info className="w-3 h-3" />
    </span>
    <span
      role="tooltip"
      className="pointer-events-none opacity-0 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-48 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-800 px-2.5 py-1.5 text-[11px] font-normal leading-snug text-zinc-100 shadow-lg z-50"
    >
      {text}
    </span>
  </span>
);

interface SliderControlProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  disabled?: boolean;
  hint?: string;
  tooltip?: string;
  onChange: (value: number) => void;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  disabled = false,
  hint,
  tooltip,
  onChange,
}) => {
  return (
    <div className={`space-y-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 min-w-0">
          <label
            htmlFor={id}
            className="text-xs font-medium text-zinc-700 dark:text-zinc-300 select-none"
          >
            {label}
          </label>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <span className="font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
          {displayValue ?? value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ink-slider"
      />
      {hint && (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
};

interface ToggleSwitchProps {
  id?: string;
  label: string;
  description?: string;
  tooltip?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  description,
  tooltip,
  checked,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5">
          <label
            htmlFor={id}
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
          >
            {label}
          </label>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {description && (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          checked
            ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100'
            : 'bg-zinc-200 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full transition-transform duration-150 ${
            checked
              ? 'translate-x-4 bg-white dark:bg-zinc-900'
              : 'translate-x-0.5 bg-white dark:bg-zinc-400'
          }`}
        />
      </button>
    </div>
  );
};

interface ColorPickerFieldProps {
  label: string;
  value: string;
  swatches: ColorSwatch[];
  onChange: (hex: string) => void;
}

export const ColorPickerField: React.FC<ColorPickerFieldProps> = ({
  label,
  value,
  swatches,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        <span className="font-mono text-[11px] uppercase text-zinc-500 dark:text-zinc-400">
          {value}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((swatch) => {
          const isSelected = value.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <button
              key={swatch.hex}
              type="button"
              title={swatch.name}
              aria-label={`${label}: ${swatch.name}`}
              onClick={() => onChange(swatch.hex)}
              className={`h-6 w-6 rounded-md border transition-transform hover:scale-105 cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 border-zinc-900 dark:border-white'
                  : 'border-zinc-300 dark:border-zinc-700'
              }`}
              style={{ backgroundColor: swatch.hex }}
            />
          );
        })}
        <label
          title="Custom color"
          className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-500 overflow-hidden"
        >
          <span
            className="h-3.5 w-3.5 rounded-sm border border-zinc-300/60"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Custom ${label}`}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};

export const SectionDivider: React.FC<{
  title: string;
  rightSlot?: React.ReactNode;
}> = ({ title, rightSlot }) => (
  <div className="flex items-center justify-between pt-3 pb-1 border-t border-zinc-200/80 dark:border-zinc-800/80 first:border-t-0 first:pt-0">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
      {title}
    </span>
    {rightSlot}
  </div>
);
