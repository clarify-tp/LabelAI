/**
 * src/pages/Profile.jsx
 * ======================
 * User profile page — view/edit health conditions, allergies, BMI.
 * BMI is calculated via the Flask /api/profile/bmi endpoint (calculate_bmi tool).
 */
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { User, Activity, Heart, AlertCircle, Save } from 'lucide-react'
import api from '../configs/api'
import toast from 'react-hot-toast'
import { setProfile } from '../store/slices/authSlice'

const CONDITIONS = ['diabetes','hypertension','high_cholesterol','obesity','heart_disease','thyroid','gout','gluten_intolerance','lactose_intolerance','pcos','pregnancy']
const ALLERGIES  = ['milk','gluten','soy','peanut','tree_nuts','eggs','fish','shellfish']

export default function Profile() {
  const dispatch = useDispatch()
  const { user, profile } = useSelector(s => s.auth)
  const [form, setForm] = useState({
    age: '', height_cm: '', weight_kg: '',
    conditions: [], allergies: [],
    diet_type: 'none', activity_level: 'moderate',
  })
  const [bmi, setBmi] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        age:            profile.age || '',
        height_cm:      profile.height_cm || '',
        weight_kg:      profile.weight_kg || '',
        conditions:     profile.conditions || [],
        allergies:      profile.allergies || [],
        diet_type:      profile.diet_type || 'none',
        activity_level: profile.activity_level || 'moderate',
      })
      if (profile.bmi) setBmi({ bmi: profile.bmi, indian_category: profile.bmi_category_indian })
    }
  }, [profile])

  const toggleItem = (key, val) => {
    setForm(p => ({
      ...p, [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val]
    }))
  }

  const calcBMI = async () => {
    if (!form.height_cm || !form.weight_kg) { toast.error('Enter height and weight first'); return }
    try {
      const { data } = await api.get(`/api/profile/bmi?height_cm=${form.height_cm}&weight_kg=${form.weight_kg}`)
      setBmi(data); toast.success(`BMI: ${data.bmi} (${data.indian_category})`)
    } catch { toast.error('BMI calculation failed') }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/api/profile', form)
      dispatch(setProfile(data))
      toast.success('Profile saved!')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <User size={22} className="text-green-500"/> My Profile
      </h1>

      {/* BMI card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2"><Activity size={15}/>Body Metrics</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[['Age', 'age', 'number'], ['Height (cm)', 'height_cm', 'number'], ['Weight (kg)', 'weight_kg', 'number']].map(([label, key, type]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
              </div>
            ))}
          </div>
          <button onClick={calcBMI} className="text-sm text-green-600 dark:text-green-400 hover:underline">Calculate BMI →</button>
          {bmi && (
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-sm">
              <span className="font-semibold text-green-700 dark:text-green-400">BMI: {bmi.bmi}</span>
              <span className="text-green-600 dark:text-green-500 ml-2">({bmi.indian_category} — Indian ICMR standard)</span>
            </div>
          )}
        </div>
      </div>

      {/* Conditions */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2"><Heart size={15}/>Health Conditions</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Used to personalise scoring and chatbot advice</p>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {CONDITIONS.map(c => (
            <button key={c} onClick={() => toggleItem('conditions', c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                form.conditions.includes(c)
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700'
              }`}>
              {c.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2"><AlertCircle size={15}/>Food Allergies</h2>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {ALLERGIES.map(a => (
            <button key={a} onClick={() => toggleItem('allergies', a)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                form.allergies.includes(a)
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-amber-300'
              }`}>
              {a.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
        <Save size={16}/> {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  )
}
