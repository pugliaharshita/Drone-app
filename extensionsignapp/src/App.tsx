import React from 'react';
import { ExtensionProvider } from '@docusign/extension-hooks';
import SSNVerification from './components/SSNVerification';

const App: React.FC = () => {
  const handleVerification = (verified: boolean) => {
    console.log('Verification result:', verified);
  };

  return (
    <ExtensionProvider>
      <div className="app">
        <SSNVerification onVerify={handleVerification} />
      </div>
    </ExtensionProvider>
  );
};

export default App; 