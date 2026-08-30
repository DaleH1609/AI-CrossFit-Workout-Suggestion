// tests/components/ui/modal.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Modal } from '@/components/ui/modal'

/**
 * The confirmPhrase guard is the only thing standing between a stray click and
 * a permanently deleted member — /api/members/delete hard-deletes the users row
 * and the auth user, with no restore path. Worth asserting rather than trusting.
 *
 * fireEvent rather than user-event, which is not a dependency of this project.
 */

afterEach(cleanup)

const base = {
  open: true,
  title: 'Delete Member?',
  description: 'This cannot be undone.',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal {...base} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders its title and description when open', () => {
    render(<Modal {...base} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Delete Member?')).toBeTruthy()
    expect(screen.getByText('This cannot be undone.')).toBeTruthy()
  })

  it('confirms on a single click when no phrase is required', () => {
    // Reversible actions must stay one click; the guard is only for permanent ones.
    const onConfirm = vi.fn()
    render(<Modal {...base} onConfirm={onConfirm} confirmLabel="Revoke" />)
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancels on Escape', () => {
    const onCancel = vi.fn()
    render(<Modal {...base} onCancel={onCancel} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('Modal with confirmPhrase', () => {
  const withPhrase = { ...base, confirmPhrase: 'John Smith', confirmLabel: 'Delete Member' }

  it('disables confirm until the phrase is typed', () => {
    render(<Modal {...withPhrase} />)
    expect((screen.getByRole('button', { name: 'Delete Member' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('stays disabled for a near miss', () => {
    // Case and whitespace must matter, or the guard is decorative.
    render(<Modal {...withPhrase} />)
    const input = screen.getByRole('textbox')
    const confirm = screen.getByRole('button', { name: 'Delete Member' }) as HTMLButtonElement
    for (const wrong of ['John', 'john smith', 'John Smith ', 'JOHN SMITH']) {
      fireEvent.change(input, { target: { value: wrong } })
      expect(confirm.disabled, wrong).toBe(true)
    }
  })

  it('enables and confirms once the phrase matches exactly', () => {
    const onConfirm = vi.fn()
    render(<Modal {...withPhrase} onConfirm={onConfirm} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'John Smith' } })
    const confirm = screen.getByRole('button', { name: 'Delete Member' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('does not submit on Enter while the phrase is unsatisfied', () => {
    const onConfirm = vi.fn()
    render(<Modal {...withPhrase} onConfirm={onConfirm} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Joh' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('submits on Enter once the phrase matches', () => {
    const onConfirm = vi.fn()
    render(<Modal {...withPhrase} onConfirm={onConfirm} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'John Smith' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('clears the typed phrase when the target changes', () => {
    // The case this guard exists for: satisfy the prompt for one member, close,
    // reopen on another, and the confirm button must not still be armed.
    const { rerender } = render(<Modal {...withPhrase} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'John Smith' } })
    expect((screen.getByRole('button', { name: 'Delete Member' }) as HTMLButtonElement).disabled).toBe(false)

    rerender(<Modal {...withPhrase} confirmPhrase="Ann Murphy" />)
    expect((screen.getByRole('button', { name: 'Delete Member' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
  })
})
