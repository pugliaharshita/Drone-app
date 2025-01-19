import React from 'react';
import { Plane, Search, ClipboardList } from 'lucide-react';

interface HomePageProps {
  onVerifyClick: () => void;
  onRegisterClick: () => void;
}

export function HomePage({ onVerifyClick, onRegisterClick }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <div className="container mx-auto px-4 py-16 flex-grow">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-24">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl"></div>
              </div>
              <div className="relative">
                <div className="inline-flex items-center justify-center p-3 mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg shadow-blue-500/30">
                  <Plane className="h-8 w-8 text-white" />
                </div>
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 backdrop-blur rounded-3xl border border-blue-100/20 p-3 inline-flex mb-6">
                  <span className="text-blue-700 font-medium px-3">Official Registration Portal</span>
                </div>
              </div>
            </div>
            <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Drone Registration <br />& Verification System
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12">
              Your comprehensive platform for drone registration and verification, ensuring compliance with aviation regulations
            </p>
            <div className="flex items-center justify-center gap-4 mb-16">
              <button 
                onClick={onVerifyClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all hover:shadow-xl hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <Search className="h-5 w-5" />
                Verify a Drone
              </button>
              <button 
                onClick={onRegisterClick}
                className="bg-white hover:bg-slate-50 text-slate-900 px-8 py-4 rounded-xl font-medium shadow-lg shadow-slate-200 transition-all hover:shadow-xl border border-slate-200 flex items-center gap-2"
              >
                <ClipboardList className="h-5 w-5" />
                Register Now
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 mb-24">
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-slate-100">
              <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Quick Verification</h3>
              <p className="text-slate-600">Instantly verify any registered drone's status and details</p>
            </div>
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-slate-100">
              <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Secure Registration</h3>
              <p className="text-slate-600">Safe and compliant registration process with data protection</p>
            </div>
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-slate-100">
              <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Plane className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">24/7 Access</h3>
              <p className="text-slate-600">Access registration and verification services anytime</p>
            </div>
          </div>

          {/* Action Cards - Remove or comment out since we now have buttons in hero section */}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm text-slate-600 mb-4">
              This is the official drone registration and verification portal. All drones must be registered as per aviation regulations.
            </p>
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Drone Registration Portal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 