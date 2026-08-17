import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AthleteEditModal from '../AthleteEditModal.jsx';
import * as athletesApi from '../../api/athletes.js';

vi.mock('../../api/athletes.js', () => ({
  updateAthlete: vi.fn(),
}));

describe('AthleteEditModal', () => {
  const mockAthlete = {
    id: '1',
    name: 'Test Athlete',
    position: 'Forward',
    birth_date: '1990-01-01T00:00:00.000Z',
    weight_kg: 80.5,
    height_m: 1.85,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when athlete is null', () => {
    const { container } = render(
      <AthleteEditModal athlete={null} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders pre-filled fields when athlete is provided', () => {
    render(<AthleteEditModal athlete={mockAthlete} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText(/name \*/i)).toHaveValue('Test Athlete');
    expect(screen.getByLabelText(/position/i)).toHaveValue('Forward');
    expect(screen.getByLabelText(/birth date/i)).toHaveValue('1990-01-01');
    expect(screen.getByLabelText(/weight/i)).toHaveValue('80.5');
    expect(screen.getByLabelText(/height/i)).toHaveValue('1.85');
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<AthleteEditModal athlete={mockAthlete} onClose={onClose} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('validates fields on submit', async () => {
    render(<AthleteEditModal athlete={mockAthlete} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/name \*/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(athletesApi.updateAthlete).not.toHaveBeenCalled();
  });

  it('submits successfully and calls onSaved', async () => {
    const updatedAthlete = { ...mockAthlete, name: 'Updated Name' };
    athletesApi.updateAthlete.mockResolvedValueOnce(updatedAthlete);

    const onSaved = vi.fn();
    render(<AthleteEditModal athlete={mockAthlete} onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText(/name \*/i), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(athletesApi.updateAthlete).toHaveBeenCalledWith('1', {
        name: 'Updated Name',
        position: 'Forward',
        birth_date: '1990-01-01',
        weight_kg: 80.5,
        height_m: 1.85,
      });
      expect(onSaved).toHaveBeenCalledWith(updatedAthlete);
    });
  });

  it('handles 422 API errors', async () => {
    athletesApi.updateAthlete.mockRejectedValueOnce({
      status: 422,
      fields: { position: 'Position is too long' },
    });

    render(<AthleteEditModal athlete={mockAthlete} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Position is too long')).toBeInTheDocument();
  });
});
