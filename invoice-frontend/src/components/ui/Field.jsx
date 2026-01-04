// src/components/ui/Field.jsx
import React from 'react'

export default function Field({
  label,
  id,
  children,
  help,
  required = false,
  className = '',
  error,
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
      )}
      {children}
      {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
