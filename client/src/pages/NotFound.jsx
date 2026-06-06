/**
 * src/pages/NotFound.jsx — 404 page
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <Leaf size={48} className="text-green-500 mb-4"/>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">404</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Yeh page nahi mila, yaar.</p>
      <Link to="/" className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors">
        Go Home
      </Link>
    </div>
  )
}
