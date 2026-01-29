import { User } from '../lib/api'
import { isImageUrl } from '../lib/utils'
import clsx from 'clsx'

interface AvatarProps {
  user: User
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',        // 24px (compact mode)
  sm: 'w-10 h-10 text-sm',      // 40px (était 32px)
  md: 'w-14 h-14 text-base',    // 56px (était 48px)
  lg: 'w-20 h-20 text-xl',      // 80px (était 64px)
  xl: 'w-24 h-24 text-2xl'      // 96px (nouveau)
}

export function Avatar({ user, size = 'md', className }: AvatarProps) {
  // Priority: Selected avatar (emoji/internal) > Google photo
  const avatarUrl = user.avatar?.imageUrl || user.customAvatarUrl
  const initials = user.name?.charAt(0).toUpperCase() || '?'

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-bold bg-primary-100 text-primary-700 overflow-hidden select-none',
        sizeClasses[size],
        className
      )}
    >
      {isImageUrl(avatarUrl) ? (
        <img
          src={avatarUrl}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : avatarUrl ? (
        <span className="flex items-center justify-center w-full h-full text-2xl">
          {avatarUrl}
        </span>
      ) : (
        <span className="flex items-center justify-center w-full h-full">
          {initials}
        </span>
      )}
    </div>
  )
}
