import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PseForm from '../PseForm.jsx';
import { patchSessionPse } from '../../api/sessions.js';

vi.mock('../../api/sessions.js', () => ({
  patchSessionPse: vi.fn(),
}));

describe('PseForm', () => {
  const defaultProps = {
    sessionId: 'session-1',
    initialPse: null,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Borg CR-10 selector with options 1–10', () => {
    render(<PseForm {...defaultProps} />);

    const select = screen.getByRole('combobox', { name: /borg cr-10 rating/i });
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(11);
    expect(options[0].value).toBe('');
    expect(options[1].value).toBe('1');
    expect(options[10].value).toBe('10');
  });

  it('pre-fills selector when initialPse is provided', () => {
    render(<PseForm {...defaultProps} initialPse={7} />);

    const select = screen.getByRole('combobox', { name: /borg cr-10 rating/i });
    expect(select.value).toBe('7');
  });

  it('shows client-side error when out-of-range value is forced and submitted', async () => {
    render(<PseForm {...defaultProps} />);
    const select = screen.getByRole('combobox');

    const option = document.createElement('option');
    option.value = '11';
    option.text = '11';
    select.appendChild(option);

    fireEvent.change(select, { target: { value: '11' } });

    const submitBtn = screen.getByRole('button', { name: /save pse/i });
    submitBtn.disabled = false;
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'PSE must be an integer between 1 and 10'
    );
    expect(patchSessionPse).not.toHaveBeenCalled();
  });

  it('calls patchSessionPse with correct sessionId and pse integer on submit', async () => {
    patchSessionPse.mockResolvedValue({ session_id: 'session-1', pse: 7, session_load: 630 });

    render(<PseForm {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '7' } });

    const submitBtn = screen.getByRole('button', { name: /save pse/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(patchSessionPse).toHaveBeenCalledWith('session-1', 7);
    });
  });

  it('calls onSuccess with API result on success', async () => {
    const mockResult = { session_id: 'session-1', pse: 7, session_load: 630 };
    patchSessionPse.mockResolvedValue(mockResult);

    render(<PseForm {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '7' } });

    const submitBtn = screen.getByRole('button', { name: /save pse/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockResult);
    });
  });

  it('shows success state after successful submission', async () => {
    patchSessionPse.mockResolvedValue({ session_id: 'session-1', pse: 7, session_load: 630 });

    render(<PseForm {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '7' } });

    const submitBtn = screen.getByRole('button', { name: /save pse/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('status')).toHaveTextContent('PSE saved successfully!');
  });

  it('shows error message from API on failure', async () => {
    patchSessionPse.mockRejectedValue(new Error('Server Error'));

    render(<PseForm {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '7' } });

    const submitBtn = screen.getByRole('button', { name: /save pse/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Server Error');
  });

  it('disables submit button while submitting', async () => {
    let resolvePromise;
    patchSessionPse.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<PseForm {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '7' } });

    const submitBtn = screen.getByRole('button', { name: /save pse/i });
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('Saving...');

    resolvePromise({ session_id: 'session-1', pse: 7, session_load: 630 });

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
      expect(submitBtn).toHaveTextContent('Save PSE');
    });
  });

  it('clears error and success messages on change', async () => {
    patchSessionPse.mockRejectedValue(new Error('Server Error'));

    render(<PseForm {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '7' } });

    const submitBtn = screen.getByRole('button', { name: /save pse/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Server Error');

    fireEvent.change(select, { target: { value: '8' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
