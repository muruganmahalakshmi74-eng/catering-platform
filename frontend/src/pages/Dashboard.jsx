import { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const today = () => new Date().toISOString().split('T')[0];

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const restaurantId = user?.restaurant?._id || user?.restaurant;

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [packages, setPackages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('I need vegetarian catering for 30 people with a budget of ₹20,000.');
  const [result, setResult] = useState(null);
  const [recommending, setRecommending] = useState(false);

  const [form, setForm] = useState({
    cateringPackage: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    guestCount: 30,
    eventDate: '',
    specialRequests: '',
  });
  const [placing, setPlacing] = useState(false);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [r, m, p, o] = await Promise.all([
        api.get(`/restaurants/${restaurantId}`),
        api.get(`/restaurants/${restaurantId}/menu`),
        api.get(`/restaurants/${restaurantId}/packages`),
        api.get(`/restaurants/${restaurantId}/orders`),
      ]);
      setRestaurant(r.data);
      setMenu(m.data);
      setPackages(p.data);
      setOrders(o.data);
      setForm((f) => ({ ...f, cateringPackage: f.cateringPackage || p.data[0]?._id || '' }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p._id === form.cateringPackage),
    [packages, form.cateringPackage]
  );

  const estimatedTotal = selectedPackage ? selectedPackage.pricePerPerson * Number(form.guestCount || 0) : 0;

  const handleRecommend = async () => {
    if (!query.trim()) {
      toast.warning('Describe what you need first — diet, guest count and budget.');
      return;
    }
    setRecommending(true);
    try {
      const { data } = await api.post(`/restaurants/${restaurantId}/recommend`, { query });
      setResult(data);

      const count = data.recommendations.length;
      if (count > 0) {
        toast.success(`Found ${count} matching package${count > 1 ? 's' : ''}.`);
      } else if (data.menuItemSuggestions?.length || data.alternatives?.length) {
        toast.warning('No exact match — showing the closest options instead.');
      } else {
        toast.info('No packages at this restaurant match that request.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRecommending(false);
    }
  };

  const useRecommendation = (rec) => {
    setForm((f) => ({
      ...f,
      cateringPackage: rec.package._id,
      guestCount: result?.parsed?.guestCount || f.guestCount,
    }));
    toast.info(`Selected “${rec.package.name}” for your order.`);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    if (!form.customerName.trim()) return toast.warning('Customer name is required.');
    if (!form.cateringPackage) return toast.warning('Please choose a catering package.');
    if (!form.eventDate) return toast.warning('Please pick an event date.');
    if (!form.guestCount || Number(form.guestCount) < 1) return toast.warning('Guest count must be at least 1.');
    if (selectedPackage) {
      const guests = Number(form.guestCount);
      if (guests < selectedPackage.minGuests || guests > selectedPackage.maxGuests) {
        return toast.warning(
          `“${selectedPackage.name}” serves ${selectedPackage.minGuests}–${selectedPackage.maxGuests} guests.`
        );
      }
    }

    setPlacing(true);
    try {
      const { data } = await api.post(`/restaurants/${restaurantId}/orders`, {
        ...form,
        guestCount: Number(form.guestCount),
      });
      toast.success(`Order for ${data.customerName} confirmed — ${inr(data.totalPrice)}.`);
      setForm((f) => ({
        ...f,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        eventDate: '',
        specialRequests: '',
      }));
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPlacing(false);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await api.patch(`/restaurants/${restaurantId}/orders/${orderId}/status`, { status });
      toast.success(`Order marked as ${status}.`);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading && !restaurant) {
    return <div className="card empty">Loading your restaurant…</div>;
  }

  return (
    <div className="stack">
      {restaurant && (
        <div className="card">
          <h2>{restaurant.name}</h2>
          <p className="muted" style={{ marginTop: '0.35rem' }}>{restaurant.description}</p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            {restaurant.address} · {restaurant.cuisine} · {restaurant.phone}
          </p>
        </div>
      )}

      {}
      <div className="card">
        <h3>AI Catering Recommendation</h3>
        <p className="muted" style={{ marginTop: '0.3rem' }}>
          Describe the event in plain English. Suggestions come only from {restaurant?.name || 'your restaurant'}.
        </p>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          style={{ marginTop: '0.75rem' }}
          placeholder="e.g. I need vegetarian catering for 30 people with a budget of ₹20,000."
        />
        <button className="btn" onClick={handleRecommend} disabled={recommending} style={{ marginTop: '0.6rem' }}>
          {recommending ? <><span className="spinner" /> Thinking…</> : 'Get recommendation'}
        </button>

        {result && (
          <div style={{ marginTop: '1.25rem' }}>
            <div className="row muted" style={{ marginBottom: '0.5rem' }}>
              <span>Diet: <strong>{result.parsed.isVeg === true ? 'Vegetarian' : result.parsed.isVeg === false ? 'Non-vegetarian' : 'Any'}</strong></span>
              <span>Guests: <strong>{result.parsed.guestCount ?? '—'}</strong></span>
              <span>Budget: <strong>{result.parsed.budget ? inr(result.parsed.budget) : '—'}</strong></span>
              {result.parsed.budgetPerPerson && <span>Per person: <strong>{inr(result.parsed.budgetPerPerson)}</strong></span>}
            </div>
            <p style={{ fontSize: '0.9rem' }}>{result.explanation}</p>

            {result.recommendations.map((rec) => (
              <div className="rec" key={rec.package._id}>
                <div className="list-row" style={{ borderBottom: 'none', padding: 0 }}>
                  <strong>{rec.package.name}</strong>
                  <span className="row">
                    <span className={`badge badge--${rec.package.isVeg ? 'veg' : 'nonveg'}`}>
                      {rec.package.isVeg ? 'Veg' : 'Non-veg'}
                    </span>
                    <span className="muted">{rec.matchScore}% match</span>
                    <button className="btn-secondary" onClick={() => useRecommendation(rec)}>Use this</button>
                  </span>
                </div>
                <p className="muted" style={{ marginTop: '0.3rem' }}>
                  {inr(rec.pricePerPerson)}/person{rec.totalPrice ? ` · ${inr(rec.totalPrice)} total` : ''}
                </p>
                {rec.reasons.map((reason, i) => (
                  <div className="rec__reason" key={i}>✓ {reason}</div>
                ))}
              </div>
            ))}

            {result.alternatives?.length > 0 && (
              <>
                <h4 style={{ marginTop: '1.25rem' }}>Closest alternatives</h4>
                {result.alternatives.map((alt) => (
                  <div className="rec rec--alt" key={alt.package._id}>
                    <div className="list-row" style={{ borderBottom: 'none', padding: 0 }}>
                      <strong>{alt.package.name}</strong>
                      <span className="muted">{inr(alt.pricePerPerson)}/person</span>
                    </div>
                    {alt.warnings.map((warning, i) => (
                      <div className="rec__warning" key={i}>! {warning}</div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {result.menuItemSuggestions?.length > 0 && (
              <>
                <h4 style={{ marginTop: '1.25rem' }}>Individual dishes within budget</h4>
                {result.menuItemSuggestions.map((s) => (
                  <div className="list-row" key={s.item._id}>
                    <span>{s.item.name}</span>
                    <span className="muted">{inr(s.pricePerPlate)}/plate</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {}
      <div className="card">
        <h3>Create Catering Order</h3>
        <form onSubmit={handleCreateOrder} className="stack" style={{ marginTop: '0.9rem', gap: '0.8rem' }}>
          <div className="field">
            <label htmlFor="pkg">Catering package</label>
            <select
              id="pkg"
              value={form.cateringPackage}
              onChange={(e) => setForm({ ...form, cateringPackage: e.target.value })}
            >
              <option value="">Select a package…</option>
              {packages.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} — {inr(p.pricePerPerson)}/person ({p.minGuests}–{p.maxGuests} guests)
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="name">Customer name</label>
            <input id="name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Full name" />
          </div>

          <div className="row" style={{ gap: '0.8rem' }}>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor="email">Email (optional)</label>
              <input id="email" type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="customer@example.com" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor="phone">Phone (optional)</label>
              <input id="phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="9876543210" />
            </div>
          </div>

          <div className="row" style={{ gap: '0.8rem' }}>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label htmlFor="guests">Guest count</label>
              <input id="guests" type="number" min="1" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label htmlFor="date">Event date</label>
              <input id="date" type="date" min={today()} value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Special requests (optional)</label>
            <textarea id="notes" rows={2} value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} placeholder="Allergies, setup time, spice level…" />
          </div>

          {selectedPackage && (
            <p className="muted">
              Estimated total: <strong>{inr(estimatedTotal)}</strong>{' '}
              ({inr(selectedPackage.pricePerPerson)} × {form.guestCount || 0} guests)
            </p>
          )}

          <button className="btn" type="submit" disabled={placing}>
            {placing ? <><span className="spinner" /> Placing order…</> : 'Create order'}
          </button>
        </form>
      </div>

      {}
      <div className="card">
        <h3>Orders ({orders.length})</h3>
        {orders.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          orders.map((o) => (
            <div className="list-row" key={o._id}>
              <div>
                <strong>{o.customerName}</strong>{' '}
                <span className="muted">· {o.cateringPackage?.name || 'Package removed'}</span>
                <div className="muted">
                  {o.guestCount} guests · {inr(o.totalPrice)} · {new Date(o.eventDate).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div className="row">
                <span className={`badge badge--${o.status}`}>{o.status}</span>
                <select
                  value={o.status}
                  onChange={(e) => handleStatusChange(o._id, e.target.value)}
                  style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                >
                  {['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {}
      <div className="card">
        <h3>Catering Packages ({packages.length})</h3>
        {packages.map((p) => (
          <div className="list-row" key={p._id}>
            <div>
              <strong>{p.name}</strong>
              <div className="muted">{p.description}</div>
              <div className="muted">{p.items?.length || 0} dishes · {p.minGuests}–{p.maxGuests} guests</div>
            </div>
            <div className="row">
              <span className={`badge badge--${p.isVeg ? 'veg' : 'nonveg'}`}>{p.isVeg ? 'Veg' : 'Non-veg'}</span>
              <strong>{inr(p.pricePerPerson)}<span className="muted">/person</span></strong>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Menu Items ({menu.length})</h3>
        {menu.map((m) => (
          <div className="list-row" key={m._id}>
            <div>
              <strong>{m.name}</strong> <span className="muted">· {m.category}</span>
              <div className="muted">{m.description}</div>
            </div>
            <div className="row">
              <span className={`badge badge--${m.isVeg ? 'veg' : 'nonveg'}`}>{m.isVeg ? 'Veg' : 'Non-veg'}</span>
              <strong>{inr(m.price)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
