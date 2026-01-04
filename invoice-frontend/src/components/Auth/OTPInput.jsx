// src/components/Auth/OTPInput.jsx
import React, { useEffect, useRef } from 'react';

export default function OTPInput({ length = 6, value, onChange }) {
  const inputsRef = useRef([]);

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      updateAtIndex(index, '');
      return;
    }
    const char = val.slice(-1);
    updateAtIndex(index, char);
    if (index < length - 1 && char) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const updateAtIndex = (index, char) => {
    const arr = value.split('');
    arr[index] = char;
    onChange(arr.join(''));
  };

  useEffect(() => {
    if (value.length !== length) {
      onChange((value || '').padEnd(length, ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length]);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          ref={(el) => (inputsRef.current[idx] = el)}
          style={{
            width: '3rem',
            height: '3rem',
            fontSize: '1.5rem',
            textAlign: 'center',
            borderRadius: '0.5rem',
            border: '1px solid #ccc',
          }}
        />
      ))}
    </div>
  );
}
