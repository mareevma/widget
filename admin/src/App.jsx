import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Layout from './components/Layout';
const Login = lazy(() => import('./pages/Login'));
const Categories = lazy(() => import('./pages/Categories'));
const ProductSetup = lazy(() => import('./pages/ProductSetup'));
const Fits = lazy(() => import('./pages/Fits'));
const Materials = lazy(() => import('./pages/Materials'));
const Pricing = lazy(() => import('./pages/Pricing'));
const PrintMethods = lazy(() => import('./pages/PrintMethods'));
const QuantityTiers = lazy(() => import('./pages/QuantityTiers'));
const Palettes = lazy(() => import('./pages/Palettes'));
const Customizations = lazy(() => import('./pages/Customizations'));
const CustomizationPricing = lazy(() => import('./pages/CustomizationPricing'));
const Orders = lazy(() => import('./pages/Orders'));

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

  if (!session) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Загрузка...</div>}>
        <Login />
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Загрузка...</div>}>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/categories" replace />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/product-setup" element={<ProductSetup />} />
            <Route path="/fits" element={<Fits />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/print-methods" element={<PrintMethods />} />
            <Route path="/quantity-tiers" element={<QuantityTiers />} />
            <Route path="/palettes" element={<Palettes />} />
            <Route path="/customizations" element={<Customizations />} />
            <Route path="/customization-pricing" element={<CustomizationPricing />} />
            <Route path="/orders" element={<Orders />} />
          </Routes>
        </Layout>
      </Suspense>
    </BrowserRouter>
  );
}
