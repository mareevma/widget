import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const STATUSES = ['new', 'in_progress', 'done', 'cancelled'];
const STATUS_LABELS = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена', cancelled: 'Отменена' };
const STATUS_COLORS = { new: 'bg-orange-500', in_progress: 'bg-blue-500', done: 'bg-green-500', cancelled: 'bg-gray-500' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [categoriesById, setCategoriesById] = useState({});
  const [fitsById, setFitsById] = useState({});
  const [materialsById, setMaterialsById] = useState({});
  const [colorsById, setColorsById] = useState({});
  const [printsById, setPrintsById] = useState({});
  const [customizationsById, setCustomizationsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { load(); }, []);

  function indexById(rows, nameField = 'name') {
    const index = {};
    (rows || []).forEach((row) => {
      index[row.id] = row[nameField];
    });
    return index;
  }

  function formatConfig(order) {
    const cfg = order.configuration || {};
    const customizationNames = Array.isArray(cfg.customization_ids)
      ? cfg.customization_ids.map((id) => customizationsById[id] || `ID ${id}`)
      : [];

    return [
      ['Изделие', categoriesById[cfg.category_id], cfg.category_id],
      ['Фасон', fitsById[cfg.fit_id], cfg.fit_id],
      ['Материал', materialsById[cfg.material_id], cfg.material_id],
      ['Цвет', colorsById[cfg.color_id], cfg.color_id],
      ['Принт спереди', printsById[cfg.print_front_id], cfg.print_front_id],
      ['Принт сзади', printsById[cfg.print_back_id], cfg.print_back_id],
      ['Кастомизации', customizationNames.length ? customizationNames.join(', ') : '—', null],
      ['Тираж', typeof cfg.quantity !== 'undefined' ? `${cfg.quantity} шт` : null, null],
      ['Цена за шт', typeof cfg.unit_price !== 'undefined' ? `${Number(cfg.unit_price).toLocaleString('ru-RU')} ₽` : null, null],
      ['Коэффициент', typeof cfg.multiplier !== 'undefined' ? `x${cfg.multiplier}` : null, null],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
  }

  async function load() {
    setLoading(true);
    const [
      { data: ordersData },
      { data: categoriesData },
      { data: fitsData },
      { data: materialsData },
      { data: colorsData },
      { data: printsData },
      { data: customizationsData },
    ] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name'),
      supabase.from('fits').select('id, name'),
      supabase.from('materials').select('id, name'),
      supabase.from('color_palettes').select('id, color_name'),
      supabase.from('print_methods').select('id, name'),
      supabase.from('customizations').select('id, name'),
    ]);

    setOrders(ordersData || []);
    setCategoriesById(indexById(categoriesData, 'name'));
    setFitsById(indexById(fitsData, 'name'));
    setMaterialsById(indexById(materialsData, 'name'));
    setColorsById(indexById(colorsData, 'color_name'));
    setPrintsById(indexById(printsData, 'name'));
    setCustomizationsById(indexById(customizationsData, 'name'));
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id);
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((x) => x.status === statusFilter);

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Заявки</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 rounded-lg text-sm ${statusFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300'}`}
        >
          Все ({orders.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-sm ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-gray-800 rounded-xl overflow-hidden">
            <div
              className="p-4 flex flex-wrap items-center gap-2 cursor-pointer hover:bg-gray-700"
              onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status]}`} />
              <span className="font-medium text-sm flex-1 min-w-[140px]">{order.customer_name}</span>
              <span className="text-gray-400 text-sm break-all">{order.customer_contact}</span>
              <span className="text-sm font-semibold">{Number(order.calculated_price).toLocaleString('ru-RU')} ₽</span>
              <span className="text-gray-500 text-xs">{order.quantity} шт</span>
              <span className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
            </div>

            {expandedId === order.id && (
              <div className="px-4 pb-4 border-t border-gray-700">
                <div className="mt-3 space-y-2">
                  {order.customer_comment && (
                    <p className="text-sm text-gray-400">Комментарий: {order.customer_comment}</p>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Конфигурация:</p>
                    <div className="bg-gray-900 p-3 rounded space-y-1">
                      {formatConfig(order).map(([label, value, id]) => (
                        <p key={label} className="text-xs text-gray-300">
                          <span className="text-gray-500">{label}:</span>{' '}
                          {value}
                          {id ? <span className="text-gray-600"> (ID {id})</span> : null}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(order.id, s)}
                        className={`px-3 py-1 rounded text-xs ${
                          order.status === s
                            ? `${STATUS_COLORS[s]} text-white`
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredOrders.length === 0 && <p className="text-gray-500 text-sm">Нет заявок</p>}
      </div>
    </div>
  );
}
