import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mercor Time Tracker
          </h1>
          <p className="text-gray-600 mb-8">
            Welcome to the employee onboarding portal
          </p>
          
          <div className="space-y-4">
            <Link
              href="/verify"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium block text-center"
            >
              Verify Your Account
            </Link>
            
            <div className="text-sm text-gray-500">
              Already verified? Download the desktop app from your verification email.
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Getting Started
            </h2>
            <div className="text-left space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">1</span>
                <span>Check your email for the verification link</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">2</span>
                <span>Click the verification link to activate your account</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">3</span>
                <span>Download and install the desktop time tracking app</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">4</span>
                <span>Start tracking your time on assigned projects</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}