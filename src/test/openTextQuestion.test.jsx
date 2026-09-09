import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OpenTextQuestion from '../components/questions/OpenTextQuestion'

const fieldLabel = (i) => `Answer ${i + 1}`

describe('OpenTextQuestion', () => {
  it('renders exactly 6 labelled answer fields for a 6-field question', () => {
    render(
      <OpenTextQuestion
        questionText="List 6 criteria"
        fieldCount={6}
        value={[]}
        getFieldLabel={fieldLabel}
      />
    )
    expect(screen.getByRole('heading', { name: 'List 6 criteria' })).toBeInTheDocument()
    for (let n = 1; n <= 6; n++) {
      expect(screen.getByLabelText(`Answer ${n}`)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
  })

  it('renders exactly 11 labelled answer fields for an 11-field question', () => {
    render(
      <OpenTextQuestion
        questionText="List 11 disqualifications"
        fieldCount={11}
        value={[]}
        getFieldLabel={fieldLabel}
      />
    )
    expect(screen.getAllByRole('textbox')).toHaveLength(11)
    expect(screen.getByLabelText('Answer 11')).toBeInTheDocument()
  })

  it('falls back to one field for legacy questions', () => {
    render(<OpenTextQuestion questionText="Legacy" value="old answer" />)
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByRole('textbox')).toHaveValue('old answer')
  })

  it('calls onChange with an array when a field changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <OpenTextQuestion
        questionText="Question"
        fieldCount={3}
        value={['a', '', 'c']}
        onChange={onChange}
        getFieldLabel={fieldLabel}
      />
    )
    const secondField = screen.getByLabelText('Answer 2')
    await user.type(secondField, 'b')
    expect(onChange).toHaveBeenCalledWith(['a', 'b', 'c'])
  })

  it('keeps inputs in DOM order so Tab/Shift+Tab move naturally between fields', () => {
    render(
      <OpenTextQuestion
        questionText="Question"
        fieldCount={3}
        value={[]}
        getFieldLabel={fieldLabel}
      />
    )
    const fields = screen.getAllByRole('textbox')
    const ids = fields.map(f => f.id)
    expect(ids).toEqual(['open-text-field-0', 'open-text-field-1', 'open-text-field-2'])
    // Tab order follows DOM order for labelled inputs
    expect(fields[0].tabIndex).toBe(0)
    expect(fields[2].tabIndex).toBe(0)
  })

  it('disables the submit button when all fields are empty', () => {
    render(
      <OpenTextQuestion
        questionText="Question"
        fieldCount={2}
        value={['', '']}
        getFieldLabel={fieldLabel}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Submit Answer' })).toBeDisabled()
  })

  it('enables the submit button when at least one field has text', () => {
    render(
      <OpenTextQuestion
        questionText="Question"
        fieldCount={2}
        value={['', 'partial']}
        getFieldLabel={fieldLabel}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Submit Answer' })).toBeEnabled()
  })

  it('fires onSubmit when the submit button is clicked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <OpenTextQuestion
        questionText="Question"
        fieldCount={2}
        value={['x']}
        getFieldLabel={fieldLabel}
        onSubmit={onSubmit}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Submit Answer' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('labels inputs accessibly (label htmlFor matches input id)', () => {
    render(
      <OpenTextQuestion
        questionText="Question"
        fieldCount={2}
        value={[]}
        getFieldLabel={fieldLabel}
        id="my-q"
      />
    )
    const field = screen.getByLabelText('Answer 1')
    expect(field.id).toBe('my-q-field-0')
  })
})