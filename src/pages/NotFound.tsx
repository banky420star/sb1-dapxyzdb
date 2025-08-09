import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 pb-16 pt-10">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-gray-700 shadow-card mx-auto">
          <span className="text-2xl">🚧</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Page not found</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          The page you are looking for doesn’t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/dashboard" className="btn-futuristic">
            Go to Dashboard
          </Link>
          <Link to="/" className="px-6 py-3 rounded-lg font-semibold border border-gray-700 text-gray-200 hover:bg-gray-800/50 transition-colors">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}