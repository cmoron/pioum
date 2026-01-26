import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com'
  }

  it('renders user initials when no avatar', () => {
    render(<Avatar user={mockUser} />)
    // Only first initial is shown now
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('renders image when customAvatarUrl is provided', () => {
    const userWithAvatar = {
      ...mockUser,
      customAvatarUrl: 'https://example.com/avatar.png'
    }
    render(<Avatar user={userWithAvatar} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  })

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<Avatar user={mockUser} size="sm" />)
    // Updated size classes based on actual component
    expect(container.firstChild).toHaveClass('w-10', 'h-10')

    rerender(<Avatar user={mockUser} size="lg" />)
    expect(container.firstChild).toHaveClass('w-20', 'h-20')
  })
})
