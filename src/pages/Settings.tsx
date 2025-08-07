import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  Target
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';

export default function Settings() {
  const { state } = useTradingContext();
  const [activeTab, setActiveTab] = useState('profile');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
    <div className={`min-h-screen bg-futuristic text-slate-100 p-6 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-6xl mx-auto">
        {/* V2: Enhanced Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gradient flex items-center">
              <SettingsIcon className="w-8 h-8 mr-3 text-indigo-400" />
              System Settings
            </h1>
            <p className="text-slate-400 text-lg">
              Configure your account, security, notifications, and system preferences
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {isDirty && (
              <div className="px-4 py-2 rounded-xl text-sm font-semibold glass text-yellow-400 border border-yellow-500/30">
                ⚠️ Unsaved Changes
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="btn-futuristic px-6 py-3 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </motion.div>

        {/* V2: Enhanced Tab Navigation */}
        <motion.div 
          className="flex space-x-2 glass p-2 rounded-xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* V2: Enhanced Tab Content */}
        <motion.div 
          className="card-futuristic p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gradient mb-6">Profile Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleInputChange('profile', 'name', e.target.value)}
                    className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange('profile', 'email', e.target.value)}
                    className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                    className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Timezone</label>
                  <select
                    value={profileData.timezone}
                    onChange={(e) => handleInputChange('profile', 'timezone', e.target.value)}
                    className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                  >
                    <option value="UTC-5">UTC-5 (Eastern Time)</option>
                    <option value="UTC-8">UTC-8 (Pacific Time)</option>
                    <option value="UTC+0">UTC+0 (GMT)</option>
                    <option value="UTC+1">UTC+1 (Central European)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gradient mb-6">Security Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 glass rounded-xl border border-white/10">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
                    <p className="text-slate-400 text-sm">Add an extra layer of security to your account</p>
                  </div>
                  <button
                    onClick={() => handleInputChange('security', 'twoFactorEnabled', !securityData.twoFactorEnabled)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      securityData.twoFactorEnabled
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : 'glass text-slate-400 hover:text-white'
                    }`}
                  >
                    {securityData.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={securityData.sessionTimeout}
                      onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">Max Login Attempts</label>
                    <input
                      type="number"
                      value={securityData.maxLoginAttempts}
                      onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                      className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gradient mb-6">Notification Preferences</h2>
              
              <div className="space-y-4">
                {Object.entries(notificationData).map(([key, value]) => (
                  <motion.div 
                    key={key}
                    className="flex items-center justify-between p-4 glass rounded-xl border border-white/10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Receive notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleInputChange('notifications', key, !value)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                        value
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : 'glass text-slate-400 hover:text-white'
                      }`}
                    >
                      {value ? 'Enabled' : 'Disabled'}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gradient mb-6">System Configuration</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 glass rounded-xl border border-white/10">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Auto Backup</h3>
                    <p className="text-slate-400 text-sm">Automatically backup your trading data</p>
                  </div>
                  <button
                    onClick={() => handleInputChange('system', 'autoBackup', !systemData.autoBackup)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      systemData.autoBackup
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : 'glass text-slate-400 hover:text-white'
                    }`}
                  >
                    {systemData.autoBackup ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">Backup Frequency</label>
                    <select
                      value={systemData.backupFrequency}
                      onChange={(e) => handleInputChange('system', 'backupFrequency', e.target.value)}
                      className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">Log Retention (days)</label>
                    <input
                      type="number"
                      value={systemData.logRetention}
                      onChange={(e) => handleInputChange('system', 'logRetention', parseInt(e.target.value))}
                      className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 glass rounded-xl border border-white/10">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Performance Mode</h3>
                    <p className="text-slate-400 text-sm">Optimize for maximum trading performance</p>
                  </div>
                  <button
                    onClick={() => handleInputChange('system', 'performanceMode', !systemData.performanceMode)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      systemData.performanceMode
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : 'glass text-slate-400 hover:text-white'
                    }`}
                  >
                    {systemData.performanceMode ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}