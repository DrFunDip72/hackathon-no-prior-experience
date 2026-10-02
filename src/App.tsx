import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SessionProvider } from './contexts/SessionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { Profile } from './pages/Profile';
import { Events } from './pages/Events';
import { Connect } from './pages/Connect';

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          {/* Accounts are created at the end of onboarding, once the profile exists. */}
          <Route path="/signup" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
          <Route path="/connect" element={<ProtectedRoute><Connect /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: 'Inter, system-ui, sans-serif' } }} />
    </SessionProvider>);

}
