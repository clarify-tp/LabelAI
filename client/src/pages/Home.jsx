/**
 * src/pages/Home.jsx
 * ===================
 * Main scan page — clean, professional, foody theme.
 * Tabs: Camera (live) · Barcode · Upload Photo · Paste Link.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import {
  ScanLine, Image, Link2, Upload, Camera,
  Star, Shield, Brain, Sparkles,
  TrendingUp, CheckCircle, Loader2, AlertTriangle
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { scanByBarcode, scanByPhoto, scanByLink } from '../store/slices/scanSlice'
import { track } from '../utils/analytics'
import CategoryPicker from '../components/ui/CategoryPicker'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CameraCapture from '../components/scan/CameraCapture'

const TABS = [
  { id: 'camera',  label: 'Live Camera',  icon: Camera },
  { id: 'barcode', label: 'Scan Barcode', icon: ScanLine },
  { id: 'photo',   label: 'Upload Photo', icon: Image },
  { id: 'link',    label: 'Paste Link',   icon: Link2 },
]

const FEATURES = [
  {
    icon: Shield,
    title: 'FSSAI Verified',
    desc: 'Every ingredient checked against the official Indian additives database',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20'
  },
  {
    icon: TrendingUp,
    title: 'India-Specific',
    desc: 'ICMR RDA values, not Western thresholds',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20'
  },
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    desc: 'Science-backed scoring using the FSSAI additives database and ICMR nutrition thresholds',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20'
  }
]

const PHOTO_TIPS = [
  'Photograph the INGREDIENTS LIST panel, not the front',
  "Ensure all text fits in frame — don't cut off edges",
  'Good lighting — no shadows or flash glare',
  'Hold steady — blurry = poor results',
]

const fmtSize = (bytes) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`

export default function Home() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading } = useSelector(s => s.scan)

  const [tab, setTab] = useState('camera')
  const [category, setCategory] = useState('general')
  const [barcode, setBarcode] = useState('')
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [imageB64, setImageB64] = useState(null)
  const [imageMimeType, setImageMimeType] = useState('image/jpeg')
  const [fileInfo, setFileInfo] = useState(null)   // { name, size, type }
  const [isFocused, setIsFocused] = useState(false)
  const [lowConfidence, setLowConfidence] = useState(null) // { message, tips }

  const heroRef = useRef(null)
  const cardsRef = useRef(null)
  const featuresRef = useRef(null)
  const tabRefs = useRef([])
  const scanBtnRef = useRef(null)
  const floatingRef = useRef(null)

  // GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(heroRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo('.hero-badge', { opacity: 0, y: -10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5 }, '-=0.4')
        .fromTo('.hero-title', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
        .fromTo('.hero-subtitle', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
        .fromTo('.hero-stats', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.2')
        .fromTo(cardsRef.current, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
        .fromTo('.feature-card', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
    })
    return () => ctx.revert()
  }, [])

  // Floating decorative elements
  useEffect(() => {
    if (!floatingRef.current) return
    const items = floatingRef.current.querySelectorAll('.float-item')
    items.forEach((el, i) => {
      gsap.to(el, { y: -12, rotation: i % 2 === 0 ? 5 : -5, duration: 2.5 + (i * 0.3), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.4 })
    })
    return () => { gsap.killTweensOf(items) }
  }, [])

  // Tab switch animation + analytics
  useEffect(() => {
    const content = document.querySelector('.tab-content')
    if (content) {
      gsap.fromTo(content, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' })
    }
    track('tab-switch', { tab })
  }, [tab])

  // Dropzone for photo upload
  const onDrop = useCallback((files) => {
    const file = files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Please upload an image under 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]
      setImageB64(base64)
      setPreview(e.target.result)
      setImageMimeType(file.type || 'image/jpeg')
      setFileInfo({ name: file.name, size: file.size, type: file.type || 'image' })
      setLowConfidence(null)
      toast.success('Photo ready!')
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsDataURL(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic', '.heif', '.bmp', '.tiff'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  })

  // Shared photo submit (used by upload + camera)
  const submitPhoto = async (image, mime) => {
    setLowConfidence(null)
    const loadingToast = toast.loading('Analyzing label… 🔬')
    const result = await dispatch(scanByPhoto({ image, category, mime_type: mime }))
    toast.dismiss(loadingToast)
    if (result.meta.requestStatus === 'fulfilled') {
      track('scan-completed', { method: 'photo', score: result.payload?.score, category })
      toast.success('Done! Redirecting…', { icon: '✨' })
      navigate('/result')
    } else {
      const payload = result.payload
      if (payload?.status === 'LOW_CONFIDENCE') {
        setLowConfidence({ message: payload.message, tips: payload.tips || PHOTO_TIPS })
      } else {
        toast.error('Failed to analyze. Please try again.', { icon: '😞' })
      }
    }
  }

  const handleCameraCapture = (base64, mime) => {
    setImageB64(base64)
    setImageMimeType(mime)
    setPreview(`data:${mime};base64,${base64}`)
    submitPhoto(base64, mime)
  }

  const handleScan = async () => {
    if (!category) { toast.error('Please select a category first', { icon: '🍽️' }); return }

    if (tab === 'barcode') {
      if (!barcode.trim()) { toast.error('Enter a barcode number', { icon: '📱' }); return }
      if (!/^\d{8,14}$/.test(barcode.trim())) { toast.error('Please enter a valid 8-14 digit barcode'); return }
      const loadingToast = toast.loading('Scanning product… 🍽️')
      const result = await dispatch(scanByBarcode({ barcode: barcode.trim(), category }))
      toast.dismiss(loadingToast)
      if (result.meta.requestStatus === 'fulfilled') {
        track('scan-completed', { method: 'barcode', score: result.payload?.score, category })
        toast.success('Product scanned! Redirecting…', { icon: '✨' })
        navigate('/result')
      } else {
        toast.error('Failed to scan product. Please try again.', { icon: '😞' })
      }
      return
    }

    if (tab === 'photo') {
      if (!imageB64) { toast.error('Please upload a photo of the product label', { icon: '📸' }); return }
      submitPhoto(imageB64, imageMimeType)
      return
    }

    // link
    if (!url.trim()) { toast.error('Paste a Blinkit or BigBasket product URL', { icon: '🔗' }); return }
    if (!url.includes('blinkit.com') && !url.includes('bigbasket.com')) {
      toast.error('Only Blinkit and BigBasket links are supported'); return
    }
    const loadingToast = toast.loading('Scanning product… 🍽️')
    const result = await dispatch(scanByLink({ url: url.trim(), category }))
    toast.dismiss(loadingToast)
    if (result.meta.requestStatus === 'fulfilled') {
      track('scan-completed', { method: 'link', score: result.payload?.score, category })
      toast.success('Product scanned! Redirecting…', { icon: '✨' })
      navigate('/result')
    } else {
      toast.error('Failed to scan product. Please try again.', { icon: '😞' })
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-gray-950">
      <LoadingSpinner rotating />
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950 relative">
      <div ref={floatingRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        {['🍎', '🥑', '🥦', '🍅', '🥕', '🍊', '🍇', '🥝'].map((emoji, i) => (
          <div key={i} className="float-item absolute text-2xl opacity-[0.06] dark:opacity-[0.04] select-none"
            style={{ left: `${10 + (i * 11)}%`, top: `${15 + ((i * 7) % 60)}%` }}>
            {emoji}
          </div>
        ))}
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Hero */}
        <div ref={heroRef} className="text-center space-y-5">
          <div className="hero-badge inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-medium">
            <Sparkles size={14} />
            India's Smartest Food Scanner · 100% Free
          </div>

          <h1 className="hero-title text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Label Padhega <span className="text-emerald-600 dark:text-emerald-400">AI</span>
          </h1>

          <p className="hero-subtitle text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            India's AI food label scanner. Scan any product to get a score, an honest verdict,
            and a clear breakdown of what's really inside.
          </p>

          <div className="hero-stats flex justify-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800/60 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
              <CheckCircle size={12} className="text-emerald-500" />
              FSSAI-backed
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800/60 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
              <Shield size={12} className="text-amber-500" />
              No ads · No tracking
            </div>
          </div>
        </div>

        {/* Category Picker */}
        <div className="bg-white dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <CategoryPicker value={category} onChange={setCategory} />
        </div>

        {/* Main Input Card */}
        <div ref={cardsRef} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto">
            {TABS.map((t, idx) => {
              const Icon = t.icon
              const isActive = tab === t.id
              return (
                <button
                  key={t.id}
                  ref={el => tabRefs.current[idx] = el}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors relative ${
                    isActive ? 'text-emerald-700 dark:text-emerald-400'
                             : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-emerald-500 rounded-full" />}
                  <Icon size={16} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              )
            })}
          </div>

          <div className="p-5 md:p-6 space-y-4 tab-content">
            {/* Low confidence tip card */}
            {lowConfidence && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={15} /> {lowConfidence.message}
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                  {lowConfidence.tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}

            {tab === 'camera' && (
              <CameraCapture onCapture={handleCameraCapture} />
            )}

            {tab === 'barcode' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <ScanLine size={15} className="text-gray-400" /> Enter barcode number
                </label>
                <input
                  type="text" inputMode="numeric" placeholder="e.g. 8901058017687"
                  value={barcode} onChange={e => setBarcode(e.target.value)}
                  onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  className={`w-full px-4 py-3.5 rounded-lg border transition-all text-base ${
                    isFocused ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-900/30'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none`}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Camera size={11} /> Find the EAN-13 barcode printed on the product packaging
                </p>
              </div>
            )}

            {tab === 'photo' && (
              <div className="space-y-3">
                <div {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 md:p-8 text-center cursor-pointer transition-all ${
                    isDragActive ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'
                                 : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}>
                  <input {...getInputProps()} />
                  {preview ? (
                    <div className="space-y-3">
                      <img src={preview} alt="Label preview" className="max-h-40 mx-auto rounded-md object-contain" />
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">✓ Photo ready for scan</p>
                      {fileInfo && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {fileInfo.name} · {fmtSize(fileInfo.size)} · {(fileInfo.type.split('/')[1] || 'image').toUpperCase()}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500">Tap or click to change photo</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center">
                        <Upload size={24} className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Drop a photo here, or <span className="text-emerald-600 dark:text-emerald-400 underline font-medium">click to browse</span>
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
                        {['JPEG', 'PNG', 'WEBP', 'HEIC', 'BMP'].map(f => (
                          <span key={f} className="bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!preview && (
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">📸 For best results:</p>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                      {PHOTO_TIPS.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === 'link' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Link2 size={15} className="text-gray-400" /> Paste product URL
                </label>
                <input
                  type="url" placeholder="https://blinkit.com/product/..."
                  value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  className="w-full px-4 py-3.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Shield size={11} /> Supports Blinkit and BigBasket product links only
                </p>
              </div>
            )}

            {/* Scan button — hidden on camera tab (camera has its own capture button) */}
            {tab !== 'camera' && (
              <button
                ref={scanBtnRef}
                onClick={handleScan}
                disabled={loading}
                className="w-full py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</>
                         : <><ScanLine size={18} /> Analyze Label</>}
              </button>
            )}
          </div>
        </div>

        {/* Features */}
        <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title}
                className="feature-card group bg-white dark:bg-gray-800/80 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <div className="space-y-3">
                  <div className={`w-10 h-10 mx-auto rounded-lg ${feature.bg} flex items-center justify-center`}>
                    <Icon size={20} className={feature.color} />
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{feature.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Trust Badge */}
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1"><Shield size={11} /> Secure & Private</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1"><Sparkles size={11} /> Instant Results</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1"><CheckCircle size={11} /> 100% Free</span>
          </div>
        </div>
      </div>
    </div>
  )
}
