import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon, useIonToast } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  addOutline, removeOutline, flashOutline, locationOutline, checkmarkCircle, timeOutline,
  cubeOutline, arrowBackOutline, bagHandleOutline, chevronForward,
  documentTextOutline, shieldCheckmarkOutline, walletOutline,
} from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { SearchField } from '@components/search/SearchField';
import { materialsApi } from '@services/api/materialsApi';
import { categoryAccent } from '../data/categoryAccent';
import type { ShopItem } from '../data/shopCatalog';

type Cart = Record<string, number>;
type View = 'shop' | 'cart';

/** Free delivery unlocks above this order value; below it a flat fee applies. */
const FREE_DELIVERY_AT = 2000;
const DELIVERY_FEE = 60;

/**
 * Instant materials ordering for builders/supervisors (quick-commerce style).
 * Shop a Zepto-style grid → review cart (progress track + recommendations) → place order.
 */
export function QuickOrderPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const [toast] = useIonToast();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<'All' | string>('All');
  const [cart, setCart] = useState<Cart>({});
  const [view, setView] = useState<View>('shop');
  const [placed, setPlaced] = useState(false);

  // Real catalog + categories from the backend.
  const { data: SHOP_ITEMS = [] } = useQuery({
    queryKey: ['materials', 'shop'],
    queryFn: async () => (await materialsApi.catalog({ limit: 200 })).map((p: any): ShopItem => ({
      id: String(p.item_id), name: p.nm_tx, emoji: p.emoji_tx || '📦', image: p.img_url_tx || undefined,
      category: p.ctgry_nm || 'Other', price: Number(p.price_am), unit: p.unit_tx || 'unit',
      etaMin: p.eta_min || 60, popular: p.poplr_in === 1,
    })),
  });
  const { data: catData = [] } = useQuery({ queryKey: ['materials', 'categories'], queryFn: () => materialsApi.categories() });

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      SHOP_ITEMS.filter(
        (it) =>
          (cat === 'All' || it.category === cat) &&
          (!q || it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q)),
      ),
    [SHOP_ITEMS, cat, q],
  );

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const next = (c[id] ?? 0) - 1;
      const copy = { ...c };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const it = SHOP_ITEMS.find((p) => p.id === id);
    return sum + (it ? it.price * qty : 0);
  }, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_AT || subtotal === 0 ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;
  // Slowest item drives the delivery window.
  const etaMin = Object.keys(cart).reduce((max, id) => {
    const it = SHOP_ITEMS.find((p) => p.id === id);
    return it ? Math.max(max, it.etaMin) : max;
  }, 0);

  const cartLines = Object.entries(cart)
    .map(([id, qty]) => ({ it: SHOP_ITEMS.find((p) => p.id === id), qty }))
    .filter((r): r is { it: ShopItem; qty: number } => Boolean(r.it));

  const recommendations = useMemo(
    () => SHOP_ITEMS.filter((it) => !cart[it.id]).slice(0, 10),
    [SHOP_ITEMS, cart],
  );

  const orderMut = useMutation({
    mutationFn: () => {
      const items = Object.entries(cart).map(([id, qty]) => {
        const it = SHOP_ITEMS.find((p) => p.id === id)!;
        return { itemId: Number(id), name: it.name, qty, price: it.price, unit: it.unit };
      });
      return materialsApi.createOrder({ items, deliveryTo: 'Site A' });
    },
    onSuccess: () => { setPlaced(true); setCart({}); setView('shop'); },
    onError: (e: any) => toast({ message: e.message || t('mat.couldNotPlaceOrder', 'Could not place order'), duration: 1800, color: 'danger', position: 'top' }),
  });
  const placeOrder = () => { if (Object.keys(cart).length) orderMut.mutate(); };

  // ── Footers (change per view) ──────────────────────────────────────────────
  const shopFooter = itemCount > 0 && (
    <button onClick={() => setView('cart')} style={ctaBar}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 26, padding: '0 8px', borderRadius: 999, background: 'rgba(0,0,0,0.14)', fontWeight: 800, fontSize: 13 }}>
        {itemCount}
      </span>
      <span style={{ flex: 1, textAlign: 'left', fontWeight: 800, fontSize: 16 }}>₹{subtotal.toLocaleString('en-IN')}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14 }}>
        {t('mat.viewCart', 'View cart')} <IonIcon icon={chevronForward} />
      </span>
    </button>
  );
  const cartFooter = itemCount > 0 && (
    <button onClick={placeOrder} disabled={orderMut.isPending} style={{ ...ctaBar, opacity: orderMut.isPending ? 0.7 : 1 }}>
      <span style={{ flex: 1, textAlign: 'left' }}>
        <span style={{ fontWeight: 800, fontSize: 17 }}>₹{total.toLocaleString('en-IN')}</span>
        <span style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{itemCount} item{itemCount > 1 ? 's' : ''} · to Site A</span>
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 15 }}>
        {orderMut.isPending ? t('mat.placing', 'Placing…') : t('mat.placeOrder', 'Place order')} <IonIcon icon={flashOutline} />
      </span>
    </button>
  );

  const footer = placed ? undefined : view === 'cart' ? (cartFooter || undefined) : (shopFooter || undefined);

  return (
    <PageShell title={placed ? t('mat.orderMaterials', 'Order Materials') : view === 'cart' ? t('mat.cart', 'Cart') : t('mat.orderMaterials', 'Order Materials')} showBack footer={footer}>
      {placed ? (
        <SuccessView onMore={() => setPlaced(false)} onHome={() => history.push('/app/home')} />
      ) : view === 'cart' ? (
        <CartView
          lines={cartLines}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          etaMin={etaMin}
          recommendations={recommendations}
          onAdd={add}
          onSub={sub}
          onBack={() => setView('shop')}
        />
      ) : (
        <ShopView
          query={query} setQuery={setQuery}
          cat={cat} setCat={setCat}
          categories={catData}
          list={list}
          cart={cart} onAdd={add} onSub={sub}
        />
      )}
    </PageShell>
  );
}

/* ───────────────────────── Shop view ───────────────────────── */

function ShopView({
  query, setQuery, cat, setCat, categories, list, cart, onAdd, onSub,
}: {
  query: string; setQuery: (v: string) => void;
  cat: string; setCat: (v: string) => void;
  categories: any[];
  list: ShopItem[];
  cart: Cart; onAdd: (id: string) => void; onSub: (id: string) => void;
}) {
  const { t } = useTranslation();
  const rail = [{ ctgry_nm: t('mat.all', 'All'), icn_tx: '🛒', img_url_tx: null, all: true }, ...categories];
  return (
    <>
      {/* Sticky top — delivery banner + search stay pinned */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--anrix-bg)', borderBottom: '1px solid var(--anrix-border)', paddingBottom: 'var(--anrix-space-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 'var(--anrix-space-4) var(--anrix-space-5) 0', padding: '10px 14px', borderRadius: 'var(--anrix-radius-md)', background: 'var(--anrix-primary-soft)' }}>
          <IonIcon icon={locationOutline} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)' }} />
          <div style={{ flex: 1, fontSize: 13.5 }}><strong>{t('mat.deliverToSiteA', 'Deliver to Site A')}</strong> · Whitefield</div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-success)' }}>
            <IonIcon icon={flashOutline} /> {t('mat.fast', 'Fast')}
          </span>
        </div>
        <div style={{ padding: 'var(--anrix-space-3) var(--anrix-space-4)' }}>
          <SearchField
            value={query}
            onChange={setQuery}
            rotatePrefix={t('mat.orderPrefix', 'Order ')}
            rotatingPlaceholders={['cement', 'sand', 'steel', 'bricks', 'sponge', 'safety gear', 'tools']}
          />
        </div>
      </div>

      {/* Circular category rail (Zepto "Veggies / Fruits" style) */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '14px 12px 6px' }}>
        {rail.map((c: any, i: number) => {
          const name = c.ctgry_nm;
          const active = cat === (c.all ? 'All' : name);
          const ac = c.all ? null : categoryAccent(name);
          return (
            <button
              key={name + i}
              onClick={() => setCat(c.all ? 'All' : name)}
              style={{ flexShrink: 0, width: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '6px 2px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span style={{
                position: 'relative', display: 'grid', placeItems: 'center', width: 62, height: 62, borderRadius: '50%',
                background: ac ? ac.bg : 'var(--anrix-primary-soft)',
                border: active ? `2px solid ${ac ? ac.fg : 'var(--anrix-primary)'}` : '2px solid transparent',
                boxShadow: active ? 'var(--anrix-shadow-2)' : 'none', overflow: 'hidden', fontSize: 26, transition: 'all 140ms',
              }}>
                {c.img_url_tx
                  ? <img src={c.img_url_tx} alt={name} loading="lazy" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (c.icn_tx || <IonIcon icon={cubeOutline} style={{ color: ac ? ac.fg : 'var(--anrix-primary-strong)' }} />)}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: active ? 800 : 600, color: active ? 'var(--anrix-text-strong)' : 'var(--anrix-text)', textAlign: 'center', lineHeight: 1.15, maxWidth: 74, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Product grid */}
      {list.length === 0 ? (
        <div style={{ padding: 'var(--anrix-space-9) var(--anrix-space-6)', textAlign: 'center', color: 'var(--anrix-text-muted)' }}>
          {t('mat.noItemsMatch', 'No items match “{{query}}”.', { query: query.trim() })}
        </div>
      ) : (
        <div className="anrix-grid-products" style={{ padding: '8px 16px 28px' }}>
          {list.map((it) => (
            <ProductCard key={it.id} item={it} qty={cart[it.id] ?? 0} onAdd={() => onAdd(it.id)} onSub={() => onSub(it.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function ProductCard({ item, qty, onAdd, onSub }: { item: ShopItem; qty: number; onAdd: () => void; onSub: () => void }) {
  const { t } = useTranslation();
  const ac = categoryAccent(item.category);
  return (
    <div style={{
      borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-border-strong)',
      background: 'var(--anrix-surface)', overflow: 'hidden', boxShadow: 'var(--anrix-shadow-1)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'relative', height: 128, background: ac.bg, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {item.image
          ? <img src={item.image} alt={item.name} loading="lazy"
              onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.style.display = 'none'; const s = t.nextElementSibling as HTMLElement | null; if (s) s.style.display = 'grid'; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : null}
        <div style={{ display: item.image ? 'none' : 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 44 }}>
          {item.emoji || <IonIcon icon={cubeOutline} style={{ color: ac.fg }} />}
        </div>

        {item.popular && (
          <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 999, background: ac.fg, color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {t('mat.popular', 'Popular')}
          </span>
        )}
        {item.etaMin > 0 && (
          <span style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', color: 'var(--anrix-text-strong)', fontSize: 10.5, fontWeight: 700 }}>
            <IonIcon icon={flashOutline} style={{ fontSize: 11, color: 'var(--anrix-success)' }} /> {item.etaMin}m
          </span>
        )}

        <div style={{ position: 'absolute', right: 8, bottom: -14 }}>
          {qty === 0 ? (
            <button onClick={onAdd} style={{
              height: 34, minWidth: 74, padding: '0 16px', borderRadius: 'var(--anrix-radius-md)',
              border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-surface)',
              color: 'var(--anrix-primary-strong)', fontWeight: 800, fontSize: 13.5, letterSpacing: '0.02em',
              cursor: 'pointer', boxShadow: 'var(--anrix-shadow-2)',
            }}>{t('mat.addUpper', 'ADD')}</button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', height: 34, borderRadius: 'var(--anrix-radius-md)', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', padding: '0 4px', boxShadow: 'var(--anrix-shadow-2)' }}>
              <button onClick={onSub} aria-label="Remove one" style={stepBtn}><IonIcon icon={removeOutline} /></button>
              <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{qty}</span>
              <button onClick={onAdd} aria-label="Add one" style={stepBtn}><IonIcon icon={addOutline} /></button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--anrix-text-strong)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 35 }}>
          {item.name}
        </div>
        <div style={{ marginTop: 4, fontSize: 11.5, fontWeight: 600, color: ac.fg, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {item.category}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <strong style={{ fontSize: 16, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>₹{item.price.toLocaleString('en-IN')}</strong>
          <span style={{ fontSize: 12, color: 'var(--anrix-text-muted)', fontWeight: 500 }}>/{item.unit}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Cart view ───────────────────────── */

function CartView({
  lines, subtotal, deliveryFee, etaMin, recommendations, onAdd, onSub, onBack,
}: {
  lines: { it: ShopItem; qty: number }[];
  subtotal: number; deliveryFee: number; etaMin: number;
  recommendations: ShopItem[];
  onAdd: (id: string) => void; onSub: (id: string) => void; onBack: () => void;
}) {
  const { t } = useTranslation();
  const remaining = Math.max(0, FREE_DELIVERY_AT - subtotal);
  const pct = Math.min(100, (subtotal / FREE_DELIVERY_AT) * 100);
  const freeUnlocked = deliveryFee === 0;

  return (
    <div style={{ padding: '0 0 20px' }}>
      {/* Back to shopping */}
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '14px 16px 0', padding: '8px 12px', borderRadius: 999, border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', color: 'var(--anrix-text-strong)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        <IonIcon icon={arrowBackOutline} /> {t('mat.addMoreMaterials', 'Add more materials')}
      </button>

      {/* Free site-delivery threshold — a trade benefit, stated plainly (no gamification) */}
      <div className="anrix-card" style={{ margin: '14px 16px 0', borderColor: freeUnlocked ? 'var(--anrix-success)' : 'var(--anrix-border-strong)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--anrix-text-strong)' }}>
          <IonIcon icon={freeUnlocked ? checkmarkCircle : cubeOutline} style={{ fontSize: 18, color: freeUnlocked ? 'var(--anrix-success)' : 'var(--anrix-primary-strong)' }} />
          {freeUnlocked
            ? <span>{t('mat.freeSiteDeliveryApplied', 'Free site delivery applied on this order')}</span>
            : <span><strong>₹{remaining.toLocaleString('en-IN')}</strong> {t('mat.awayFromFreeDelivery', 'away from free site delivery')}</span>}
        </div>
        <div style={{ position: 'relative', height: 6, borderRadius: 999, background: 'var(--anrix-surface-2)', marginTop: 11 }}>
          <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, borderRadius: 999, background: freeUnlocked ? 'var(--anrix-success)' : 'var(--anrix-primary)', transition: 'width 260ms' }} />
        </div>
      </div>

      {/* Delivery card + line items */}
      <div className="anrix-card" style={{ margin: '14px 16px 0', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 12px' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, background: 'var(--anrix-primary-soft)' }}>
            <IonIcon icon={timeOutline} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)' }} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{t('mat.arrivingIn', 'Arriving in ~{{mins}} mins', { mins: etaMin || 60 })}</div>
            <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)' }}>{lines.length} item{lines.length > 1 ? 's' : ''} · to Site A, Whitefield</div>
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--anrix-border)' }} />
        {lines.map(({ it, qty }, i) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < lines.length - 1 ? '1px solid var(--anrix-border)' : 'none' }}>
            <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 10, background: categoryAccent(it.category).bg, display: 'grid', placeItems: 'center', overflow: 'hidden', fontSize: 22 }}>
              {it.image
                ? <img src={it.image} alt={it.name} loading="lazy" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : it.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)' }}>₹{it.price.toLocaleString('en-IN')}/{it.unit}</div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', height: 32, borderRadius: 'var(--anrix-radius-md)', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', padding: '0 4px' }}>
              <button onClick={() => onSub(it.id)} aria-label="Remove one" style={stepBtn}><IonIcon icon={removeOutline} /></button>
              <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: 13.5 }}>{qty}</span>
              <button onClick={() => onAdd(it.id)} aria-label="Add one" style={stepBtn}><IonIcon icon={addOutline} /></button>
            </div>
            <div style={{ width: 62, textAlign: 'right', fontWeight: 800, fontSize: 14 }}>₹{(it.price * qty).toLocaleString('en-IN')}</div>
          </div>
        ))}
      </div>

      {/* You might also like */}
      {recommendations.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 16px 10px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{t('mat.frequentlyOrdered', 'Frequently ordered together')}</div>
          </div>
          <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px' }}>
            {recommendations.map((it) => {
              const ac = categoryAccent(it.category);
              return (
                <div key={it.id} style={{ flexShrink: 0, width: 130, borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', overflow: 'hidden', boxShadow: 'var(--anrix-shadow-1)' }}>
                  <div style={{ position: 'relative', height: 92, background: ac.bg, display: 'grid', placeItems: 'center', overflow: 'hidden', fontSize: 34 }}>
                    {it.image
                      ? <img src={it.image} alt={it.name} loading="lazy" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : it.emoji}
                    <button onClick={() => onAdd(it.id)} aria-label={`Add ${it.name}`} style={{ position: 'absolute', right: 6, bottom: -12, width: 32, height: 32, borderRadius: 9, border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-surface)', color: 'var(--anrix-primary-strong)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: 'var(--anrix-shadow-2)' }}>
                      <IonIcon icon={addOutline} style={{ fontSize: 18 }} />
                    </button>
                  </div>
                  <div style={{ padding: '16px 10px 10px' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-strong)', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 30 }}>{it.name}</div>
                    <div style={{ marginTop: 6, fontWeight: 800, fontSize: 13.5 }}>₹{it.price.toLocaleString('en-IN')}<span style={{ fontWeight: 500, fontSize: 11, color: 'var(--anrix-text-muted)' }}>/{it.unit}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Bill summary */}
      <div className="anrix-card" style={{ margin: '22px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--anrix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{t('mat.billDetails', 'Bill details')}</div>
        <Line label={t('mat.itemTotal', 'Item total')} value={`₹${subtotal.toLocaleString('en-IN')}`} />
        <Line label={t('mat.deliveryFee', 'Delivery fee')} value={deliveryFee === 0 ? t('mat.free', 'FREE') : `₹${deliveryFee}`} valueColor={deliveryFee === 0 ? 'var(--anrix-success)' : undefined} />
        <div style={{ height: 1, background: 'var(--anrix-border)', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
          <span>{t('mat.toPay', 'To pay')}</span><span>₹{(subtotal + deliveryFee).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Trade assurances — distinctly construction procurement, not retail */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 16px 0' }}>
        {[
          { icon: documentTextOutline, k: 'gstInvoice', label: 'GST invoice' },
          { icon: shieldCheckmarkOutline, k: 'qualityChecked', label: 'Quality checked' },
          { icon: walletOutline, k: 'payOnDelivery', label: 'Pay on delivery' },
        ].map((a) => (
          <div key={a.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', textAlign: 'center' }}>
            <IonIcon icon={a.icon} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)' }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--anrix-text)' }}>{t(`mat.${a.k}`, a.label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Line({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '3px 0', color: 'var(--anrix-text)' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor || 'var(--anrix-text-strong)' }}>{value}</span>
    </div>
  );
}

/* ───────────────────────── Success view ───────────────────────── */

function SuccessView({ onMore, onHome }: { onMore: () => void; onHome: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--anrix-space-9) var(--anrix-space-6)', gap: 'var(--anrix-space-4)' }}>
      <IonIcon icon={checkmarkCircle} style={{ fontSize: 72, color: 'var(--anrix-success)' }} />
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t('mat.orderPlaced', 'Order placed')}</h2>
      <p style={{ margin: 0, color: 'var(--anrix-text-muted)', maxWidth: 300 }}>
        Your materials are on the way to <strong>Site A</strong>. You'll get a call before delivery.
      </p>
      <button onClick={onMore} style={{ marginTop: 8, height: 46, padding: '0 22px', borderRadius: 'var(--anrix-radius-md)', border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <IonIcon icon={bagHandleOutline} /> {t('mat.orderMore', 'Order more')}
      </button>
      <button onClick={onHome} style={{ background: 'none', border: 'none', color: 'var(--anrix-primary-strong)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
        {t('mat.backToHome', 'Back to home')}
      </button>
    </div>
  );
}

const ctaBar: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
  borderRadius: 'var(--anrix-radius-lg)', border: 'none', cursor: 'pointer',
  background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)',
  boxShadow: '0 6px 16px rgba(22, 24, 29,0.32)',
};
const stepBtn: React.CSSProperties = {
  width: 28, height: 28, display: 'grid', placeItems: 'center',
  background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18,
};
