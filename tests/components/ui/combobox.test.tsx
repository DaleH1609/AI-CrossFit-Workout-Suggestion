// tests/components/ui/combobox.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { Combobox } from '@/components/ui/combobox'

afterEach(cleanup)

const FEW = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
]

// SEARCH_THRESHOLD is 8, so this crosses it.
const MANY = Array.from({ length: 10 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }))

function open() {
  fireEvent.click(screen.getByRole('combobox'))
}

describe('Combobox', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<Combobox options={FEW} value={null} onChange={vi.fn()} placeholder="Select one…" />)
    expect(screen.getByRole('combobox').textContent).toContain('Select one…')
  })

  it('shows the selected option’s label, not its value', () => {
    render(<Combobox options={FEW} value="b" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox').textContent).toContain('Bravo')
  })

  it('exposes the aria wiring its role requires', () => {
    // role="combobox" needs both of these; the missing aria-controls was a real
    // defect here, caught by eslint jsx-a11y once linting was restored.
    render(<Combobox options={FEW} value={null} onChange={vi.fn()} ariaLabel="Pick one" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
    expect(trigger.getAttribute('aria-label')).toBe('Pick one')
  })

  it('reports expanded state when opened', () => {
    render(<Combobox options={FEW} value={null} onChange={vi.fn()} />)
    open()
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('true')
  })

  it('emits the option value on select', () => {
    const onChange = vi.fn()
    render(<Combobox options={FEW} value={null} onChange={onChange} />)
    open()
    fireEvent.click(screen.getByText('Charlie'))
    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('hides search for short lists', () => {
    // A search box above three options reads as unconsidered.
    render(<Combobox options={FEW} value={null} onChange={vi.fn()} />)
    open()
    expect(screen.queryByPlaceholderText('Search…')).toBeNull()
  })

  it('shows search once the list is long enough to need it', () => {
    render(<Combobox options={MANY} value={null} onChange={vi.fn()} />)
    open()
    expect(screen.getByPlaceholderText('Search…')).toBeTruthy()
  })

  it('offers no clear row unless clearable', () => {
    render(<Combobox options={FEW} value="a" onChange={vi.fn()} placeholder="- none -" />)
    open()
    // The placeholder appears on the trigger only, never as a selectable row.
    const rows = screen.getAllByText(/Alpha|Bravo|Charlie|- none -/)
    expect(rows.some(r => r.textContent === '- none -' && r.closest('[cmdk-item]'))).toBe(false)
  })

  it('emits null from the clear row when clearable', () => {
    // This is how "- unassigned -" un-assigns a coach; emitting '' instead
    // would write an empty string where the column expects null.
    const onChange = vi.fn()
    render(
      <Combobox options={FEW} value="a" onChange={onChange} clearable placeholder="- unassigned -" />
    )
    open()
    const clearRow = screen.getAllByText('- unassigned -').find(el => el.closest('[cmdk-item]'))
    expect(clearRow).toBeTruthy()
    fireEvent.click(clearRow!)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('does not open when disabled', () => {
    render(<Combobox options={FEW} value={null} onChange={vi.fn()} disabled />)
    const trigger = screen.getByRole('combobox') as HTMLButtonElement
    expect(trigger.disabled).toBe(true)
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})
