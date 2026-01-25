import { User } from '../lib/api'
import clsx from 'clsx'

interface AvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg'
}

export function Avatar({ user, size = 'md', className }: AvatarProps) {
  const avatarUrl = user.customAvatarUrl || user.avatar?.imageUrl
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-medium bg-primary-100 text-primary-700 overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  )
}
