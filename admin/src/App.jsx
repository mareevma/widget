import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import Layout from './components/Layout';
import Categories from './pages/Categories';
import Fits from './pages/Fits';
import Materials from './pages/Materials';
import Pricing from './pages/Pricing';
import PrintMethods from './pages/PrintMethods';
import QuantityTiers from './pages/QuantityTiers';
import Palettes from './pages/Palettes';
import Orders from './pages/Orders';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Загрузка...</div>;

  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/categories" replace />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/fits" element={<Fits />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/print-methods" element={<PrintMethods />} />
          <Route path="/quantity-tiers" element={<QuantityTiers />} />
          <Route path="/palettes" element={<Palettes />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
