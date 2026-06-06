/**
 * src/pages/Chat.jsx  (FIXED)
 * ============================
 * Fixes:
 *   1. Product chips now pass the barcode correctly to sendChatMessage.
 *      Previously activeBarcode was set in Redux but the sendChatMessage
 *      thunk always read from the stale closure — the barcode never reached
 *      the Flask backend.
 *      Fix: pass productBarcode directly from local state, not Redux,
 *           and sync Redux activeBarcode as a side effect only.
 *
 *   2. When a chip is selected, show which product is active so the
 *      user knows the context switched.
 *
 *   3. Chat input placeholder and suggestion questions updated to be
 *      more natural.
 */
import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Send, Bot, User, AlertCircle, History, CheckCircle2 } from 'lucide-react'
import { sendChatMessage, setActiveBarcode, clearChat } from '../store/slices/chatSlice'

export default function Chat() {
  const dispatch   = useDispatch()
  const { history, loading, error } = useSelector(s => s.chat)
  const activeBarcode = useSelector(s => s.chat.activeBarcode)
  const scanHistory   = useSelector(s => s.scan.history)
  const recentScan    = useSelector(s => s.scan.current)

  const [input,      setInput]      = useState('')
  // Local barcode state — source of truth for the current API call
  const [localBarcode, setLocalBarcode] = useState(null)
  const bottomRef = useRef(null)

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  // Initialise local barcode from Redux / recent scan on mount
  useEffect(() => {
    const init = activeBarcode || recentScan?.product?.barcode || null
    setLocalBarcode(init)
    if (init && !activeBarcode) dispatch(setActiveBarcode(init))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Build recent products list for chips
  const recentProducts = [
    ...(recentScan?.product
      ? [{ barcode: recentScan.product.barcode, name: recentScan.product.product_name }]
      : []),
    ...scanHistory.slice(0, 4).map(s => ({ barcode: s.barcode, name: s.product_name })),
  ]
    .filter((p, i, arr) => p.barcode && arr.findIndex(x => x.barcode === p.barcode) === i)
    .slice(0, 5)

  // Active product name (for display)
  const activeProduct = recentProducts.find(p => p.barcode === localBarcode)

  const handleChipSelect = (barcode) => {
    setLocalBarcode(barcode)
    dispatch(setActiveBarcode(barcode))
  }

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    // Pass localBarcode directly — this is what reaches the Flask backend
    await dispatch(sendChatMessage({
      message:       msg,
      productBarcode: localBarcode,   // ← FIX: use local state, not stale Redux
      history:       history,
    }))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const SUGGESTIONS = [
    'Is this product safe for my child?',
    'What is the worst ingredient here?',
    'Can a diabetic person eat this?',
    'How often can I eat this?',
  ]

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Label Padhega AI Chat
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ask anything about your scanned products
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            dispatch(clearChat())
            setLocalBarcode(null)
          }}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          Clear chat
        </button>
      </div>

      {/* Product chips */}
      {recentProducts.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
            <History size={11} /> Select product context:
          </p>
          <div className="flex flex-wrap gap-2">
            {recentProducts.map(p => {
              const isActive = localBarcode === p.barcode
              return (
                <button
                  key={p.barcode}
                  onClick={() => handleChipSelect(p.barcode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-400 dark:hover:border-green-600'
                  }`}
                >
                  {isActive && <CheckCircle2 size={11} />}
                  {(p.name || 'Product').slice(0, 22)}
                </button>
              )
            })}
            {/* "No product" option */}
            <button
              onClick={() => { setLocalBarcode(null); dispatch(setActiveBarcode(null)) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                localBarcode === null
                  ? 'bg-gray-600 text-white border-gray-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
              }`}
            >
              General question
            </button>
          </div>

          {/* Active context indicator */}
          {localBarcode && activeProduct && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={11} />
              Talking about: <span className="font-medium">{activeProduct.name}</span>
            </p>
          )}
          {!localBarcode && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              No product selected — select one above for product-specific advice.
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {history.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Bot size={36} className="mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {localBarcode
                ? `Ask me anything about ${activeProduct?.name || 'this product'}`
                : 'Select a product above, then ask your question'}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {SUGGESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
              msg.role === 'user'
                ? 'bg-green-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              {msg.role === 'user'
                ? <User size={13} className="text-white" />
                : <Bot size={13} className="text-gray-600 dark:text-gray-400" />}
            </div>
            <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-green-600 text-white rounded-tr-sm'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Bot size={13} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm border border-gray-200 dark:border-gray-700">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-center text-red-500 dark:text-red-400">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              localBarcode
                ? `Ask about ${activeProduct?.name || 'this product'}…`
                : 'Select a product above first, or ask a general question…'
            }
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-10 h-10 flex-shrink-0 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white flex items-center justify-center transition-colors"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>Yeh medical advice nahi hai. Apne doctor se confirm karo.</span>
        </div>
      </div>
    </div>
  )
}