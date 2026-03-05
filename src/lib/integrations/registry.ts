// ================================================================
//  StrongNailBits OS — Service Registry
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
    isRequired: true,
    docsUrl: 'https://developers.google.com/analytics',
    requiredFields: [
      { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX', required: true, helpText: 'GA4 Measurement ID з налаштувань потоку даних' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Measurement Protocol API Secret', required: false, helpText: 'Для серверного трекінгу (Measurement Protocol)' },
    ],
    envMapping: {
      measurement_id: 'NEXT_PUBLIC_GA_MEASUREMENT_ID',
      api_secret: 'GA_API_SECRET',
    },
  },
  {
    slug: 'google-tag-manager',
    name: 'Google Tag Manager',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'Tags',
    description: 'Централізоване управління всіма тегами і пікселями на сайті.',
    isRequired: true,
    docsUrl: 'https://tagmanager.google.com',
    requiredFields: [
      { key: 'container_id', label: 'Container ID', type: 'text', placeholder: 'GTM-XXXXXXX', required: true },
    ],
    envMapping: {
      container_id: 'NEXT_PUBLIC_GTM_CONTAINER_ID',
    },
  },
  {
    slug: 'microsoft-clarity',
    name: 'Microsoft Clarity',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'MousePointerClick',
    description: 'Хітмепи, записи сесій, rage clicks, dead clicks. Без лімітів на трафік.',
    isRequired: true,
    docsUrl: 'https://clarity.microsoft.com',
    requiredFields: [
      { key: 'project_id', label: 'Project ID', type: 'text', placeholder: 'Clarity Project ID', required: true },
    ],
    envMapping: {
      project_id: 'NEXT_PUBLIC_CLARITY_PROJECT_ID',
    },
  },
  {
    slug: 'facebook-pixel',
    name: 'Facebook Pixel + CAPI',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'Facebook',
    description: 'Конверсії для Facebook/Instagram Ads. Серверний трекінг (CAPI) обходить блокування кукі.',
    isRequired: true,
    docsUrl: 'https://developers.facebook.com/docs/meta-pixel',
    requiredFields: [
      { key: 'pixel_id', label: 'Pixel ID', type: 'text', placeholder: 'Facebook Pixel ID', required: true },
      { key: 'access_token', label: 'Access Token (CAPI)', type: 'password', placeholder: 'Conversions API Token', required: false, helpText: 'Для серверного трекінгу' },
    ],
    envMapping: {
      pixel_id: 'NEXT_PUBLIC_FB_PIXEL_ID',
      access_token: 'FB_CAPI_ACCESS_TOKEN',
    },
  },
  {
    slug: 'posthog',
    name: 'PostHog',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'FlaskConical',
    description: 'A/B тести кнопок, карток, checkout, цін. Feature flags. FREE до 1M events.',
    isRequired: false,
    docsUrl: 'https://posthog.com/docs',
    requiredFields: [
      { key: 'api_key', label: 'Project API Key', type: 'text', placeholder: 'phc_...', required: true },
      { key: 'host', label: 'Host', type: 'url', placeholder: 'https://app.posthog.com', required: false, helpText: 'За замовчуванням: https://app.posthog.com' },
    ],
    envMapping: {
      api_key: 'NEXT_PUBLIC_POSTHOG_KEY',
      host: 'NEXT_PUBLIC_POSTHOG_HOST',
    },
  },
  {
    slug: 'meta-ad-library',
    name: 'Meta Ad Library API',
    category: 'analytics',
    module: 'Конкуренти',
    icon: 'Eye',
    description: 'Безкоштовний доступ до реклами конкурентів у Facebook/Instagram.',
    isRequired: false,
    docsUrl: 'https://www.facebook.com/ads/library/api',
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
    isRequired: true,
    docsUrl: 'https://merchants.google.com',
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
    isRequired: false,
    docsUrl: 'https://lookerstudio.google.com',
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
    isRequired: false,
    docsUrl: 'https://business.google.com',
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
    isRequired: false,
    docsUrl: 'https://core.telegram.org/bots/api',
    requiredFields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...', required: true },
      { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: '-100123456789', required: false, helpText: 'ID чату або групи для сповіщень (можна додати пізніше)' },
      { key: 'bot_username', label: 'Bot Username', type: 'text', placeholder: 'strongnailbits_b2b_bot', required: false },
    ],
    envMapping: {
      bot_token: 'TELEGRAM_BOT_TOKEN',
      chat_id: 'TELEGRAM_CHAT_ID',
      bot_username: 'TELEGRAM_BOT_USERNAME',
    },
  },
  {
    slug: 'onesignal',
    name: 'OneSignal',
    category: 'comms',
    module: 'Комунікації',
    icon: 'Bell',
    description: 'Web Push сповіщення в браузері. FREE до 10 000 підписників.',
    isRequired: false,
    docsUrl: 'https://documentation.onesignal.com',
    requiredFields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'OneSignal App ID', required: true },
      { key: 'api_key', label: 'REST API Key', type: 'password', placeholder: 'OneSignal REST API Key', required: true },
    ],
  },
  {
    slug: 'nova-poshta',
    name: 'Нова Пошта API',
    category: 'operations',
    module: 'Замовлення / Доставка',
    icon: 'Truck',
    description: 'Пошук відділень, розрахунок вартості, створення ТТН, трекінг посилок. Основний перевізник.',
    isRequired: true,
    docsUrl: 'https://developers.novaposhta.ua/documentation',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, helpText: 'Ключ API з кабінету НП → Налаштування → Безпека' },
      { key: 'sender_ref', label: 'Sender Ref (Counterparty)', type: 'text', required: false, helpText: 'Ref відправника — заповнюється автоматично при налаштуванні' },
      { key: 'sender_address', label: 'Sender Address Ref', type: 'text', required: false, helpText: 'Ref відділення відправки' },
      { key: 'sender_contact', label: 'Sender Contact Ref', type: 'text', required: false, helpText: 'Ref контактної особи відправника' },
      { key: 'sender_phone', label: 'Телефон відправника', type: 'text', placeholder: '+380XXXXXXXXX', required: false },
    ],
    envMapping: {
      api_key: 'NOVAPOSHTA_API_KEY',
      sender_ref: 'NOVAPOSHTA_SENDER_REF',
      sender_address: 'NOVAPOSHTA_SENDER_ADDRESS',
      sender_contact: 'NOVAPOSHTA_SENDER_CONTACT',
      sender_phone: 'NOVAPOSHTA_SENDER_PHONE',
    },
  },
  {
    slug: 'privatbank',
    name: 'PrivatBank API',
    category: 'operations',
    module: 'International',
    icon: 'Landmark',
    description: 'Курси валют щодня (USD, EUR, PLN, CZK, RON).',
    isRequired: false,
    docsUrl: 'https://api.privatbank.ua',
    requiredFields: [],
  },
  {
    slug: 'price-parser',
    name: 'Price Parser',
    category: 'competitors',
    module: 'Конкуренти',
    icon: 'TrendingDown',
    description: 'Власний парсер для моніторингу цін конкурентів.',
    isRequired: false,
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
    isRequired: false,
    docsUrl: 'https://developers.google.com/google-ads/api',
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
    isRequired: false,
    docsUrl: 'https://developers.facebook.com/docs/marketing-apis',
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
    isRequired: false,
    docsUrl: 'https://ads.tiktok.com/marketing_api',
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
    isRequired: false,
    docsUrl: 'https://serpstat.com/api',
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
    isRequired: false,
    docsUrl: 'https://docs.esputnik.com',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, helpText: 'REST API ключ з кабінету eSputnik' },
    ],
  },
  {
    slug: 'alphasms',
    name: 'AlphaSMS',
    category: 'operations',
    module: 'Авторизація / Комунікації',
    icon: 'Smartphone',
    description: 'SMS OTP для входу клієнтів, Viber-розсилки. Основний SMS-гейтвей.',
    isRequired: true,
    docsUrl: 'https://alphasms.net/about/techdocs/',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, helpText: 'Ключ з кабінету AlphaSMS → Налаштування → API' },
      { key: 'sender', label: 'Alpha-name (відправник)', type: 'text', placeholder: 'StrongNail', required: true, helpText: 'Зареєстроване ім\'я відправника SMS' },
    ],
    envMapping: {
      api_key: 'ALPHASMS_API_KEY',
      sender: 'ALPHASMS_SENDER',
    },
  },
  {
    slug: 'turbosms',
    name: 'TurboSMS',
    category: 'operations',
    module: 'Комунікації',
    icon: 'MessageSquare',
    description: 'SMS-гейтвей для України. Alpha-name відправника.',
    isRequired: false,
    docsUrl: 'https://turbosms.ua/api.html',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'sender', label: 'Alpha-name', type: 'text', placeholder: 'StrongNailBits', required: true, helpText: 'Зареєстроване ім\'я відправника' },
    ],
  },
  {
    slug: 'claude-api',
    name: 'Claude API (Anthropic)',
    category: 'ai',
    module: 'Всі модулі',
    icon: 'Brain',
    description: 'AI мозок SmartЛійок: персоналізація повідомлень, чатбот 24/7, аналіз воронок, скоринг контактів.',
    isRequired: true,
    docsUrl: 'https://docs.anthropic.com',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true },
      { key: 'model', label: 'Модель', type: 'select', required: false, options: [
        { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (розумний)' },
        { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (швидкий і дешевий)' },
      ]},
    ],
    envMapping: {
      api_key: 'CLAUDE_API_KEY',
      model: 'CLAUDE_MODEL',
    },
  },
  {
    slug: 'photoroom',
    name: 'PhotoRoom API',
    category: 'ai',
    module: 'Товари',
    icon: 'ImagePlus',
    description: 'Видалення фону, бейджі (ХІТ, -20%), ресайз для різних каналів.',
    isRequired: false,
    docsUrl: 'https://www.photoroom.com/api',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
    envMapping: {
      api_key: 'PHOTOROOM_API_KEY',
    },
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
    isRequired: false,
    docsUrl: 'https://prom.ua/partner-api',
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
    isRequired: false,
    docsUrl: 'https://api-seller.rozetka.com.ua',
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
    isRequired: false,
    docsUrl: 'https://hotline.ua',
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
    isRequired: false,
    docsUrl: 'https://developers.admitad.com',
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
    isRequired: false,
    docsUrl: 'https://fal.ai',
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
    isRequired: false,
    docsUrl: 'https://fal.ai',
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
    isRequired: false,
    docsUrl: 'https://www.banuba.com/tint',
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
    isRequired: false,
    docsUrl: 'https://www.searchapi.io',
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
    isRequired: false,
    docsUrl: 'https://docs.apify.com',
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
    isRequired: false,
    docsUrl: 'https://ahrefs.com/api',
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
    isRequired: false,
    docsUrl: 'https://polotno.com',
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
    isRequired: false,
    docsUrl: 'http://fabricjs.com',
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
    category: 'operations',
    module: 'Замовлення / Оплата',
    icon: 'CreditCard',
    description: 'Оплата в Україні (UAH). Інтернет-еквайринг від ПриватБанку.',
    isRequired: false,
    docsUrl: 'https://www.liqpay.ua/documentation',
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
    isRequired: false,
    docsUrl: 'https://developers.przelewy24.pl',
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
    isRequired: false,
    docsUrl: 'https://stripe.com/docs',
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
    isRequired: false,
    docsUrl: 'https://meest.com',
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
    isRequired: false,
    docsUrl: 'https://www.whitepress.com',
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
    isRequired: false,
    requiredFields: [],
  },
  {
    slug: 'reviews-ugc',
    name: 'Відгуки / UGC',
    category: 'builtin',
    module: 'Товари',
    icon: 'Star',
    description: 'Рейтинги, фото клієнтів, Schema.org AggregateRating.',
    isRequired: false,
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
    isRequired: false,
    requiredFields: [],
  },
  {
    slug: 'review-moderation',
    name: 'Review & Moderation',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'ShieldCheck',
    description: 'Claude AI перевіряє описи + модератор затверджує.',
    isRequired: false,
    requiredFields: [],
  },
  {
    slug: 'split-payment',
    name: 'Split Payment Engine',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'Split',
    description: 'Авто-розподіл оплати: комісія Strong Nail Bits + виплата селлеру.',
    isRequired: false,
    requiredFields: [],
  },
  {
    slug: 'fondy',
    name: 'Fondy / LiqPay Split',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'ArrowLeftRight',
    description: 'Процесинг зі спліт-виплатами.',
    isRequired: false,
    docsUrl: 'https://docs.fondy.eu',
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
    isRequired: false,
    requiredFields: [],
  },
  {
    slug: 'delivery-orchestrator',
    name: 'Delivery Orchestrator',
    category: 'marketplace',
    module: 'Маркетплейс',
    icon: 'Route',
    description: 'Роутинг доставки: Strong Nail Bits / Seller / 3PL.',
    isRequired: false,
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
    isRequired: true,
    docsUrl: 'https://search.google.com/search-console',
    requiredFields: [
      { key: 'site_url', label: 'Site URL', type: 'url', placeholder: 'https://strongnailbitsb2b.com', required: true },
      { key: 'service_account_json', label: 'Service Account JSON', type: 'password', required: false, helpText: 'JSON ключ сервісного акаунту Google' },
    ],
  },
];

// -----------------------------------------------------------------
//  M. Додаткові сервіси
// -----------------------------------------------------------------

// -----------------------------------------------------------------
//  N. Операційні додаткові (Checkbox, monobank)
// -----------------------------------------------------------------

const operationsExtra: ServiceDefinition[] = [
  {
    slug: 'checkbox',
    name: 'Checkbox ПРРО',
    category: 'operations',
    module: 'Замовлення / Фіскалізація',
    icon: 'Receipt',
    description: 'Фіскальні чеки (ПРРО). Автоматичне створення чека після оплати. Sandbox для тестування.',
    isRequired: true,
    docsUrl: 'https://docs.checkbox.ua',
    requiredFields: [
      { key: 'api_key', label: 'API Key (X-Token)', type: 'password', required: true, helpText: 'Токен з кабінету Checkbox → API' },
      { key: 'cashier_login', label: 'Логін касира', type: 'text', required: true },
      { key: 'cashier_password', label: 'Пароль касира', type: 'password', required: true },
      { key: 'license_key', label: 'Ліцензійний ключ', type: 'password', required: false, helpText: 'Ключ каси (для prod)' },
      { key: 'is_sandbox', label: 'Режим', type: 'select', required: true, options: [
        { value: 'true', label: 'Тестовий (Sandbox)' },
        { value: 'false', label: 'Бойовий (Production)' },
      ]},
    ],
  },
  {
    slug: 'mono-acquiring',
    name: 'monobank Acquiring',
    category: 'operations',
    module: 'Замовлення / Оплата',
    icon: 'CreditCard',
    description: 'Прийом онлайн-оплати через monobank. Invoice-based payment links.',
    isRequired: false,
    docsUrl: 'https://api.monobank.ua/docs/acquiring.html',
    requiredFields: [
      { key: 'token', label: 'X-Token', type: 'password', required: true, helpText: 'Токен з кабінету мерчанта monobank' },
    ],
  },
];

const additionalServices: ServiceDefinition[] = [
  {
    slug: 'voyage-ai',
    name: 'Voyage AI (Embeddings)',
    category: 'ai',
    module: 'Enrichment',
    icon: 'Compass',
    description: 'Векторні ембедінги для семантичного пошуку товарів.',
    isRequired: false,
    docsUrl: 'https://docs.voyageai.com',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
    envMapping: { api_key: 'VOYAGE_API_KEY' },
  },
  {
    slug: 'google-psi',
    name: 'Google PageSpeed Insights',
    category: 'analytics',
    module: 'Дашборд',
    icon: 'Gauge',
    description: 'Аналіз швидкості сайту.',
    isRequired: false,
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: false },
    ],
    envMapping: { api_key: 'GOOGLE_PSI_KEY' },
  },
  {
    slug: 'telegram-admin',
    name: 'Telegram Admin Bot',
    category: 'comms',
    module: 'Адмінка',
    icon: 'Shield',
    description: 'Окремий бот для адмін-сповіщень і OTP автентифікації.',
    isRequired: false,
    requiredFields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true },
      { key: 'bot_username', label: 'Bot Username', type: 'text', placeholder: 'SNB_admin_bot', required: false },
    ],
    envMapping: {
      bot_token: 'TELEGRAM_ADMIN_BOT_TOKEN',
      bot_username: 'TELEGRAM_ADMIN_BOT_USERNAME',
    },
  },
];

// ================================================================
//  ПОВНИЙ РЕЄСТР
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
  ...operationsExtra,
  ...additionalServices,
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
