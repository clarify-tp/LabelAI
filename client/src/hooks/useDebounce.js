/**
 * src/hooks/useDebounce.js
 * Delays updating a value until the user stops typing.
 * Usage: const debouncedSearch = useDebounce(searchTerm, 400)
 */
import { useState, useEffect } from 'react'

export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
