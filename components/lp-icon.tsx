import Image from 'next/image'

const ICON_MAP: Record<string, string> = {
  '🎧': 'listen',
  '🤖': 'ai',
  '🎯': 'target',
  '💬': 'conversation',
  '🤝': 'smooth',
  '🆓': 'free',
  '🌱': 'beginner-wakaba',
  '⏱️': 'clock',
  '🎙️': 'speak',
  '🎙': 'speak',
  '🧠': 'memory',
  '🎤': 'speak',
  '✨': 'memory',
  '📊': 'report',
  '🛡️': 'safe',
  '🗣': 'speak',
  '🗣️': 'speak',
  '🏠': 'daily-life',
}

export default function LpIcon({ emoji, size = 32 }: { emoji: string; size?: number }) {
  if (emoji === '💎') {
    return (
      <Image
        src="/images/branding/diamond.svg"
        alt=""
        width={size * 2}
        height={size * 2}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    )
  }
  const file = ICON_MAP[emoji]
  if (!file) return <span style={{ fontSize: size }}>{emoji}</span>
  return (
    <Image
      src={`/images/lp/icons/${file}.webp`}
      alt=""
      width={size * 2}
      height={size * 2}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}
