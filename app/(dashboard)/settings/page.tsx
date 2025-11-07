import { Settings as SettingsIcon, User, CreditCard, Users as TeamIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-500">Manage your account, billing, and connections.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Account Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Account Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                defaultValue="Brody"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                defaultValue="brodrickharrison@gmail.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800">
              Save Changes
            </button>
          </div>
        </div>

        {/* Bank & Card Connections */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Bank & Card Connections</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">This feature is coming soon. Connect your bank to automate expense tracking.</p>
          <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
            Connect Bank Account
          </button>
        </div>

        {/* Team Management */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TeamIcon className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Team Management</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Your current role is <span className="font-medium">admin</span>. Inviting collaborators is coming soon.
          </p>
          <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
            Invite Team Member
          </button>
        </div>
      </div>
    </div>
  );
}
