interface TeamFlagProps {
  teamCode: string
  label: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const

export function TeamFlag({ teamCode, label, size = 'md' }: TeamFlagProps) {
  return (
    <span
      className={[
        'grid place-items-center overflow-hidden rounded-full border border-white/12 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
        sizeClasses[size],
      ].join(' ')}
    >
      <img
        src={`/team-flags/${teamCode}.svg`}
        alt={label}
        loading="lazy"
        width={48}
        height={48}
        className="h-full w-full object-cover"
      />
    </span>
  )
}
