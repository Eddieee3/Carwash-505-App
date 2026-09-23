# 4 · Modelo de datos (ampliación del esquema de la web)

Todas las tablas nuevas viven en el **mismo** Postgres de Supabase. Siguen la regla de la web: migración en `../Car Wash 505/supabase/migrations/` + rollback en `supabase/rollback/` + casos en `tests/integration/rls.test.ts`.

Convenciones heredadas:
- `uuid` como PK.
- `created_at` / `updated_at` como `timestamptz` (UTC).
- Estados con `CHECK`.
- Teléfono E.164.
- Moneda `USD | NIO` por fila, como en `services.currency`.

## 4.1 Cambios a tablas existentes

| Tabla | Cambio |
|---|---|
| `profiles.role` | Añadir `'operator'` al `CHECK` (colaboradores) |
| `services` | `bay_kind text check in ('wash','detail')`, `duration_minutes int` (**interno**, para agendar), `bookable boolean default false` |
| `business_settings` | `booking_slot_minutes` (15), `reminder_minutes` (90), `confirm_window_minutes` (30), `no_show_grace_minutes` (15), `ios_store_url`, `android_store_url` |
| trigger de alta de usuario | **Hecho en F0 (migración 7).** Invitado desde el panel (`auth.users.invited_at`, que solo escribe Supabase) → `profiles`. Cualquier otro alta → `customers`. No se usa `raw_user_meta_data`: lo controla quien se registra |

## 4.2 Clientes y vehículos

```sql
customers (
  id uuid pk references auth.users,
  full_name text, whatsapp text check (E.164), email text,
  birthday date null, locale text check in ('es','en'),
  preferred_windows jsonb,            -- [{weekday:6, from:"08:00", to:"11:00"}]
  marketing_consent boolean default false, marketing_consent_at timestamptz,
  referral_code text unique, referred_by uuid null references customers,
  tier text check in ('free','gold','platinum') default 'free',
  created_at, updated_at
)
vehicles (
  id, customer_id → customers, kind check in ('car','suv','other'),  -- = leads.vehicle_type y price_car/price_suv
  make, model, year int, color, plate text, nickname, is_default boolean, archived_at
)
```

## 4.3 Capacidad y reservas

```sql
create extension if not exists btree_gist;

bays ( id, name, kind check in ('wash','detail'), active boolean, sort_order )

bay_closures ( id, bay_kind, starts_at, ends_at, reason check in ('weather','maintenance','other'), created_by )

bookings (
  id, reference_code text unique check (~ '^CW505-[0-9]{6}-[A-HJKMNP-Z2-9]{4}$'),  -- mismo formato que leads
  customer_id, vehicle_id, service_id, bay_id,
  slot tstzrange not null,
  status text check in ('pending','confirmed','late','unconfirmed','checked_in','in_progress',
                        'completed','cancelled','no_show'),
  attendance_reply text null check in ('attending','late','cancel'), replied_at,
  eta_at timestamptz null,              -- "Llego en 10 min"
  assigned_staff_id uuid null → profiles,
  started_at, finished_at,
  price_snapshot jsonb not null,        -- base, reglas aplicadas, extras, total, moneda
  source check in ('app','web','walk_in','staff'),
  idempotency_key text unique,
  created_at, updated_at,
  exclude using gist (bay_id with =, slot with &&)
    where (status in ('pending','confirmed','late','unconfirmed','checked_in','in_progress'))
)
booking_addons ( booking_id, product_id, qty, unit_price, currency )
booking_events ( id, booking_id, from_status, to_status, actor_id, at, note )   -- línea de tiempo
booking_media  ( id, booking_id, phase check in ('before','after','damage'), storage_path, taken_by, taken_at )
```

**RPC** (`security definer`, validan rol y dueño):
- `available_slots(day date, service_id)`
- `book_slot(...)`
- `reply_attendance(booking_id, reply)`
- `set_eta(booking_id, minutes)`
- `advance_booking(booking_id, to_status)`: solo transiciones válidas, y solo personal
- `cancel_booking(booking_id)`

## 4.4 Precios dinámicos y upselling

```sql
pricing_rules (
  id, name, kind check in ('peak','valley','weather','flash','membership'),
  conditions jsonb,        -- {weekdays:[1], from:"14:00", to:"16:00"} | {rain_prob_gte:70}
  adjustment_pct numeric check (adjustment_pct between -50 and 50),
  service_ids uuid[] null, priority int, active boolean, starts_at, ends_at
)
products ( id, name_es, name_en, price, currency, active, image_path, stock_item_id null )  -- extras vendibles
```

## 4.5 Fidelización y wallet

```sql
loyalty_ledger   ( id, customer_id, delta int, reason check in ('booking_completed','review','referral',
                   'challenge','spin','redeem','adjustment'), ref_id uuid, created_by, created_at )  -- solo INSERT
badges           ( id, code unique, name_es, name_en, rule jsonb, icon )
customer_badges  ( customer_id, badge_id, earned_at, primary key (customer_id, badge_id) )
challenges       ( id, month date, rule jsonb, reward_points int, active )
spins            ( id, booking_id unique, customer_id, prize jsonb, expires_at, redeemed_at )
referrals        ( id, referrer_id, referred_id unique, status check in ('pending','qualified','rewarded'), qualified_at )
reviews          ( id, booking_id unique, rating smallint check 1..5, comment, created_at )  -- INTERNAS, nunca públicas

membership_plans ( id, code check in ('free','gold','platinum'), price null, currency, period check in ('month','year'),
                   benefits jsonb, active )          -- price null = no confirmado, no se vende
subscriptions    ( id, customer_id, plan_id, status check in ('active','past_due','cancelled'),
                   current_period_end, provider, provider_ref )
gift_cards       ( id, code_hash text unique, initial_amount, currency, owner_id null, purchaser_id, status, expires_at )
gift_card_ledger ( id, gift_card_id, delta, booking_id null, created_at )
gift_card_transfers ( id, gift_card_id, from_id, to_id, status check in ('pending','accepted','cancelled'), created_at )
vip_cards        ( id, customer_id, nfc_uid_hash null, qr_secret, status, issued_at )   -- complementa vip_program de la web
```

## 4.6 Soporte y contenido

```sql
support_tickets ( id, customer_id, booking_id null, kind check in ('complaint','pre_existing_damage','other'),
                  description, status check in ('open','in_review','resolved','closed'), resolution, created_at )
ticket_media    ( id, ticket_id, storage_path )
care_tips       ( id, title_es, title_en, body_es, body_en, image_path, status check in ('draft','published') )
```

## 4.7 Marketing y notificaciones

```sql
push_tokens      ( id, user_id, token unique, platform, last_seen_at )
campaigns        ( id, name, trigger check in ('weather','inactivity_14','inactivity_30','birthday','occupancy','manual'),
                   message_es, message_en, reward jsonb null, active, max_per_week int )
notification_log ( id, user_id, campaign_id null, kind, sent_at, opened_at )
weather_snapshots( id, fetched_at, forecast jsonb )    -- Managua
nfc_tags         ( id text pk, purpose check in ('checkin','profile','promo'), active, created_at )
```

## 4.8 Operación y analítica (propietario)

```sql
inventory_items     ( id, name, unit, min_stock numeric, active )
inventory_movements ( id, item_id, delta numeric, reason check in ('purchase','usage','adjustment'),
                      unit_cost null, booking_id null, created_by, created_at )
maintenance_tasks   ( id, title, assignee_id → profiles, due_at, recurrence text null, status, done_at )
no_show_scores      ( customer_id pk, score numeric, factors jsonb, computed_at )
customer_restrictions ( id, customer_id, reason, starts_at, ends_at null, created_by, reviewed_at )
```

## 4.9 RLS (resumen)

| Tabla(s) | Cliente | Colaborador (`operator`) | Propietario |
|---|---|---|---|
| `customers`, `vehicles` | solo propias (R/W) | R: nombre, vehículo (vista `staff_booking_view`) | R/W |
| `bookings` | R propias. Escritura **solo** por RPC | R del día. Cambio de estado solo por RPC | R/W |
| `booking_media` | R de sus reservas | R/W | R/W |
| `loyalty_ledger`, `gift_card_ledger` | R propias. **Nunca** escritura directa | — | R. Ajustes por RPC con auditoría |
| `pricing_rules`, `campaigns`, `customer_restrictions`, `no_show_scores` | — | — | R/W |
| `inventory_*` | — | R + insertar `usage` | R/W |
| `bays`, `products`, `membership_plans`, `care_tips` (publicados) | R | R | R/W |

**Pruebas obligatorias** (PGlite):
- Dos `book_slot` concurrentes sobre la misma franja → solo una pasa.
- Un cliente no ve reservas ajenas.
- Un operador no puede leer `pricing_rules` ni el teléfono completo del cliente.
- Nadie puede hacer `UPDATE` sobre `loyalty_ledger`.
- Un alta desde la app no crea `profiles`.
