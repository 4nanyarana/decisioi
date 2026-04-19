import React, { useState } from 'react';

export default function InputArea({ options, onAdd }) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    onAdd(inputValue);
    setInputValue(''); // clear input
  };

  return (
    <div className="input-section">
      <h3>Add your options</h3>
      <div>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. Tacos"
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      {/* show current options */}
      <ul className="options-list">
        {options.map((opt, i) => (
          <li key={i}>{opt}</li>
        ))}
      </ul>
    </div>
  );
}
