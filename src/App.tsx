import React, { useState, useEffect } from 'react';
import { Plane, Clipboard, User as UserIcon, CheckCircle, LayoutDashboard, Download, Clock, X, Search, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import type { User } from '@supabase/supabase-js';
import { DroneVerification } from './components/DroneVerification';
import { HomePage } from './components/HomePage';
import { docuSignService } from './lib/docusign';

// Generate a unique pilot license ID
const generatePilotLicenseId = () => {
  const prefix = 'PL';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

type FormStep = 'owner' | 'drone' | 'review' | 'success' | 'dashboard' | 'view-drone' | 'signing';

interface OwnerInfo {
  firstName: string;
  lastName: string;
  email: string;
  pilotLicense: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface DroneInfo {
  manufacturer: string;
  model: string;
  serialNumber: string;
  weight: string;
  purpose: string;
}

interface RegisteredDrone {
  id: string;
  owner_id: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  weight: number;
  purpose: string;
  created_at: string;
  registration_id: string | null;
  docusign_status: string;
  docusign_envelope_id?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<FormStep>('dashboard');
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    pilotLicense: generatePilotLicenseId(),
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [droneInfo, setDroneInfo] = useState<DroneInfo>({
    manufacturer: '',
    model: '',
    serialNumber: '',
    weight: '',
    purpose: '',
  });
  const [hasOwnerProfile, setHasOwnerProfile] = useState(false);
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [registeredDrones, setRegisteredDrones] = useState<RegisteredDrone[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<RegisteredDrone | null>(null);
  const [isVerificationMode, setIsVerificationMode] = useState(false);
  const [showHomePage, setShowHomePage] = useState(true);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset all form states
  const resetStates = () => {
    setOwnerInfo({
      firstName: '',
      lastName: '',
      email: user?.email || '',
      pilotLicense: generatePilotLicenseId(),
      address: '',
      city: '',
      state: '',
      zipCode: '',
    });
    setDroneInfo({
      manufacturer: '',
      model: '',
      serialNumber: '',
      weight: '',
      purpose: '',
    });
    setHasOwnerProfile(false);
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setOwnerInfo(prev => ({
          ...prev,
          email: session.user.email || ''
        }));
      } else {
        resetStates();
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setOwnerInfo(prev => ({
          ...prev,
          email: session.user.email || ''
        }));
      } else {
        resetStates();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch owner profile when user logs in
  useEffect(() => {
    const fetchOwnerProfile = async () => {
      if (!user) {
        resetStates();
        return;
      }

      try {
        const { data, error } = await supabase
          .from('owners')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No profile found for this user, generate a new license ID
            setOwnerInfo(prev => ({
              ...prev,
              pilotLicense: generatePilotLicenseId()
            }));
          } else {
            console.error('Error fetching owner profile:', error);
          }
          return;
        }

        if (data) {
          setOwnerInfo({
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            pilotLicense: data.pilot_license,
            address: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zip_code,
          });
          setHasOwnerProfile(true);
        } else {
          resetStates();
        }
      } catch (error) {
        console.error('Error:', error);
        resetStates();
      }
    };

    fetchOwnerProfile();
  }, [user?.id]); // Use user.id instead of user to ensure it updates when user changes

  // Fetch registered drones
  useEffect(() => {
    const fetchDrones = async () => {
      if (!user) return;

      try {
        const { data: ownerData, error: ownerError } = await supabase
          .from('owners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (ownerError) {
          console.error('Error fetching owner:', ownerError);
          return;
        }

        const { data: drones, error: dronesError } = await supabase
          .from('drones')
          .select('*')
          .eq('owner_id', ownerData.id)
          .order('created_at', { ascending: false });

        if (dronesError) {
          console.error('Error fetching drones:', dronesError);
          return;
        }

        setRegisteredDrones(drones);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchDrones();
  }, [user, step]);

  const handleSignOut = async () => {
    try {
      // Clear all states first
      resetStates();
      setIsVerificationMode(false);
      setRegisteredDrones([]);
      setSelectedDrone(null);
      setHasOwnerProfile(false);
      setIsEditingOwner(false);
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();

      // Sign out from Supabase
    await supabase.auth.signOut();
      
      // Clear user state last
      setUser(null);
      
      // Force reload the page to clear any remaining cache
      window.location.reload();
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (hasOwnerProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('owners')
          .update({
            first_name: ownerInfo.firstName,
            last_name: ownerInfo.lastName,
            email: ownerInfo.email,
            pilot_license: ownerInfo.pilotLicense,
            address: ownerInfo.address,
            city: ownerInfo.city,
            state: ownerInfo.state,
            zip_code: ownerInfo.zipCode,
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        setStep('drone');
        return;
      }

      // Insert new profile
      const { error: insertError } = await supabase.from('owners').insert({
        user_id: user.id,
        first_name: ownerInfo.firstName,
        last_name: ownerInfo.lastName,
        email: ownerInfo.email,
        pilot_license: ownerInfo.pilotLicense,
        address: ownerInfo.address,
        city: ownerInfo.city,
        state: ownerInfo.state,
        zip_code: ownerInfo.zipCode,
      });

      if (insertError) throw insertError;
      setHasOwnerProfile(true);
      setStep('drone');
    } catch (error) {
      console.error('Error saving owner info:', error);
      if (error instanceof Error) {
        if (error.message.includes('violates foreign key')) {
          alert('There was an error with your user account. Please try logging in again.');
        } else {
          alert(`Failed to save owner information: ${error.message}`);
        }
      } else {
      alert('Failed to save owner information. Please try again.');
      }
    }
  };

  const handleDroneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Get the owner_id for the current user
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (ownerError) throw ownerError;

      const { error } = await supabase.from('drones').insert({
        owner_id: ownerData.id,
        manufacturer: droneInfo.manufacturer,
        model: droneInfo.model,
        serial_number: droneInfo.serialNumber,
        weight: parseInt(droneInfo.weight),
        purpose: droneInfo.purpose,
      });

      if (error) throw error;
      setStep('review');
    } catch (error) {
      console.error('Error saving drone info:', error);
      alert('Failed to save drone information. Please try again.');
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the owner ID and existing drone record
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (ownerError || !ownerData) {
        throw new Error('Failed to fetch owner information');
      }

      // Get the existing drone record
      const { data: droneData, error: droneError } = await supabase
        .from('drones')
        .select('*')
        .eq('owner_id', ownerData.id)
        .eq('serial_number', droneInfo.serialNumber)
        .single();

      if (droneError || !droneData) {
        throw new Error('Failed to fetch drone record');
      }

      // Create signing request with type assertions for required fields
      const signingData = {
        droneId: droneInfo.serialNumber || '',
        manufacturer: droneInfo.manufacturer || '',
        model: droneInfo.model || '',
        serialNumber: droneInfo.serialNumber || '',
        ownerName: `${ownerInfo.firstName || ''} ${ownerInfo.lastName || ''}`,
        ownerEmail: ownerInfo.email || user.email || '',
        pilotLicense: ownerInfo.pilotLicense || ''
      };

      // Get origin for return URL
      const origin = window.location.origin || 'http://localhost:3000';
      const { envelopeId, status, message, registrationId } = await docuSignService.initiateSigningProcess(
        signingData,
        `${origin}/registration-complete`
      );
      
      if (!registrationId) {
        throw new Error('No registration ID received from DocuSign service');
      }

      // Update the drone record with envelope ID and registration ID
      const { error: updateError } = await supabase
        .from('drones')
        .update({
          docusign_envelope_id: envelopeId,
          docusign_status: status,
          registration_id: registrationId // Using the registration ID from DocuSign
        })
        .eq('id', droneData.id);

      if (updateError) {
        console.error('Update error details:', updateError);
        throw new Error('Failed to update drone with signing information');
      }

      // Fetch the updated drone record to ensure we have the latest data
      const { data: updatedDrone, error: fetchError } = await supabase
        .from('drones')
        .select('*')
        .eq('id', droneData.id)
        .single();

      if (fetchError || !updatedDrone) {
        console.error('Error fetching updated drone:', fetchError);
        throw new Error('Failed to fetch updated drone information');
      }

      // Update the selected drone with the latest data
      setSelectedDrone(updatedDrone);
      
      // Store registration ID in state for display
      setRegistrationId(registrationId);
      
      // Replace alert with notification
      showNotification('success', `Registration initiated! Your registration ID is: ${registrationId}\nPlease check your email to complete the signing process.`);
      
      setStep('success');
    } catch (error) {
      console.error('Error during signing process:', error);
      if (error instanceof Error) {
        showNotification('error', `Failed to initiate signing process: ${error.message}`);
      } else {
        showNotification('error', 'Failed to initiate signing process. Please try again.');
      }
    }
  };

  // Add handler for registration completion
  useEffect(() => {
    const handleRegistrationComplete = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const event = urlParams.get('event');
      
      if (event === 'signing_complete') {
        try {
          if (!user) return;

          // Update the drone's signing status
          const { data: ownerData } = await supabase
            .from('owners')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (ownerData && droneInfo.serialNumber) {
            // Update the status
            await supabase.from('drones')
              .update({
                docusign_status: 'completed'
              })
              .eq('owner_id', ownerData.id)
              .eq('serial_number', droneInfo.serialNumber);

            // Fetch the updated drone record
            const { data: updatedDrone } = await supabase
              .from('drones')
              .select('*')
              .eq('owner_id', ownerData.id)
              .eq('serial_number', droneInfo.serialNumber)
              .single();

            if (updatedDrone) {
              setSelectedDrone(updatedDrone);
              setRegistrationId(updatedDrone.registration_id);
            }
          }
        } catch (error) {
          console.error('Error updating signing status:', error);
        }

        setStep('success');
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleRegistrationComplete();
  }, [user, droneInfo.serialNumber]);

  // Add handler for registration click
  const handleRegisterClick = () => {
    setShowHomePage(false);
    if (!user) {
      // If not logged in, show auth screen
      setIsVerificationMode(false);
    } else {
      // If logged in, go directly to dashboard
      setIsVerificationMode(false);
      setStep('dashboard');
    }
  };

  // Add handler for verify click
  const handleVerifyClick = () => {
    setShowHomePage(false);
    setIsVerificationMode(true);
  };

  // Add handler for DocuSign callback
  useEffect(() => {
    const handleDocuSignCallback = async () => {
      if (window.location.pathname === '/docusign-callback') {
        try {
          // Get the code from URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          
          if (code) {
            // Store the consent code (you might want to send this to your backend)
            console.log('DocuSign consent granted with code:', code);
            
            // Redirect back to the registration flow
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Error handling DocuSign callback:', error);
          alert('Failed to complete DocuSign consent. Please try again.');
        }
      }
    };

    handleDocuSignCallback();
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Update the return statement at the top level
  if (showHomePage) {
    return (
      <HomePage
        onVerifyClick={handleVerifyClick}
        onRegisterClick={handleRegisterClick}
      />
    );
  }

  if (isVerificationMode) {
    return (
      <div>
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
          <div className="container mx-auto">
            <nav className="px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Plane className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-slate-900">Drone Registration Portal</h1>
              </div>
              <button
                onClick={() => setShowHomePage(true)}
                className="text-slate-600 hover:text-slate-900 font-medium transition-all hover:scale-105"
              >
                Back to Home
              </button>
            </nav>
          </div>
        </div>
        <div className="pt-20">
          <DroneVerification onClose={() => setIsVerificationMode(false)} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
          <div className="container mx-auto">
            <nav className="px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Plane className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-slate-900">Drone Registration Portal</h1>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsVerificationMode(true)}
                  className="text-slate-600 hover:text-slate-900 font-medium transition-all hover:scale-105"
                >
                  Verify a Drone
                </button>
                <button
                  onClick={() => setShowHomePage(true)}
                  className="text-slate-600 hover:text-slate-900 font-medium transition-all hover:scale-105"
                >
                  Back to Home
                </button>
              </div>
            </nav>
          </div>
        </div>
        <div className="pt-20">
          <Auth onAuthSuccess={(user) => {
            setUser(user);
            setStep('dashboard');
            setShowHomePage(false);
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Modern Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="container mx-auto">
          <nav className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Drone Registration Portal</h1>
                <p className="text-sm text-slate-500">Official Registration System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsVerificationMode(true)}
                className="text-slate-600 hover:text-slate-900 font-medium transition-all hover:scale-105 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Verify a Drone
              </button>
              {step !== 'dashboard' && (
                <button
                  onClick={() => {
                    setStep('dashboard');
                    setSelectedDrone(null);
                  }}
                  className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2 transition-all hover:scale-105"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
              )}
              {user && (
                <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-slate-900">{ownerInfo.firstName} {ownerInfo.lastName}</span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-slate-600 hover:text-slate-900 font-medium transition-all hover:scale-105"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Dashboard View */}
          {step === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Your Registered Drones</h2>
                  <p className="text-slate-500 mt-1">Manage and monitor your drone registrations</p>
                </div>
                <button
                  onClick={() => setStep('owner')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/10 transition-all hover:shadow-xl hover:shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2"
                >
                  <Plane className="h-5 w-5" />
                  Register New Drone
                </button>
              </div>

              {registeredDrones.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-xl border border-slate-100">
                  <div className="bg-slate-50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4">
                    <Plane className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No Drones Registered</h3>
                  <p className="text-slate-600 mb-6">Get started by registering your first drone</p>
                  <button
                    onClick={() => setStep('owner')}
                    className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2 mx-auto"
                  >
                    <Plane className="h-4 w-4" />
                    Register your first drone
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {registeredDrones.map((drone) => (
                    <div 
                      key={drone.id} 
                      className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all cursor-pointer group"
                      onClick={() => {
                        setSelectedDrone(drone);
                        setStep('view-drone');
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                            {drone.manufacturer} {drone.model}
                          </h3>
                          <p className="text-slate-500">Serial: {drone.serial_number}</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 capitalize">
                            {drone.purpose}
                          </span>
                          {drone.docusign_status === 'completed' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-100">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Signed
                            </span>
                          ) : drone.docusign_status === 'sent' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                              <Clock className="w-4 h-4 mr-1" />
                              Pending Signature
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <p className="text-slate-600">Weight: {drone.weight}g</p>
                          {drone.registration_id && (
                            <p className="text-slate-600">ID: {drone.registration_id}</p>
                          )}
                        </div>
                        <p className="text-slate-400">
                          Registered: {new Date(drone.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Forms with modern styling */}
          {step === 'owner' && (
            <form onSubmit={handleOwnerSubmit} className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-100 p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Owner Information</h2>
                  <p className="text-slate-500 mt-1">Provide your details for drone registration</p>
                </div>
                {hasOwnerProfile && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Profile Registered</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={ownerInfo.firstName}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, firstName: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={ownerInfo.lastName}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, lastName: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={ownerInfo.email}
                    readOnly
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-slate-500">Email is automatically set from your login account</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pilot License ID</label>
                  <input
                    type="text"
                    required
                    value={ownerInfo.pilotLicense}
                    readOnly
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-slate-500">This is your unique pilot license ID</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={ownerInfo.address}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, address: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={ownerInfo.city}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, city: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={ownerInfo.state}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, state: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
                  <input
                    type="number"
                    required
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={ownerInfo.zipCode}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, zipCode: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/10 transition-all hover:shadow-xl hover:shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2"
                >
                  <Plane className="h-5 w-5" />
                  {hasOwnerProfile ? 'Update & Continue' : 'Next: Drone Details'}
                </button>
              </div>
            </form>
          )}

          {/* View Drone Details */}
          {step === 'view-drone' && selectedDrone && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-slate-900">Drone Details</h2>
                <div className="flex items-center gap-4">
                  {selectedDrone.docusign_status !== 'completed' && (
                    <button
                      onClick={async () => {
                        try {
                          // Get owner info for the selected drone
                          const { data: ownerData } = await supabase
                            .from('owners')
                            .select('*')
                            .eq('id', selectedDrone.owner_id)
                            .single();

                          if (!ownerData) {
                            throw new Error('Owner information not found');
                          }

                          // Prepare signing data with existing registration ID
                          const signingData = {
                            droneId: selectedDrone.serial_number,
                            manufacturer: selectedDrone.manufacturer,
                            model: selectedDrone.model,
                            serialNumber: selectedDrone.serial_number,
                            ownerName: `${ownerData.first_name} ${ownerData.last_name}`,
                            ownerEmail: ownerData.email,
                            pilotLicense: ownerData.pilot_license,
                            // Only pass registration ID if it exists
                            ...(selectedDrone.registration_id && { registrationId: selectedDrone.registration_id })
                          };

                          // Get origin for return URL
                          const origin = window.location.origin || 'http://localhost:3000';
                          
                          // Initiate signing process
                          const response = await docuSignService.initiateSigningProcess(
                            signingData,
                            `${origin}/registration-complete`
                          );

                          // If we didn't have a registration ID before, we should update it now
                          if (!selectedDrone.registration_id) {
                            // Update drone record with new envelope ID, status, and registration ID
                            const { error: updateError } = await supabase
                              .from('drones')
                              .update({
                                docusign_envelope_id: response.envelopeId,
                                docusign_status: response.status,
                                registration_id: response.registrationId // Save the new registration ID
                              })
                              .eq('id', selectedDrone.id);

                            if (updateError) throw updateError;
                          } else {
                            // Just update envelope ID and status for existing registration
                            const { error: updateError } = await supabase
                              .from('drones')
                              .update({
                                docusign_envelope_id: response.envelopeId,
                                docusign_status: response.status
                              })
                              .eq('id', selectedDrone.id);

                            if (updateError) throw updateError;
                          }

                          // Show success notification
                          showNotification('success', 'Signing request has been resent. Please check your email.');
                          
                          // Update the selected drone's status and registration ID
                          setSelectedDrone({
                            ...selectedDrone,
                            docusign_status: response.status,
                            docusign_envelope_id: response.envelopeId,
                            // Update registration_id if it was null before
                            registration_id: selectedDrone.registration_id || response.registrationId
                          });
                        } catch (error) {
                          console.error('Error resending signature request:', error);
                          showNotification('error', 'Failed to resend signature request. Please try again.');
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-indigo-600/10 transition-all hover:shadow-xl hover:shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Resend for Signing
                    </button>
                  )}
                  <button
                    onClick={() => setStep('dashboard')}
                    className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-100 p-8">
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-900 mb-1">
                          {selectedDrone.manufacturer} {selectedDrone.model}
                        </h3>
                        <p className="text-slate-500">
                          Registration ID: {selectedDrone.registration_id || 'Pending'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 capitalize">
                          {selectedDrone.purpose}
                        </span>
                        {selectedDrone.docusign_status === 'completed' ? (
                          <>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-100">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Signed
                            </span>
                            <button
                              onClick={async () => {
                                try {
                                  if (!selectedDrone.docusign_envelope_id) {
                                    alert('Document ID not found');
                                    return;
                                  }
                                  setIsLoading(true);
                                  await docuSignService.downloadDocument(selectedDrone.docusign_envelope_id);
                                } catch (error) {
                                  console.error('Error downloading document:', error);
                                  alert('Failed to download the document. Please try again.');
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              disabled={isLoading || !selectedDrone.docusign_envelope_id}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-1" />
                                  Download Document
                                </>
                              )}
                            </button>
                          </>
                        ) : selectedDrone.docusign_status === 'sent' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                            <Clock className="w-4 h-4 mr-1" />
                            Waiting for Signature
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* QR Code Section */}
                    {selectedDrone.docusign_status === 'completed' && (
                      <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="bg-white p-2 rounded-lg shadow-lg">
                            <QRCodeSVG
                              value={`Registration ID: ${selectedDrone.registration_id}
Manufacturer: ${selectedDrone.manufacturer}
Model: ${selectedDrone.model}
Serial Number: ${selectedDrone.serial_number}
Purpose: ${selectedDrone.purpose}`}
                              size={120}
                              level="H"
                              includeMargin={true}
                              id="drone-qr-code"
                            />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">Tamper-Proof Identification</h4>
                            <p className="text-slate-600 mb-3">This QR code contains your drone's unique identification details.</p>
                            <button 
                              onClick={() => {
                                const svg = document.getElementById('drone-qr-code');
                                if (svg) {
                                  const svgData = new XMLSerializer().serializeToString(svg);
                                  const canvas = document.createElement('canvas');
                                  const ctx = canvas.getContext('2d');
                                  const img = new Image();
                                  img.onload = () => {
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    if (ctx) {
                                      ctx.fillStyle = 'white';
                                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                                      ctx.drawImage(img, 0, 0);
                                    }
                                    const pngFile = canvas.toDataURL('image/png');
                                    const downloadLink = document.createElement('a');
                                    downloadLink.download = `drone-${selectedDrone.id}-qr.png`;
                                    downloadLink.href = pngFile;
                                    downloadLink.click();
                                  };
                                  img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                                }
                              }}
                              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              <Download className="h-4 w-4" />
                              Download QR Code
                            </button>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                          <p className="text-sm text-indigo-700">Print this QR code and attach it to your drone for easy identification</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Serial Number</label>
                        <p className="text-slate-900">{selectedDrone.serial_number}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Weight</label>
                        <p className="text-slate-900">{selectedDrone.weight} grams</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Registration Date</label>
                        <p className="text-slate-900">{new Date(selectedDrone.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Purpose</label>
                        <p className="text-slate-900 capitalize">{selectedDrone.purpose}</p>
                      </div>
                    </div>
                  </div>

                  {/* Owner Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">Owner Information</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Name</label>
                        <p className="text-slate-900">{ownerInfo.firstName} {ownerInfo.lastName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                        <p className="text-slate-900">{ownerInfo.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Pilot License</label>
                        <p className="text-slate-900">{ownerInfo.pilotLicense}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Address</label>
                        <p className="text-slate-900">{ownerInfo.address}</p>
                        <p className="text-slate-900">{ownerInfo.city}, {ownerInfo.state} {ownerInfo.zipCode}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          {step !== 'dashboard' && (
            <>
              <div className="flex justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
                <div className={`relative z-10 flex flex-col items-center ${step === 'owner' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step === 'owner' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Owner</span>
                </div>
                <div className={`relative z-10 flex flex-col items-center ${step === 'drone' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step === 'drone' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                    <Plane className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Drone</span>
                </div>
                <div className={`relative z-10 flex flex-col items-center ${step === 'review' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step === 'review' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                    <Clipboard className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Review</span>
                </div>
                <div className={`relative z-10 flex flex-col items-center ${step === 'success' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step === 'success' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Complete</span>
                </div>
              </div>

              {/* Forms with updated styling */}
              {step === 'drone' && (
                <form onSubmit={handleDroneSubmit} className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-100 p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">Drone Information</h2>
                      <p className="text-slate-500 mt-1">Enter your drone's specifications</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('owner')}
                      className="text-slate-600 hover:text-slate-900 font-medium transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <UserIcon className="h-4 w-4" />
                      Back to Owner Info
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
                      <input
                        type="text"
                        required
                        value={droneInfo.manufacturer}
                        onChange={(e) => setDroneInfo({ ...droneInfo, manufacturer: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder="e.g. DJI, Parrot"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                      <input
                        type="text"
                        required
                        value={droneInfo.model}
                        onChange={(e) => setDroneInfo({ ...droneInfo, model: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder="e.g. Mavic Air 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                      <input
                        type="text"
                        required
                        value={droneInfo.serialNumber}
                        onChange={(e) => setDroneInfo({ ...droneInfo, serialNumber: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder="Enter drone serial number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Weight (grams)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={droneInfo.weight}
                        onChange={(e) => setDroneInfo({ ...droneInfo, weight: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder="e.g. 249"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                      <select
                        required
                        value={droneInfo.purpose}
                        onChange={(e) => setDroneInfo({ ...droneInfo, purpose: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      >
                        <option value="">Select purpose</option>
                        <option value="recreational">Recreational</option>
                        <option value="commercial">Commercial</option>
                        <option value="educational">Educational</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/10 transition-all hover:shadow-xl hover:shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2"
                    >
                      <Plane className="h-5 w-5" />
                      Register Drone
                    </button>
                  </div>
                </form>
              )}

              {step === 'review' && (
                <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-100 p-8">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-8">Review Information</h2>
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Owner Information</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Name</label>
                          <p className="text-slate-900">{ownerInfo.firstName} {ownerInfo.lastName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                          <p className="text-slate-900">{ownerInfo.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Pilot License</label>
                          <p className="text-slate-900">{ownerInfo.pilotLicense}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Address</label>
                          <p className="text-slate-900">{ownerInfo.address}</p>
                          <p className="text-slate-900">{ownerInfo.city}, {ownerInfo.state} {ownerInfo.zipCode}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Drone Information</h3>
                      <div className="grid grid-cols-2 gap-6">
                        {selectedDrone?.registration_id && (
                          <div className="col-span-2 bg-slate-50 p-4 rounded-lg">
                            <label className="block text-sm font-medium text-slate-500 mb-1">Registration ID</label>
                            <p className="text-lg font-mono font-semibold text-slate-900">{selectedDrone.registration_id}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Manufacturer</label>
                          <p className="text-slate-900">{selectedDrone?.manufacturer || droneInfo.manufacturer}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Model</label>
                          <p className="text-slate-900">{selectedDrone?.model || droneInfo.model}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Serial Number</label>
                          <p className="text-slate-900">{selectedDrone?.serial_number || droneInfo.serialNumber}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Weight</label>
                          <p className="text-slate-900">{selectedDrone?.weight || droneInfo.weight} grams</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">Purpose</label>
                          <p className="text-slate-900 capitalize">{selectedDrone?.purpose || droneInfo.purpose}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => setStep('drone')}
                      className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                      Back to Drone Details
                    </button>
                    <button
                      onClick={handleSubmitRegistration}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/10 transition-all hover:shadow-xl hover:shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Submit Registration
                    </button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="max-w-2xl mx-auto p-8 bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-100">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Registration Successful!</h2>
                    <p className="text-slate-600 mb-6">
                      Your drone has been successfully registered. Please check your email to complete the signing process.
                    </p>
                    {registrationId && (
                      <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500 mb-2">Registration ID</p>
                        <p className="text-lg font-mono font-semibold text-slate-900">{registrationId}</p>
                      </div>
                    )}
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => setStep('dashboard')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Go to Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modern Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-4">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`flex items-center justify-between p-4 rounded-lg shadow-lg max-w-sm transition-all transform animate-slide-in ${
              notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' :
              notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' :
              'bg-indigo-50 text-indigo-800 border border-indigo-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {notification.type === 'error' && <X className="w-5 h-5 text-red-500" />}
              {notification.type === 'info' && <Clock className="w-5 h-5 text-indigo-500" />}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="ml-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;