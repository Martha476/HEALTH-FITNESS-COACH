/**
 * Body Measurements Tracker Component
 * Track chest, waist, hips, arms, and other body measurements for comprehensive progress
 */

'use client';

import React, { useState, useEffect } from 'react';

interface BodyMeasurement {
  id: string;
  weight_lbs?: number;
  chest_inches?: number;
  waist_inches?: number;
  hips_inches?: number;
  arms_inches?: number;
  body_fat_percent?: number;
  measured_date: string;
  notes?: string;
}

export default function BodyMeasurementsTracker() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    weight_lbs: '',
    chest_inches: '',
    waist_inches: '',
    hips_inches: '',
    arms_inches: '',
    body_fat_percent: '',
    notes: '',
  });

  useEffect(() => {
    fetchMeasurements();
  }, []);

  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/body-measurements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMeasurements(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch measurements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');

      const payload = {
        weight_lbs: formData.weight_lbs ? parseFloat(formData.weight_lbs) : null,
        chest_inches: formData.chest_inches ? parseFloat(formData.chest_inches) : null,
        waist_inches: formData.waist_inches ? parseFloat(formData.waist_inches) : null,
        hips_inches: formData.hips_inches ? parseFloat(formData.hips_inches) : null,
        arms_inches: formData.arms_inches ? parseFloat(formData.arms_inches) : null,
        body_fat_percent: formData.body_fat_percent ? parseFloat(formData.body_fat_percent) : null,
        notes: formData.notes || null,
      };

      const res = await fetch('/api/body-measurements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchMeasurements();
        setShowForm(false);
        setFormData({
          weight_lbs: '',
          chest_inches: '',
          waist_inches: '',
          hips_inches: '',
          arms_inches: '',
          body_fat_percent: '',
          notes: '',
        });
      }
    } catch (err) {
      console.error('Failed to log measurement:', err);
    }
  };

  const calculateChange = (metric: keyof BodyMeasurement): { value: number; percentage: number } | null => {
    if (measurements.length < 2) return null;

    const current = measurements[0][metric] as number;
    const previous = measurements[1][metric] as number;

    if (!current || !previous) return null;

    const value = current - previous;
    const percentage = (value / previous) * 100;

    return { value, percentage };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">📏 Body Measurements</h2>
          <p className="text-gray-600">Track your progress beyond the scale</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight_lbs}
                  onChange={(e) => setFormData({ ...formData, weight_lbs: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 180.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chest (inches)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.chest_inches}
                  onChange={(e) => setFormData({ ...formData, chest_inches: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 38.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Waist (inches)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.waist_inches}
                  onChange={(e) => setFormData({ ...formData, waist_inches: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 32.0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hips (inches)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.hips_inches}
                  onChange={(e) => setFormData({ ...formData, hips_inches: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 38.0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Arms (inches)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.arms_inches}
                  onChange={(e) => setFormData({ ...formData, arms_inches: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 14.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Body Fat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.body_fat_percent}
                  onChange={(e) => setFormData({ ...formData, body_fat_percent: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 22.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Any observations or context?"
                rows={2}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition"
            >
              Save Measurement
            </button>
          </form>
        </div>
      )}

      {/* Measurements History */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading measurements...</div>
        ) : measurements.length > 0 ? (
          measurements.map((measurement, index) => {
            const date = new Date(measurement.measured_date);
            return (
              <div key={measurement.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {measurement.notes && <p className="text-gray-600 text-sm">{measurement.notes}</p>}
                  </div>
                  {index === 0 && <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">Latest</span>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {measurement.weight_lbs && (
                    <div>
                      <p className="text-gray-600 text-sm">Weight</p>
                      <p className="text-2xl font-bold">{measurement.weight_lbs.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">lbs</p>
                      {index < measurements.length - 1 && calculateChange('weight_lbs') && (
                        <p
                          className={`text-sm font-semibold ${
                            calculateChange('weight_lbs')!.value < 0 ? 'text-green-600' : 'text-orange-600'
                          }`}
                        >
                          {calculateChange('weight_lbs')!.value < 0 ? '−' : '+'}
                          {Math.abs(calculateChange('weight_lbs')!.value).toFixed(1)} lbs
                        </p>
                      )}
                    </div>
                  )}

                  {measurement.chest_inches && (
                    <div>
                      <p className="text-gray-600 text-sm">Chest</p>
                      <p className="text-2xl font-bold">{measurement.chest_inches.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">in</p>
                    </div>
                  )}

                  {measurement.waist_inches && (
                    <div>
                      <p className="text-gray-600 text-sm">Waist</p>
                      <p className="text-2xl font-bold">{measurement.waist_inches.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">in</p>
                    </div>
                  )}

                  {measurement.hips_inches && (
                    <div>
                      <p className="text-gray-600 text-sm">Hips</p>
                      <p className="text-2xl font-bold">{measurement.hips_inches.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">in</p>
                    </div>
                  )}

                  {measurement.arms_inches && (
                    <div>
                      <p className="text-gray-600 text-sm">Arms</p>
                      <p className="text-2xl font-bold">{measurement.arms_inches.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">in</p>
                    </div>
                  )}

                  {measurement.body_fat_percent && (
                    <div>
                      <p className="text-gray-600 text-sm">Body Fat</p>
                      <p className="text-2xl font-bold">{measurement.body_fat_percent.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">bf</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <p className="text-gray-700 mb-4">No measurements recorded yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Start Tracking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
