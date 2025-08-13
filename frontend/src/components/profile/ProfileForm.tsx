import React, { useState } from 'react';
import { ProfileData, ProfileUpdateRequest, profileApi } from '../../services/profileApi';

interface ProfileFormProps {
  profile: ProfileData;
  onUpdate: (updatedProfile: ProfileData) => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState<ProfileUpdateRequest>({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phoneNumber: profile.phoneNumber,
    riskTolerance: profile.riskTolerance as 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof ProfileUpdateRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear success/error states when user starts typing
    if (success) setSuccess(false);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const updatedProfile = await profileApi.updateProfile(formData);
      onUpdate(updatedProfile);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    return (
      formData.firstName !== profile.firstName ||
      formData.lastName !== profile.lastName ||
      formData.phoneNumber !== profile.phoneNumber ||
      formData.riskTolerance !== profile.riskTolerance
    );
  };

  const getRiskToleranceDescription = (tolerance: string) => {
    switch (tolerance) {
      case 'CONSERVATIVE':
        return 'Lower risk, more stable returns';
      case 'MODERATE':
        return 'Balanced risk and return profile';
      case 'AGGRESSIVE':
        return 'Higher risk, potentially higher returns';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Editable Information */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={2}
                maxLength={50}
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={2}
                maxLength={50}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Risk Tolerance */}
            <div>
              <label htmlFor="riskTolerance" className="block text-sm font-medium text-gray-700 mb-2">
                Risk Tolerance
              </label>
              <select
                id="riskTolerance"
                value={formData.riskTolerance}
                onChange={(e) => handleInputChange('riskTolerance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CONSERVATIVE">Conservative</option>
                <option value="MODERATE">Moderate</option>
                <option value="AGGRESSIVE">Aggressive</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {getRiskToleranceDescription(formData.riskTolerance)}
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex-1">
              {success && (
                <div className="text-green-600 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Profile updated successfully!
                </div>
              )}
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !hasChanges()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading || !hasChanges()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Read-only Information */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
              {profile.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
              {formatDate(profile.dateOfBirth)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Created</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
              {formatDate(profile.createdAt)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Updated</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
              {formatDate(profile.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
