import React from 'react';
import { RegistrationForm, RegistrationFormData } from './components/auth/RegistrationForm';

function App() {
  const handleRegistration = async (data: RegistrationFormData) => {
    console.log('Registration data:', data);
    
    try {
      // TODO: Implement API call to backend registration endpoint
      const response = await fetch('http://localhost:3002/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const result = await response.json();
      console.log('Registration successful:', result);
      
      // TODO: Handle successful registration (redirect, store token, etc.)
    } catch (error) {
      console.error('Registration error:', error);
      // TODO: Handle registration error (show error message)
    }
  };

  return (
    <div className="App">
      <RegistrationForm onSubmit={handleRegistration} />
    </div>
  );
}

export default App;
