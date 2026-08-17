import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RouteMap, { getSpeedZone, buildColoredPolylines } from '../RouteMap.jsx';

vi.mock('react-leaflet', () => {
  return {
    MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    Polyline: ({ pathOptions }) => <div data-testid="polyline" data-color={pathOptions.color} />,
    useMap: () => ({
      fitBounds: vi.fn(),
    }),
  };
});

describe('RouteMap - getSpeedZone', () => {
  it('returns Rest/Walk color for <= 2.0 m/s', () => {
    expect(getSpeedZone(0).label).toContain('Rest / Walk');
    expect(getSpeedZone(2.0).label).toContain('Rest / Walk');
    expect(getSpeedZone(2.0).color).toBe('#64748b');
  });

  it('returns Jog color for > 2.0 and <= 4.0 m/s', () => {
    expect(getSpeedZone(2.1).label).toContain('Jog');
    expect(getSpeedZone(4.0).label).toContain('Jog');
    expect(getSpeedZone(4.0).color).toBe('#3b82f6');
  });

  it('returns Run color for > 4.0 and <= 7.0 m/s', () => {
    expect(getSpeedZone(4.1).label).toContain('Run');
    expect(getSpeedZone(7.0).label).toContain('Run');
    expect(getSpeedZone(7.0).color).toBe('#f59e0b');
  });

  it('returns Sprint color for > 7.0 m/s', () => {
    expect(getSpeedZone(7.1).label).toContain('Sprint');
    expect(getSpeedZone(10.0).label).toContain('Sprint');
    expect(getSpeedZone(10.0).color).toBe('#dc2626');
  });
});

describe('RouteMap - buildColoredPolylines', () => {
  it('returns empty array if gps length < 2', () => {
    expect(buildColoredPolylines(null)).toEqual([]);
    expect(buildColoredPolylines([])).toEqual([]);
    expect(buildColoredPolylines([{ latitude: 0, longitude: 0, speed_ms: 1 }])).toEqual([]);
  });

  it('groups consecutive points in the same zone', () => {
    const gps = [
      { latitude: 10, longitude: 10, speed_ms: 1 },
      { latitude: 11, longitude: 11, speed_ms: 1.5 },
    ];
    const lines = buildColoredPolylines(gps);
    expect(lines).toHaveLength(1);
    expect(lines[0].coords).toHaveLength(2);
    expect(lines[0].color).toBe('#64748b');
  });

  it('splits segments on zone change and repeats the boundary coordinate', () => {
    const gps = [
      { latitude: 10, longitude: 10, speed_ms: 1 },
      { latitude: 11, longitude: 11, speed_ms: 1.5 },
      { latitude: 12, longitude: 12, speed_ms: 3.0 },
      { latitude: 13, longitude: 13, speed_ms: 3.5 },
    ];
    const lines = buildColoredPolylines(gps);

    expect(lines).toHaveLength(2);

    expect(lines[0].color).toBe('#64748b');
    expect(lines[0].coords).toHaveLength(3);
    expect(lines[0].coords[2]).toEqual([12, 12]);

    expect(lines[1].color).toBe('#3b82f6');
    expect(lines[1].coords).toHaveLength(2);
    expect(lines[1].coords[0]).toEqual([12, 12]);
  });
});

describe('RouteMap Component', () => {
  it('renders empty message when no GPS data provided', () => {
    render(<RouteMap gps={[]} />);
    expect(screen.getByText(/no gps data available/i)).toBeInTheDocument();
  });

  it('renders map and legend when GPS data is provided', () => {
    const gps = [
      { latitude: 10, longitude: 10, speed_ms: 1 },
      { latitude: 11, longitude: 11, speed_ms: 5 },
    ];
    render(<RouteMap gps={gps} />);

    expect(screen.getByTestId('map-container')).toBeInTheDocument();

    expect(screen.getByText(/Rest \/ Walk/)).toBeInTheDocument();
    expect(screen.getByText(/Jog/)).toBeInTheDocument();
    expect(screen.getByText(/Run/)).toBeInTheDocument();
    expect(screen.getByText(/Sprint/)).toBeInTheDocument();
  });
});
