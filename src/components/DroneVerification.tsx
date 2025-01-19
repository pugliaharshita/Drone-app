import React, { useState } from 'react';
import { Search, Plane, X, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Add utility functions for masking data
const maskName = (name: string) => {
  if (!name) return '';
  return name[0] + '*'.repeat(name.length - 1);
};

const maskLicenseId = (id: string) => {
  if (!id) return '';
  const firstPart = id.slice(0, 2);  // Show 'PL' prefix
  const lastPart = id.slice(-3);      // Show last 3 characters
  return `${firstPart}${'*'.repeat(id.length - 5)}${lastPart}`;
};

interface VerificationResult {
  drone: {
    id: string;
    manufacturer: string;
    model: string;
    serial_number: string;
    weight: number;
    purpose: string;
    created_at: string;
    registration_id: string;
    docusign_status: string;
  };
  owner: {
    first_name: string;
    last_name: string;
    pilot_license: string;
  };
}

export function DroneVerification() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // First try to find by registration ID
      let { data: droneData, error: droneError } = await supabase
        .from('drones')
        .select(`
          *,
          owner: owners (
            first_name,
            last_name,
            email,
            pilot_license,
            address,
            city,
            state,
            zip_code
          )
        `)
        .eq('registration_id', searchQuery.trim())
        .single();

      // If not found by registration ID, try serial number
      if (!droneData && !droneError) {
        ({ data: droneData, error: droneError } = await supabase
          .from('drones')
          .select(`
            *,
            owner: owners (
              first_name,
              last_name,
              email,
              pilot_license,
              address,
              city,
              state,
              zip_code
            )
          `)
          .eq('serial_number', searchQuery.trim())
          .single());
      }

      if (droneError) {
        throw droneError;
      }

      if (!droneData) {
        setError('No drone found with the provided registration ID or serial number.');
        return;
      }

      setResult({
        drone: {
          id: droneData.id,
          manufacturer: droneData.manufacturer,
          model: droneData.model,
          serial_number: droneData.serial_number,
          weight: droneData.weight,
          purpose: droneData.purpose,
          created_at: droneData.created_at,
          registration_id: droneData.registration_id,
          docusign_status: droneData.docusign_status
        },
        owner: {
          first_name: droneData.owner.first_name,
          last_name: droneData.owner.last_name,
          pilot_license: droneData.owner.pilot_license,
        },
      });
    } catch (error) {
      console.error('Error verifying drone:', error);
      setError('Failed to verify drone. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center p-3 mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl backdrop-blur-sm"></div>
              <Plane className="h-8 w-8 text-white relative z-10" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-slate-900">
                Drone Registration Verification
              </h1>
              <p className="text-slate-600 max-w-xl mx-auto">
                Verify the authenticity and registration status of any drone in our official database
              </p>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleVerify} className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="registration-id" className="block text-sm font-medium text-slate-700 mb-2">
                  Drone Registration ID
                </label>
                <input
                  id="registration-id"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter the drone registration ID"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg shadow-blue-600/10 transition-all hover:shadow-xl hover:shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed h-[42px] flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Verify
                </button>
              </div>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 rounded-lg p-1">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-red-600">{error}</p>
              </div>
              <button
                onClick={handleClear}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="mt-8 bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-100 p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900 mb-1">
                    Drone Verification Result
                  </h3>
                </div>
                <div className="flex gap-2">
                  {result.drone.docusign_status === 'completed' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-100">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verified
                    </span>
                  ) : result.drone.docusign_status === 'sent' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                      <Clock className="w-4 h-4 mr-1" />
                      Pending Verification
                    </span>
                  ) : null}
                </div>
              </div>

              {result.drone.docusign_status === 'completed' ? (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 bg-slate-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-slate-500 mb-1">Registration ID</label>
                      <p className="text-lg font-mono font-semibold text-slate-900">{result.drone.registration_id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Manufacturer</label>
                      <p className="text-slate-900">{result.drone.manufacturer}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Model</label>
                      <p className="text-slate-900">{result.drone.model}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Serial Number</label>
                      <p className="text-slate-900">{result.drone.serial_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Weight</label>
                      <p className="text-slate-900">{result.drone.weight} grams</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Purpose</label>
                      <p className="text-slate-900 capitalize">{result.drone.purpose}</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">Owner Information</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Name</label>
                        <p className="text-slate-900">
                          {maskName(result.owner.first_name)} {maskName(result.owner.last_name)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Pilot License</label>
                        <p className="text-slate-900">{maskLicenseId(result.owner.pilot_license)}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-2">
                    This drone registration is pending verification. Details will be available once the registration process is complete.
                  </p>
                  <p className="text-sm text-slate-500">
                    Please check back later or contact support if you need immediate assistance.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Important Information</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• All drones must be registered as per aviation regulations</li>
                  <li>• Keep your registration ID in a safe place</li>
                  <li>• Update your information if any details change</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Legal Notice</h3>
                <p className="text-sm text-slate-600">
                  This verification system is part of the official drone registration database. 
                  Personal information is protected and partially hidden for privacy reasons.
                </p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-center text-sm text-slate-500">
                © {new Date().getFullYear()} Drone Registration Portal. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 