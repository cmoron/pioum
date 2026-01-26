import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LoadingSpinner } from './LoadingSpinner'

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<LoadingSpinner />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render a div element', () => {
      const { container } = render(<LoadingSpinner />)
      expect(container.firstChild?.nodeName).toBe('DIV')
    })

    it('should have animate-spin class', () => {
      const { container } = render(<LoadingSpinner />)
      expect(container.firstChild).toHaveClass('animate-spin')
    })

    it('should have rounded-full class for circular shape', () => {
      const { container } = render(<LoadingSpinner />)
      expect(container.firstChild).toHaveClass('rounded-full')
    })

    it('should have border classes', () => {
      const { container } = render(<LoadingSpinner />)
      const spinner = container.firstChild
      expect(spinner).toHaveClass('border-2')
      expect(spinner).toHaveClass('border-primary-200')
      expect(spinner).toHaveClass('border-t-primary-700')
    })
  })

  describe('Size variations', () => {
    it('should apply medium size by default', () => {
      const { container } = render(<LoadingSpinner />)
      expect(container.firstChild).toHaveClass('w-8', 'h-8')
    })

    it('should apply small size classes', () => {
      const { container } = render(<LoadingSpinner size="sm" />)
      expect(container.firstChild).toHaveClass('w-4', 'h-4')
    })

    it('should apply medium size classes explicitly', () => {
      const { container } = render(<LoadingSpinner size="md" />)
      expect(container.firstChild).toHaveClass('w-8', 'h-8')
    })

    it('should apply large size classes', () => {
      const { container } = render(<LoadingSpinner size="lg" />)
      expect(container.firstChild).toHaveClass('w-12', 'h-12')
    })

    it('should only apply one size set at a time', () => {
      const { container, rerender } = render(<LoadingSpinner size="sm" />)
      expect(container.firstChild).toHaveClass('w-4', 'h-4')
      expect(container.firstChild).not.toHaveClass('w-8', 'h-8')
      expect(container.firstChild).not.toHaveClass('w-12', 'h-12')

      rerender(<LoadingSpinner size="lg" />)
      expect(container.firstChild).toHaveClass('w-12', 'h-12')
      expect(container.firstChild).not.toHaveClass('w-4', 'h-4')
      expect(container.firstChild).not.toHaveClass('w-8', 'h-8')
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should preserve default classes when custom className is added', () => {
      const { container } = render(<LoadingSpinner className="my-spinner" />)
      expect(container.firstChild).toHaveClass('my-spinner')
      expect(container.firstChild).toHaveClass('animate-spin')
      expect(container.firstChild).toHaveClass('rounded-full')
    })

    it('should combine size and custom className', () => {
      const { container } = render(<LoadingSpinner size="lg" className="loading" />)
      expect(container.firstChild).toHaveClass('w-12', 'h-12', 'loading')
    })

    it('should handle multiple custom classes', () => {
      const { container } = render(<LoadingSpinner className="class1 class2 class3" />)
      expect(container.firstChild).toHaveClass('class1', 'class2', 'class3')
    })
  })

  describe('Re-rendering', () => {
    it('should update when size prop changes', () => {
      const { container, rerender } = render(<LoadingSpinner size="sm" />)
      expect(container.firstChild).toHaveClass('w-4', 'h-4')

      rerender(<LoadingSpinner size="md" />)
      expect(container.firstChild).toHaveClass('w-8', 'h-8')

      rerender(<LoadingSpinner size="lg" />)
      expect(container.firstChild).toHaveClass('w-12', 'h-12')
    })

    it('should update when className prop changes', () => {
      const { container, rerender } = render(<LoadingSpinner className="initial" />)
      expect(container.firstChild).toHaveClass('initial')

      rerender(<LoadingSpinner className="updated" />)
      expect(container.firstChild).toHaveClass('updated')
      expect(container.firstChild).not.toHaveClass('initial')
    })

    it('should handle removing className', () => {
      const { container, rerender } = render(<LoadingSpinner className="removable" />)
      expect(container.firstChild).toHaveClass('removable')

      rerender(<LoadingSpinner />)
      expect(container.firstChild).not.toHaveClass('removable')
    })
  })

  describe('Accessibility', () => {
    it('should be visible in the document', () => {
      const { container } = render(<LoadingSpinner />)
      expect(container.firstChild).toBeVisible()
    })

    it('should not have any text content', () => {
      const { container } = render(<LoadingSpinner />)
      expect(container.firstChild?.textContent).toBe('')
    })
  })
})
