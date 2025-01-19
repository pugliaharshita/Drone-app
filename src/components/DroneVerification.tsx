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

interface DroneVerificationProps {
  onClose: () => void;
}

export function DroneVerification({ onClose }: DroneVerificationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedDrone, setVerifiedDrone] = useState<VerificationResult | null>(null);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // First try by registration ID
      let { data: droneByRegId, error: regIdError } = await supabase
        .from('drones')
        .select(`
          *,
          owners (
            first_name,
            last_name,
            pilot_license
          )
        `)
        .eq('registration_id', searchQuery)
        .single();

      if (regIdError) {
        // If not found by registration ID, try by serial number
        let { data: droneBySerial, error: serialError } = await supabase
          .from('drones')
          .select(`
            *,
            owners (
              first_name,
              last_name,
              pilot_license
            )
          `)
          .eq('serial_number', searchQuery)
          .single();

        if (serialError) {
          setError('No registered drone found with this ID. Please verify the registration ID and try again.');
          return;
        }

        if (!droneBySerial || !droneBySerial.owners) {
          setError('Invalid drone data received from the server.');
          return;
        }

        setVerifiedDrone({
          drone: {
            id: droneBySerial.id,
            manufacturer: droneBySerial.manufacturer,
            model: droneBySerial.model,
            serial_number: droneBySerial.serial_number,
            weight: droneBySerial.weight,
            purpose: droneBySerial.purpose,
            created_at: droneBySerial.created_at,
            registration_id: droneBySerial.registration_id,
            docusign_status: droneBySerial.docusign_status
          },
          owner: {
            first_name: droneBySerial.owners.first_name,
            last_name: droneBySerial.owners.last_name,
            pilot_license: droneBySerial.owners.pilot_license,
          },
        });
      } else {
        if (!droneByRegId || !droneByRegId.owners) {
          setError('Invalid drone data received from the server.');
          return;
        }

        setVerifiedDrone({
          drone: {
            id: droneByRegId.id,
            manufacturer: droneByRegId.manufacturer,
            model: droneByRegId.model,
            serial_number: droneByRegId.serial_number,
            weight: droneByRegId.weight,
            purpose: droneByRegId.purpose,
            created_at: droneByRegId.created_at,
            registration_id: droneByRegId.registration_id,
            docusign_status: droneByRegId.docusign_status
          },
          owner: {
            first_name: droneByRegId.owners.first_name,
            last_name: droneByRegId.owners.last_name,
            pilot_license: droneByRegId.owners.pilot_license,
          },
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('An error occurred during verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Verify Drone Registration</h2>
              <p className="text-slate-500 mt-1">Enter a registration ID or serial number to verify a drone</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {!verifiedDrone ? (
            <form onSubmit={handleVerification} className="space-y-6">
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter registration ID or serial number"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    required
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                </div>
                {error && (
                  <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                    <div className="p-1 bg-red-100 rounded-full">
                      <X className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Verification Failed</h3>
                      <p className="text-sm text-red-600 mt-0.5">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/10 transition-all hover:shadow-xl hover:shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="h-5 w-5" />
                  {isLoading ? 'Verifying...' : 'Verify Drone'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8">
              <div className="p-6 bg-green-50 rounded-xl border border-green-100 flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-green-800">Valid Registration</h3>
                  <p className="text-green-600">This drone is officially registered in our system</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Registration Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Registration ID</p>
                      <p className="text-slate-900">{verifiedDrone.drone.registration_id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Registration Date</p>
                      <p className="text-slate-900">{new Date(verifiedDrone.drone.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Status</p>
                      <div className="mt-1">
                        {verifiedDrone.drone.docusign_status === 'completed' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-100">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Signed
                          </span>
                        ) : verifiedDrone.drone.docusign_status === 'sent' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                            Pending Signature
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-50 text-slate-700 border border-slate-100">
                            Not Started
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Drone Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Manufacturer & Model</p>
                      <p className="text-slate-900">{verifiedDrone.drone.manufacturer} {verifiedDrone.drone.model}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Serial Number</p>
                      <p className="text-slate-900">{verifiedDrone.drone.serial_number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Weight</p>
                      <p className="text-slate-900">{verifiedDrone.drone.weight}g</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Purpose</p>
                      <p className="text-slate-900 capitalize">{verifiedDrone.drone.purpose}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Owner Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Full Name</p>
                    <p className="text-slate-900">{maskName(verifiedDrone.owner.first_name)} {maskName(verifiedDrone.owner.last_name)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Pilot License</p>
                    <p className="text-slate-900">{maskLicenseId(verifiedDrone.owner.pilot_license)}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-200">
                <button
                  onClick={() => {
                    setVerifiedDrone(null);
                    setSearchQuery('');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/10 transition-all hover:shadow-xl hover:shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2"
                >
                  <Search className="h-5 w-5" />
                  Verify Another Drone
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 