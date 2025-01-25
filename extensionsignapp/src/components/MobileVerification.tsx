import React, { useState } from 'react';

interface MobileVerificationProps {}

const MobileVerification: React.FC<MobileVerificationProps> = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !mobileNumber) {
      alert('Please provide both mobile number and Excel file');
      return;
    }

    setLoading(true);
    try {
      // First get the access token
      const tokenResponse = await fetch('/.netlify/functions/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${process.env.REACT_APP_CLIENT_ID}:${process.env.REACT_APP_CLIENT_SECRET}`)}`
        },
        body: JSON.stringify({
          grant_type: 'client_credentials'
        })
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error || 'Failed to get access token');
      }

      // Convert Excel file to base64
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      
      fileReader.onload = async () => {
        const base64File = (fileReader.result as string).split(',')[1];

        // Verify mobile number
        const verifyResponse = await fetch('/.netlify/functions/oauth/verify-mobile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenData.access_token}`
          },
          body: JSON.stringify({
            mobileNumber,
            excelFile: base64File
          })
        });

        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) {
          throw new Error(verifyData.error || 'Verification failed');
        }

        setVerificationResult(verifyData.message);
      };
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-verification">
      <h1>Mobile Number Verification</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="mobileNumber">Mobile Number:</label>
          <input
            type="text"
            id="mobileNumber"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Enter mobile number"
            required
          />
        </div>
        <div>
          <label htmlFor="excelFile">Excel File:</label>
          <input
            type="file"
            id="excelFile"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
      {verificationResult && (
        <div className={`result ${verificationResult.includes('successfully') ? 'success' : 'error'}`}>
          {verificationResult}
        </div>
      )}
    </div>
  );
};

export default MobileVerification; 