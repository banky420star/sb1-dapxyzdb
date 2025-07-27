import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Database,
  Globe,
  Key,
  Trash2,
  Save,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';

export default function Settings() {
  const { state } = useTradingContext();
  const [activeTab, setActiveTab] = useState('profile');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [profileData, setProfileData] = useState({
    name: 'John Doe',
    email: 'john@methtrader.xyz',
    phone: '+1 (555) 123-4567',
    timezone: 'UTC-5',
    language: 'en'
  });

  const [securityData, setSecurityData] = useState({
    twoFactorEnabled: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90
  });

  const [notificationData, setNotificationData] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    tradeConfirmations: true,
    riskAlerts: true,
    systemUpdates: false
  });

  const [systemData, setSystemData] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    logRetention: 30,
    performanceMode: false,
    debugMode: false
  });

  const handleInputChange = (section: string, field: string, value: any) => {
    setIsDirty(true);
    switch (section) {
      case 'profile':
        setProfileData(prev => ({ ...prev, [field]: value }));
        break;
      case 'security':
        setSecurityData(prev => ({ ...prev, [field]: value }));
        break;
      case 'notifications':
        setNotificationData(prev => ({ ...prev, [field]: value }));
        break;
      case 'system':
        setSystemData(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSaving(false);
    setIsDirty(false);
  };

  const handleReset = () => {
    // Reset to original values
    setIsDirty(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: Database }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 text-sm">
            Manage your account preferences and system configuration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isDirty && (
            <span className="text-sm text-yellow-400 flex items-center space-x-1">
              <AlertTriangle className="h-4 w-4" />
              <span>Unsaved changes</span>
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={!isDirty}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-surface rounded-lg p-4 border border-gray-700">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-surface rounded-lg p-6 border border-gray-700"
          >
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('profile', 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('profile', 'email', e.target.value)}
                      className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                      className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={profileData.timezone}
                      onChange={(e) => handleInputChange('profile', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="UTC-8">UTC-8 (PST)</option>
                      <option value="UTC-5">UTC-5 (EST)</option>
                      <option value="UTC+0">UTC+0 (GMT)</option>
                      <option value="UTC+1">UTC+1 (CET)</option>
                      <option value="UTC+8">UTC+8 (CST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      value={profileData.language}
                      onChange={(e) => handleInputChange('profile', 'language', e.target.value)}
                      className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Security Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-bg-deep rounded-lg border border-gray-600">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                          <p className="text-xs text-gray-400">Add an extra layer of security</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInputChange('security', 'twoFactorEnabled', !securityData.twoFactorEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          securityData.twoFactorEnabled ? 'bg-primary' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            securityData.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        value={securityData.sessionTimeout}
                        onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                        min="5"
                        max="480"
                        className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Login Attempts
                      </label>
                      <input
                        type="number"
                        value={securityData.maxLoginAttempts}
                        onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                        min="3"
                        max="10"
                        className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password Expiry (days)
                      </label>
                      <input
                        type="number"
                        value={securityData.passwordExpiry}
                        onChange={(e) => handleInputChange('security', 'passwordExpiry', parseInt(e.target.value))}
                        min="30"
                        max="365"
                        className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Email Notifications</h3>
                    {Object.entries(notificationData)
                      .filter(([key]) => key.includes('email') || key.includes('trade') || key.includes('risk'))
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-bg-deep rounded-lg border border-gray-600">
                          <span className="text-sm text-gray-300 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                          <button
                            onClick={() => handleInputChange('notifications', key, !value)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              value ? 'bg-accent' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                value ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Other Notifications</h3>
                    {Object.entries(notificationData)
                      .filter(([key]) => !key.includes('email') && !key.includes('trade') && !key.includes('risk'))
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-bg-deep rounded-lg border border-gray-600">
                          <span className="text-sm text-gray-300 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                          <button
                            onClick={() => handleInputChange('notifications', key, !value)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              value ? 'bg-accent' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                value ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">System Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-bg-deep rounded-lg border border-gray-600">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                          <Database className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Auto Backup</p>
                          <p className="text-xs text-gray-400">Automatically backup data</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInputChange('system', 'autoBackup', !systemData.autoBackup)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          systemData.autoBackup ? 'bg-accent' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            systemData.autoBackup ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Backup Frequency
                      </label>
                      <select
                        value={systemData.backupFrequency}
                        onChange={(e) => handleInputChange('system', 'backupFrequency', e.target.value)}
                        className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Log Retention (days)
                      </label>
                      <input
                        type="number"
                        value={systemData.logRetention}
                        onChange={(e) => handleInputChange('system', 'logRetention', parseInt(e.target.value))}
                        min="7"
                        max="365"
                        className="w-full px-3 py-2 bg-bg-deep border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-bg-deep rounded-lg border border-gray-600">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Performance Mode</p>
                          <p className="text-xs text-gray-400">Optimize for speed</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInputChange('system', 'performanceMode', !systemData.performanceMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          systemData.performanceMode ? 'bg-primary' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            systemData.performanceMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Danger Zone */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-surface rounded-lg p-6 border border-red-500/20"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
            <p className="text-sm text-gray-400">Irreversible and destructive actions</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-bg-deep rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Delete Account</h4>
              <Trash2 className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Permanently delete your account and all associated data
            </p>
            <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors">
              Delete Account
            </button>
          </div>

          <div className="p-4 bg-bg-deep rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Reset All Settings</h4>
              <RefreshCw className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Reset all settings to their default values
            </p>
            <button className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-lg transition-colors">
              Reset Settings
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}