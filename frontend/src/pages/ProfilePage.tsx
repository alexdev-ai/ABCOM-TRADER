import React, { useState, useEffect } from 'react';
import { ProfileForm } from '../components/profile/ProfileForm';
import { ProfileStats } from '../components/profile/ProfileStats';
import { profileApi, ProfileData, ProfileStats as ProfileStatsType } from '../services/profileApi';
import { useAuthStore } from '../stores/authStore';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');
  const { user } = useAuthStore();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [profileData, statsData] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getProfileStats()
      ]);
      
      setProfile(profileData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: ProfileData) => {
    setProfile(updatedProfile);
    // Refresh stats as they might have changed
    try {
      const statsData = await profileApi.getProfileStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadProfileData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">No profile data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and view trading statistics</p>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-gray-600">{profile.email}</p>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.kycStatus === 'verified' 
                    ? 'bg-green-100 text-green-800'
                    : profile.kycStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  KYC: {profile.kycStatus.charAt(0).toUpperCase() + profile.kycStatus.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Trading Statistics
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'profile' ? (
          <ProfileForm profile={profile} onUpdate={handleProfileUpdate} />
        ) : (
          <ProfileStats stats={stats} />
        )}
      </div>
    </div>
  );
};
