import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const STATUSES = ['new', 'in_progress', 'done', 'cancelled'];
const STATUS_LABELS = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена', cancelled: 'Отменена' };
const STATUS_COLORS = { new: 'bg-orange-500', in_progress: 'bg-blue-500', done: 'bg-green-500', cancelled: 'bg-gray-500' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Заявки</h2>

      <div className="flex gap-2 mb-6">
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
        {orders.map(order => (
          <div key={order.id} className="bg-gray-800 rounded-xl overflow-hidden">
            <div
              className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-750"
              onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status]}`} />
              <span className="font-medium text-sm flex-1">{order.customer_name}</span>
              <span className="text-gray-400 text-sm">{order.customer_contact}</span>
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
                    <p className="text-xs text-gray-500 mb-1">Конфигурация:</p>
                    <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                      {JSON.stringify(order.configuration, null, 2)}
                    </pre>
                  </div>
                  <div className="flex gap-2 mt-3">
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
        {orders.length === 0 && <p className="text-gray-500 text-sm">Нет заявок</p>}
      </div>
    </div>
  );
}
