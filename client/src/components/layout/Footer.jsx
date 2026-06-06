/**
 * src/components/layout/Footer.jsx
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { Leaf, Heart, ScanLine, GitCompare, History } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Leaf size={14} className="text-green-500"/>
            <span>Label Padhega AI — India padhega, India samjhega</span>
          </div>
          <div className="flex items-center gap-2">
            <span>© {currentYear}</span>
            <span>•</span>
            <Link to="/privacy" className="hover:text-orange-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-orange-600 transition-colors">Terms</Link>
            <a href="https://www.youtube.com/@Foodpharmer" target="_blank" rel="noopener noreferrer" className="hover:text-orange-600 transition-colors">
              Food Pharmer
            </a>
            <span className="flex items-center gap-1">
              Made with <Heart size={11} className="text-red-400"/> for India
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}