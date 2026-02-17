import { NavLink } from 'react-router-dom';
import { supabase } from '../supabase';

const NAV = [
  { to: '/categories', label: 'Категории' },
  { to: '/sections', label: 'Разделы и опции' },
  { to: '/pricing', label: 'Цены' },
  { to: '/palettes', label: 'Палитры' },
  { to: '/orders', label: 'Заявки' },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <aside className="w-56 bg-gray-800 p-4 flex flex-col">
        <h1 className="text-lg font-bold text-orange-500 mb-6">UNFRM Admin</h1>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-orange-500/20 text-orange-400' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-400 hover:text-white mt-4"
        >
          Выйти
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
