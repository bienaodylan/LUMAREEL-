import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  compact?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  action,
  onBack,
  backLabel,
  compact = false,
}) => (
  <header className={compact ? 'mb-6' : 'mb-8 sm:mb-10'}>
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs text-[#9A9A9A] hover:text-white transition-colors mb-5 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
        <span>{backLabel || 'Retour'}</span>
      </button>
    )}
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.23em] text-[#D4AF6A] mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl lg:text-[42px] text-white tracking-tight leading-[1.04] text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2.5 text-sm sm:text-[15px] text-[#C8C8C8] max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </header>
);

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  actionLabel,
  onAction,
  className = '',
}) => (
  <div className={`flex items-end justify-between gap-4 mb-5 ${className}`}>
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.23em] text-[#D4AF6A] mb-1">
          {eyebrow}
        </p>
      )}
      <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
        {title}
      </h2>
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 text-xs font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer py-1"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  layoutId?: string;
  pill?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  layoutId = 'lumareel-segmented-pill',
  pill = true,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex max-w-full overflow-x-auto scrollbar-hide items-center gap-1 bg-[#141414] border border-white/[0.12] p-1 ${
        pill ? 'rounded-full' : 'rounded-[4px]'
      } ${className}`}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`relative min-h-[38px] px-4 sm:px-5 text-xs font-agrandir-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-2 ${
              pill ? 'rounded-full' : 'rounded-[4px]'
            } ${active ? 'text-black' : 'text-[#9A9A9A] hover:text-white'}`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 460, damping: 36, mass: 0.8 }}
                className={`absolute inset-0 bg-white ${pill ? 'rounded-full' : 'rounded-[4px]'}`}
              />
            )}
            <span className="relative z-10">{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                className={`relative z-10 text-[11px] tabular-nums ${
                  active ? 'text-black/60' : 'text-[#9A9A9A]'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="rounded-[20px] border border-white/[0.12] bg-[#0E0E0E] px-6 py-12 sm:py-14 text-center max-w-xl mx-auto">
    <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-white/[0.12] text-white flex items-center justify-center mx-auto mb-4">
      {icon}
    </div>
    <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white mb-1.5">
      {title}
    </h3>
    <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed max-w-md mx-auto">
      {description}
    </p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-6 min-h-[44px] px-6 rounded-full bg-[#D4AF6A] text-black text-xs font-agrandir-extrabold hover:bg-[#E1BE7D] transition-colors cursor-pointer lum-press"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
