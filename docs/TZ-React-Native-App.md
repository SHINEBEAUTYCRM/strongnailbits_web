# Техническое задание: ShineShop B2B — React Native приложение

> **Версия**: 1.0  
> **Дата**: 11.02.2026  
> **Проект**: Мобильное приложение ShineShop B2B (iOS + Android)  
> **Основа**: Копия веб-приложения shineshopb2b.com (Next.js 16)  
> **База данных**: Общая Supabase (PostgreSQL) — та же, что и у веба

---

## Содержание

1. [Общее описание](#1-общее-описание)
2. [Технологический стек](#2-технологический-стек)
3. [Архитектура проекта](#3-архитектура-проекта)
4. [Подключение к Supabase](#4-подключение-к-supabase)
5. [Навигация и структура экранов](#5-навигация-и-структура-экранов)
6. [Экраны: Детальное описание](#6-экраны-детальное-описание)
7. [Компоненты: Детальное описание](#7-компоненты-детальное-описание)
8. [Стейт-менеджмент (Zustand)](#8-стейт-менеджмент-zustand)
9. [Аутентификация](#9-аутентификация)
10. [API-интеграция](#10-api-интеграция)
11. [Push-уведомления](#11-push-уведомления)
12. [Аналитика](#12-аналитика)
13. [Дизайн-система](#13-дизайн-система)
14. [Оффлайн-режим и кэширование](#14-оффлайн-режим-и-кэширование)
15. [Deep Linking](#15-deep-linking)
16. [Безопасность](#16-безопасность)
17. [Производительность](#17-производительность)
18. [Тестирование](#18-тестирование)
19. [Сборка и публикация](#19-сборка-и-публикация)
20. [Структура файлов проекта](#20-структура-файлов-проекта)
21. [База данных: Полная схема](#21-база-данных-полная-схема)
22. [Омниканальная синхронизация (Веб ↔ Мобильное)](#22-омниканальная-синхронизация-веб--мобильное)
23. [Маппинг Web → Mobile](#23-маппинг-web--mobile)
24. [Этапы разработки](#24-этапы-разработки)

---

## 1. Общее описание

### 1.1 О проекте

**ShineShop B2B** — B2B платформа для оптовой продажи профессиональной nail-косметики (гель-лаки, базы, топы, инструменты). Мобильное приложение является полной копией веб-версии и работает с той же базой данных Supabase.

### 1.2 Целевая аудитория

- Мастера маникюра
- Владельцы nail-салонов  
- Оптовые закупщики
- B2B клиенты с индивидуальными ценами

### 1.3 Платформы

- **iOS**: 15.0+
- **Android**: API 24+ (Android 7.0+)

### 1.4 Языки интерфейса

- Украинский (основной)
- Русский (переключаемый)

### 1.5 Валюта

- Гривна (₴), формат: `1 234.00 ₴`

---

## 2. Технологический стек

### 2.1 Основные технологии

| Технология | Версия | Назначение |
|---|---|---|
| React Native | 0.76+ | Фреймворк мобильного приложения |
| Expo | SDK 52+ | Платформа разработки и сборки |
| TypeScript | 5.x | Типизация |
| Expo Router | 4.x | Файловая навигация (аналог Next.js App Router) |
| Zustand | 5.x | Стейт-менеджмент (идентично вебу) |
| @supabase/supabase-js | 2.x | Клиент Supabase |
| expo-secure-store | latest | Безопасное хранение токенов |
| @react-native-async-storage/async-storage | latest | Персистентное хранилище |

### 2.2 UI библиотеки

| Библиотека | Назначение |
|---|---|
| react-native-reanimated | Анимации |
| react-native-gesture-handler | Жесты (свайпы, зум) |
| expo-image | Оптимизированные изображения (замена Next.js Image) |
| expo-linear-gradient | Градиенты |
| lucide-react-native | Иконки (идентично вебу) |
| react-native-safe-area-context | Safe area |
| @shopify/flash-list | Производительные списки |
| react-native-mmkv | Быстрое хранилище для Zustand |

### 2.3 Дополнительные

| Библиотека | Назначение |
|---|---|
| expo-notifications | Push-уведомления |
| expo-linking | Deep links |
| expo-haptics | Тактильная обратная связь |
| expo-splash-screen | Сплеш-скрин |
| expo-font | Кастомные шрифты |
| expo-clipboard | Буфер обмена |
| react-native-share | Шаринг товаров |
| @gorhom/bottom-sheet | Нижние шторки (фильтры, корзина) |
| react-native-markdown-display | Рендеринг Markdown (CMS-страницы) |

---

## 3. Архитектура проекта

### 3.1 Общая архитектура

```
┌─────────────────────────────────────────────┐
│          React Native App (Expo)            │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  │
│  │ Screens │  │Components│  │   Stores   │  │
│  │ (Expo   │  │(Shared  │  │  (Zustand)  │  │
│  │ Router) │  │  UI)    │  │             │  │
│  └────┬────┘  └────┬────┘  └─────┬──────┘  │
│       │            │              │          │
│  ┌────┴────────────┴──────────────┴──────┐  │
│  │           Supabase Client             │  │
│  │    (@supabase/supabase-js)            │  │
│  └───────────────┬───────────────────────┘  │
└──────────────────┼──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │   Supabase Cloud    │
        │                     │
        │  ┌──────────────┐   │
        │  │  PostgreSQL   │   │
        │  │  (общая БД)   │   │
        │  └──────────────┘   │
        │  ┌──────────────┐   │
        │  │   Auth        │   │
        │  └──────────────┘   │
        │  ┌──────────────┐   │
        │  │   Storage     │   │
        │  └──────────────┘   │
        │  ┌──────────────┐   │
        │  │  Realtime     │   │
        │  └──────────────┘   │
        └─────────────────────┘
```

### 3.2 Принцип работы с общей БД

Мобильное приложение работает **напрямую** с Supabase (без промежуточного сервера):

- **Чтение данных** — через Supabase JS Client (RLS-политики обеспечивают безопасность)
- **Аутентификация** — через Supabase Auth (phone OTP)
- **Создание заказов** — через Supabase RPC или Edge Functions
- **Загрузка изображений** — через Supabase Storage
- **Realtime** — подписка на изменения заказов, корзины

### 3.3 Что НЕ переносится в мобильное приложение

| Функциональность | Причина |
|---|---|
| Админ-панель | Остаётся только в вебе |
| Cron-задачи | Выполняются на Vercel |
| Синхронизация товаров (импорт) | Серверная логика (веб) |
| API v1 (1C интеграция) | Серверная логика (веб) |
| Вебхуки | Серверная логика (веб) |
| SEO (robots, sitemap) | Не применимо для мобильных |
| SSR/ISR | Не применимо для RN |
| Facebook CAPI (серверный) | Серверная логика |

> **Важно**: Мобильное приложение **не знает** об источниках данных (CS-Cart, 1C и т.д.). Оно работает исключительно с Supabase, где данные уже синхронизированы веб-сервером.

---

## 4. Подключение к Supabase

### 4.1 Клиент Supabase

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { AppState } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Автообновление токена при возврате из фона
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
```

### 4.2 Переменные окружения

```env
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SITE_URL=https://shineshopb2b.com
```

### 4.3 Supabase Edge Functions (новые)

Для операций, которые на вебе выполнялись через API routes, необходимо создать **Supabase Edge Functions**:

| Edge Function | Назначение | Аналог в Web |
|---|---|---|
| `send-otp` | Отправка SMS через AlphaSMS | `/api/auth/send-otp` |
| `verify-otp` | Верификация OTP | `/api/auth/verify-otp` |
| `phone-auth` | Регистрация/логин по телефону | `/api/auth/phone-auth` |
| `create-order` | Создание заказа | `/api/orders` |
| `search` | Глобальный поиск | `/api/search` |
| `track-event` | Трекинг аналитики | `/api/analytics/event` |
| `register-push` | Регистрация push-токена | Новый |

> **Важно**: Edge Functions имеют доступ к `SUPABASE_SERVICE_ROLE_KEY` и могут обходить RLS для операций, требующих серверных привилегий (отправка SMS, Telegram-уведомления и т.д.).

---

## 5. Навигация и структура экранов

### 5.1 Навигационная структура

```
app/
├── _layout.tsx                    # Root layout (провайдеры, шрифты)
├── (auth)/                        # Auth группа (без табов)
│   ├── _layout.tsx
│   ├── login.tsx                  # Экран логина
│   └── register.tsx               # Экран регистрации
├── (tabs)/                        # Главная группа (с таб-баром)
│   ├── _layout.tsx                # Tab navigator layout
│   ├── index.tsx                  # Главная (Домой)
│   ├── catalog/                   # Каталог
│   │   ├── _layout.tsx            # Stack layout для каталога
│   │   ├── index.tsx              # Дерево категорий
│   │   └── [slug].tsx             # Товары категории
│   ├── cart.tsx                   # Корзина
│   ├── wishlist.tsx               # Избранное
│   └── account/                   # Аккаунт
│       ├── _layout.tsx            # Stack layout для аккаунта
│       ├── index.tsx              # Профиль / Дашборд
│       ├── orders.tsx             # Мои заказы
│       ├── bonuses.tsx            # Бонусы
│       └── documents.tsx          # Документы
├── product/
│   └── [slug].tsx                 # Страница товара (модальная или push)
├── checkout/
│   ├── index.tsx                  # Оформление заказа
│   └── success.tsx                # Успешный заказ
├── search.tsx                     # Результаты поиска
├── notifications.tsx              # Лента уведомлений
├── brands.tsx                     # Бренды
├── page/
│   └── [slug].tsx                 # CMS-страницы (about, contacts, delivery, wholesale, privacy, faq)
```

### 5.2 Tab Bar (нижняя навигация)

| Таб | Иконка | Экран | Badge |
|---|---|---|---|
| Головна | `Home` | `/(tabs)/` | — |
| Каталог | `LayoutGrid` | `/(tabs)/catalog` | — |
| Кошик | `ShoppingBag` | `/(tabs)/cart` | Кол-во товаров |
| Обране | `Heart` | `/(tabs)/wishlist` | Кол-во товаров |
| Профіль | `User` | `/(tabs)/account` | — |

### 5.3 Хедер

Фиксированный хедер с:
- Лого ShineShop (по центру или слева)
- Кнопка поиска (иконка `Search`)
- Кнопка уведомлений (иконка `Bell`) с badge количества непрочитанных → `/notifications`

---

## 6. Экраны: Детальное описание

### 6.1 Главная (`/(tabs)/index`)

**Аналог веба**: `/` (Home Page)

#### Секции (сверху вниз):

1. **Герой-баннер** — горизонтальный слайдер баннеров
   - Данные: из таблицы `banners` (или хардкод)
   - Автоскролл с индикаторами
   - Полноширинное изображение
   - Нажатие → навигация по `link`

2. **Быстрые категории** — горизонтальный скролл чипсов
   - Данные: корневые категории (без родителя)
   - Нажатие → `/(tabs)/catalog/[slug]`

3. **Популярные товары** — горизонтальный скролл `ProductCard`
   - Данные: `products` ORDER BY `quantity` DESC, LIMIT 20
   - Фильтр: `status = 'active'`, `quantity > 0`
   - Кнопка "Дивитись всі" → каталог с сортировкой

4. **Розпродаж** — горизонтальный скролл `ProductCard`
   - Данные: `products` WHERE `old_price IS NOT NULL`, `old_price > price`
   - Фильтр: `status = 'active'`
   - Кнопка "Дивитись всі" → каталог с фильтром

5. **Новинки** — горизонтальный скролл `ProductCard`
   - Данные: `products` ORDER BY `created_at` DESC, LIMIT 20
   - Фильтр: `status = 'active'`, `quantity > 0`

6. **Переваги** — горизонтальный скролл карточек
   - Статический контент:
     - 🚚 Безкоштовна доставка від 2500₴
     - 💰 Оптові ціни від 1 одиниці
     - 🔄 Обмін та повернення 14 днів
     - ✅ Тільки оригінальна продукція
     - 📦 Відправка в день замовлення

7. **B2B CTA** — баннер для оптовых клиентов
   - Кнопка "Дізнатися більше" → `/wholesale`

#### Запросы к БД:

```typescript
// Популярные
const { data: popular } = await supabase
  .from('products')
  .select('id, slug, name_uk, name_ru, price, old_price, main_image_url, quantity, status, is_new, is_featured, brands(name, slug)')
  .eq('status', 'active')
  .gt('quantity', 0)
  .order('quantity', { ascending: false })
  .limit(20)

// Распродажа
const { data: sale } = await supabase
  .from('products')
  .select('id, slug, name_uk, name_ru, price, old_price, main_image_url, quantity, status, is_new, is_featured, brands(name, slug)')
  .eq('status', 'active')
  .not('old_price', 'is', null)
  .gt('old_price', 0)
  .limit(20)

// Новинки
const { data: newest } = await supabase
  .from('products')
  .select('id, slug, name_uk, name_ru, price, old_price, main_image_url, quantity, status, is_new, is_featured, brands(name, slug)')
  .eq('status', 'active')
  .gt('quantity', 0)
  .order('created_at', { ascending: false })
  .limit(20)

// Корневые категории (без родителя)
const { data: categories } = await supabase
  .from('categories')
  .select('id, slug, name_uk, name_ru, image_url, product_count, parent_cs_cart_id')
  .eq('status', 'active')
  .is('parent_cs_cart_id', null)  // parent_cs_cart_id = NULL означает корневую категорию
  .order('position')
```

---

### 6.2 Каталог — Дерево категорий (`/(tabs)/catalog/index`)

**Аналог веба**: `/catalog`

#### UI:

- **Список категорий** — вертикальный список с иконками
  - Каждый элемент: иконка/изображение + название + количество товаров + стрелка
  - Подкатегории показываются при нажатии (drill-down) или раскрывающийся список
  - Нажатие на категорию с подкатегориями → показать подкатегории
  - Нажатие на конечную категорию → `/(tabs)/catalog/[slug]`

#### Запрос:

```typescript
const { data: categories } = await supabase
  .from('categories')
  .select('id, cs_cart_id, parent_cs_cart_id, slug, name_uk, name_ru, image_url, product_count, position, status')
  .eq('status', 'active')
  .order('position')
```

> **Примечание к полям**: `cs_cart_id` и `parent_cs_cart_id` — это целочисленные ID категорий в базе. Поле `parent_cs_cart_id` ссылается на `cs_cart_id` родительской категории. Значение `NULL` означает корневую категорию. Эти поля используются для построения дерева категорий.

Дерево строится на клиенте (аналог `useCategoryTree` из веба).

---

### 6.3 Каталог — Товары категории (`/(tabs)/catalog/[slug]`)

**Аналог веба**: `/catalog/[slug]`

#### UI:

1. **Хедер**: Название категории + breadcrumbs (горизонтальный скролл)
2. **Подкатегории**: горизонтальный скролл чипсов (если есть)
3. **Тулбар**:
   - Количество найденных товаров
   - Кнопка сортировки (bottom sheet)
   - Кнопка фильтров (bottom sheet)
4. **Сетка товаров**: 2 колонки `ProductCard` (FlashList)
5. **Пагинация**: "Завантажити ще" или бесконечный скролл

#### Сортировка (bottom sheet):

| Значение | Название |
|---|---|
| `popular` | Популярні (по умолчанию) |
| `price_asc` | Від дешевих |
| `price_desc` | Від дорогих |
| `newest` | Новинки |
| `name_asc` | За назвою А-Я |

#### Фильтры (bottom sheet):

1. **Ціна**: два поля (від — до) с валидацией
2. **Бренд**: чекбоксы с поиском по брендам
3. **В наявності**: переключатель
4. **Кнопки**: "Застосувати" + "Скинути"

#### Запросы:

```typescript
// Товары категории с фильтрами
let query = supabase
  .from('products')
  .select('id, slug, name_uk, name_ru, price, old_price, main_image_url, quantity, status, is_new, is_featured, brand_id, brands(name, slug)', { count: 'exact' })
  .eq('status', 'active')
  .in('category_id', descendantCategoryIds) // включая подкатегории

if (minPrice) query = query.gte('price', minPrice)
if (maxPrice) query = query.lte('price', maxPrice)
if (brandIds.length) query = query.in('brand_id', brandIds)
if (inStock) query = query.gt('quantity', 0)

// Сортировка
switch (sort) {
  case 'price_asc': query = query.order('price', { ascending: true }); break
  case 'price_desc': query = query.order('price', { ascending: false }); break
  case 'newest': query = query.order('created_at', { ascending: false }); break
  case 'name_asc': query = query.order('name_uk', { ascending: true }); break
  default: query = query.order('quantity', { ascending: false })
}

query = query.range(offset, offset + limit - 1)

// Бренды для фильтра
const { data: brands } = await supabase
  .from('brands')
  .select('id, name, slug')
  .in('id', brandIdsInCategory)
```

---

### 6.4 Страница товара (`/product/[slug]`)

**Аналог веба**: `/product/[slug]`

#### UI (ScrollView):

1. **Галерея изображений**
   - Горизонтальный пейджинг слайдер (полная ширина)
   - Индикаторы (точки) внизу
   - Нажатие → полноэкранный просмотр с зумом (pinch-to-zoom)
   - Если нет изображений — placeholder

2. **Основная информация**
   - Название товара (name_uk / name_ru)
   - Бренд (нажатие → каталог с фильтром по бренду)
   - Артикул (SKU), кнопка копирования
   - Статус наличия (В наявності / Немає в наявності / Закінчується)

3. **Цена и покупка** (sticky bottom bar)
   - Цена: текущая (крупно) + старая (зачёркнутая)
   - Скидка: бейдж "-X%"
   - B2B цена (если авторизован и есть `customer_prices`)
   - Селектор количества (-/+)
   - Кнопка "Додати в кошик" (на всю ширину)
   - Кнопка "В обране" (иконка сердечка)

4. **Табы** (или аккордеон):
   - **Опис**: HTML → простой текст с форматированием
   - **Характеристики**: таблица свойств из `properties` JSONB
   - **Доставка**: статический контент

5. **Схожі товари**
   - Горизонтальный скролл `ProductCard`
   - Данные: товары из той же категории

#### Запросы:

```typescript
// Товар
const { data: product } = await supabase
  .from('products')
  .select(`
    id, slug, name_uk, name_ru, sku, description_uk, description_ru,
    price, old_price, wholesale_price, quantity, status,
    images, main_image_url, weight, properties,
    is_new, is_featured,
    category_id, categories(id, slug, name_uk, name_ru),
    brand_id, brands(id, name, slug, logo_url)
  `)
  .eq('slug', slug)
  .single()

// B2B цена (если авторизован)
const { data: b2bPrice } = await supabase
  .from('customer_prices')
  .select('price')
  .eq('profile_id', userId)
  .eq('product_id', productId)
  .single()

// Похожие товары
const { data: related } = await supabase
  .from('products')
  .select('id, slug, name_uk, name_ru, price, old_price, main_image_url, quantity, status, is_new, is_featured')
  .eq('category_id', product.category_id)
  .neq('id', product.id)
  .eq('status', 'active')
  .limit(10)
```

---

### 6.5 Корзина (`/(tabs)/cart`)

**Аналог веба**: `CartDrawer` (drawer → полноэкранный таб)

#### UI:

1. **Список товаров** (FlashList)
   - Изображение (миниатюра)
   - Название товара
   - Цена за единицу
   - Селектор количества (-/+) с ограничением по `max_quantity`
   - Кнопка удаления (свайп влево или иконка)
   - Старая цена (если есть скидка)

2. **Подитог**
   - Кількість товарів: N
   - Загальна вага: X кг
   - Сума: XXXX ₴
   - Прогресс-бар "До безкоштовної доставки" (порог: 2500 ₴)

3. **Кнопки**
   - "Оформити замовлення" → `/checkout`
   - "Продовжити покупки" → назад

4. **Пустая корзина**
   - Иконка корзины
   - "Ваш кошик порожній"
   - Кнопка "Перейти до каталогу"

#### Стор (Zustand):

```typescript
// Полная копия веб-стора
interface CartItem {
  product_id: string
  name: string
  slug: string
  image: string
  price: number
  old_price: number | null
  quantity: number
  sku: string
  max_quantity: number
  weight: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getCount: () => number
  getWeight: () => number
}
```

**Персистенция**: MMKV (вместо localStorage).

---

### 6.6 Избранное (`/(tabs)/wishlist`)

**Аналог веба**: `/wishlist`

#### UI:

1. **Сетка товаров**: 2 колонки `ProductCard` (FlashList)
2. **Кнопка "Очистити все"** (в хедере)
3. **Пустое состояние**:
   - Иконка сердечка
   - "Список бажань порожній"
   - Кнопка "Перейти до каталогу"

#### Стор (Zustand):

```typescript
interface WishlistItem {
  product_id: string
  name: string
  slug: string
  image: string
  price: number
  old_price: number | null
  added_at: string
}

interface WishlistStore {
  items: WishlistItem[]
  addItem: (item: WishlistItem) => void
  removeItem: (productId: string) => void
  toggleItem: (item: WishlistItem) => void
  hasItem: (productId: string) => boolean
  getCount: () => number
}
```

---

### 6.7 Поиск (`/search`)

**Аналог веба**: `/search`

#### UI:

1. **Поле поиска** (автофокус при открытии)
   - Placeholder: "Шукати товари..."
   - Очистка кнопкой ×
   - Debounce: 300ms

2. **Результаты**:
   - **Бренды** (если совпадение): горизонтальный скролл чипсов
   - **Товары**: 2 колонки `ProductCard` (FlashList)
   - Пагинация (бесконечный скролл)

3. **Пустое состояние**:
   - "За запитом «...» нічого не знайдено"
   - Предложения: проверить написание, использовать другие слова

#### Логика поиска:

Вызов Edge Function `search`:

```typescript
const { data } = await supabase.functions.invoke('search', {
  body: { query: searchText }
})
```

Или прямой запрос:

```typescript
// Поиск товаров
const variants = getSearchVariants(query) // транслитерация кириллица ↔ латиница
const { data: products } = await supabase
  .from('products')
  .select('...')
  .eq('status', 'active')
  .or(variants.map(v => `name_uk.ilike.%${v}%,name_ru.ilike.%${v}%,sku.ilike.%${v}%`).join(','))
  .order('quantity', { ascending: false })
  .limit(40)
```

---

### 6.8 Оформление заказа (`/checkout`)

**Аналог веба**: `/checkout`

#### UI (ScrollView):

1. **Контактна інформація**
   - Телефон (автозаполнение из профиля)
   - Ім'я (автозаполнение)
   - Прізвище (автозаполнение)
   - Email (опционально)

2. **Спосіб доставки** (радио-кнопки)
   - 📦 Нова Пошта (відділення) — поля: місто, відділення
   - 🏠 Нова Пошта (кур'єр) — поля: місто, адреса
   - 📮 Укрпошта — поля: адреса
   - 🏪 Самовивіз — адрес магазина
   - 🌍 Міжнародна доставка — поля: країна, адреса

3. **Спосіб оплати** (радио-кнопки)
   - 💵 Накладений платіж (НП)
   - 🏦 Рахунок-фактура (для ФОП/ТОВ)
   - 💳 Онлайн оплата

4. **Коментар до замовлення** (TextInput, multiline)

5. **Підсумок замовлення**
   - Список товаров (свёрнутый, раскрываемый)
   - Підсумок: X товарів
   - Вага: X кг
   - Сума: XXXX ₴
   - Доставка: безкоштовно / від XX ₴
   - **Всього: XXXX ₴**

6. **Кнопка "Підтвердити замовлення"**

#### Создание заказа:

Через Edge Function `create-order`:

```typescript
const { data } = await supabase.functions.invoke('create-order', {
  body: {
    items: cartItems.map(item => ({
      product_id: item.product_id,
      name: item.name,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    })),
    contact: { phone, firstName, lastName, email },
    shipping: { method, city, warehouse, address, country },
    payment: { method: paymentMethod },
    notes: comment,
  }
})
```

Edge Function выполняет (аналог `/api/orders`):
1. Валидацию данных
2. Проверку остатков
3. Создание записи в `orders`
4. Уменьшение `quantity` товаров
5. Генерацию `order_number`
6. Telegram-уведомление администратору
7. Трекинг воронки продаж
8. Facebook CAPI event (Purchase)

---

### 6.9 Успешный заказ (`/checkout/success`)

**Аналог веба**: `/checkout/success`

#### UI:

- ✅ Иконка успеха (анимация)
- "Дякуємо за замовлення!"
- "Номер замовлення: #XXXXX"
- "Ми зв'яжемося з вами найближчим часом"
- Кнопка "На головну"
- Кнопка "Мої замовлення" (если авторизован)

---

### 6.10 Логін (`/(auth)/login`)

**Аналог веба**: `/login`

#### UI (пошаговый flow):

**Шаг 1: Ввод телефона**
- Поле телефона с маской `+380 XX XXX XX XX`
- Кнопка "Отримати код"
- Ссылка "Увійти з паролем" (toggle)

**Шаг 2: Ввод OTP (если SMS)**
- 4 поля для цифр (автофокус, автопереход)
- Таймер повторной отправки (60 сек)
- Кнопка "Відправити повторно"

**Шаг 2 (альт): Ввод пароля**
- Поле пароля
- Кнопка "Увійти"
- Ссылка "Забули пароль?"

**После успешного входа** → перенаправление на `/account`

#### API:

```typescript
// Шаг 1: Отправка OTP
await supabase.functions.invoke('send-otp', { body: { phone } })

// Шаг 2: Проверка OTP
const { data } = await supabase.functions.invoke('verify-otp', { body: { phone, code } })

// Шаг 3: Вход
if (data.existingUser) {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: data.profile.loginEmail,
    password: /* используется телефон как пароль при OTP */
  })
}
```

---

### 6.11 Реєстрація (`/(auth)/register`)

**Аналог веба**: `/register`

#### UI (пошаговый flow):

**Шаг 1**: Ввод телефона + отправка OTP (идентично логину)

**Шаг 2**: Ввод OTP-кода

**Шаг 3**: Форма регистрации
- Ім'я *
- Прізвище *
- Компанія (опционально)
- Пароль * (min 6 символов)
- Кнопка "Зареєструватися"

#### API:

```typescript
// После верификации OTP
await supabase.functions.invoke('phone-auth', {
  body: {
    phone,
    action: 'register',
    firstName,
    lastName,
    company,
    password
  }
})

// Затем вход
await supabase.auth.signInWithPassword({ email: loginEmail, password })
```

---

### 6.12 Профіль / Дашборд (`/(tabs)/account/index`)

**Аналог веба**: `/account`

#### UI:

**Если не авторизован**:
- Кнопка "Увійти"
- Кнопка "Зареєструватися"

**Если авторизован**:

1. **Заголовок**: Ім'я Прізвище
2. **B2B информація** (если `is_b2b`):
   - Бонуси: XXX балів (тир: Gold)
   - Баланс: XXX ₴
   - Кредитний ліміт: XXX ₴
   - Знижка: X%
3. **Быстрые ссылки** (карточки):
   - 📋 Мої замовлення
   - 🎁 Бонуси
   - 📄 Документи
4. **Редактирование профиля**:
   - Ім'я
   - Прізвище
   - Телефон (readonly)
   - Компанія
   - Кнопка "Зберегти"
5. **Настройки**:
   - Мова (UK/RU) — переключатель
   - Push-повідомлення — переключатель
6. **Кнопка "Вийти"** (красная)

#### Запросы:

```typescript
// Профиль
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

// Количество заказов
const { count } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .eq('profile_id', user.id)
```

---

### 6.13 Мої замовлення (`/(tabs)/account/orders`)

**Аналог веба**: `/account/orders`

#### UI:

1. **Список заказов** (FlashList, сортировка по дате DESC)
   - Каждый заказ — карточка:
     - Номер замовлення (#XXXXX)
     - Дата
     - Статус (badge с цветом)
     - Сума: XXXX ₴
     - Кількість товарів: N
     - ТТН (если есть) — кнопка копирования + ссылка для отслеживания
   - Раскрытие → список товаров заказа

2. **Статусы и цвета**:

| Статус | Текст | Цвет |
|---|---|---|
| `new` | Новий | `#8B5CF6` (violet) |
| `processing` | В обробці | `#C27400` (amber) |
| `shipped` | Відправлено | `#3B82F6` (blue) |
| `delivered` | Доставлено | `#008040` (green) |
| `cancelled` | Скасовано | `#E0352B` (red) |

3. **Пустое состояние**:
   - "У вас поки немає замовлень"
   - Кнопка "Перейти до каталогу"

#### Запросы:

```typescript
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .eq('profile_id', user.id)
  .order('created_at', { ascending: false })
```

---

### 6.14 Бонуси (`/(tabs)/account/bonuses`)

**Аналог веба**: `/account/bonuses`

#### UI:

1. **Баланс бонусів** (крупная карточка)
   - Текущий баланс: XXX балів
   - Тір: Bronze / Silver / Gold / Platinum
   - Прогресс до следующего тіра

2. **Історія операцій** (FlashList)
   - Тип: Нарахування (+) / Списання (-)
   - Сума балів
   - Причина
   - Дата

#### Запросы:

```typescript
// Баланс
const { data: profile } = await supabase
  .from('profiles')
  .select('loyalty_points, loyalty_tier')
  .eq('id', user.id)
  .single()

// История
const { data: bonuses } = await supabase
  .from('bonuses')
  .select('*')
  .eq('profile_id', user.id)
  .order('created_at', { ascending: false })
```

---

### 6.15 Документи (`/(tabs)/account/documents`)

**Аналог веба**: `/account/documents`

#### UI:

1. **Список документов** (FlashList)
   - Тип документа (бейдж): Продаж / Повернення / Рахунок
   - Номер документа
   - Дата
   - Сума
   - Статус оплати
   - ТТН (если есть)

#### Запросы:

```typescript
const { data: documents } = await supabase
  .from('documents')
  .select('*')
  .eq('profile_id', user.id)
  .order('doc_date', { ascending: false })
```

---

### 6.16 Бренди (`/brands`)

**Аналог веба**: `/brands`

#### UI:

- **Алфавітний індекс**: горизонтальный скролл букв (A-Z, А-Я)
- **Список брендів**: сгруппированы по первой букве
  - Каждый бренд: лого + название + количество товаров
  - Нажатие → каталог с фильтром по бренду

#### Запросы:

```typescript
const { data: brands } = await supabase
  .from('brands')
  .select('id, name, slug, logo_url')
  .order('name')
```

---

### 6.17 CMS-страницы (из базы данных)

> Все информационные страницы загружаются из таблицы `pages` в Supabase. Администратор редактирует контент через админку — обновляется и на сайте, и в приложении.

#### Общий запрос:

```typescript
const { data: page } = await supabase
  .from('pages')
  .select('title_uk, title_ru, content_uk, content_ru')
  .eq('slug', pageSlug)  // 'about', 'contacts', 'delivery', 'wholesale', 'privacy', 'faq'
  .single()
```

#### О компании (`/about`, slug: `about`)
- Контент из `pages` (Markdown → рендеринг)
- Контактная информация из `app_config` (телефон, email, адрес)

#### Контакти (`/contacts`, slug: `contacts`)
- Телефон из `app_config` → нажатие → звонок (`Linking.openURL('tel:...')`)
- Email из `app_config` → нажатие → почтовый клиент
- Социальные сети из `app_config` → нажатие → внешние ссылки
- Время работы из `app_config`

#### Доставка и оплата (`/delivery`, slug: `delivery`)
- Способы доставки из `app_config` (`shipping_methods`)
- Способы оплаты из `app_config` (`payment_methods`)
- Дополнительный контент из `pages`

#### Оптовим клієнтам (`/wholesale`, slug: `wholesale`)
- Контент из `pages`
- Пороги лояльности из `app_config` (`loyalty_tiers`)
- CTA: зарегистрироваться

#### Політика конфіденційності (`/privacy`, slug: `privacy`)
- Контент из `pages`

#### FAQ (`/faq`, slug: `faq`)
- Контент из `pages` (формат: аккордеон вопрос-ответ)

---

## 7. Компоненты: Детальное описание

### 7.1 ProductCard

**Аналог веба**: `src/components/product/ProductCard.tsx`

```typescript
interface ProductCardProps {
  id: string
  slug: string
  name: string           // name_uk или name_ru (по языку)
  price: number
  oldPrice?: number | null
  imageUrl?: string | null
  brand?: string | null
  isNew?: boolean
  isFeatured?: boolean
  status: string
  quantity: number
}
```

#### UI:
- Изображение (aspect ratio 1:1, placeholder если нет)
- Бейджи (абсолютное позиционирование):
  - **-X%** (красный) — если `oldPrice > price`
  - **NEW** (фиолетовый) — если `isNew`
  - **HIT** (коралловый) — если `isFeatured`
- Бренд (мелкий текст над названием)
- Название товара (max 2 строки, ellipsis)
- Цена:
  - Текущая (жирная, моноширинный шрифт)
  - Старая (зачёркнутая, серая)
- Кнопка "В обране" (иконка сердечка, toggle)
- Кнопка "В кошик" (если в наличии) или "Немає" (если нет)
- Overlay "Немає в наявності" (если `quantity <= 0`)

#### Хаптик:
- `Haptics.impactAsync(ImpactFeedbackStyle.Light)` при добавлении в корзину
- `Haptics.selectionAsync()` при toggle wishlist

---

### 7.2 ProductGallery

```typescript
interface ProductGalleryProps {
  images: Array<{ url: string; alt?: string }>
  name: string
}
```

#### UI:
- Горизонтальный `FlatList` с `pagingEnabled`
- Индикаторы-точки внизу (анимированные)
- Нажатие → модальный полноэкранный просмотр
  - Pinch-to-zoom (react-native-gesture-handler)
  - Свайп для перехода между фото
  - Кнопка закрытия (X)

---

### 7.3 QuantitySelector

```typescript
interface QuantitySelectorProps {
  value: number
  min?: number           // default 1
  max: number            // max_quantity
  onChange: (value: number) => void
  size?: 'sm' | 'md'
}
```

#### UI:
- Кнопка "−" (disabled при min)
- Текущее значение (по центру)
- Кнопка "+" (disabled при max)
- Хаптик при нажатии

---

### 7.4 BottomSheet (Фильтры)

Используется `@gorhom/bottom-sheet`:

```typescript
interface FilterSheetProps {
  brands: Array<{ id: string; name: string }>
  minPrice?: number
  maxPrice?: number
  onApply: (filters: CatalogFilters) => void
  onReset: () => void
}
```

---

### 7.5 StatusBadge

```typescript
interface StatusBadgeProps {
  status: string
  type?: 'order' | 'payment' | 'document'
}
```

Маппинг статусов на цвета и тексты.

---

### 7.6 SearchBar

```typescript
interface SearchBarProps {
  placeholder?: string
  value: string
  onChangeText: (text: string) => void
  onSubmit?: () => void
  autoFocus?: boolean
}
```

---

### 7.7 Toast

Глобальная система тостов (аналог веба):

```typescript
function showToast(message: string, type: 'success' | 'error' | 'info'): void
```

Появляется сверху, автоисчезает через 3 секунды.

---

## 8. Стейт-менеджмент (Zustand)

### 8.1 Сторы (полная копия веба)

| Стор | Файл | Персистенция | Аналог веба |
|---|---|---|---|
| `useCartStore` | `src/stores/cart.ts` | MMKV (`shine-shop-cart`) | `src/lib/store/cart.ts` |
| `useWishlistStore` | `src/stores/wishlist.ts` | MMKV (`shine-shop-wishlist`) | `src/lib/store/wishlist.ts` |
| `useAuthStore` | `src/stores/auth.ts` | SecureStore | Нет аналога (сессия в cookies) |
| `useSettingsStore` | `src/stores/settings.ts` | MMKV | Нет аналога (cookies) |

### 8.2 Auth Store (новый)

```typescript
interface AuthStore {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  fetchProfile: () => Promise<void>
  signOut: () => Promise<void>
  reset: () => void
}
```

### 8.3 Settings Store (новый)

```typescript
interface SettingsStore {
  language: 'uk' | 'ru'
  pushEnabled: boolean
  
  setLanguage: (lang: 'uk' | 'ru') => void
  setPushEnabled: (enabled: boolean) => void
}
```

### 8.4 MMKV Persister

```typescript
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV()

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
}
```

---

## 9. Аутентификация

### 9.1 Схема аутентификации

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Ввод       │     │  SMS OTP     │     │  Supabase    │
│  телефона   │────▶│  через       │────▶│  Auth        │
│             │     │  AlphaSMS    │     │  signIn      │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
                    ┌──────┴──────┐
                    │  Edge       │
                    │  Function   │
                    │  send-otp   │
                    └─────────────┘
```

### 9.2 Хранение сессии

- Токены хранятся в **expo-secure-store** (Keychain iOS / Keystore Android)
- Автообновление при возврате из фона
- Сессия сохраняется между перезапусками

### 9.3 Защита маршрутов

```typescript
// src/hooks/useAuth.ts
export function useAuth() {
  const { user, isLoading } = useAuthStore()
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isB2B: user?.profile?.is_b2b ?? false,
  }
}

// Использование в экранах
function AccountScreen() {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />
  
  return <AccountContent />
}
```

---

## 10. API-интеграция

### 10.1 Supabase Edge Functions

Необходимо создать следующие Edge Functions (заменяют Next.js API routes):

#### `supabase/functions/send-otp/index.ts`

```typescript
// Аналог: /api/auth/send-otp
// - Принимает { phone }
// - Генерирует 4-digit OTP
// - Сохраняет в БД (таблица otp_codes) с TTL 5 мин
// - Отправляет SMS через AlphaSMS API
// - Rate limit: 3 SMS / 10 мин на номер
// - Возвращает { success: true }
```

#### `supabase/functions/verify-otp/index.ts`

```typescript
// Аналог: /api/auth/verify-otp
// - Принимает { phone, code }
// - Проверяет код в БД
// - Максимум 5 попыток
// - Помечает код как использованный
// - Возвращает { verified, existingUser, profile? }
```

#### `supabase/functions/phone-auth/index.ts`

```typescript
// Аналог: /api/auth/phone-auth
// - Actions: register, get-login-email, otp-login, reset-password
// - register: создаёт пользователя + профиль
// - Линкует с существующим профилем по телефону (если есть)
// - Возвращает { success, userId?, loginEmail? }
```

#### `supabase/functions/create-order/index.ts`

```typescript
// Аналог: /api/orders (POST)
// - Валидация данных
// - Проверка остатков
// - Создание orders + order_number
// - Уменьшение quantity в products
// - Telegram-уведомление
// - Funnel tracking
// - Возвращает { orderNumber, total }
```

#### `supabase/functions/search/index.ts`

```typescript
// Аналог: /api/search
// - Принимает { query }
// - Поиск: products (name, sku, description), brands
// - Транслитерация кир/лат
// - Возвращает { products, brands }
```

#### `supabase/functions/register-push/index.ts`

```typescript
// Новый (нет аналога в вебе)
// - Принимает { token, platform, userId? }
// - Сохраняет push-токен в таблице push_tokens
// - Возвращает { success }
```

### 10.2 Прямые запросы к Supabase

Большинство данных читаются **напрямую** через Supabase JS Client (RLS контролирует доступ):

| Данные | Таблица | Доступ |
|---|---|---|
| Категории | `categories` | Публичный (anon SELECT) |
| Бренды | `brands` | Публичный (anon SELECT) |
| Товары | `products` | Публичный (anon SELECT) |
| Профиль | `profiles` | Свой (auth SELECT/UPDATE) |
| Заказы | `orders` | Свои (auth SELECT) |
| Корзина (серверная) | `carts` | Своя (auth CRUD) |
| Документы | `documents` | Свои (auth SELECT) |
| Бонусы | `bonuses` | Свои (auth SELECT) |
| B2B цены | `customer_prices` | Свои (auth SELECT) |

### 10.3 Необходимые RLS-дополнения

Для мобильного приложения нужно добавить RLS-политики:

```sql
-- Документы: пользователь видит свои
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (profile_id = auth.uid());

-- Бонусы: пользователь видит свои
CREATE POLICY "Users can view own bonuses" ON bonuses
  FOR SELECT USING (profile_id = auth.uid());

-- B2B цены: пользователь видит свои
CREATE POLICY "Users can view own prices" ON customer_prices
  FOR SELECT USING (profile_id = auth.uid());

-- Push-токены (новая таблица)
CREATE TABLE push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE POLICY "Users manage own push tokens" ON push_tokens
  FOR ALL USING (profile_id = auth.uid());
```

---

## 11. Push-уведомления

### 11.1 Типы уведомлений

| Тип | Триггер | Заголовок | Тело |
|---|---|---|---|
| `order_status` | Изменение статуса заказа | "Замовлення #XXXXX" | "Статус змінено на: Відправлено" |
| `order_ttn` | ТТН добавлен | "Замовлення #XXXXX" | "ТТН: XXXXXXXXXXXX" |
| `promo` | Маркетинговая рассылка | Настраиваемый | Настраиваемый |
| `new_product` | Новый товар в избранном бренде | "Новинка від [Бренд]" | "[Назва товару]" |
| `price_drop` | Снижение цены в wishlist | "Ціна знижена!" | "[Товар] тепер XXXX ₴" |
| `bonus_accrual` | Начисление бонусов | "Бонуси нараховані" | "+XXX балів на ваш рахунок" |

### 11.2 Реализация

```typescript
// src/lib/notifications/setup.ts
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return null
  
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id'
  })
  
  return token.data
}
```

### 11.3 Серверная отправка

Через Supabase Database Webhooks или Edge Functions при изменении данных в таблице `orders`:

```sql
-- Trigger на изменение статуса заказа
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS trigger AS $$
BEGIN
  -- Вызов Edge Function для отправки push
  PERFORM net.http_post(
    url := 'https://xxx.supabase.co/functions/v1/send-push',
    body := json_build_object(
      'profile_id', NEW.profile_id,
      'type', 'order_status',
      'order_number', NEW.order_number,
      'status', NEW.status
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 12. Аналитика

### 12.1 Встроенная аналитика (site_events)

Мобильное приложение трекает те же события в таблицу `site_events`:

| Событие | Когда | Данные |
|---|---|---|
| `page_view` | Открытие экрана | `page_path`, `page_title` |
| `view_item` | Открытие товара | `product_id`, `product_name` |
| `add_to_cart` | Добавление в корзину | `product_id`, `product_name`, `revenue` |
| `remove_from_cart` | Удаление из корзины | `product_id` |
| `begin_checkout` | Начало оформления | `revenue` |
| `purchase` | Покупка | `order_id`, `revenue` |
| `search` | Поиск | `search_query` |
| `view_item_list` | Просмотр списка | `page_path` |

Дополнительное поле в `metadata`:
```json
{ "platform": "ios" | "android", "app_version": "1.0.0" }
```

### 12.2 Внешняя аналитика

- **Firebase Analytics** (GA4) — через `@react-native-firebase/analytics`
- **Facebook App Events** — через `react-native-fbsdk-next`
- **PostHog** — через `posthog-react-native`

---

## 13. Дизайн-система

### 13.1 Цвета (идентично вебу)

```typescript
// src/theme/colors.ts
export const colors = {
  // Основные
  coral: '#D6264A',
  coral2: '#B8203F',        // hover/pressed
  violet: '#8B5CF6',
  
  // Текст
  dark: '#1a1a1a',
  darkSecondary: '#666666',
  darkTertiary: '#999999',
  
  // Фоны
  pearl: '#FAFAF8',
  sand: '#F3F1EE',
  white: '#FFFFFF',
  
  // Состояния
  green: '#008040',
  amber: '#C27400',
  red: '#E0352B',
  
  // Дополнительные
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  overlay: 'rgba(0,0,0,0.5)',
}
```

### 13.2 Типографика

```typescript
// src/theme/typography.ts
export const fonts = {
  heading: 'Unbounded',       // Заголовки
  body: 'Inter',              // Основной текст
  mono: 'JetBrainsMono',      // Цены
}

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
}

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
}
```

### 13.3 Отступы и размеры

```typescript
// src/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
}

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,       // card radius (как в вебе)
  xl: 24,
  pill: 50,     // pill radius
  full: 9999,
}
```

### 13.4 Тени

```typescript
// src/theme/shadows.ts
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
}
```

### 13.5 Иконки

Используется `lucide-react-native` (идентично вебу `lucide-react`):

| Контекст | Иконки |
|---|---|
| Навигация | `Home`, `LayoutGrid`, `ShoppingBag`, `Heart`, `User` |
| Товары | `Plus`, `Minus`, `Star`, `Share2`, `Copy` |
| Корзина | `Trash2`, `ShoppingCart`, `Package` |
| Заказы | `FileText`, `Truck`, `CheckCircle`, `Clock` |
| Общие | `Search`, `X`, `ChevronRight`, `ChevronLeft`, `ChevronDown`, `ArrowLeft` |
| Уведомления | `Bell`, `BellDot`, `Check`, `CheckCheck` |
| Контакты | `Phone`, `Mail`, `MapPin`, `Instagram`, `MessageCircle` |

---

## 14. Оффлайн-режим и кэширование

### 14.1 Стратегия кэширования

| Данные | Стратегия | TTL | Хранилище |
|---|---|---|---|
| Категории | Cache-first, fetch in bg | 5 мин | MMKV |
| Бренды | Cache-first, fetch in bg | 1 час | MMKV |
| Товары (список) | Network-first, cache fallback | 2 мин | MMKV |
| Товар (детали) | Network-first, cache fallback | 5 мин | MMKV |
| Профиль | Network-first | — | SecureStore |
| Корзина | Local-only | — | MMKV |
| Wishlist | Local-only | — | MMKV |
| Заказы | Network-only | — | — |
| Поиск | Network-only | — | — |

### 14.2 Оффлайн-режим

```typescript
// src/hooks/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo'

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true)
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false)
    })
    return unsubscribe
  }, [])
  
  return isConnected
}
```

При отсутствии сети:
- Показываем кэшированные данные (каталог, товары)
- Корзина и wishlist работают полностью
- Оформление заказа: показываем баннер "Немає з'єднання"
- Автоматическая повторная попытка при восстановлении

---

## 15. Deep Linking

### 15.1 URL-схема

```
shineshop://                          → Главная
shineshop://product/{slug}            → Страница товара
shineshop://catalog/{slug}            → Категория
shineshop://search?q={query}          → Поиск
shineshop://cart                      → Корзина
shineshop://account                   → Аккаунт
shineshop://account/orders            → Заказы
```

### 15.2 Universal Links (iOS) / App Links (Android)

```
https://shineshopb2b.com/product/{slug}   → Страница товара
https://shineshopb2b.com/catalog/{slug}   → Категория
https://shineshopb2b.com/search?q={query} → Поиск
```

### 15.3 Конфигурация Expo

```json
// app.json
{
  "expo": {
    "scheme": "shineshop",
    "ios": {
      "associatedDomains": ["applinks:shineshopb2b.com"]
    },
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "https", "host": "shineshopb2b.com" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

---

## 16. Безопасность

### 16.1 Хранение данных

| Данные | Хранилище | Шифрование |
|---|---|---|
| Auth токены | expo-secure-store | AES-256 (Keychain/Keystore) |
| Профиль пользователя | expo-secure-store | AES-256 |
| Корзина | MMKV | — |
| Wishlist | MMKV | — |
| Кэш каталога | MMKV | — |
| Настройки | MMKV | — |

### 16.2 Сетевая безопасность

- Все запросы через HTTPS
- Certificate pinning для Supabase (опционально)
- Supabase Anon Key хранится в .env (не в коде)
- RLS-политики контролируют доступ к данным

### 16.3 Защита от обратной разработки

- ProGuard (Android): обфускация кода
- Bitcode (iOS): оптимизация
- Не хранить секреты в клиентском коде

---

## 17. Производительность

### 17.1 Оптимизация изображений

```typescript
// Использование expo-image с кэшированием
import { Image } from 'expo-image'

<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

### 17.2 Оптимизация списков

- `@shopify/flash-list` вместо `FlatList` для каталога
- `estimatedItemSize` для правильного рендеринга
- `getItemType` для разных типов элементов
- Мемоизация `ProductCard` через `React.memo`

### 17.3 Оптимизация навигации

- Lazy-loading экранов
- `freezeOnBlur` для неактивных табов
- Prefetch данных при навигации

### 17.4 Целевые метрики

| Метрика | Цель |
|---|---|
| Время запуска (cold) | < 2 сек |
| Время запуска (warm) | < 1 сек |
| TTI (Time to Interactive) | < 3 сек |
| FPS при скролле | 60 fps |
| Размер APK | < 30 MB |
| Размер IPA | < 50 MB |
| RAM usage | < 200 MB |

---

## 18. Тестирование

### 18.1 Unit-тесты

- Jest + @testing-library/react-native
- Тесты для сторов (cart, wishlist)
- Тесты для утилит (format, slugify, search-helpers)

### 18.2 Компонентные тесты

- @testing-library/react-native
- Тесты для ключевых компонентов (ProductCard, QuantitySelector)

### 18.3 E2E тесты

- Detox (iOS + Android)
- Основные сценарии:
  1. Просмотр каталога → товар → корзина → чекаут
  2. Регистрация → OTP → профиль
  3. Поиск → результаты → товар
  4. Фильтрация каталога

---

## 19. Сборка и публикация

### 19.1 Expo EAS Build

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "autoIncrement": true },
      "android": { "autoIncrement": true }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "./google-sa.json" }
    }
  }
}
```

### 19.2 OTA Updates

```typescript
// Expo Updates для мгновенных обновлений без App Store
import * as Updates from 'expo-updates'

async function checkForUpdates() {
  const update = await Updates.checkForUpdateAsync()
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync()
    Updates.reloadAsync()
  }
}
```

### 19.3 App Store Requirements

**iOS (App Store)**:
- Минимум iOS 15.0
- Поддержка iPhone SE — iPhone 16 Pro Max
- Privacy Policy URL
- App Review Information

**Android (Google Play)**:
- Минимум API 24 (Android 7.0)
- Target API 35 (Android 15)
- Privacy Policy
- Data Safety form

---

## 20. Структура файлов проекта

```
shineshop-mobile/
├── app/                              # Expo Router (экраны)
│   ├── _layout.tsx                   # Root layout
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab navigator
│   │   ├── index.tsx                 # Главная
│   │   ├── catalog/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx             # Дерево категорий
│   │   │   └── [slug].tsx            # Товары категории
│   │   ├── cart.tsx
│   │   ├── wishlist.tsx
│   │   └── account/
│   │       ├── _layout.tsx
│   │       ├── index.tsx
│   │       ├── orders.tsx
│   │       ├── bonuses.tsx
│   │       └── documents.tsx
│   ├── product/
│   │   └── [slug].tsx
│   ├── checkout/
│   │   ├── index.tsx
│   │   └── success.tsx
│   ├── search.tsx
│   ├── notifications.tsx             # Лента уведомлений
│   ├── brands.tsx
│   └── page/
│       └── [slug].tsx                # CMS-страницы (about, contacts, delivery, wholesale, privacy, faq)
├── src/
│   ├── components/
│   │   ├── product/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGallery.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   └── RelatedProducts.tsx
│   │   ├── catalog/
│   │   │   ├── CategoryTree.tsx
│   │   │   ├── FilterSheet.tsx
│   │   │   ├── SortSheet.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   ├── cart/
│   │   │   ├── CartItem.tsx
│   │   │   └── CartSummary.tsx
│   │   ├── checkout/
│   │   │   ├── ContactForm.tsx
│   │   │   ├── ShippingForm.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   └── OrderSummary.tsx
│   │   ├── auth/
│   │   │   ├── PhoneInput.tsx
│   │   │   ├── OtpInput.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── home/
│   │   │   ├── HeroBanner.tsx
│   │   │   ├── QuickCategories.tsx
│   │   │   ├── ProductSection.tsx
│   │   │   ├── Features.tsx
│   │   │   └── B2BCta.tsx
│   │   ├── account/
│   │   │   ├── ProfileForm.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── BonusCard.tsx
│   │   │   └── DocumentCard.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Badge.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── QuantitySelector.tsx
│   │       ├── Toast.tsx
│   │       ├── SearchBar.tsx
│   │       ├── Loading.tsx
│   │       ├── EmptyState.tsx
│   │       └── LanguageSwitcher.tsx
│   ├── stores/
│   │   ├── cart.ts
│   │   ├── wishlist.ts
│   │   ├── auth.ts
│   │   └── settings.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts             # Supabase client (expo-secure-store)
│   │   ├── analytics/
│   │   │   └── tracker.ts            # Event tracking
│   │   ├── notifications/
│   │   │   └── setup.ts              # Push notifications
│   │   └── cache/
│   │       └── manager.ts            # Cache management (MMKV)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAppConfig.ts          # Динамическая конфигурация из app_config
│   │   ├── useCategoryTree.ts
│   │   ├── useLanguage.ts
│   │   ├── useNetworkStatus.ts
│   │   ├── useNotifications.ts      # Лента уведомлений + badge
│   │   ├── useProducts.ts
│   │   ├── useRealtimeSync.ts       # Supabase Realtime подписки
│   │   └── useSearch.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── shadows.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── cart.ts                   # (копия из веба)
│   │   ├── product.ts
│   │   ├── order.ts
│   │   ├── profile.ts
│   │   └── navigation.ts
│   └── utils/
│       ├── format.ts                 # (копия из веба)
│       ├── slugify.ts                # (копия из веба)
│       └── search-helpers.ts         # (копия из веба)
├── assets/
│   ├── fonts/
│   │   ├── Unbounded-Medium.ttf
│   │   ├── Unbounded-Bold.ttf
│   │   ├── Unbounded-Black.ttf
│   │   ├── Inter-Regular.ttf
│   │   ├── Inter-Medium.ttf
│   │   ├── Inter-SemiBold.ttf
│   │   ├── Inter-Bold.ttf
│   │   ├── JetBrainsMono-Regular.ttf
│   │   ├── JetBrainsMono-Medium.ttf
│   │   └── JetBrainsMono-Bold.ttf
│   ├── images/
│   │   ├── logo.png
│   │   ├── logo-dark.png
│   │   ├── splash.png
│   │   └── icon.png
│   └── adaptive-icon.png
├── supabase/
│   └── functions/
│       ├── send-otp/
│       │   └── index.ts
│       ├── verify-otp/
│       │   └── index.ts
│       ├── phone-auth/
│       │   └── index.ts
│       ├── create-order/
│       │   └── index.ts
│       ├── search/
│       │   └── index.ts
│       ├── register-push/
│       │   └── index.ts
│       └── send-push/
│           └── index.ts
├── app.json                          # Expo config
├── eas.json                          # EAS Build config
├── package.json
├── tsconfig.json
├── .env.example
├── babel.config.js
└── metro.config.js
```

---

## 21. База данных: Полная схема

### 21.1 Существующие таблицы (общие с вебом)

Мобильное приложение использует **все те же таблицы**, что и веб. Полный список:

| # | Таблица | Описание | Доступ в мобильном |
|---|---|---|---|
| 1 | `categories` | Категории товаров | READ (публичный) |
| 2 | `brands` | Бренды | READ (публичный) |
| 3 | `products` | Товары | READ (публичный) |
| 4 | `profiles` | Профили пользователей | READ/UPDATE (свой) |
| 5 | `orders` | Заказы | READ (свои), CREATE (через Edge Function) |
| 6 | `carts` | Серверные корзины | CRUD (своя) |
| 7 | `sync_log` | Лог синхронизации (серверный) | — (нет доступа) |
| 8 | `site_events` | Аналитика | CREATE (через Edge Function) |
| 9 | `api_tokens` | API токены | — (нет доступа) |
| 10 | `api_request_log` | Лог API запросов | — (нет доступа) |
| 11 | `documents` | Документы (накладні, рахунки) | READ (свои) |
| 12 | `payments` | Платежи | READ (свои) |
| 13 | `bonuses` | Бонусы | READ (свои) |
| 14 | `customer_prices` | Индивидуальные цены | READ (свои) |
| 15 | `funnels` | Воронки | — (нет доступа) |
| 16 | `funnel_stages` | Этапы воронок | — (нет доступа) |
| 17 | `funnel_contacts` | Контакты воронок | — (нет доступа) |
| 18 | `funnel_events` | События воронок | — (нет доступа) |
| 19 | `tenant_settings` | Настройки тенанта | — (нет доступа) |
| 20 | `integration_keys` | Ключи интеграций | — (нет доступа) |
| 21 | `integration_logs` | Логи интеграций | — (нет доступа) |
| 22 | `cron_jobs` | Cron задачи | — (нет доступа) |
| 23 | `automation_triggers` | Триггеры автоматизации | — (нет доступа) |
| 24 | `funnel_messages` | Шаблоны сообщений | — (нет доступа) |
| 25 | `message_log` | Лог сообщений | — (нет доступа) |
| 26 | `scheduled_messages` | Запланированные сообщения | — (нет доступа) |
| 27 | `webhooks` | Вебхуки | — (нет доступа) |
| 28 | `webhook_deliveries` | Доставка вебхуков | — (нет доступа) |

### 21.2 Новая таблица (для мобильного)

```sql
-- Push-токены мобильных устройств
CREATE TABLE push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name TEXT,
  app_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens" ON push_tokens
  FOR ALL USING (profile_id = auth.uid());

-- Index
CREATE INDEX idx_push_tokens_profile ON push_tokens(profile_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- Trigger
CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 21.3 Дополнение к profiles

```sql
-- Добавить поле для push-уведомлений (если ещё нет)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;
```

### 21.4 Новые таблицы для омниканальной синхронизации

Для полной синхронизации между вебом и мобильным приложением необходимо создать дополнительные таблицы. Администратор управляет контентом **один раз** через админку — оба клиента (веб + мобильное) подхватывают изменения автоматически.

#### Таблица `banners` — Баннеры (главная, промо)

```sql
CREATE TABLE banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  image_mobile_url TEXT,           -- отдельное изображение для мобильного (другое соотношение сторон)
  link TEXT,                       -- URL или deep link (напр. /catalog/gel-laki или shineshop://catalog/gel-laki)
  link_type TEXT DEFAULT 'internal' CHECK (link_type IN ('internal', 'external', 'product', 'category')),
  placement TEXT DEFAULT 'hero' CHECK (placement IN ('hero', 'promo', 'catalog', 'checkout')),
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,           -- запланированная публикация
  ends_at TIMESTAMPTZ,             -- автоматическое скрытие
  target_platforms TEXT[] DEFAULT '{web,ios,android}', -- на каких платформах показывать
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active banners" ON banners
  FOR SELECT USING (
    is_active = true 
    AND (starts_at IS NULL OR starts_at <= now()) 
    AND (ends_at IS NULL OR ends_at > now())
  );

CREATE INDEX idx_banners_placement ON banners(placement, position);
CREATE INDEX idx_banners_active ON banners(is_active) WHERE is_active = true;
CREATE TRIGGER banners_updated_at BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

#### Таблица `wishlist_items` — Серверный список избранного

```sql
CREATE TABLE wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, product_id)
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON wishlist_items
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_wishlist_profile ON wishlist_items(profile_id);
CREATE INDEX idx_wishlist_product ON wishlist_items(product_id);
```

#### Таблица `recently_viewed` — Недавно просмотренные

```sql
CREATE TABLE recently_viewed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, product_id)
);

ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history" ON recently_viewed
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_recently_viewed_profile ON recently_viewed(profile_id, viewed_at DESC);

-- Автоочистка: максимум 50 записей на пользователя
CREATE OR REPLACE FUNCTION trim_recently_viewed()
RETURNS trigger AS $$
BEGIN
  DELETE FROM recently_viewed
  WHERE id IN (
    SELECT id FROM recently_viewed
    WHERE profile_id = NEW.profile_id
    ORDER BY viewed_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trim_recently_viewed
  AFTER INSERT ON recently_viewed
  FOR EACH ROW EXECUTE FUNCTION trim_recently_viewed();
```

#### Таблица `pages` — CMS-страницы (управляемые из админки)

```sql
CREATE TABLE pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,        -- 'about', 'contacts', 'delivery', 'wholesale', 'privacy', 'faq'
  title_uk TEXT NOT NULL,
  title_ru TEXT,
  content_uk TEXT NOT NULL,         -- Markdown или HTML
  content_ru TEXT,
  meta_title TEXT,
  meta_description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active pages" ON pages
  FOR SELECT USING (is_active = true);

CREATE TRIGGER pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Начальные данные
INSERT INTO pages (slug, title_uk, content_uk) VALUES
  ('about', 'Про компанію', ''),
  ('contacts', 'Контакти', ''),
  ('delivery', 'Доставка та оплата', ''),
  ('wholesale', 'Оптовим клієнтам', ''),
  ('privacy', 'Політика конфіденційності', ''),
  ('faq', 'Часті запитання', '');
```

#### Таблица `app_config` — Динамическая конфигурация

```sql
CREATE TABLE app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read config" ON app_config FOR SELECT USING (true);
CREATE TRIGGER app_config_updated_at BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Начальные настройки (управляются из админки, читаются обоими клиентами)
INSERT INTO app_config (key, value, description) VALUES
  ('free_shipping_threshold', '2500', 'Порог бесплатной доставки (₴)'),
  ('min_order_amount', '300', 'Минимальная сумма заказа (₴)'),
  ('phone', '"+380671234567"', 'Телефон магазина'),
  ('email', '"info@shineshopb2b.com"', 'Email магазина'),
  ('instagram', '"https://instagram.com/shineshop"', 'Instagram'),
  ('telegram_channel', '"https://t.me/shineshop"', 'Telegram канал'),
  ('working_hours', '{"weekdays": "09:00-18:00", "saturday": "10:00-15:00", "sunday": "вихідний"}', 'Часы работы'),
  ('address', '"м. Київ, вул. Хрещатик 1"', 'Адрес магазина'),
  ('currency_symbol', '"₴"', 'Символ валюты'),
  ('loyalty_tiers', '{"bronze": 0, "silver": 5000, "gold": 15000, "platinum": 50000}', 'Пороги лояльности (₴ накоплений)'),
  ('shipping_methods', '[{"id":"nova_poshta","name_uk":"Нова Пошта","icon":"📦"},{"id":"nova_poshta_courier","name_uk":"Нова Пошта (кур''єр)","icon":"🏠"},{"id":"ukrposhta","name_uk":"Укрпошта","icon":"📮"},{"id":"pickup","name_uk":"Самовивіз","icon":"🏪"},{"id":"international","name_uk":"Міжнародна","icon":"🌍"}]', 'Способы доставки'),
  ('payment_methods', '[{"id":"cod","name_uk":"Накладений платіж"},{"id":"invoice","name_uk":"Рахунок-фактура"},{"id":"online","name_uk":"Онлайн оплата"}]', 'Способы оплаты'),
  ('maintenance_mode', 'false', 'Режим обслуживания (закрыть приложение)'),
  ('min_app_version_ios', '"1.0.0"', 'Минимальная версия iOS приложения'),
  ('min_app_version_android', '"1.0.0"', 'Минимальная версия Android приложения'),
  ('feature_flags', '{"bonuses_enabled": true, "documents_enabled": true, "b2b_prices_enabled": true, "reviews_enabled": false}', 'Включение/выключение фич');
```

#### Таблица `notifications_feed` — Лента уведомлений в приложении

```sql
CREATE TABLE notifications_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,               -- 'order_status', 'promo', 'bonus', 'price_drop', 'system'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  link TEXT,                        -- deep link: /product/xxx, /account/orders и т.д.
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON notifications_feed
  FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications_feed
  FOR UPDATE USING (profile_id = auth.uid());

CREATE INDEX idx_notifications_profile ON notifications_feed(profile_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications_feed(profile_id, is_read) WHERE is_read = false;
```

---

## 22. Омниканальная синхронизация (Веб ↔ Мобильное)

> **Принцип**: Администратор управляет всем через одну админку. Оба клиента (веб и мобильное приложение) читают из одной базы. Изменил баннер — обновилось везде. Добавил товар в корзину на сайте — он уже в мобильном.

### 22.1 Матрица синхронизации

| Данные | Источник | Web | Mobile | Синхронизация |
|---|---|---|---|---|
| **Товары, цены, остатки** | Админка / 1C sync | Читает из Supabase | Читает из Supabase | Мгновенно (одна БД) |
| **Категории, бренды** | Админка / sync | Читает из Supabase | Читает из Supabase | Мгновенно |
| **Баннеры** | Админка → `banners` | Читает из Supabase | Читает из Supabase | Мгновенно + автопубликация по расписанию |
| **Корзина** | Пользователь → `carts` | Пишет/читает | Пишет/читает | **Realtime** (мгновенно) |
| **Избранное** | Пользователь → `wishlist_items` | Пишет/читает | Пишет/читает | Мгновенно (одна таблица) |
| **Недавно просмотренные** | Пользователь → `recently_viewed` | Пишет/читает | Пишет/читает | Мгновенно |
| **Заказы** | Пользователь / Админ | Создаёт/читает | Создаёт/читает | Мгновенно |
| **Профиль** | Пользователь | Пишет/читает | Пишет/читает | Мгновенно |
| **Уведомления** | Система → `notifications_feed` | Читает (опционально) | Читает + push | Мгновенно |
| **Статические страницы** | Админка → `pages` | Читает из Supabase | Читает из Supabase | Мгновенно |
| **Контакты, телефон, соцсети** | Админка → `app_config` | Читает из Supabase | Читает из Supabase | Мгновенно |
| **Способы доставки/оплаты** | Админка → `app_config` | Читает из Supabase | Читает из Supabase | Мгновенно |
| **Порог бесплатной доставки** | Админка → `app_config` | Читает из Supabase | Читает из Supabase | Мгновенно |
| **Feature flags** | Админка → `app_config` | Читает из Supabase | Читает из Supabase | Мгновенно |
| **Мин. версия приложения** | Админка → `app_config` | — | Читает → force update | Мгновенно |

### 22.2 Серверная корзина (синхронизация между устройствами)

Для авторизованных пользователей корзина хранится на сервере в таблице `carts` и синхронизируется между всеми устройствами.

#### Логика работы:

```
Гость (не авторизован):
  → Корзина хранится локально (MMKV / localStorage)
  → При авторизации: merge локальной корзины с серверной

Авторизован:
  → Корзина хранится в Supabase (`carts` таблица)
  → Localный кэш в MMKV для скорости
  → Supabase Realtime подписка для мгновенной синхронизации
  → Добавил на сайте → мгновенно появилось в приложении
```

#### Реализация в мобильном:

```typescript
// src/stores/cart.ts — расширенный стор с серверной синхронизацией
interface CartStore {
  items: CartItem[]
  isLoading: boolean
  
  // Локальные действия (для гостей)
  addItemLocal: (item: CartItem) => void
  removeItemLocal: (productId: string) => void
  
  // Серверные действия (для авторизованных)
  syncWithServer: () => Promise<void>
  addItem: (item: CartItem) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  updateQuantity: (productId: string, qty: number) => Promise<void>
  
  // Merge при логине
  mergeLocalToServer: () => Promise<void>
  
  // Computed
  getTotal: () => number
  getCount: () => number
  getWeight: () => number
}
```

#### Supabase Realtime подписка:

```typescript
// Подписка на изменения корзины (мгновенная синхронизация между устройствами)
supabase
  .channel('cart-sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'carts',
    filter: `profile_id=eq.${userId}`
  }, (payload) => {
    // Обновить локальный стор из серверных данных
    useCartStore.getState().syncFromServer(payload.new.items)
  })
  .subscribe()
```

### 22.3 Серверное избранное (синхронизация между устройствами)

#### Логика работы:

```
Гость: локальное хранилище (MMKV)
Авторизован: Supabase `wishlist_items` + локальный кэш
При логине: merge локального в серверное
```

#### Реализация:

```typescript
// src/stores/wishlist.ts — расширенный стор
interface WishlistStore {
  items: WishlistItem[]
  
  toggleItem: (product: WishlistItem) => Promise<void>  // add/remove
  hasItem: (productId: string) => boolean
  syncWithServer: () => Promise<void>
  mergeLocalToServer: () => Promise<void>
  getCount: () => number
}
```

### 22.4 Баннеры из админки

Баннеры управляются через админку (веб), отображаются на обоих платформах:

#### Запрос (одинаковый для веба и мобильного):

```typescript
const platform = Platform.OS // 'ios' | 'android'

const { data: banners } = await supabase
  .from('banners')
  .select('*')
  .eq('placement', 'hero')
  .contains('target_platforms', [platform]) // фильтр по платформе
  .order('position')
  
// RLS-политика автоматически фильтрует:
// - is_active = true
// - starts_at <= now() (или NULL)
// - ends_at > now() (или NULL)
```

#### Возможности для админки:

- Создать баннер с отдельным изображением для мобильного (`image_mobile_url`)
- Выбрать платформы показа (веб, iOS, Android — любая комбинация)
- Запланировать публикацию (starts_at / ends_at — автоматически появится и исчезнет)
- Разные placement: hero (главная), promo (каталог), checkout (корзина)

### 22.5 CMS-страницы из админки

Статические страницы (О нас, Контакты, Доставка и т.д.) управляются из админки через таблицу `pages`. Больше никакого хардкода.

#### Запрос:

```typescript
const { data: page } = await supabase
  .from('pages')
  .select('title_uk, title_ru, content_uk, content_ru')
  .eq('slug', 'about')  // или 'delivery', 'contacts', 'wholesale', 'privacy', 'faq'
  .single()
```

#### Рендеринг Markdown/HTML в мобильном:

```typescript
// Использовать react-native-markdown-display или react-native-render-html
import Markdown from 'react-native-markdown-display'

<Markdown style={markdownStyles}>{page.content_uk}</Markdown>
```

### 22.6 Динамическая конфигурация (app_config)

Вместо хардкода констант — всё читается из `app_config`. Администратор меняет значение в админке → оба клиента подхватывают.

#### Хук для мобильного:

```typescript
// src/hooks/useAppConfig.ts
export function useAppConfig() {
  const [config, setConfig] = useState<Record<string, any>>({})
  
  useEffect(() => {
    // Загрузить конфигурацию
    supabase.from('app_config').select('key, value').then(({ data }) => {
      const map: Record<string, any> = {}
      data?.forEach(row => { map[row.key] = row.value })
      setConfig(map)
    })
  }, [])
  
  return {
    freeShippingThreshold: config.free_shipping_threshold ?? 2500,
    minOrderAmount: config.min_order_amount ?? 300,
    phone: config.phone ?? '+380671234567',
    email: config.email ?? 'info@shineshopb2b.com',
    instagram: config.instagram ?? '',
    telegram: config.telegram_channel ?? '',
    workingHours: config.working_hours ?? {},
    address: config.address ?? '',
    shippingMethods: config.shipping_methods ?? [],
    paymentMethods: config.payment_methods ?? [],
    featureFlags: config.feature_flags ?? {},
    loyaltyTiers: config.loyalty_tiers ?? {},
    maintenanceMode: config.maintenance_mode ?? false,
    minAppVersion: Platform.OS === 'ios' 
      ? config.min_app_version_ios 
      : config.min_app_version_android,
  }
}
```

#### Что это даёт:

| Настройка | Было (хардкод) | Стало (app_config) |
|---|---|---|
| Порог бесплатной доставки | Менять в коде обоих приложений | Изменил число в админке → везде обновилось |
| Телефон магазина | Хардкод в вебе и мобильном | Изменил раз → обновилось на сайте, в приложении, в чекауте |
| Способы доставки | Массив в коде | Добавил новый способ → появился на обеих платформах |
| Способы оплаты | Массив в коде | Аналогично |
| Время работы | Хардкод | Изменил → обновилось на странице Контакты везде |
| Включить бонусы | Деплоить код | Переключить флаг → функция скрылась/появилась |
| Техобслуживание | Деплоить maintenance page | Включил флаг → приложение показывает "ведутся работы" |
| Force update | Невозможно | Поставил min_app_version → старые версии увидят "обновите приложение" |

### 22.7 Лента уведомлений (in-app)

Помимо push-уведомлений, есть лента уведомлений внутри приложения (как в Instagram):

#### UI:

- Иконка колокольчика в хедере с badge (количество непрочитанных)
- Экран уведомлений: список карточек
- Каждое уведомление: иконка типа + заголовок + текст + время + кнопка перехода
- Свайп для отметки "прочитано"
- Кнопка "Прочитати все"

#### Запрос:

```typescript
// Непрочитанные (для badge)
const { count } = await supabase
  .from('notifications_feed')
  .select('*', { count: 'exact', head: true })
  .eq('profile_id', userId)
  .eq('is_read', false)

// Лента
const { data: notifications } = await supabase
  .from('notifications_feed')
  .select('*')
  .eq('profile_id', userId)
  .order('created_at', { ascending: false })
  .limit(50)
```

#### Realtime подписка (мгновенное обновление):

```typescript
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications_feed',
    filter: `profile_id=eq.${userId}`
  }, (payload) => {
    // Показать in-app toast + обновить badge
    showToast(payload.new.title, 'info')
    incrementNotificationBadge()
  })
  .subscribe()
```

### 22.8 Недавно просмотренные товары

Синхронизируется между устройствами для авторизованных пользователей.

#### Где показывать:

- Главный экран: секция "Ви нещодавно переглядали"
- Страница товара: перед "Схожі товари"

#### Запись:

```typescript
// При открытии страницы товара
await supabase
  .from('recently_viewed')
  .upsert({
    profile_id: userId,
    product_id: productId,
    viewed_at: new Date().toISOString()
  }, { onConflict: 'profile_id,product_id' })
```

#### Чтение:

```typescript
const { data } = await supabase
  .from('recently_viewed')
  .select('product_id, viewed_at, products(id, slug, name_uk, name_ru, price, old_price, main_image_url, quantity, status)')
  .eq('profile_id', userId)
  .order('viewed_at', { ascending: false })
  .limit(20)
```

### 22.9 Force Update (принудительное обновление приложения)

Через `app_config` (`min_app_version_ios` / `min_app_version_android`):

```typescript
// src/lib/force-update.ts
import * as Application from 'expo-application'

export function checkForceUpdate(minVersion: string): boolean {
  const current = Application.nativeApplicationVersion ?? '0.0.0'
  return compareVersions(current, minVersion) < 0
}

// В Root Layout:
function RootLayout() {
  const { minAppVersion, maintenanceMode } = useAppConfig()
  
  if (maintenanceMode) return <MaintenanceScreen />
  if (checkForceUpdate(minAppVersion)) return <ForceUpdateScreen />
  
  return <Stack />
}
```

### 22.10 Supabase Realtime — итоговый список подписок

| Подписка | Таблица | Событие | Эффект |
|---|---|---|---|
| Корзина | `carts` | UPDATE | Мгновенная синхронизация корзины между устройствами |
| Уведомления | `notifications_feed` | INSERT | Toast + badge + звук |
| Статус заказа | `orders` | UPDATE | Обновить статус в "Мои заказы" |
| Бонусы | `bonuses` | INSERT | Обновить баланс в профиле |

---

## 23. Маппинг Web → Mobile

### 22.1 Экраны

| Web Route | Mobile Screen | Тип навигации |
|---|---|---|
| `/` | `/(tabs)/index` | Tab (Головна) |
| `/catalog` | `/(tabs)/catalog/index` | Tab (Каталог) |
| `/catalog/[slug]` | `/(tabs)/catalog/[slug]` | Stack push |
| `/product/[slug]` | `/product/[slug]` | Stack push (modal) |
| `/search?q=` | `/search` | Modal |
| `/checkout` | `/checkout/index` | Stack push |
| `/checkout/success` | `/checkout/success` | Stack replace |
| `/login` | `/(auth)/login` | Stack push |
| `/register` | `/(auth)/register` | Stack push |
| `/account` | `/(tabs)/account/index` | Tab (Профіль) |
| `/account/orders` | `/(tabs)/account/orders` | Stack push |
| `/account/bonuses` | `/(tabs)/account/bonuses` | Stack push |
| `/account/documents` | `/(tabs)/account/documents` | Stack push |
| `/wishlist` | `/(tabs)/wishlist` | Tab (Обране) |
| `/brands` | `/brands` | Stack push |
| `/about` | `/page/about` | Stack push (CMS) |
| `/contacts` | `/page/contacts` | Stack push (CMS) |
| `/delivery` | `/page/delivery` | Stack push (CMS) |
| `/wholesale` | `/page/wholesale` | Stack push (CMS) |
| `/privacy` | `/page/privacy` | Stack push (CMS) |
| — (новый) | `/notifications` | Stack push |
| — (новый) | `/page/faq` | Stack push (CMS) |

### 22.2 Компоненты

| Web Component | Mobile Component | Изменения |
|---|---|---|
| `Header` | Tab Bar + Search header | Tab вместо меню |
| `Footer` | — | Не нужен (tabs) |
| `CartDrawer` | Cart Screen (tab) | Полноэкранный таб |
| `CatalogToolbar` | Sort/Filter buttons | Bottom sheets |
| `Filters` (sidebar) | `FilterSheet` | Bottom sheet |
| `ProductCard` | `ProductCard` | Адаптация размеров |
| `ProductGallery` | `ProductGallery` | Paging + pinch-zoom |
| `ProductGrid` | `FlashList` (2 cols) | FlashList вместо CSS Grid |
| `ProductBuySidebar` | Sticky bottom bar | Фиксированная панель снизу |
| `ProductInfo` (tabs) | Accordion / Tabs | Аккордеон лучше для mobile |
| `AuthForm` | PhoneInput + OtpInput | Нативные компоненты |
| `OrderSummary` | `CartSummary` | Адаптация |
| `Breadcrumbs` | Horizontal scroll chips | Горизонтальный скролл |
| `Toast` | Native toast | Сверху экрана |
| `LanguageSwitcher` | Settings toggle | В настройках профиля |
| `ScrollReveal` | — | Не нужен (RN нет IntersectionObserver) |
| `HomeSidebar` | — | Заменяется Quick Categories |

### 22.3 Сторы

| Web Store | Mobile Store | Изменения |
|---|---|---|
| `useCartStore` (localStorage) | `useCartStore` (MMKV + Supabase `carts`) | Локальный кэш + серверная синхронизация для авторизованных |
| `useWishlistStore` (localStorage) | `useWishlistStore` (MMKV + Supabase `wishlist_items`) | Локальный кэш + серверная синхронизация для авторизованных |
| Cookie: `lang` | `useSettingsStore` (MMKV) | Zustand вместо cookie |
| Cookie: `session` | SecureStore | Supabase Auth |
| — | `useAppConfig` (Supabase `app_config`) | Новый: динамическая конфигурация |
| — | `useNotifications` (Supabase `notifications_feed`) | Новый: лента уведомлений |

### 22.4 Утилиты (копируются без изменений)

| Утилита | Файл | Изменения |
|---|---|---|
| `formatPrice` | `utils/format.ts` | Без изменений |
| `formatDiscount` | `utils/format.ts` | Без изменений |
| `getProductWord` | `utils/format.ts` | Без изменений |
| `slugify` | `utils/slugify.ts` | Без изменений |
| `cyrToLat` | `utils/search-helpers.ts` | Без изменений |
| `latToCyr` | `utils/search-helpers.ts` | Без изменений |
| `getSearchVariants` | `utils/search-helpers.ts` | Без изменений |

### 22.5 Хуки

| Web Hook | Mobile Hook | Изменения |
|---|---|---|
| `useCategoryTree` | `useCategoryTree` | Тот же Supabase запрос |
| `useLanguage` | `useLanguage` | MMKV вместо cookie |
| — | `useAuth` | Новый (Supabase Auth) |
| — | `useNetworkStatus` | Новый (NetInfo) |
| — | `useProducts` | Новый (data fetching) |
| — | `useSearch` | Новый (debounced search) |

---

## 24. Этапы разработки

### Этап 1: Фундамент + БД (1-2 недели)

- [ ] Инициализация Expo проекта
- [ ] Настройка TypeScript, ESLint, Prettier
- [ ] Подключение Supabase client (expo-secure-store)
- [ ] Настройка Expo Router (навигация)
- [ ] Дизайн-система (цвета, типографика, spacing)
- [ ] Загрузка шрифтов (Unbounded, Inter, JetBrains Mono)
- [ ] UI-компоненты: Button, Input, Badge, Loading, EmptyState, Toast
- [ ] Zustand сторы (cart, wishlist, auth, settings) с MMKV
- [ ] **Создать новые таблицы в Supabase** (banners, wishlist_items, recently_viewed, pages, app_config, notifications_feed, push_tokens)
- [ ] **Заполнить app_config** начальными значениями
- [ ] **Заполнить pages** контентом статических страниц
- [ ] Хук `useAppConfig` для динамической конфигурации

### Этап 2: Каталог и товары (2-3 недели)

- [ ] Главный экран (баннеры из БД, секции товаров, недавно просмотренные)
- [ ] ProductCard компонент
- [ ] Дерево категорий
- [ ] Каталог с фильтрами и сортировкой
- [ ] Страница товара (галерея, инфо, buy bar)
- [ ] Запись в `recently_viewed` при открытии товара
- [ ] Поиск
- [ ] Бренды
- [ ] CMS-страницы (О нас, Контакты, Доставка, Опт, FAQ, Приватність)

### Этап 3: Корзина и чекаут (1-2 недели)

- [ ] Экран корзины (локальная + серверная синхронизация)
- [ ] QuantitySelector
- [ ] Экран оформления заказа (способы доставки/оплаты из `app_config`)
- [ ] Edge Function: create-order
- [ ] Экран успешного заказа
- [ ] Прогресс-бар бесплатной доставки (порог из `app_config`)

### Этап 4: Аутентификация + синхронизация (1-2 недели)

- [ ] Edge Functions: send-otp, verify-otp, phone-auth
- [ ] Экран логина (телефон + OTP)
- [ ] Экран регистрации
- [ ] Auth store и защита маршрутов
- [ ] Автозаполнение профиля в чекауте
- [ ] **Merge локальной корзины с серверной при логине**
- [ ] **Merge локального wishlist с серверным при логине**
- [ ] **Supabase Realtime**: подписки на корзину, заказы, уведомления

### Этап 5: Профиль и аккаунт (1 неделя)

- [ ] Экран профиля
- [ ] Редактирование профиля
- [ ] Мои заказы (realtime обновление статусов)
- [ ] Бонусы
- [ ] Документы
- [ ] Настройки (язык, пуш)
- [ ] Избранное (серверное `wishlist_items`)

### Этап 6: Уведомления и аналитика (1-2 недели)

- [ ] Настройка expo-notifications (push)
- [ ] Edge Function: register-push, send-push
- [ ] **Лента уведомлений** (экран + badge + realtime)
- [ ] Трекинг событий (site_events) с `platform` в metadata
- [ ] Firebase Analytics / PostHog
- [ ] **Force Update** проверка (min_app_version из `app_config`)
- [ ] **Maintenance mode** проверка

### Этап 7: Полировка и оптимизация (1-2 недели)

- [ ] Deep linking (URL scheme + Universal Links)
- [ ] Оффлайн-режим и кэширование
- [ ] Оптимизация производительности (FlashList, memo)
- [ ] Splash screen и app icons
- [ ] Тёмная тема (опционально)
- [ ] Haptic feedback
- [ ] Анимации переходов
- [ ] Pull-to-refresh на всех списках

### Этап 8: Админка (расширение веба) (1 неделя)

- [ ] Страница управления баннерами (CRUD + drag-and-drop позиции)
- [ ] Страница редактирования CMS-страниц (Markdown-редактор)
- [ ] Страница `app_config` (key-value редактор)
- [ ] Страница ленты уведомлений (отправка массовых уведомлений)
- [ ] Страница push-рассылок

### Этап 9: Тестирование и публикация (1-2 недели)

- [ ] Unit-тесты
- [ ] E2E тесты (Detox)
- [ ] Beta-тестирование (TestFlight / Internal Testing)
- [ ] App Store / Google Play скриншоты и описания
- [ ] Privacy Policy
- [ ] Подача на ревью
- [ ] Публикация

---

### Общая оценка: 12-18 недель

| Этап | Срок |
|---|---|
| 1. Фундамент + БД | 1-2 нед. |
| 2. Каталог и товары | 2-3 нед. |
| 3. Корзина и чекаут | 1-2 нед. |
| 4. Аутентификация + синхронизация | 1-2 нед. |
| 5. Профиль и аккаунт | 1 нед. |
| 6. Уведомления и аналитика | 1-2 нед. |
| 7. Полировка | 1-2 нед. |
| 8. Админка (расширение веба) | 1 нед. |
| 9. Тестирование и публикация | 1-2 нед. |
| **ИТОГО** | **12-18 нед.** |

---

## Приложение A: Переменные окружения (.env.example)

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# App
EXPO_PUBLIC_SITE_URL=https://shineshopb2b.com
EXPO_PUBLIC_APP_VERSION=1.0.0

# Analytics (опционально)
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Expo
EXPO_PUBLIC_EAS_PROJECT_ID=...
```

## Приложение B: app.json

```json
{
  "expo": {
    "name": "ShineShop B2B",
    "slug": "shineshop-b2b",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "shineshop",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAFAF8"
    },
    "ios": {
      "bundleIdentifier": "com.shineshop.b2b",
      "supportsTablet": true,
      "associatedDomains": ["applinks:shineshopb2b.com"],
      "infoPlist": {
        "CFBundleAllowMixedLocalizations": true,
        "CFBundleDevelopmentRegion": "uk"
      }
    },
    "android": {
      "package": "com.shineshop.b2b",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FAFAF8"
      },
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "shineshopb2b.com",
              "pathPrefix": "/product"
            },
            {
              "scheme": "https",
              "host": "shineshopb2b.com",
              "pathPrefix": "/catalog"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-haptics",
      "expo-notifications",
      "expo-linking"
    ]
  }
}
```

---

> **Документ создан**: 11.02.2026  
> **Автор**: AI Assistant  
> **Проект**: ShineShop B2B Mobile App  
> **Статус**: Черновик для согласования
