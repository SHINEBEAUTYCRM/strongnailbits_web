// ================================================================
//  ShineShop OS — Service Registry
//  Статичний реєстр всіх 47 сервісів екосистеми
// ================================================================

import type { ServiceDefinition } from './types';

// -----------------------------------------------------------------
//  A. Безкоштовна аналітика та трекінг (6)
// -----------------------------------------------------------------

const analytics: ServiceDefinition[] = [
  {
    slug: 'google-analytics',
    name: 'Google Analytics 4',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'BarChart3',
    description: 'Воронка продажів, когорти, LTV, джерела трафіку. Enhanced E-commerce трекінг.',
    price: 'FREE',
    isRequired: true,
    docsUrl: 'https://developers.google.com/analytics',
    phase: 1,
    requiredFields: [
      { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX', required: true, helpText: 'GA4 Measurement ID з налаштувань потоку даних' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Measurement Protocol API Secret', required: false, helpText: 'Для серверного трекінгу (Measurement Protocol)' },
    ],
  },
  {
    slug: 'google-tag-manager',
    name: 'Google Tag Manager',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'Tags',
    description: 'Централізоване управління всіма тегами і пікселями на сайті.',
    price: 'FREE',
    isRequired: true,
    docsUrl: 'https://tagmanager.google.com',
    phase: 1,
    requiredFields: [
      { key: 'container_id', label: 'Container ID', type: 'text', placeholder: 'GTM-XXXXXXX', required: true },
    ],
  },
  {
    slug: 'microsoft-clarity',
    name: 'Microsoft Clarity',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'MousePointerClick',
    description: 'Хітмепи, записи сесій, rage clicks, dead clicks. Без лімітів на трафік.',
    price: 'FREE',
    isRequired: true,
    docsUrl: 'https://clarity.microsoft.com',
    phase: 1,
    requiredFields: [
      { key: 'project_id', label: 'Project ID', type: 'text', placeholder: 'Clarity Project ID', required: true },
    ],
  },
  {
    slug: 'facebook-pixel',
    name: 'Facebook Pixel + CAPI',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'Facebook',
    description: 'Конверсії для Facebook/Instagram Ads. Серверний трекінг (CAPI) обходить блокування кукі.',
    price: 'FREE',
    isRequired: true,
    docsUrl: 'https://developers.facebook.com/docs/meta-pixel',
    phase: 1,
    requiredFields: [
      { key: 'pixel_id', label: 'Pixel ID', type: 'text', placeholder: 'Facebook Pixel ID', required: true },
      { key: 'access_token', label: 'Access Token (CAPI)', type: 'password', placeholder: 'Conversions API Token', required: false, helpText: 'Для серверного трекінгу' },
    ],
  },
  {
    slug: 'posthog',
    name: 'PostHog',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'FlaskConical',
    description: 'A/B тести кнопок, карток, checkout, цін. Feature flags. FREE до 1M events.',
    price: 'FREE (<1M)',
    isRequired: false,
    docsUrl: 'https://posthog.com/docs',
    phase: 1,
    requiredFields: [
      { key: 'api_key', label: 'Project API Key', type: 'text', placeholder: 'phc_...', required: true },
      { key: 'host', label: 'Host', type: 'url', placeholder: 'https://app.posthog.com', required: false, helpText: 'За замовчуванням: https://app.posthog.com' },
    ],
  },
  {
    slug: 'meta-ad-library',
    name: 'Meta Ad Library API',
    category: 'analytics',
    module: 'Конкуренти',
    icon: 'Eye',
    description: 'Безкоштовний доступ до реклами конкурентів у Facebook/Instagram.',
    price: 'FREE',
    isRequired: false,
    docsUrl: 'https://www.facebook.com/ads/library/api',
    phase: 21,
    requiredFields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Meta Graph API Token', required: true },
    ],
  },
];

// -----------------------------------------------------------------
//  B. Безкоштовний маркетинг (4)
// -----------------------------------------------------------------

const freeMarketing: ServiceDefinition[] = [
  {
    slug: 'google-merchant',
    name: 'Google Merchant Center',
    category: 'ads',
    module: 'Товари',
    icon: 'ShoppingCart',
    description: 'Фід товарів для Google Shopping і безкоштовних лістингів.',
    price: 'FREE',
    isRequired: true,
    docsUrl: 'https://merchants.google.com',
    phase: 5,
    requiredFields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Merchant Center ID', required: true },
    ],
  },
  {
    slug: 'looker-studio',
    name: 'Looker Studio',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'PieChart',
    description: 'Зведені звіти GA4 + Ads + GSC + Facebook в одному екрані.',
    price: 'FREE',
    isRequired: false,
    docsUrl: 'https://lookerstudio.google.com',
    phase: 1,
    requiredFields: [
      { key: 'report_url', label: 'Report URL', type: 'url', placeholder: 'https://lookerstudio.google.com/...', required: false, helpText: 'Посилання на зведений дашборд' },
    ],
  },
  {
    slug: 'google-business',
    name: 'Google Business Profile',
    category: 'seo',
    module: 'International',
    icon: 'MapPin',
    description: 'Карточка в Google Maps, відгуки, локальний пошук для Одеси.',
    price: 'FREE',
    isRequired: false,
    docsUrl: 'https://business.google.com',
    phase: 3,
    requiredFields: [
      { key: 'account_id', label: 'Account ID', type: 'text', placeholder: 'GBP Account ID', required: false },
      { key: 'location_id', label: 'Location ID', type: 'text', placeholder: 'GBP Location ID', required: false },
    ],
  },
];

// -----------------------------------------------------------------
//  C. Безкоштовні утиліти (4)
// -----------------------------------------------------------------

const freeUtilities: ServiceDefinition[] = [
  {
    slug: 'telegram-bot',
    name: 'Telegram Bot API',
    category: 'comms',
    module: 'Замовлення',
    icon: 'Send',
    description: 'Алерти про замовлення, звіти продажів, повідомлення команді.',
    price: 'FREE',
    isRequired: false,
    docsUrl: 'https://core.telegram.org/bots/api',
    phase: 10,
    requiredFields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...', required: true },
      { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: '-100123456789', required: true, helpText: 'ID чату або групи для сповіщень' },
    ],
  },
  {
    slug: 'onesignal',
    name: 'OneSignal',
    category: 'comms',
    module: 'Комунікації',
    icon: 'Bell',
    description: 'Web Push сповіщення в браузері. FREE до 10 000 підписників.',
    price: 'FREE (<10K)',
    isRequired: false,
    docsUrl: 'https://documentation.onesignal.com',
    phase: 10,
    requiredFields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'OneSignal App ID', required: true },
      { key: 'api_key', label: 'REST API Key', type: 'password', placeholder: 'OneSignal REST API Key', required: true },
    ],
  },
  {
    slug: 'privatbank',
    name: 'PrivatBank API',
    category: 'international',
    module: 'International',
    icon: 'Landmark',
    description: 'Курси валют щодня (USD, EUR, PLN, CZK, RON).',
    price: 'FREE',
    isRequired: false,
    docsUrl: 'https://api.privatbank.ua',
    phase: 33,
    requiredFields: [],
  },
  {
    slug: 'price-parser',
    name: 'Price Parser',
    category: 'competitors',
    module: 'Конкуренти',
    icon: 'TrendingDown',
    description: 'Власний парсер для моніторингу цін конкурентів.',
    price: 'FREE',
    isRequired: false,
    phase: 21,
    requiredFields: [
      { key: 'targets', label: 'URL конкурентів', type: 'text', placeholder: 'staleks.com, amoreshop.com.ua...', required: false, helpText: 'Список сайтів через кому' },
    ],
  },
];

// -----------------------------------------------------------------
//  D. Рекламні платформи (3)
// -----------------------------------------------------------------

const adsPlatforms: ServiceDefinition[] = [
  {
    slug: 'google-ads',
    name: 'Google Ads API',
    category: 'ads',
    module: 'Реклама',
    icon: 'Megaphone',
    description: 'Search, Shopping, YouTube, Performance Max. Автоуправління кампаніями.',
    price: 'Бюджет',
    isRequired: false,
    docsUrl: 'https://developers.google.com/google-ads/api',
    phase: 5,
    requiredFields: [
      { key: 'client_id', label: 'OAuth Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', required: true },
      { key: 'developer_token', label: 'Developer Token', type: 'password', required: true },
      { key: 'customer_id', label: 'Customer ID', type: 'text', placeholder: '123-456-7890', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
    ],
  },
  {
    slug: 'facebook-ads',
    name: 'Facebook / Instagram Ads',
    category: 'ads',
    module: 'Реклама',
    icon: 'Target',
    description: 'DPA, ретаргетинг, lookalike аудиторії. Серверний трекінг CAPI.',
    price: 'Бюджет',
    isRequired: false,
    docsUrl: 'https://developers.facebook.com/docs/marketing-apis',
    phase: 8,
    requiredFields: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true },
      { key: 'app_secret', label: 'App Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', placeholder: 'act_123456789', required: true },
    ],
  },
  {
    slug: 'tiktok-ads',
    name: 'TikTok Ads API',
    category: 'ads',
    module: 'Реклама',
    icon: 'Clapperboard',
    description: 'In-Feed Ads, Spark Ads, каталог товарів. Жінки 18–45.',
    price: 'Бюджет',
    isRequired: false,
    docsUrl: 'https://ads.tiktok.com/marketing_api',
    phase: 8,
    requiredFields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'pixel_id', label: 'Pixel ID', type: 'text', required: false },
      { key: 'advertiser_id', label: 'Advertiser ID', type: 'text', required: true },
    ],
  },
];

// -----------------------------------------------------------------
//  E. Платні маркетингові (5)
// -----------------------------------------------------------------

const paidMarketing: ServiceDefinition[] = [
  {
    slug: 'serpstat',
    name: 'Serpstat API',
    category: 'seo',
    module: 'Конкуренти/SEO',
    icon: 'SearchCheck',
    description: 'SEO: позиції конкурентів, keyword gap, аудит сайту. google.com.ua.',
    price: '~2 800 ₴/міс',
    isRequired: false,
    docsUrl: 'https://serpstat.com/api',
    phase: 3,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    slug: 'esputnik',
    name: 'eSputnik',
    category: 'comms',
    module: 'Комунікації',
    icon: 'Mail',
    description: 'Email, SMS, Viber, Push, App Inbox. Українська CDP (22 000+ брендів).',
    price: '~2 500 ₴/міс',
    isRequired: false,
    docsUrl: 'https://docs.esputnik.com',
    phase: 10,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, helpText: 'REST API ключ з кабінету eSputnik' },
    ],
  },
  {
    slug: 'turbosms',
    name: 'TurboSMS',
    category: 'comms',
    module: 'Комунікації',
    icon: 'MessageSquare',
    description: 'SMS-гейтвей для України. Alpha-name «ShineShop». ~0.35 ₴/SMS.',
    price: '~1 500 ₴/міс',
    isRequired: false,
    docsUrl: 'https://turbosms.ua/api.html',
    phase: 10,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'sender', label: 'Alpha-name', type: 'text', placeholder: 'ShineShop', required: true, helpText: 'Зареєстроване ім\'я відправника' },
    ],
  },
  {
    slug: 'claude-api',
    name: 'Claude API (Anthropic)',
    category: 'ai',
    module: 'Всі модулі',
    icon: 'Brain',
    description: 'AI мозок: контент, SEO-мета, чатбот 24/7, модерація, переклади.',
    price: '~3 000 ₴/міс',
    isRequired: true,
    docsUrl: 'https://docs.anthropic.com',
    phase: 12,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true },
      { key: 'model', label: 'Модель', type: 'select', required: false, options: [
        { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (recommended)' },
        { value: 'claude-haiku-4-20250514', label: 'Claude Haiku 4 (fast & cheap)' },
      ]},
    ],
  },
  {
    slug: 'photoroom',
    name: 'PhotoRoom API',
    category: 'ai',
    module: 'Товари',
    icon: 'ImagePlus',
    description: 'Видалення фону, бейджі (ХІТ, -20%), ресайз для різних каналів.',
    price: '~1 200 ₴/міс',
    isRequired: false,
    docsUrl: 'https://www.photoroom.com/api',
    phase: 12,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
  },
];

// -----------------------------------------------------------------
//  F. Маркетплейси зовнішні (4)
// -----------------------------------------------------------------

const externalMarketplaces: ServiceDefinition[] = [
  {
    slug: 'prom-ua',
    name: 'Prom.ua',
    category: 'marketplace-ext',
    module: 'Маркетплейси',
    icon: 'Store',
    description: 'Найбільший B2B-маркетплейс України. XML/YML фід з Supabase.',
    price: '5–16% комісія',
    isRequired: false,
    docsUrl: 'https://prom.ua/partner-api',
    phase: 12,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'feed_url', label: 'Feed URL', type: 'url', required: false, helpText: 'Генерується автоматично' },
    ],
  },
  {
    slug: 'rozetka',
    name: 'Rozetka Marketplace',
    category: 'marketplace-ext',
    module: 'Маркетплейси',
    icon: 'ShoppingBag',
    description: 'Найбільший маркетплейс UA. 2.5 млн відвідувачів/день.',
    price: '4–35% + 100 ₴/міс',
    isRequired: false,
    docsUrl: 'https://api-seller.rozetka.com.ua',
    phase: 12,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'seller_id', label: 'Seller ID', type: 'text', required: true },
    ],
  },
  {
    slug: 'hotline',
    name: 'Hotline.ua',
    category: 'marketplace-ext',
    module: 'Маркетплейси',
    icon: 'Flame',
    description: 'Прайс-агрегатор #1 в Україні. Оплата за кліки (CPC).',
    price: 'CPC',
    isRequired: false,
    docsUrl: 'https://hotline.ua',
    phase: 12,
    requiredFields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true },
      { key: 'feed_url', label: 'Feed URL', type: 'url', required: false, helpText: 'Генерується автоматично' },
    ],
  },
  {
    slug: 'admitad',
    name: 'Admitad',
    category: 'marketplace-ext',
    module: 'Маркетплейси',
    icon: 'Handshake',
    description: 'Афіліатна мережа. Блогери рекламують за % від продажів (5–10% CPA).',
    price: '5–10% CPA',
    isRequired: false,
    docsUrl: 'https://developers.admitad.com',
    phase: 12,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'campaign_id', label: 'Campaign ID', type: 'text', required: true },
    ],
  },
];

// -----------------------------------------------------------------
//  G. AI та генерація (3)
// -----------------------------------------------------------------

const aiGeneration: ServiceDefinition[] = [
  {
    slug: 'flux-kontext',
    name: 'fal.ai + FLUX Kontext',
    category: 'ai',
    module: 'Shine Scan',
    icon: 'Sparkles',
    description: 'Image-to-image: фото руки → зміна дизайну нігтів. Ядро Shine Scan.',
    price: '$0.04/фото',
    isRequired: false,
    docsUrl: 'https://fal.ai',
    phase: 17,
    requiredFields: [
      { key: 'api_key', label: 'fal.ai API Key', type: 'password', required: true },
    ],
  },
  {
    slug: 'flux-pro',
    name: 'fal.ai + FLUX 2 Pro',
    category: 'ai',
    module: 'AI Designer',
    icon: 'Wand2',
    description: 'Text-to-image: опис → фотореалістичні nail-дизайни.',
    price: '$0.04–0.06/фото',
    isRequired: false,
    docsUrl: 'https://fal.ai',
    phase: 17,
    requiredFields: [
      { key: 'api_key', label: 'fal.ai API Key', type: 'password', required: true },
    ],
  },
  {
    slug: 'banuba-tint',
    name: 'Banuba TINT',
    category: 'ai',
    module: 'Color Studio',
    icon: 'Palette',
    description: 'AR-примірка кольору через камеру. Текстури: желе, мат, хром, глітер.',
    price: '$200–300/міс',
    isRequired: false,
    docsUrl: 'https://www.banuba.com/tint',
    phase: 21,
    requiredFields: [
      { key: 'client_token', label: 'Client Token', type: 'password', required: true },
    ],
  },
];

// -----------------------------------------------------------------
//  H. Конкурентна розвідка (3)
// -----------------------------------------------------------------

const competitiveIntel: ServiceDefinition[] = [
  {
    slug: 'searchapi',
    name: 'SearchApi',
    category: 'competitors',
    module: 'Конкуренти',
    icon: 'Radar',
    description: 'Google Ads Transparency доступ. Моніторинг реклами конкурентів.',
    price: '~$50/міс',
    isRequired: false,
    docsUrl: 'https://www.searchapi.io',
    phase: 21,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    slug: 'apify',
    name: 'Apify',
    category: 'competitors',
    module: 'Конкуренти',
    icon: 'Bug',
    description: 'Скрейпер 400 оголошень/хв. Парсинг даних конкурентів.',
    price: '~$5/міс',
    isRequired: false,
    docsUrl: 'https://docs.apify.com',
    phase: 21,
    requiredFields: [
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
    ],
  },
  {
    slug: 'ahrefs',
    name: 'Ahrefs API',
    category: 'competitors',
    module: 'Конкуренти',
    icon: 'Link',
    description: 'Ключові слова, беклінки конкурентів. Потужна SEO-аналітика.',
    price: 'В SEO бюджеті',
    isRequired: false,
    docsUrl: 'https://ahrefs.com/api',
    phase: 21,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
  },
];

// -----------------------------------------------------------------
//  I. Дизайн (2)
// -----------------------------------------------------------------

const designTools: ServiceDefinition[] = [
  {
    slug: 'polotno',
    name: 'Polotno SDK',
    category: 'design',
    module: 'Banner Studio',
    icon: 'PenTool',
    description: 'Canva-подібний редактор банерів в адмінці. Шаблони IG/Stories/FB.',
    price: '~$100/міс',
    isRequired: false,
    docsUrl: 'https://polotno.com',
    phase: 17,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    slug: 'fabricjs',
    name: 'Fabric.js',
    category: 'design',
    module: 'Banner Studio',
    icon: 'Brush',
    description: 'Open-source canvas бібліотека (резервний варіант).',
    price: 'FREE',
    isRequired: false,
    docsUrl: 'http://fabricjs.com',
    phase: 17,
    requiredFields: [],
  },
];

// -----------------------------------------------------------------
//  J. Міжнародна експансія (5)
// -----------------------------------------------------------------

const international: ServiceDefinition[] = [
  {
    slug: 'liqpay',
    name: 'LiqPay',
    category: 'international',
    module: 'International',
    icon: 'CreditCard',
    description: 'Оплата в Україні (UAH). Інтернет-еквайринг від ПриватБанку.',
    price: 'Комісія',
    isRequired: false,
    docsUrl: 'https://www.liqpay.ua/documentation',
    phase: 29,
    requiredFields: [
      { key: 'public_key', label: 'Public Key', type: 'text', required: true },
      { key: 'private_key', label: 'Private Key', type: 'password', required: true },
    ],
  },
  {
    slug: 'przelewy24',
    name: 'Przelewy24',
    category: 'international',
    module: 'International',
    icon: 'Banknote',
    description: 'Оплата в Польщі (PLN). Популярний платіжний провайдер.',
    price: 'Комісія',
    isRequired: false,
    docsUrl: 'https://developers.przelewy24.pl',
    phase: 33,
    requiredFields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'crc', label: 'CRC Key', type: 'password', required: true },
    ],
  },
  {
    slug: 'stripe',
    name: 'Stripe',
    category: 'international',
    module: 'International',
    icon: 'Wallet',
    description: 'Оплата для Румунії (RON), Чехії (CZK), та інших країн.',
    price: '2.9% + 30¢',
    isRequired: false,
    docsUrl: 'https://stripe.com/docs',
    phase: 33,
    requiredFields: [
      { key: 'publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_...', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_...', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...', required: false },
    ],
  },
  {
    slug: 'meest',
    name: 'Meest / NP Global',
    category: 'international',
    module: 'International',
    icon: 'Truck',
    description: 'Міжнародна доставка UA→PL/CZ/RO. Трекінг посилок.',
    price: 'За відправку',
    isRequired: false,
    docsUrl: 'https://meest.com',
    phase: 33,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'sender_id', label: 'Sender ID', type: 'text', required: false },
    ],
  },
  {
    slug: 'whitepress',
    name: 'WhitePress / Linkhouse',
    category: 'international',
    module: 'International',
    icon: 'ExternalLink',
    description: 'Лінкбілдинг для PL/RO/CZ. Публікації та беклінки.',
    price: '50–100K ₴',
    isRequired: false,
    docsUrl: 'https://www.whitepress.com',
    phase: 33,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: false },
    ],
  },
];

// -----------------------------------------------------------------
//  K. Вбудовані функції (2)
// -----------------------------------------------------------------

const builtinFeatures: ServiceDefinition[] = [
  {
    slug: 'loyalty-program',
    name: 'Loyalty-програма',
    category: 'builtin',
    module: 'Клієнти',
    icon: 'Heart',
    description: 'Накопичувальні знижки, бонуси за покупки, реферали.',
    price: 'Вбудовано',
    isRequired: false,
    phase: 15,
    requiredFields: [],
  },
  {
    slug: 'reviews-ugc',
    name: 'Відгуки / UGC',
    category: 'builtin',
    module: 'Товари',
    icon: 'Star',
    description: 'Рейтинги, фото клієнтів, Schema.org AggregateRating.',
    price: 'Вбудовано',
    isRequired: false,
    phase: 15,
    requiredFields: [],
  },
];

// -----------------------------------------------------------------
//  L. Маркетплейс косметики (6)
// -----------------------------------------------------------------

const marketplace: ServiceDefinition[] = [
  {
    slug: 'seller-portal',
    name: 'Seller Portal',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'Building2',
    description: 'Кабінет селлера: товари, замовлення, аналітика, виведення коштів.',
    price: 'Вбудовано',
    isRequired: false,
    phase: 29,
    requiredFields: [],
  },
  {
    slug: 'review-moderation',
    name: 'Review & Moderation',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'ShieldCheck',
    description: 'Claude AI перевіряє описи + модератор затверджує.',
    price: 'Вбудовано',
    isRequired: false,
    phase: 29,
    requiredFields: [],
  },
  {
    slug: 'split-payment',
    name: 'Split Payment Engine',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'Split',
    description: 'Авто-розподіл оплати: комісія Shine Shop + виплата селлеру.',
    price: 'Вбудовано',
    isRequired: false,
    phase: 29,
    requiredFields: [],
  },
  {
    slug: 'fondy',
    name: 'Fondy / LiqPay Split',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'ArrowLeftRight',
    description: 'Процесинг зі спліт-виплатами. 1.5–2.5% комісія.',
    price: '1.5–2.5%',
    isRequired: false,
    docsUrl: 'https://docs.fondy.eu',
    phase: 29,
    requiredFields: [
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', required: true },
    ],
  },
  {
    slug: 'seller-analytics',
    name: 'Seller Analytics',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'BarChart',
    description: 'Дашборд для селлерів: продажі, конверсії, виплати.',
    price: 'Вбудовано',
    isRequired: false,
    phase: 29,
    requiredFields: [],
  },
  {
    slug: 'delivery-orchestrator',
    name: 'Delivery Orchestrator',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'Route',
    description: 'Роутинг доставки: Shine Shop / Seller / 3PL.',
    price: 'Вбудовано',
    isRequired: false,
    phase: 29,
    requiredFields: [],
  },
];

// -----------------------------------------------------------------
//  Google Search Console (SEO)
// -----------------------------------------------------------------

const seoServices: ServiceDefinition[] = [
  {
    slug: 'google-search-console',
    name: 'Google Search Console',
    category: 'seo',
    module: 'SEO',
    icon: 'Search',
    description: 'Позиції, CTR, Quick Wins (8–15), Core Web Vitals.',
    price: 'FREE',
    isRequired: true,
    docsUrl: 'https://search.google.com/search-console',
    phase: 3,
    requiredFields: [
      { key: 'site_url', label: 'Site URL', type: 'url', placeholder: 'https://shineshopb2b.com', required: true },
      { key: 'service_account_json', label: 'Service Account JSON', type: 'password', required: false, helpText: 'JSON ключ сервісного акаунту Google' },
    ],
  },
];

// ================================================================
//  ПОВНИЙ РЕЄСТР (47 сервісів)
// ================================================================

export const SERVICE_REGISTRY: ServiceDefinition[] = [
  ...analytics,
  ...freeMarketing,
  ...seoServices,
  ...freeUtilities,
  ...adsPlatforms,
  ...paidMarketing,
  ...externalMarketplaces,
  ...aiGeneration,
  ...competitiveIntel,
  ...designTools,
  ...international,
  ...builtinFeatures,
  ...marketplace,
];

// ================================================================
//  Хелпери
// ================================================================

/** Знайти сервіс за slug */
export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return SERVICE_REGISTRY.find(s => s.slug === slug);
}

/** Отримати всі сервіси по категорії */
export function getServicesByCategory(category: string): ServiceDefinition[] {
  return SERVICE_REGISTRY.filter(s => s.category === category);
}

/** Отримати рекомендовані сервіси */
export function getRequiredServices(): ServiceDefinition[] {
  return SERVICE_REGISTRY.filter(s => s.isRequired);
}

/** Отримати всі унікальні категорії */
export function getAllCategories(): string[] {
  return [...new Set(SERVICE_REGISTRY.map(s => s.category))];
}

/** Кількість сервісів */
export const TOTAL_SERVICES = SERVICE_REGISTRY.length;
