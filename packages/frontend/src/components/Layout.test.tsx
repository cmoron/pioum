import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Layout } from './Layout'
import { useAuthStore } from '../stores/auth'
import { User } from '../lib/api'

// Mock the auth store
vi.mock('../stores/auth')

describe('Layout', () => {
  const renderLayout = (user: User | null = null) => {
    vi.mocked(useAuthStore).mockReturnValue({
      user,
      loading: false,
      error: null,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      requestMagicLink: vi.fn(),
      verifyMagicLink: vi.fn(),
      devLogin: vi.fn(),
      updateUser: vi.fn(),
      checkAuth: vi.fn()
    })

    return render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    )
  }

  it('renders logo image in header', () => {
    renderLayout()
    const logo = screen.getByAltText('Pioum Logo')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/logo.png')
  })

  it('renders Pioum title as link to home', () => {
    renderLayout()
    const title = screen.getByText('Pioum')
    expect(title).toBeInTheDocument()
    const link = title.closest('a')
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders header with correct background color', () => {
    renderLayout()
    const logo = screen.getByAltText('Pioum Logo')
    const header = logo.closest('header')
    expect(header).toHaveClass('bg-warm')
  })

  it('renders user avatar when logged in', () => {
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    }
    renderLayout(mockUser)

    // The avatar should be rendered
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('does not render user avatar when not logged in', () => {
    renderLayout(null)

    // Only the logo and title should be present, no avatar
    expect(screen.queryByText('J')).not.toBeInTheDocument()
  })

  it('renders main content', () => {
    renderLayout()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders bottom navigation with correct items', () => {
    renderLayout()
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Bans')).toBeInTheDocument()
    expect(screen.getByText('Profil')).toBeInTheDocument()
  })
})
