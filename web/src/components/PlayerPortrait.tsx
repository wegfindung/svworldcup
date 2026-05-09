interface PlayerPortraitProps {
  src: string
  alt: string
  width: number
  height: number
  className: string
}

const fallbackPortrait = '/placeholders/player.svg'

export function PlayerPortrait({ src, alt, width, height, className }: PlayerPortraitProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width={width}
      height={height}
      onError={(event) => {
        event.currentTarget.onerror = null
        event.currentTarget.src = fallbackPortrait
      }}
      className={className}
    />
  )
}
