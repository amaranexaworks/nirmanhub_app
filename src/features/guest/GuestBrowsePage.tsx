import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { IonPage, IonContent, IonHeader, IonIcon } from '@ionic/react';
import { useQuery } from '@tanstack/react-query';
import {
  cubeOutline, barbellOutline, gridOutline, waterOutline, flashOutline, colorFillOutline,
  constructOutline, shieldOutline, ellipsisHorizontalOutline, chevronBackOutline, cartOutline, checkmark,
  arrowForward, searchOutline, locationOutline, lockClosedOutline, chevronDownOutline,
  homeOutline, receiptOutline, personOutline,
  brushOutline, umbrellaOutline, layersOutline, albumsOutline, flaskOutline, appsOutline,
  imageOutline, toggleOutline, bulbOutline, gitNetworkOutline, apertureOutline, browsersOutline,
  buildOutline, squareOutline, restaurantOutline, bedOutline,
  star, checkmarkCircle, hammerOutline, sparklesOutline, bugOutline,
  calendarOutline, peopleOutline,
} from 'ionicons/icons';
import { LogoMark } from '@design/brand/Logo';
import { tradePhoto } from '@assets/services/serviceImages';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { publicApi } from '@services/api/publicApi';
import { categoryAccent } from '@features/materials/data/categoryAccent';

// Ionicon NAME (as stored in the DB — category.icn_tx / promo.icn_tx / highlight.icn_tx)
// → the bundled icon object. The CHOICE lives in the DB; the SVG is a bundled asset.
const ICON_BY_NAME: Record<string, string> = {
  'cube-outline': cubeOutline, 'barbell-outline': barbellOutline, 'grid-outline': gridOutline,
  'water-outline': waterOutline, 'flash-outline': flashOutline, 'color-fill-outline': colorFillOutline,
  'construct-outline': constructOutline, 'shield-outline': shieldOutline, 'ellipsis-horizontal-outline': ellipsisHorizontalOutline,
  'brush-outline': brushOutline, 'umbrella-outline': umbrellaOutline, 'layers-outline': layersOutline,
  'albums-outline': albumsOutline, 'flask-outline': flaskOutline, 'apps-outline': appsOutline,
  'image-outline': imageOutline, 'toggle-outline': toggleOutline, 'bulb-outline': bulbOutline,
  'git-network-outline': gitNetworkOutline, 'aperture-outline': apertureOutline, 'browsers-outline': browsersOutline,
  'lock-closed-outline': lockClosedOutline, 'build-outline': buildOutline, 'square-outline': squareOutline,
  'restaurant-outline': restaurantOutline, 'bed-outline': bedOutline, 'home-outline': homeOutline,
  'receipt-outline': receiptOutline, 'cart-outline': cartOutline,
};
const iconByName = (name?: string) => ICON_BY_NAME[name || ''] || cubeOutline;
// Section display order (anything else falls to the end).
const SECTION_ORDER = ['Civil & Structure', 'Finishes & Interiors', 'Plumbing & Electrical', 'Doors, Windows & Hardware', 'Kitchen & Wardrobe', 'Roofing & Exterior', 'Tools & Safety', 'Other Materials'];

type Seg = 'materials' | 'workers' | 'jobs';
type Tab = 'home' | 'category' | 'orders' | 'account';

/** Rotating home banners ("ads"). Each slide is fully data-driven, so real
 *  promotions can later come from an ads API with the same shape. Colours are
 *  brand-safe (no black hero surfaces) with per-slide text/CTA contrast. */
// Marketing banner shape (rows come from the DB via /web/promos, mapped in the page).
type Promo = { tag: string; title: string; sub: string; cta: string; action: Seg; icon: string; bg: string; fg: string; ctaFg: string; img?: string };

// Sponsored-ad banner shape (rows come from the DB via /web/promos?slot=ad).
type Ad = { label: string; title: string; sub: string; cta: string; icon: string; bg: string; fg: string; ctaFg: string; img?: string };

/** A rotating sponsored-ad banner ("plays" ads if any are supplied). */
function AdBanner({ ads, onCta }: { ads: Ad[]; onCta: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (ads.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % ads.length), 5000);
    return () => clearInterval(id);
  }, [ads.length]);
  if (!ads.length) return null;
  const a = ads[i % ads.length];
  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: a.bg, padding: '22px 18px', minHeight: 160, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: 'var(--anrix-shadow-1)', transition: 'background 500ms ease' }}>
        {/* Real photo on the right, masked to fade into the gradient; falls back to a glyph. */}
        {a.img
          ? <img src={a.img} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: '64%', objectFit: 'cover', WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 48%)', maskImage: 'linear-gradient(90deg, transparent 0%, #000 48%)' }} />
          : <IonIcon icon={a.icon} aria-hidden style={{ position: 'absolute', right: -18, bottom: -18, fontSize: 150, color: a.fg, opacity: 0.12 }} />}
        <span style={{ position: 'absolute', top: 12, right: 14, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: a.fg, opacity: 0.7 }}>{a.label}</span>
        <div style={{ position: 'relative', fontSize: 20, fontWeight: 800, color: a.fg, maxWidth: '82%', lineHeight: 1.2 }}>{a.title}</div>
        <div style={{ position: 'relative', fontSize: 13, color: a.fg, opacity: 0.9, marginTop: 5, maxWidth: '84%' }}>{a.sub}</div>
        <button onClick={onCta} style={{ position: 'relative', alignSelf: 'flex-start', marginTop: 14, padding: '9px 17px', borderRadius: 999, border: 'none', background: '#fff', color: a.ctaFg, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          {a.cta} <IonIcon icon={arrowForward} />
        </button>
        {ads.length > 1 && (
          <div style={{ position: 'absolute', bottom: 10, right: 14, display: 'flex', gap: 5 }}>
            {ads.map((_, d) => (
              <span key={d} onClick={() => setI(d)} aria-label={`Ad ${d + 1}`} style={{ width: d === i % ads.length ? 14 : 6, height: 6, borderRadius: 999, background: d === i % ads.length ? a.fg : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 260ms' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A spacious category tile (soft tinted square + photo/icon, name below). Shows NO
 *  price/Add — it's a drill-in: tapping opens that category's products. Shared by the
 *  Home grid and the Category tab. */
function CategoryTile({ c, onClick }: { c: any; onClick: () => void }) {
  const ac = categoryAccent(c.ctgry_nm || 'Other');
  return (
    <button onClick={onClick} className="anrix-pressable" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
      <div style={{ aspectRatio: '1', borderRadius: 18, background: ac.bg, position: 'relative', display: 'grid', placeItems: 'center', overflow: 'hidden', boxShadow: 'var(--anrix-shadow-1)' }}>
        <IonIcon icon={iconByName(c.icn_tx)} style={{ fontSize: 30, color: ac.fg, opacity: 0.85 }} />
        {c.img_url_tx && <img src={c.img_url_tx} alt={c.ctgry_nm} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'center', marginTop: 10, color: 'var(--anrix-text-strong)', lineHeight: 1.25 }}>{c.ctgry_nm}</div>
    </button>
  );
}
const categoryGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', columnGap: 14, rowGap: 24 };

// Trade → icon (keyword-matched against the role name; construct is the fallback).
const TRADE_ICON_RULES: Array<[RegExp, string]> = [
  [/demolit|break|dismantl/i, hammerOutline],
  [/plaster|putty|screed|render/i, colorFillOutline],
  [/paint|coat|polish|whitewash/i, brushOutline],
  [/pest|termite|fumig|rodent/i, bugOutline],
  [/fabricat|weld|grill|steel|iron/i, buildOutline],
  [/housekeep|clean|sweep|janitor/i, sparklesOutline],
  [/electric|wire|wiring/i, flashOutline],
  [/plumb|pipe|sanitary/i, waterOutline],
  [/mason|brick|concret|rcc|block/i, gridOutline],
  [/carpent|wood|furnitur|door/i, constructOutline],
  [/safety|security|guard|watch/i, shieldOutline],
  [/water.?proof|seal/i, umbrellaOutline],
  [/tile|marble|granite|floor/i, squareOutline],
];
function tradeIcon(name: string) {
  for (const [re, ic] of TRADE_ICON_RULES) if (re.test(name || '')) return ic;
  return constructOutline;
}

/** A hireable tradesperson card. Signature: a trade-tinted header band carrying a
 *  watermark trade icon + verified avatar + rating, with the day-rate as the footer
 *  hero and a single clear Hire action. Trust signals (rating, KYC) lead, because
 *  they drive the hiring decision. */
function WorkerCard({ w, onHire, t, showTrade = true }: { w: any; onHire: () => void; t: TFunction; showTrade?: boolean }) {
  const trade = w.rle_nm || t('guest.worker', 'Worker');
  const ac = categoryAccent(trade);
  const icon = tradeIcon(w.rle_nm || w.rle_cd || '');
  const rating = Number(w.rtng_nm) || 0;
  const ratingCnt = Number(w.rtng_cnt) || 0;
  const rate = Number(w.day_rate_am) || 0;
  const verified = !!w.kyc_tier_cd && w.kyc_tier_cd !== 'none';
  return (
    <div style={{ borderRadius: 16, border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', overflow: 'hidden', boxShadow: 'var(--anrix-shadow-1)', display: 'flex', flexDirection: 'column' }}>
      {/* Trade band — a slim tinted header carrying the avatar + rating. The watermark
          glyph is kept faint so the card reads as a professional profile, not a sticker. */}
      <div style={{ position: 'relative', background: ac.bg, padding: '13px 13px 12px', overflow: 'hidden' }}>
        <IonIcon icon={icon} aria-hidden style={{ position: 'absolute', right: -16, bottom: -20, fontSize: 88, color: ac.fg, opacity: 0.10 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, overflow: 'hidden', background: 'var(--anrix-surface)', boxShadow: '0 3px 10px rgba(22,24,29,0.12)', display: 'grid', placeItems: 'center' }}>
            <img src={tradePhoto(w.rle_cd, w.avtr_url_tx)} alt={w.dsply_nm}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {rating > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--anrix-surface)', borderRadius: 999, padding: '4px 9px', border: '1px solid var(--anrix-border)', flexShrink: 0 }}>
              <IonIcon icon={star} style={{ fontSize: 12, color: '#f5b301' }} />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{rating.toFixed(1)}</span>
              {ratingCnt > 0 && <span className="anrix-muted" style={{ fontSize: 11, fontWeight: 600 }}>({ratingCnt})</span>}
            </span>
          )}
        </div>
      </div>

      {/* Identity */}
      <div style={{ padding: '11px 13px 13px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Trade label is only useful under "All trades" — when a trade filter is
            active it's redundant, so we hide it and lead straight with the name. */}
        {showTrade && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: ac.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trade}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: showTrade ? 2 : 0, minWidth: 0 }}>
          <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.dsply_nm}</span>
          {verified && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0, fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--anrix-success)', background: 'rgba(31,157,107,0.12)', padding: '2px 6px', borderRadius: 999 }}>
              <IonIcon icon={checkmarkCircle} style={{ fontSize: 11 }} /> {t('guest.verified', 'Verified')}
            </span>
          )}
        </div>
        <div className="anrix-muted" style={{ fontSize: 12, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <IonIcon icon={locationOutline} style={{ fontSize: 13, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.cty_nm || t('guest.india', 'India')}</span>
          {w.srvc_rds_km ? <span style={{ opacity: 0.65, flexShrink: 0 }}>· {w.srvc_rds_km} km</span> : null}
        </div>

        {/* Rate + action */}
        <div style={{ marginTop: 'auto', paddingTop: 11, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--anrix-border)' }}>
          <div style={{ minWidth: 0, lineHeight: 1.15 }}>
            {rate > 0 ? (
              <>
                <div className="anrix-muted" style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('guest.from', 'From')}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>₹{rate.toLocaleString('en-IN')}</span>
                  <span className="anrix-muted" style={{ fontSize: 11, fontWeight: 500 }}>/{t('guest.day', 'day')}</span>
                </div>
              </>
            ) : <span className="anrix-muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{t('guest.rateOnRequest', 'Rate on ask')}</span>}
          </div>
          <button onClick={onHire} className="anrix-pressable" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 15px', borderRadius: 999, border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
            {t('guest.hire', 'Hire')} <IonIcon icon={arrowForward} style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Our Services" tile — a big branded trade avatar filling the card, the service
 *  name below, and a count of available pros. Tapping drills into that trade so the
 *  seeker sees every registered professional for it (Karya-Hero-style service grid). */
function ServiceCard({ s, onClick, t }: { s: { name: string; code: string; count: number; rating: number }; onClick: () => void; t: TFunction }) {
  const ac = categoryAccent(s.name);
  const icon = tradeIcon(s.name || s.code);
  return (
    <button onClick={onClick} className="anrix-pressable" aria-label={s.name} style={{ border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column', boxShadow: 'var(--anrix-shadow-1)' }}>
      {/* Branded trade-in-action photo fills the top. A faint trade glyph sits behind
          it so the tile still reads if the image ever fails to load. */}
      <div style={{ position: 'relative', aspectRatio: '1', background: ac.bg, overflow: 'hidden' }}>
        <IonIcon icon={icon} aria-hidden style={{ position: 'absolute', right: -12, bottom: -14, fontSize: 92, color: ac.fg, opacity: 0.12 }} />
        <img src={tradePhoto(s.code)} alt={s.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        {s.count > 0 && (
          <span style={{ position: 'absolute', top: 7, right: 7, display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--anrix-surface)', borderRadius: 999, padding: '2px 7px', fontSize: 10.5, fontWeight: 800, color: 'var(--anrix-text-strong)', boxShadow: '0 2px 6px rgba(22,24,29,0.16)' }}>
            <IonIcon icon={peopleOutline} style={{ fontSize: 11, color: ac.fg }} /> {s.count}
          </span>
        )}
      </div>
      {/* Name + rating, then the pro count — mirrors the marketplace card language. */}
      <div style={{ padding: '9px 10px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
          {s.rating > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <IonIcon icon={star} style={{ fontSize: 11, color: '#f5b301' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{s.rating.toFixed(1)}</span>
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: ac.fg, marginTop: 3 }}>
          {s.count} {s.count === 1 ? t('guest.pro', 'pro') : t('guest.pros', 'pros')}
        </div>
      </div>
    </button>
  );
}

/** A job-opening card. Mirrors the worker card's language (trade tint + icon + pay
 *  hero + single action) but reads as an opportunity: the trade + title lead, a
 *  meta row carries location / duration / applicants, and pay + Apply close it. */
function JobCard({ j, onApply, t }: { j: any; onApply: () => void; t: TFunction }) {
  const trade = j.rle_nm || t('guest.job', 'Job');
  const ac = categoryAccent(trade);
  const icon = tradeIcon(j.rle_nm || j.rle_cd || '');
  const pay = Number(j.pay_am) || 0;
  const unit = j.pay_unit_cd || 'day';
  const days = Number(j.days_cnt) || 0;
  const applicants = Number(j.applicants) || 0;
  const urgent = j.urgnt_in === 1 || j.urgnt_in === true;
  const chip = (chipIcon: string, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--anrix-text-muted)', minWidth: 0 }}>
      <IonIcon icon={chipIcon} style={{ fontSize: 13, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
  return (
    <div style={{ borderRadius: 16, border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', overflow: 'hidden', boxShadow: 'var(--anrix-shadow-1)' }}>
      <div style={{ padding: 14 }}>
        {/* Trade + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: ac.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <IonIcon icon={icon} style={{ fontSize: 22, color: ac.fg }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: ac.fg }}>{trade}</span>
              {urgent && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--anrix-danger, #c0392b)', background: 'var(--anrix-danger-soft, rgba(192,57,43,0.12))', padding: '2px 7px', borderRadius: 999 }}>
                  <IonIcon icon={flashOutline} style={{ fontSize: 11 }} /> {t('guest.urgent', 'Urgent')}
                </span>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--anrix-text-strong)', marginTop: 3, lineHeight: 1.3 }}>{j.ttl_tx}</div>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 11 }}>
          {chip(locationOutline, j.lctn_tx || t('guest.india', 'India'))}
          {days > 0 && chip(calendarOutline, `${days} ${t('guest.days', 'days')}`)}
          {applicants > 0 && chip(peopleOutline, `${applicants} ${t('guest.applied', 'applied')}`)}
        </div>

        {/* Pay + action */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--anrix-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ lineHeight: 1.1 }}>
            {pay > 0 ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>₹{pay.toLocaleString('en-IN')}</span>
                <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 500 }}>/{unit}</span>
              </div>
            ) : <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('guest.payOnAsk', 'Pay on ask')}</span>}
          </div>
          <button onClick={onApply} className="anrix-pressable" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 18px', borderRadius: 999, border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', flexShrink: 0 }}>
            {t('guest.apply', 'Apply')} <IonIcon icon={arrowForward} style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Auto-advancing banner carousel with tappable dots; each CTA jumps to its segment. */
function HeroCarousel({ slides, onAction }: { slides: Promo[]; onAction: (a: Seg) => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % slides.length), 4200);
    return () => clearInterval(id);
  }, [slides.length]);
  const s = slides[i];
  return (
    <div style={{ padding: '12px 16px 2px' }}>
      <div style={{ position: 'relative', height: 168, borderRadius: 18, overflow: 'hidden', background: s.bg, boxShadow: 'var(--anrix-shadow-2)', transition: 'background 500ms ease' }}>
        {/* Real photo on the right, masked to fade into the gradient (keeps text legible);
            falls back to a faint watermark glyph when no image is set. */}
        {s.img
          ? <img src={s.img} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: '64%', objectFit: 'cover', WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 48%)', maskImage: 'linear-gradient(90deg, transparent 0%, #000 48%)' }} />
          : <IonIcon icon={s.icon} aria-hidden style={{ position: 'absolute', right: -16, bottom: -22, fontSize: 158, color: s.fg, opacity: 0.12 }} />}
        <div style={{ position: 'relative', height: '100%', padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.28)', color: s.fg, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 9 }}>
            <IonIcon icon={s.icon} style={{ fontSize: 13 }} /> {s.tag}
          </span>
          <div style={{ fontSize: 19, fontWeight: 800, color: s.fg, lineHeight: 1.2, maxWidth: '84%' }}>{s.title}</div>
          <div style={{ fontSize: 12.5, color: s.fg, opacity: 0.88, marginTop: 4, maxWidth: '82%' }}>{s.sub}</div>
          <button onClick={() => onAction(s.action)} style={{ alignSelf: 'flex-start', marginTop: 12, padding: '8px 16px', borderRadius: 999, border: 'none', background: '#fff', color: s.ctaFg, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
            {s.cta} <IonIcon icon={arrowForward} />
          </button>
        </div>
        <div style={{ position: 'absolute', bottom: 11, right: 14, display: 'flex', gap: 5 }}>
          {slides.map((_, d) => (
            <span key={d} onClick={() => setI(d)} aria-label={`Go to slide ${d + 1}`} style={{ width: d === i ? 16 : 6, height: 6, borderRadius: 999, background: d === i ? s.fg : 'rgba(255,255,255,0.55)', transition: 'all 260ms', cursor: 'pointer' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Guest storefront reached from "Get Started" — a no-login shopping experience:
 *   Home     → ALL products (every material), so a visitor sees the goods immediately.
 *   Category → browse category-wise (sectioned tiles → drill into a category).
 *   Orders / Profile → prompt sign-in (bottom menu stays put).
 * Any commit (Add / Hire / Apply) sends them to sign up — see value first, commit second.
 */
export function GuestBrowsePage() {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const initialSeg = new URLSearchParams(location.search).get('seg');
  const [seg, setSeg] = useState<Seg>(initialSeg === 'workers' || initialSeg === 'jobs' ? initialSeg : 'materials');
  const [cat, setCat] = useState<string | null>(null);     // selected category
  const [subType, setSubType] = useState<string | null>(null); // selected sub-type (e.g. Ceiling Fans)
  const [brand, setBrand] = useState<string | null>(null);     // selected brand (e.g. Havells)
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [sheet, setSheet] = useState<any | null>(null); // product whose detail page is open
  const [packIdx, setPackIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [workerTrade, setWorkerTrade] = useState<string | null>(null); // Workers-tab trade filter

  // Reset the whole category drill-in (used by category tiles + bottom nav).
  const resetDrill = () => { setCat(null); setSubType(null); setBrand(null); setQ(''); };

  // Sign in, remembering where to resume the tapped action after login.
  const loginFor = (returnTo: string) => { sessionStorage.setItem('nirmaan_post_login', returnTo); history.push('/auth/login'); };

  // Header search — scoped to the active segment (materials / workers / jobs).
  const [searchOn, setSearchOn] = useState(false);
  const [gq, setGq] = useState('');
  const hq = gq.trim().toLowerCase();
  const headerSearching = searchOn && hq.length > 0;
  // On non-home tabs the search always targets materials.
  const searchScope: Seg = tab === 'home' ? seg : 'materials';
  // The full-screen material search overlay only takes over in the materials context;
  // workers/jobs are filtered in place so their segment stays visible.
  const searching = headerSearching && searchScope === 'materials';
  const searchResults = useQuery({ queryKey: ['guest', 'search', gq.trim()], queryFn: () => publicApi.materials({ q: gq.trim(), limit: 60 }), enabled: searching });

  // Data
  const catsQ = useQuery({ queryKey: ['guest', 'matcats'], queryFn: publicApi.materialCategories, enabled: !searching && (tab === 'home' || tab === 'category') });
  // Product-depth drill: category → sub-types → brands → items (filtered) → item detail.
  const subtypesQ = useQuery({ queryKey: ['guest', 'subtypes', cat], queryFn: () => publicApi.materialSubtypes(cat!), enabled: !searching && !!cat });
  const subtypes = subtypesQ.data ?? [];
  const needSubtype = subtypes.length > 0 && !subType;
  const brandsQ = useQuery({
    queryKey: ['guest', 'brands', cat, subType],
    queryFn: () => publicApi.materialBrands(cat!, subType || undefined),
    enabled: !searching && !!cat && subtypesQ.isSuccess && !needSubtype,
  });
  const brands = brandsQ.data ?? [];
  const needBrand = !needSubtype && brands.length > 0 && !brand;
  // Drill level for the full-page overlay (null ⇒ not drilled into a category).
  const drillLevel: 'subtype' | 'brand' | 'products' | null =
    !cat ? null : needSubtype ? 'subtype' : needBrand ? 'brand' : 'products';
  const itemsQ = useQuery({
    queryKey: ['guest', 'materials', cat, subType, brand],
    queryFn: () => publicApi.materials({ category: cat || undefined, subType: subType || undefined, brand: brand || undefined, limit: 100 }),
    enabled: !searching && !!cat && drillLevel === 'products',
  });
  const itemDetailQ = useQuery({ queryKey: ['guest', 'item', sheet?.item_id], queryFn: () => publicApi.materialItem(sheet.item_id), enabled: !!sheet?.item_id });
  // Featured products for the Home "Popular right now" rail (backend orders popular-first).
  const featuredQ = useQuery({ queryKey: ['guest', 'featured'], queryFn: () => publicApi.materials({ limit: 12 }), enabled: !searching && tab === 'home' && seg === 'materials' && !cat });
  const featured = (featuredQ.data ?? []).slice(0, 10);
  // New arrivals rail (latest items first) for the bottom of Home.
  const newArrivalsQ = useQuery({ queryKey: ['guest', 'new-arrivals'], queryFn: () => publicApi.materials({ sort: 'new', limit: 10 }), enabled: !searching && tab === 'home' && seg === 'materials' && !cat });
  const newArrivals = newArrivalsQ.data ?? [];
  // Marketing banners (hero + bottom ads) — DB-managed via /web/promos.
  const heroQ = useQuery({ queryKey: ['guest', 'promos', 'hero'], queryFn: () => publicApi.promos('hero'), enabled: !searching && tab === 'home' });
  const adsQ = useQuery({ queryKey: ['guest', 'promos', 'ad'], queryFn: () => publicApi.promos('ad'), enabled: !searching && tab === 'home' && seg === 'materials' && !cat });
  // Home extras (guest, pre-login): coupons, curated kits, trust strip.
  const onHomeMaterials = !searching && tab === 'home' && seg === 'materials' && !cat;
  const couponsQ = useQuery({ queryKey: ['guest', 'promos', 'coupon'], queryFn: () => publicApi.promos('coupon'), enabled: onHomeMaterials });
  const kitsQ = useQuery({ queryKey: ['guest', 'kits'], queryFn: () => publicApi.materialKits(), enabled: onHomeMaterials });
  const trustQ = useQuery({ queryKey: ['guest', 'highlights'], queryFn: () => publicApi.materialHighlights(), enabled: onHomeMaterials });
  const [openKit, setOpenKit] = useState<any | null>(null);
  const kitDetailQ = useQuery({ queryKey: ['guest', 'kit', openKit?.kit_id], queryFn: () => publicApi.materialKit(openKit.kit_id), enabled: !!openKit?.kit_id });
  const coupons = couponsQ.data ?? [];
  const kits = kitsQ.data ?? [];
  const trust = trustQ.data ?? [];
  const heroSlides: Promo[] = (heroQ.data ?? []).map((p: any) => ({ tag: p.tag_tx, title: p.ttl_tx, sub: p.sub_tx, cta: p.cta_tx, action: p.actn_cd as Seg, icon: iconByName(p.icn_tx), bg: p.bg_tx, fg: p.fg_tx, ctaFg: p.cta_fg_tx, img: p.img_url_tx }));
  const ads: Ad[] = (adsQ.data ?? []).map((p: any) => ({ label: p.tag_tx, title: p.ttl_tx, sub: p.sub_tx, cta: p.cta_tx, icon: iconByName(p.icn_tx), bg: p.bg_tx, fg: p.fg_tx, ctaFg: p.cta_fg_tx, img: p.img_url_tx }));
  const workersQ = useQuery({ queryKey: ['guest', 'workers'], queryFn: () => publicApi.professionals('workers', { limit: 60 }), enabled: !searching && tab === 'home' && seg === 'workers' });
  // Distinct trades present in the workforce, for the filter chip row (a real taxonomy).
  const workerTrades = useMemo(() => {
    const set = new Map<string, number>();
    for (const w of workersQ.data ?? []) { const nm = w.rle_nm || 'Worker'; set.set(nm, (set.get(nm) || 0) + 1); }
    return [...set.entries()].sort((a, b) => b[1] - a[1]).map(([nm]) => nm);
  }, [workersQ.data]);
  // "Our Services" — one big avatar card per trade (name + code + how many pros).
  // Tapping a card drills into that trade's registered professionals.
  const services = useMemo(() => {
    const map = new Map<string, { name: string; code: string; count: number; rSum: number; rCnt: number }>();
    for (const w of workersQ.data ?? []) {
      const name = w.rle_nm || 'Worker';
      const r = Number(w.rtng_nm) || 0;
      const ex = map.get(name);
      if (ex) { ex.count += 1; if (r > 0) { ex.rSum += r; ex.rCnt += 1; } }
      else map.set(name, { name, code: w.rle_cd || '', count: 1, rSum: r > 0 ? r : 0, rCnt: r > 0 ? 1 : 0 });
    }
    return [...map.values()]
      .map((s) => ({ name: s.name, code: s.code, count: s.count, rating: s.rCnt ? s.rSum / s.rCnt : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [workersQ.data]);
  const workerSearching = headerSearching && searchScope === 'workers';
  const workers = useMemo(
    () => (workersQ.data ?? []).filter((w: any) => {
      if (workerTrade && (w.rle_nm || 'Worker') !== workerTrade) return false;
      if (workerSearching && !`${w.dsply_nm ?? ''} ${w.rle_nm ?? ''} ${w.cty_nm ?? ''}`.toLowerCase().includes(hq)) return false;
      return true;
    }),
    [workersQ.data, workerTrade, workerSearching, hq],
  );
  const jobsQ = useQuery({ queryKey: ['guest', 'jobs'], queryFn: () => publicApi.jobs({ limit: 60 }), enabled: !searching && tab === 'home' && seg === 'jobs' });
  const jobSearching = headerSearching && searchScope === 'jobs';
  const jobs = useMemo(
    () => (jobsQ.data ?? []).filter((j: any) => {
      if (jobSearching && !`${j.ttl_tx ?? ''} ${j.rle_nm ?? ''} ${j.lctn_tx ?? ''}`.toLowerCase().includes(hq)) return false;
      return true;
    }),
    [jobsQ.data, jobSearching, hq],
  );

  // Category display name for titles.
  const catName = (code: string | null) => (catsQ.data ?? []).find((c: any) => c.ctgry_cd === code)?.ctgry_nm || '';
  // Back one level in the drill (product detail handles its own back separately).
  const drillBack = () => { if (brand) setBrand(null); else if (subType) setSubType(null); else setCat(null); };

  // Product-detail derived data (from itemDetailQ; falls back to the list row while loading).
  const detail: any = itemDetailQ.data;
  const colours: any[] = detail?.variants ?? [];
  const specRows: any[] = detail?.specs ?? [];
  const featureList: string[] = detail?.features ?? [];
  const packList: number[] = (detail?.packs ?? []).map((p: any) => p.mult_qty);
  const highlights: any[] = detail?.highlights ?? [];
  const packMult = packList[packIdx] ?? packList[0] ?? 1;
  // Selected colour can carry its own price; otherwise use the item's base price.
  const unitPrice = colours[colorIdx]?.price_am != null ? Number(colours[colorIdx].price_am) : Number(sheet?.price_am || 0);

  // Group categories into their sections, in a stable display order.
  const sections = useMemo(() => {
    const by: Record<string, any[]> = {};
    for (const c of catsQ.data ?? []) (by[c.sctn_nm || 'Other Materials'] ??= []).push(c);
    return Object.entries(by).sort((a, b) => {
      const ai = SECTION_ORDER.indexOf(a[0]); const bi = SECTION_ORDER.indexOf(b[0]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [catsQ.data]);

  const catProducts = useMemo(() => {
    const list = itemsQ.data ?? [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((p: any) => (p.nm_tx || '').toLowerCase().includes(s));
  }, [itemsQ.data, q]);

  // One compact product card — tight spacing, no wasted vertical gap. The 2-line
  // name reserve keeps the price + Add row aligned across a row without stretching.
  // `onAdd` overrides the button (category products open the packet sheet); when
  // omitted (search results) it falls back to prompting sign-in.
  const ProductCard = (p: any, onAdd?: () => void) => {
    const ac = categoryAccent(p.ctgry_nm || 'Other');
    return (
      <div key={p.item_id} style={{ borderRadius: 12, border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--anrix-shadow-1)' }}>
        <button onClick={onAdd ?? (() => loginFor('/app/catalog'))} style={{ border: 'none', background: ac.bg, padding: 0, cursor: 'pointer', height: 84, position: 'relative', display: 'grid', placeItems: 'center', overflow: 'hidden', width: '100%' }}>
          {/* Clean category icon as the base — a real photo layers over it when set; if
              the photo is missing or fails to load, the icon shows (never a raw emoji). */}
          <IonIcon icon={iconByName(p.icn_tx)} style={{ fontSize: 26, color: ac.fg, opacity: 0.85 }} />
          {p.img_url_tx && <img src={p.img_url_tx} alt={p.nm_tx} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        </button>
        <div style={{ padding: '7px 9px 8px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25, minHeight: 30, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.nm_tx}</div>
          <div style={{ fontWeight: 800, fontSize: 13, marginTop: 3 }}>₹{Number(p.price_am)}<span className="anrix-muted" style={{ fontWeight: 400, fontSize: 10 }}> /{p.unit_tx}</span></div>
          <button onClick={onAdd ?? (() => loginFor('/app/catalog'))} style={addBtnFull}><IonIcon icon={cartOutline} style={{ fontSize: 14 }} /> {t('guest.add', 'Add')}</button>
        </div>
      </div>
    );
  };

  // Opens the product detail page (resets pack + colour selection to the first option).
  const openSheet = (p: any) => { setPackIdx(0); setColorIdx(0); setSheet(p); };

  // Shared full-screen drill page shell (top bar with back + title + cart, scroll body).
  const DrillShell = ({ title, subtitle, onBack, children }: { title: string; subtitle?: string; onBack: () => void; children: React.ReactNode }) => (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'var(--anrix-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top) + 10px) 14px 10px', background: 'var(--anrix-surface)', borderBottom: '1px solid var(--anrix-border)' }}>
        <button onClick={onBack} aria-label={t('guest.back', 'Back')} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: 'var(--anrix-surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <IonIcon icon={chevronBackOutline} style={{ fontSize: 22, color: 'var(--anrix-text-strong)' }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: 17, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</strong>
          {subtitle && <span style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{subtitle}</span>}
        </div>
        <button onClick={() => loginFor('/app/catalog')} aria-label={t('guest.cart', 'Cart')} style={{ ...iconBtn }}>
          <IonIcon icon={cartOutline} style={{ fontSize: 22, color: 'var(--anrix-text)' }} />
        </button>
      </div>
      <div style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '14px 16px 28px' }}>{children}</div>
    </div>
  );

  // Level 1 — sub-types within a category (e.g. Ceiling / Table / Exhaust Fans).
  const renderSubtypes = () => (
    <DrillShell title={catName(cat)} subtitle={t('guest.chooseType', 'Choose a type')} onBack={() => setCat(null)}>
      {subtypesQ.isLoading && <BrandLoader overlay label={t('guest.loading', 'Loading…')} />}
      <div style={categoryGrid}>
        {subtypes.map((s: any) => (
          <CategoryTile key={s.sub_nm} c={{ ctgry_cd: s.sub_nm, ctgry_nm: s.sub_nm, ctgry: cat, img_url_tx: s.img_url_tx }} onClick={() => { setBrand(null); setSubType(s.sub_nm); }} />
        ))}
      </div>
    </DrillShell>
  );

  // Level 2 — brands (companies) for the chosen category/sub-type.
  const renderBrands = () => (
    <DrillShell title={subType || catName(cat)} subtitle={t('guest.chooseBrand', 'Choose a brand')} onBack={() => (subType ? setSubType(null) : setCat(null))}>
      {brandsQ.isLoading && <BrandLoader overlay label={t('guest.loading', 'Loading…')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {brands.map((b: any) => (
          <button key={b.brnd_nm} onClick={() => setBrand(b.brnd_nm)} className="anrix-pressable" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', boxShadow: 'var(--anrix-shadow-1)', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, overflow: 'hidden', background: 'var(--anrix-primary-soft)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 17, color: 'var(--anrix-primary-strong)' }}>
              {b.img_url_tx ? <img src={b.img_url_tx} alt={b.brnd_nm} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : String(b.brnd_nm).slice(0, 2).toUpperCase()}
            </span>
            <span style={{ flex: 1, fontSize: 15.5, fontWeight: 700, color: 'var(--anrix-text-strong)' }}>{b.brnd_nm}</span>
            <span className="anrix-muted" style={{ fontSize: 12.5 }}>{b.item_count} {t('guest.items', 'items')}</span>
            <IonIcon icon={arrowForward} style={{ fontSize: 18, color: 'var(--anrix-text-muted)' }} />
          </button>
        ))}
      </div>
    </DrillShell>
  );

  // Level 3 — the products (types/models) at the deepest chosen level, each opens detail.
  const renderCategoryProducts = () => (
    <DrillShell title={brand || subType || catName(cat)} subtitle={brand ? subType || catName(cat) : undefined} onBack={drillBack}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--anrix-surface)', border: '1px solid var(--anrix-border)', borderRadius: 12, padding: '8px 12px', marginBottom: 14 }}>
        <IonIcon icon={searchOutline} style={{ color: 'var(--anrix-text-muted)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('mat.searchProducts', 'Search products')} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15 }} />
      </div>
      {itemsQ.isLoading && <BrandLoader overlay label={t('guest.loading', 'Loading…')} />}
      <div style={productGrid}>{catProducts.map((p: any) => ProductCard(p, () => openSheet(p)))}</div>
    </DrillShell>
  );

  return (
    <IonPage>
      {/* Fixed top bar — lives in IonHeader (a sibling of IonContent) so it stays
          pinned while the page scrolls, instead of drifting with the content. */}
      <IonHeader className="ion-no-border">
        {/* Header: brand + location selector (asked up-front) + search + cart.
            No login button — tapping a product / cart routes to sign-in when needed. */}
        <div style={{ zIndex: 20, background: 'var(--anrix-surface)', borderBottom: '1px solid var(--anrix-border)',
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
          <LogoMark size={40} animated={false} />
          {/* Deliver-to location — the first thing we ask; tap to set it */}
          <button onClick={() => loginFor('/app/profile')} className="anrix-pressable" aria-label={t('guest.setLocation', 'Set your delivery location')}
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 2px' }}>
            <IonIcon icon={locationOutline} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--anrix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1 }}>
                {t('guest.deliverToSite', 'Deliver to site')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('guest.setLocationShort', 'Set location')}
                </span>
                <IonIcon icon={chevronDownOutline} style={{ fontSize: 13, color: 'var(--anrix-text-strong)', flexShrink: 0 }} />
              </div>
            </div>
          </button>
          <button onClick={() => setSearchOn((s) => !s)} aria-label={t('guest.search', 'Search')} style={iconBtn}>
            <IonIcon icon={searchOutline} style={{ fontSize: 22, color: searchOn ? 'var(--anrix-primary-strong)' : 'var(--anrix-text)' }} />
          </button>
          <button onClick={() => loginFor('/app/catalog')} aria-label={t('guest.cart', 'Cart')} style={{ ...iconBtn, position: 'relative' }}>
            <IonIcon icon={cartOutline} style={{ fontSize: 22, color: 'var(--anrix-text)' }} />
            <span aria-hidden style={{ position: 'absolute', top: 2, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--anrix-primary)' }} />
          </button>
        </div>

        {/* Collapsible search bar */}
        {searchOn && (
          <div style={{ padding: '10px 14px 4px', background: 'var(--anrix-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--anrix-surface)', border: '1px solid var(--anrix-border-strong)', borderRadius: 12, padding: '8px 12px' }}>
              <IonIcon icon={searchOutline} style={{ color: 'var(--anrix-text-muted)' }} />
              <input value={gq} onChange={(e) => setGq(e.target.value)} autoFocus placeholder={searchScope === 'workers' ? t('guest.searchWorkers', 'Search workers…') : searchScope === 'jobs' ? t('guest.searchJobs', 'Search jobs…') : t('guest.searchMaterials', 'Search materials…')} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15 }} />
              {gq && <button onClick={() => setGq('')} aria-label="Clear" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--anrix-text-muted)', fontSize: 18 }}>×</button>}
            </div>
          </div>
        )}
      </IonHeader>

      <IonContent>
        {/* ---------- SEARCH RESULTS ---------- */}
        {searching && (
          <div style={{ padding: '10px 16px 96px' }}>
            {searchResults.isLoading && <BrandLoader label={t('guest.loading', 'Loading…')} />}
            {searchResults.isSuccess && (searchResults.data ?? []).length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{t('guest.noResults', 'No products match your search.')}</div>}
            <div style={productGrid}>{(searchResults.data ?? []).map((p: any) => ProductCard(p, () => openSheet(p)))}</div>
          </div>
        )}

        {/* Rotating promo banner ("ads") at the top of Home */}
        {!searching && tab === 'home' && heroSlides.length > 0 && <HeroCarousel slides={heroSlides} onAction={setSeg} />}

        {/* Segment switch — only on the Home tab */}
        {tab === 'home' && !searching && (
          <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 14px 4px' }}>
            {(['materials', 'workers', 'jobs'] as Seg[]).map((s) => (
              <button key={s} onClick={() => setSeg(s)} style={{
                whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${seg === s ? 'var(--anrix-primary)' : 'var(--anrix-border)'}`,
                background: seg === s ? 'var(--anrix-primary)' : 'var(--anrix-surface)',
                color: seg === s ? 'var(--anrix-on-primary)' : 'var(--anrix-text)',
              }}>{t(`guest.seg_${s}`, s === 'materials' ? 'Materials' : s === 'workers' ? 'Workers' : 'Jobs')}</button>
            ))}
          </div>
        )}

        {/* ---------- HOME · MATERIAL CATEGORIES (tap to see the types inside) ----------
            Home shows categories only (e.g. "Cement") — no price/Add. Tapping a tile
            drills into that category's products IN PLACE (bottom nav stays on Home),
            where each type shows its price + Add (which opens the packet sheet). */}
        {!searching && tab === 'home' && seg === 'materials' && !cat && (
          <div style={{ padding: '16px 0 96px' }}>
            {/* Coupon strip — scannable offer chips (tap → sign in to apply) */}
            {coupons.length > 0 && (
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px', marginBottom: 18 }}>
                {coupons.map((c: any) => (
                  <button key={c.tag_tx} onClick={() => loginFor('/app/catalog')} className="anrix-pressable" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 12, border: '1px dashed var(--anrix-primary)', background: 'var(--anrix-primary-soft)', cursor: 'pointer', textAlign: 'left' }}>
                    <IonIcon icon={iconByName(c.icn_tx)} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{c.ttl_tx}</div>
                      <div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{c.sub_tx} · <span style={{ fontWeight: 800, color: 'var(--anrix-primary-strong)' }}>{c.tag_tx}</span></div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Quick actions — jump to the other segments / key tasks */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '0 16px', marginBottom: 22 }}>
              {[
                { icon: constructOutline, label: t('guest.hireWorkers', 'Hire workers'), on: () => setSeg('workers') },
                { icon: flashOutline, label: t('guest.electrician', 'Electrician'), on: () => setSeg('workers') },
                { icon: hammerOutline, label: t('guest.postJob', 'Post a job'), on: () => setSeg('jobs') },
                { icon: cubeOutline, label: t('guest.orderMaterials', 'Materials'), on: () => { /* already here */ } },
              ].map((a) => (
                <button key={a.label} onClick={a.on} className="anrix-pressable" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 4px', borderRadius: 14, border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', boxShadow: 'var(--anrix-shadow-1)', cursor: 'pointer' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: 'var(--anrix-primary-soft)' }}>
                    <IonIcon icon={a.icon} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)' }} />
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--anrix-text-strong)', textAlign: 'center', lineHeight: 1.2 }}>{a.label}</span>
                </button>
              ))}
            </div>

            {/* Popular products rail — tap a card to open its detail page */}
            {featured.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 12 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 16, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>
                    <IonIcon icon={flashOutline} style={{ fontSize: 18, color: 'var(--anrix-primary-strong)' }} /> {t('guest.popularNow', 'Popular right now')}
                  </div>
                </div>
                <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 16px 4px' }}>
                  {featured.map((p: any) => (
                    <div key={p.item_id} style={{ flex: '0 0 148px' }}>{ProductCard(p, () => openSheet(p))}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Shop by project — curated kits (add-all material lists) */}
            {kits.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 16, fontWeight: 800, color: 'var(--anrix-text-strong)', padding: '0 16px', marginBottom: 12 }}>
                  <IonIcon icon={cubeOutline} style={{ fontSize: 18, color: 'var(--anrix-primary-strong)' }} /> {t('guest.shopByProject', 'Shop by project')}
                </div>
                <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 16px 4px' }}>
                  {kits.map((k: any) => (
                    <button key={k.kit_id} onClick={() => setOpenKit(k)} className="anrix-pressable" style={{ flexShrink: 0, width: 210, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', boxShadow: 'var(--anrix-shadow-1)', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                      <div style={{ position: 'relative', height: 96, background: 'var(--anrix-primary-soft)', overflow: 'hidden' }}>
                        {k.img_url_tx && <img src={k.img_url_tx} alt={k.nm_tx} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        {k.tag_tx && <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 9px', borderRadius: 999, background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{k.tag_tx}</span>}
                      </div>
                      <div style={{ padding: '10px 12px 12px' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{k.nm_tx}</div>
                        <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub_tx}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 9, color: 'var(--anrix-primary-strong)', fontSize: 12.5, fontWeight: 800 }}>
                          {k.item_count} {t('guest.items', 'items')} <IonIcon icon={arrowForward} style={{ fontSize: 13 }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Shop by category */}
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--anrix-text-strong)', padding: '0 16px', marginBottom: 14 }}>{t('guest.shopByCategory', 'Shop by category')}</div>
            {catsQ.isLoading && <BrandLoader label={t('guest.loading', 'Loading…')} />}
            {catsQ.isSuccess && (catsQ.data ?? []).length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{t('guest.noProducts', 'No products yet.')}</div>}
            <div style={{ ...categoryGrid, padding: '0 16px' }}>
              {(catsQ.data ?? []).map((c: any) => (
                <CategoryTile key={c.ctgry_cd} c={c} onClick={() => { setSubType(null); setBrand(null); setCat(c.ctgry_cd); setQ(''); }} />
              ))}
            </div>

            {/* New arrivals rail — highlighted in a soft branded panel with NEW badges */}
            {newArrivals.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ margin: '0 16px', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(160deg, var(--anrix-primary-soft) 0%, var(--anrix-surface) 62%)', border: '1px solid var(--anrix-primary)', boxShadow: 'var(--anrix-shadow-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 16px 12px' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: 'var(--anrix-primary)' }}>
                      <IonIcon icon={sparklesOutline} style={{ fontSize: 20, color: 'var(--anrix-on-primary)' }} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{t('guest.newArrivals', 'New arrivals')}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)' }}>{t('guest.freshlyAdded', 'Freshly added to the catalog')}</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 999, background: 'var(--anrix-surface)', border: '1px solid var(--anrix-primary)', color: 'var(--anrix-primary-strong)', fontSize: 11.5, fontWeight: 800 }}>
                      <IonIcon icon={flashOutline} style={{ fontSize: 12 }} /> {t('guest.justIn', 'Just in')}
                    </span>
                  </div>
                  <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 16px' }}>
                    {newArrivals.map((p: any) => (
                      <div key={p.item_id} style={{ flex: '0 0 148px', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, padding: '3px 8px', borderRadius: 999, background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: 'var(--anrix-shadow-1)' }}>{t('guest.newBadge', 'New')}</span>
                        {ProductCard(p, () => openSheet(p))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trust strip — DB-managed assurances (verified pros, GST, secure, fast) */}
            {trust.length > 0 && (
              <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginTop: 26 }}>
                {trust.map((h: any) => (
                  <div key={h.label_tx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '13px 6px', borderRadius: 14, border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', textAlign: 'center' }}>
                    <IonIcon icon={iconByName(h.icn_tx)} style={{ fontSize: 21, color: 'var(--anrix-primary-strong)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--anrix-text)', lineHeight: 1.2 }}>{h.label_tx}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sponsored ads — a slot that "plays" ad banners when any are supplied */}
            {ads.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 16, fontWeight: 800, color: 'var(--anrix-text-strong)', padding: '0 16px', marginBottom: 12 }}>
                  <IonIcon icon={sparklesOutline} style={{ fontSize: 18, color: 'var(--anrix-primary-strong)' }} /> {t('guest.dealsOffers', 'Deals & offers')}
                </div>
                <AdBanner ads={ads} onCta={() => loginFor('/app/catalog')} />
              </div>
            )}
          </div>
        )}

        {/* ---------- HOME · WORKERS ---------- */}
        {!searching && tab === 'home' && seg === 'workers' && (
          <div style={{ padding: '4px 16px 96px' }}>
            {workersQ.isLoading && <BrandLoader label={t('guest.loading', 'Loading…')} />}

            {/* ---------- Service picker: big branded avatar per trade ----------
                Shown until the seeker picks a trade (or runs a worker search). Tapping
                a service drills into all its registered professionals. */}
            {!workerTrade && !workerSearching ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '8px 0 2px' }}>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{t('guest.ourServices', 'Our Services')}</h2>
                  {!workersQ.isLoading && <span className="anrix-muted" style={{ fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>{services.length} {t('guest.trades', 'trades')}</span>}
                </div>
                <p className="anrix-muted" style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{t('guest.servicesSub', 'Pick a trade to see verified professionals near you.')}</p>
                {workersQ.isSuccess && services.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{t('guest.noWorkers', 'No workers here yet. Try another trade.')}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                  {services.map((s) => (
                    <ServiceCard key={s.name} s={s} t={t} onClick={() => setWorkerTrade(s.name)} />
                  ))}
                </div>
              </>
            ) : (
              /* ---------- Professionals for the chosen trade ---------- */
              <>
                {!workerSearching && (
                  <button onClick={() => setWorkerTrade(null)} className="anrix-pressable" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--anrix-primary-strong)' }}>
                    <IonIcon icon={chevronBackOutline} style={{ fontSize: 15 }} /> {t('guest.ourServices', 'Our Services')}
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '6px 0 2px' }}>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{workerTrade ?? t('guest.hireWorkers', 'Hire skilled workers')}</h2>
                  {!workersQ.isLoading && <span className="anrix-muted" style={{ fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>{workers.length} {t('guest.available', 'available')}</span>}
                </div>
                <p className="anrix-muted" style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{t('guest.workersSub', 'Verified tradespeople near you — rated, priced, ready to book.')}</p>

                {/* Quick trade switcher */}
                {workerTrades.length > 1 && (
                  <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px -16px 4px', padding: '0 16px' }}>
                    {[null, ...workerTrades].map((tr) => {
                      const active = workerTrade === tr;
                      const label = tr ?? t('guest.allTrades', 'All trades');
                      return (
                        <button key={tr ?? '__all'} onClick={() => setWorkerTrade(tr)} className="anrix-pressable" style={{
                          whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                          border: `1.5px solid ${active ? 'var(--anrix-primary)' : 'var(--anrix-border-strong)'}`,
                          background: active ? 'var(--anrix-primary)' : 'var(--anrix-surface)',
                          color: active ? 'var(--anrix-on-primary)' : 'var(--anrix-text)', flexShrink: 0,
                        }}>{label}</button>
                      );
                    })}
                  </div>
                )}

                {workersQ.isSuccess && workers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{workerSearching ? t('guest.noWorkersSearch', 'No workers match your search.') : t('guest.noWorkers', 'No workers here yet. Try another trade.')}</div>
                )}
                <div className="anrix-grid-products" style={{ marginTop: 14 }}>
                  {workers.map((w: any) => (
                    <WorkerCard key={w.usr_id} w={w} t={t} showTrade={false} onHire={() => loginFor('/app/discover')} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------- HOME · JOBS ---------- */}
        {!searching && tab === 'home' && seg === 'jobs' && (
          <div style={{ padding: '4px 16px 96px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '8px 0 2px' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{t('guest.findWork', 'Find work near you')}</h2>
              {!jobsQ.isLoading && <span className="anrix-muted" style={{ fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>{jobs.length} {t('guest.openings', 'openings')}</span>}
            </div>
            <p className="anrix-muted" style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{t('guest.jobsSub', 'Live construction openings — apply in one tap once you sign in.')}</p>

            {jobsQ.isLoading && <BrandLoader label={t('guest.loading', 'Loading…')} />}
            {jobsQ.isSuccess && jobs.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{jobSearching ? t('guest.noJobsSearch', 'No openings match your search.') : t('guest.noJobs', 'No openings right now. Check back soon.')}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {jobs.map((j: any) => (
                <JobCard key={j.job_id} j={j} t={t} onApply={() => loginFor('/app/jobs')} />
              ))}
            </div>
          </div>
        )}

        {/* ---------- CATEGORY · sectioned grid ---------- */}
        {!searching && tab === 'category' && !cat && (
          <div style={{ padding: '6px 16px 96px' }}>
            {catsQ.isLoading && <BrandLoader label={t('guest.loading', 'Loading…')} />}
            {sections.map(([section, cats]) => (
              <div key={section} style={{ marginTop: 28 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--anrix-text-strong)', marginBottom: 18 }}>{section}</div>
                <div style={categoryGrid}>
                  {cats.map((c: any) => (
                    <CategoryTile key={c.ctgry_cd} c={c} onClick={() => { setSubType(null); setBrand(null); setCat(c.ctgry_cd); setQ(''); }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}


        {/* ---------- ORDERS / PROFILE (guest → centered sign-in panel) ---------- */}
        {!searching && (tab === 'orders' || tab === 'account') && (
          <div style={{ minHeight: 'calc(100dvh - 150px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px calc(84px + env(safe-area-inset-bottom))', textAlign: 'center' }}>
            <div style={{ width: 76, height: 76, borderRadius: 22, margin: '0 auto 16px', display: 'grid', placeItems: 'center', background: 'var(--anrix-primary-soft)' }}>
              <IonIcon icon={tab === 'orders' ? receiptOutline : personOutline} style={{ fontSize: 36, color: 'var(--anrix-primary-strong)' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>
              {tab === 'orders' ? t('guest.ordersTitle', 'Track your orders') : t('guest.accountTitle', 'Your account')}
            </h3>
            <p className="anrix-muted" style={{ fontSize: 14, maxWidth: 300, margin: '0 auto 20px', lineHeight: 1.5 }}>
              {tab === 'orders'
                ? t('guest.ordersMsg', 'Log in to place orders and track their status.')
                : t('guest.accountMsg', 'Log in or create an account to manage your profile, wallet, KYC and more.')}
            </p>
            <button onClick={() => loginFor(tab === 'orders' ? '/app/orders' : '/app/profile')} style={{ height: 52, minWidth: 220, padding: '0 24px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 15.5,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IonIcon icon={lockClosedOutline} /> {t('guest.loginSignup', 'Log in / Sign up')} <IonIcon icon={arrowForward} />
            </button>
          </div>
        )}

      </IonContent>

      {/* Fixed bottom menu — mirrors the signed-in BUYER nav (Home · Category · Orders · Profile). */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
        display: 'flex', background: 'var(--anrix-surface)', borderTop: '1px solid var(--anrix-border)',
        paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -4px 16px rgba(22,24,29,0.06)' }}>
        {[
          { key: 'home', label: t('guest.navHome', 'Home'), icon: homeOutline, on: () => { setTab('home'); resetDrill(); }, active: tab === 'home' },
          { key: 'category', label: t('guest.navCategory', 'Category'), icon: gridOutline, on: () => { setTab('category'); resetDrill(); }, active: tab === 'category' },
          { key: 'orders', label: t('guest.navOrders', 'Orders'), icon: receiptOutline, on: () => setTab('orders'), active: tab === 'orders' },
          { key: 'account', label: t('guest.navProfile', 'Profile'), icon: personOutline, on: () => setTab('account'), active: tab === 'account' },
        ].map((n) => (
          <button key={n.key} onClick={n.on} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '9px 0 8px', border: 'none', background: 'transparent', cursor: 'pointer',
            color: n.active ? 'var(--anrix-primary-strong)' : 'var(--anrix-text-muted)' }}>
            {n.active && <span aria-hidden style={{ position: 'absolute', top: 0, width: 26, height: 3, borderRadius: 3, background: 'var(--anrix-primary)' }} />}
            <IonIcon icon={n.icon} style={{ fontSize: 22 }} />
            <span style={{ fontSize: 11, fontWeight: n.active ? 800 : 600 }}>{n.label}</span>
          </button>
        ))}
      </div>

      {/* ---------- CATEGORY DRILL (full page) ----------
          Rendered at IonPage level so a category opens as its OWN page (over the nav).
          Adapts to how deep the catalog goes: sub-types → brands → products. */}
      {!searching && cat && (tab === 'home' || tab === 'category') && (
        drillLevel === 'subtype' ? renderSubtypes()
        : drillLevel === 'brand' ? renderBrands()
        : renderCategoryProducts()
      )}

      {/* ---------- KIT DETAIL (full page) ---------- */}
      {openKit && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'var(--anrix-bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top) + 10px) 14px 10px', background: 'var(--anrix-surface)', borderBottom: '1px solid var(--anrix-border)' }}>
            <button onClick={() => setOpenKit(null)} aria-label={t('guest.back', 'Back')} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: 'var(--anrix-surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <IonIcon icon={chevronBackOutline} style={{ fontSize: 22, color: 'var(--anrix-text-strong)' }} />
            </button>
            <strong style={{ flex: 1, minWidth: 0, fontSize: 17, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{openKit.nm_tx}</strong>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ position: 'relative', height: 180, background: 'var(--anrix-primary-soft)', overflow: 'hidden' }}>
              {openKit.img_url_tx && <img src={openKit.img_url_tx} alt={openKit.nm_tx} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ padding: '14px 16px 4px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{openKit.nm_tx}</div>
              <div style={{ fontSize: 13, color: 'var(--anrix-text-muted)', marginTop: 3 }}>{openKit.sub_tx}</div>
              <div style={detailHdr}>{t('guest.whatsInTheKit', "What's in the kit")}</div>
            </div>
            {kitDetailQ.isLoading && <BrandLoader label={t('guest.loading', 'Loading…')} />}
            <div style={{ ...productGrid, padding: '0 16px 24px' }}>
              {(kitDetailQ.data?.items ?? []).map((p: any) => ProductCard(p, () => { setOpenKit(null); openSheet(p); }))}
            </div>
          </div>
          {/* Sticky Add-all bar */}
          <div style={{ padding: '12px 18px calc(12px + env(safe-area-inset-bottom))', background: 'var(--anrix-surface)', borderTop: '1px solid var(--anrix-border)' }}>
            <button onClick={() => loginFor('/app/catalog')} style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IonIcon icon={cartOutline} /> {t('guest.addAll', 'Add all')}{kitDetailQ.data?.total_am ? ` · ₹${Number(kitDetailQ.data.total_am).toLocaleString('en-IN')}` : ''}
            </button>
          </div>
        </div>
      )}

      {/* ---------- PRODUCT DETAIL (full page) ----------
          Rendered at IonPage level (NOT inside IonContent, whose scroll container traps
          position:fixed) so it truly takes over the whole screen — over the bottom nav
          too. Stacks above the category page. Tapping a product opens it; Add prompts
          sign-in. Pack prices are honest multiples of the item's unit price. */}
      {sheet && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'var(--anrix-bg)', display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top) + 10px) 14px 10px', background: 'var(--anrix-surface)', borderBottom: '1px solid var(--anrix-border)' }}>
            <button onClick={() => setSheet(null)} aria-label={t('guest.back', 'Back')} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: 'var(--anrix-surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <IonIcon icon={chevronBackOutline} style={{ fontSize: 22, color: 'var(--anrix-text-strong)' }} />
            </button>
            <strong style={{ flex: 1, minWidth: 0, fontSize: 16, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sheet.nm_tx}</strong>
            <button onClick={() => loginFor('/app/catalog')} aria-label={t('guest.cart', 'Cart')} style={{ ...iconBtn }}>
              <IonIcon icon={cartOutline} style={{ fontSize: 22, color: 'var(--anrix-text)' }} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Hero image */}
            <div style={{ position: 'relative', height: 240, background: categoryAccent(sheet.ctgry_nm || 'Other').bg, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              <IonIcon icon={iconByName(sheet.icn_tx)} style={{ fontSize: 56, color: categoryAccent(sheet.ctgry_nm || 'Other').fg, opacity: 0.85 }} />
              {sheet.img_url_tx && <img src={sheet.img_url_tx} alt={sheet.nm_tx} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>

            <div style={{ padding: '16px 18px 24px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: categoryAccent(sheet.ctgry_nm || 'Other').fg, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sheet.ctgry_nm}{sheet.brnd_tx && sheet.brnd_tx !== 'Generic' ? ` · ${sheet.brnd_tx}` : ''}</div>
              <h1 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--anrix-text-strong)', lineHeight: 1.2 }}>{sheet.nm_tx}</h1>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>₹{unitPrice.toLocaleString('en-IN')}<span className="anrix-muted" style={{ fontSize: 13, fontWeight: 500 }}> /{sheet.unit_tx}</span></div>

              {/* Colour options — real colour/finish variants from the backend. */}
              {colours.length > 0 && (
                <>
                  <div style={detailHdr}>{t('guest.colour', 'Colour')}: <span style={{ color: 'var(--anrix-text-strong)' }}>{colours[colorIdx]?.clr_nm}</span></div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                    {colours.map((c: any, i: number) => (
                      <button key={c.variant_id ?? i} onClick={() => setColorIdx(i)} aria-label={c.clr_nm} title={c.clr_nm} style={{ width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', background: c.clr_hex || 'var(--anrix-surface-2)', border: i === colorIdx ? '2px solid var(--anrix-primary)' : '2px solid var(--anrix-border-strong)', boxShadow: i === colorIdx ? '0 0 0 3px var(--anrix-primary-soft)' : 'none' }} />
                    ))}
                  </div>
                </>
              )}

              {/* Pack options — pack sizes come from the DB (per category, else global) */}
              {packList.length > 0 && (<>
              <div style={detailHdr}>{t('guest.choosePack', 'Choose pack')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {packList.map((n, idx) => {
                  const on = idx === packIdx;
                  return (
                    <button key={n} onClick={() => setPackIdx(idx)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${on ? 'var(--anrix-primary)' : 'var(--anrix-border-strong)'}`,
                      background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                    }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', border: `2px solid ${on ? 'var(--anrix-primary)' : 'var(--anrix-border-strong)'}` }}>
                        {on && <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--anrix-primary)' }} />}
                      </span>
                      <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--anrix-text-strong)' }}>{n} × {sheet.unit_tx}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>₹{(unitPrice * n).toLocaleString('en-IN')}</span>
                    </button>
                  );
                })}
              </div>
              </>)}

              {/* Specifications — real spec rows from the backend when present, else honest
                  field-derived rows so the section is never empty. */}
              <div style={detailHdr}>{t('guest.specifications', 'Specifications')}</div>
              <div className="anrix-card" style={{ padding: '2px 14px' }}>
                {(specRows.length > 0
                  ? specRows.map((s: any) => ({ k: s.k_tx, v: s.v_tx }))
                  : [
                      { k: t('guest.specCategory', 'Category'), v: sheet.ctgry_nm },
                      ...(sheet.brnd_tx && sheet.brnd_tx !== 'Generic' ? [{ k: t('guest.specBrand', 'Brand'), v: sheet.brnd_tx }] : []),
                      { k: t('guest.specUnit', 'Sold by'), v: sheet.unit_tx },
                      { k: t('guest.specPrice', 'Unit price'), v: `₹${unitPrice.toLocaleString('en-IN')} / ${sheet.unit_tx}` },
                      ...(sheet.eta_min ? [{ k: t('guest.specDelivery', 'Delivery'), v: t('guest.etaToSite', '~{{m}} min to site', { m: sheet.eta_min }) }] : []),
                    ]
                ).map((s: any, i: number) => (
                  <div key={s.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
                    <span className="anrix-muted" style={{ fontSize: 13.5 }}>{s.k}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--anrix-text-strong)', textAlign: 'right' }}>{s.v}</span>
                  </div>
                ))}
              </div>

              {/* Features — from the backend (shown only when the product has them). */}
              {featureList.length > 0 && (
                <>
                  <div style={detailHdr}>{t('guest.features', 'Features')}</div>
                  <div className="anrix-card" style={{ padding: '4px 14px' }}>
                    {featureList.map((f: string, i: number) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: 'var(--anrix-success)' }}>
                          <IonIcon icon={checkmark} style={{ fontSize: 13, color: '#fff' }} />
                        </span>
                        <span style={{ fontSize: 14, color: 'var(--anrix-text-strong)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Highlights — trade assurances (DB-managed, apply to every order) */}
              {highlights.length > 0 && (
                <>
                  <div style={detailHdr}>{t('guest.highlights', 'Highlights')}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {highlights.map((h: any) => (
                      <div key={h.label_tx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '13px 6px', borderRadius: 14, border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', textAlign: 'center' }}>
                        <IonIcon icon={iconByName(h.icn_tx)} style={{ fontSize: 21, color: 'var(--anrix-primary-strong)' }} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--anrix-text)' }}>{h.label_tx}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sticky Add bar */}
          <div style={{ padding: '12px 18px calc(12px + env(safe-area-inset-bottom))', background: 'var(--anrix-surface)', borderTop: '1px solid var(--anrix-border)' }}>
            <button onClick={() => loginFor('/app/catalog')} style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IonIcon icon={cartOutline} /> {t('guest.add', 'Add')} · ₹{(unitPrice * packMult).toLocaleString('en-IN')}
            </button>
          </div>
        </div>
      )}
    </IonPage>
  );
}

// Compact storefront product grid — small tidy cards (2–3 per row on a phone, more
// on wider screens). `alignItems: start` keeps each card at its content height
// (no stretching → no wasted vertical gap). Category tiles keep their own 4-col grid.
const productGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(124px, 1fr))', columnGap: 12, rowGap: 16, alignItems: 'start' };
const iconBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: 12, border: 'none', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 };
// Section heading on the product detail page (Colour / Choose pack / Specifications / Highlights).
const detailHdr: React.CSSProperties = { marginTop: 22, marginBottom: 10, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--anrix-primary-strong)' };
const addBtnFull: React.CSSProperties = { marginTop: 6, width: '100%', height: 28, borderRadius: 8, border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 };
