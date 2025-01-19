import React from 'react';
import { Plane, Search, ShieldCheck, Zap, Users, ArrowRight, CheckCircle, Globe2 } from 'lucide-react';

interface HomePageProps {
  onVerifyClick: () => void;
  onRegisterClick: () => void;
}

export function HomePage({ onVerifyClick, onRegisterClick }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-top" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/2 left-1/3 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        {/* Content */}
        <div className="relative pt-6 pb-16 lg:pt-8">
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Plane className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    Drone Registration Portal
                  </span>
                  <p className="text-sm text-slate-500">Official Registration System</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={onVerifyClick}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 font-medium transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Verify Registration
                </button>
                <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">Features</a>
              </div>
            </div>

            {/* Hero Content */}
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 mb-8">
                <Globe2 className="h-4 w-4" />
                <span className="text-sm font-medium">Trusted by Drone Pilots Worldwide</span>
              </div>
              
              <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Register Your Drone with Confidence
              </h1>
              <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                Streamlined drone registration process with secure digital certificates and instant verification.
              </p>

              {/* Key Benefits */}
              <div className="flex justify-center gap-8 mb-10">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="h-5 w-5 text-indigo-500" />
                  <span>Instant Registration</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="h-5 w-5 text-indigo-500" />
                  <span>Digital Certificates</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="h-5 w-5 text-indigo-500" />
                  <span>24/7 Verification</span>
                </div>
              </div>

              <div className="flex justify-center gap-6">
                <button
                  onClick={onRegisterClick}
                  className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2"
                >
                  Register Your Drone
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={onVerifyClick}
                  className="px-8 py-4 bg-white text-slate-800 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 flex items-center gap-2"
                >
                  Verify a Registration
                  <Search className="h-4 w-4" />
                </button>
              </div><br></br><br></br><br></br>

            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 mb-4">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Powerful Features</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Simplified Drone Registration
              </h2>
              <p className="text-lg text-slate-600">
                Our platform makes drone registration easy, secure, and efficient
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Quick Process</h3>
                <p className="text-slate-600">
                  Register your drone in minutes with our streamlined digital process
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-indigo-500" />
                    <span>5-minute registration</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-indigo-500" />
                    <span>Instant verification</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Secure & Compliant</h3>
                <p className="text-slate-600">
                  Digital certificates with tamper-proof verification system
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-indigo-500" />
                    <span>Encrypted data</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-indigo-500" />
                    <span>Regulatory compliance</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">User Friendly</h3>
                <p className="text-slate-600">
                  Intuitive interface designed for both new and experienced pilots
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-indigo-500" />
                    <span>Step-by-step guide</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-indigo-500" />
                    <span>24/7 support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-slate-600">
                  Drone Registration Portal
                </span>
                <p className="text-xs text-slate-500">Secure • Compliant • Efficient</p>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 