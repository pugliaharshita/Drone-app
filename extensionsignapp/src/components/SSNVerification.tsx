import React, { useState } from 'react';
import { useExtensionData, useExtensionTrigger } from '@docusign/extension-hooks';
import { Button, TextField, Alert } from '@docusign/extension-ui';

interface SSNVerificationProps {
  onVerify: (verified: boolean) => void;
}

const SSNVerification: React.FC<SSNVerificationProps> = ({ onVerify }) => {
  const [ssn, setSSN] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { data } = useExtensionData();
  const { trigger } = useExtensionTrigger();

  const validateSSN = (value: string): boolean => {
    const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
    return ssnRegex.test(value);
  };

  const formatSSN = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as XXX-XX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSSN(e.target.value);
    setSSN(formatted);
    setError(null);
  };

  const handleVerify = async () => {
    if (!validateSSN(ssn)) {
      setError('Please enter a valid SSN in the format XXX-XX-XXXX');
      return;
    }

    setLoading(true);
    try {
      // Here you would typically make an API call to verify the SSN
      // For demo purposes, we'll simulate a verification
      const response = await simulateVerification(ssn);
      
      if (response.verified) {
        await trigger({
          type: 'verify',
          status: 'completed',
          message: 'SSN verification successful'
        });
        onVerify(true);
      } else {
        setError('SSN verification failed. Please check the number and try again.');
        await trigger({
          type: 'verify',
          status: 'failed',
          message: 'SSN verification failed'
        });
        onVerify(false);
      }
    } catch (err) {
      setError('An error occurred during verification. Please try again.');
      await trigger({
        type: 'verify',
        status: 'failed',
        message: 'Verification error occurred'
      });
      onVerify(false);
    } finally {
      setLoading(false);
    }
  };

  // Simulate SSN verification (replace with actual API call)
  const simulateVerification = async (ssn: string): Promise<{ verified: boolean }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo purposes, verify if SSN matches a test pattern
        resolve({ verified: ssn === '123-45-6789' });
      }, 1000);
    });
  };

  return (
    <div className="ssn-verification">
      <h2>SSN Verification Required</h2>
      <p>Please enter your Social Security Number to proceed with signing.</p>
      
      <TextField
        label="Social Security Number"
        value={ssn}
        onChange={handleSSNChange}
        placeholder="XXX-XX-XXXX"
        error={error}
        disabled={loading}
      />

      {error && (
        <Alert type="error" message={error} />
      )}

      <Button
        onClick={handleVerify}
        loading={loading}
        disabled={!ssn || loading}
      >
        Verify SSN
      </Button>
    </div>
  );
};

export default SSNVerification; 