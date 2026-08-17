import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AthleteCreatePage from '../AthleteCreatePage.jsx';
import * as athletesApi from '../../api/athletes.js';

vi.mock('../../api/athletes.js', () => ({
  createAthlete: vi.fn(),
}));

describe('AthleteCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={['/athletes/new']}>
        <Routes>
          <Route path="/athletes/new" element={<AthleteCreatePage />} />
          <Route path="/athletes" element={<div>Athletes List Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders all form fields', () => {
    renderPage();
    expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/birth date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save athlete/i })).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    renderPage();
    const saveButton = screen.getByRole('button', { name: /save athlete/i });
    fireEvent.click(saveButton);

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Birth date is required')).toBeInTheDocument();
    expect(screen.getByText('Weight is required')).toBeInTheDocument();
    expect(screen.getByText('Height is required')).toBeInTheDocument();

    expect(athletesApi.createAthlete).not.toHaveBeenCalled();
  });

  it('validates name max length', async () => {
    renderPage();
    const nameInput = screen.getByLabelText(/name \*/i);
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(101) } });

    const saveButton = screen.getByRole('button', { name: /save athlete/i });
    fireEvent.click(saveButton);

    expect(await screen.findByText('Name must be 100 characters or fewer')).toBeInTheDocument();
  });

  it('validates date format and validity', async () => {
    renderPage();
    const dateInput = screen.getByLabelText(/birth date/i);
    const saveButton = screen.getByRole('button', { name: /save athlete/i });

    fireEvent.change(dateInput, { target: { value: '10-25-1995' } });
    fireEvent.click(saveButton);
    expect(await screen.findByText('Format must be YYYY-MM-DD')).toBeInTheDocument();

    fireEvent.change(dateInput, { target: { value: '1899-01-01' } });
    fireEvent.click(saveButton);
    expect(await screen.findByText('Must be a valid calendar date')).toBeInTheDocument();
  });

  it('validates number formats', async () => {
    renderPage();
    const weightInput = screen.getByLabelText(/weight/i);
    const heightInput = screen.getByLabelText(/height/i);
    const saveButton = screen.getByRole('button', { name: /save athlete/i });

    fireEvent.change(weightInput, { target: { value: 'abc' } });
    fireEvent.click(saveButton);
    expect(
      await screen.findByText('Must be a positive number with max 2 decimal places')
    ).toBeInTheDocument();

    fireEvent.change(weightInput, { target: { value: '75.123' } });
    fireEvent.change(heightInput, { target: { value: '1.8234' } });
    fireEvent.click(saveButton);
    expect(
      await screen.findByText('Must be a positive number with max 2 decimal places')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Must be a positive number with max 3 decimal places')
    ).toBeInTheDocument();

    fireEvent.change(weightInput, { target: { value: '-10' } });
    fireEvent.click(saveButton);
    expect(
      await screen.findByText('Must be a positive number with max 2 decimal places')
    ).toBeInTheDocument();
  });

  it('submits successfully and navigates', async () => {
    athletesApi.createAthlete.mockResolvedValueOnce({ id: '1' });
    renderPage();

    fireEvent.change(screen.getByLabelText(/name \*/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/position/i), { target: { value: 'Forward' } });
    fireEvent.change(screen.getByLabelText(/birth date/i), { target: { value: '1995-10-25' } });
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '75.5' } });
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '1.82' } });

    const saveButton = screen.getByRole('button', { name: /save athlete/i });
    fireEvent.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent('Saving...');

    await waitFor(() => {
      expect(athletesApi.createAthlete).toHaveBeenCalledWith({
        name: 'John Doe',
        position: 'Forward',
        birth_date: '1995-10-25',
        weight_kg: 75.5,
        height_m: 1.82,
      });
      expect(screen.getByText('Athletes List Page')).toBeInTheDocument();
    });
  });

  it('handles 422 field errors from API', async () => {
    athletesApi.createAthlete.mockRejectedValueOnce({
      status: 422,
      fields: { position: 'Server validation error on position' },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText(/name \*/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/birth date/i), { target: { value: '1995-10-25' } });
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '75.5' } });
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '1.82' } });

    fireEvent.click(screen.getByRole('button', { name: /save athlete/i }));

    expect(await screen.findByText('Server validation error on position')).toBeInTheDocument();
  });

  it('handles generic global error from API', async () => {
    athletesApi.createAthlete.mockRejectedValueOnce(new Error('Internal Server Error'));
    renderPage();

    fireEvent.change(screen.getByLabelText(/name \*/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/birth date/i), { target: { value: '1995-10-25' } });
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '75.5' } });
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '1.82' } });

    fireEvent.click(screen.getByRole('button', { name: /save athlete/i }));

    expect(await screen.findByText(/Internal Server Error/)).toBeInTheDocument();
  });
});
