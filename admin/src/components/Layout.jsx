import { NavLink } from 'react-router-dom';
import { supabase } from '../supabase';

const NAV = [
  { to: '/categories', label: 'Категории' },
  { to: '/fits', label: 'Фасоны' },
  { to: '/materials', label: 'Материалы' },
  { to: '/product-setup', label: 'Товары: структура' },
  { to: '/pricing', label: 'Цены (матрица)' },
  { to: '/print-methods', label: 'Нанесение' },
  { to: '/customizations', label: 'Кастомизация' },
  { to: '/customization-pricing', label: 'Кастомизация: цены' },
  { to: '/quantity-tiers', label: 'Множители' },
  { to: '/palettes', label: 'Палитры' },
  { to: '/orders', label: 'Заявки' },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen md:h-screen bg-gray-900 text-white flex flex-col md:flex-row md:overflow-hidden">
      <aside className="w-full md:w-56 bg-gray-800 p-4 flex flex-col border-b border-gray-700 md:border-b-0 md:border-r md:border-gray-700 md:h-screen md:sticky md:top-0 md:flex-shrink-0">
        <h1 className="text-lg font-bold text-orange-500 mb-4 md:mb-6">UNFRM Admin</h1>
        <nav className="flex md:flex-col gap-1 flex-1 overflow-x-auto md:overflow-y-auto md:overflow-x-visible pb-1 md:pb-0">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-colors ${
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
          className="text-sm text-gray-400 hover:text-white mt-3 md:mt-4 text-left"
        >
          Выйти
        </button>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-6 md:overflow-y-auto overflow-x-hidden">{children}</main>
    </div>
  );
}
