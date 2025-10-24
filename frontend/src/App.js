import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Forecast from './pages/Forecast';
import EmergencyResources from './pages/EmergencyResources';
import HurricaneSimulation from './pages/HurricaneSimulation';
import Chat from './pages/Chat';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/emergency-resources" element={<EmergencyResources />} />
          <Route path="/hurricane-simulation" element={<HurricaneSimulation />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
