import React from 'react';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm px-6 py-4">
        <h1 className="text-2xl font-bold text-blue-600">ShiftSync</h1>
      </header>
      <main className="p-6">
        <Routes>
          <Route path="/" element={<p>Welcome to ShiftSync</p>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
