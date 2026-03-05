export interface GenerateRequest {
  action: 'generate' | 'translate' | 'improve' | 'seo';
  targetLang: 'uk' | 'ru';
  productName: string;
  brand?: string;
  category?: string;
  price?: number;
  existingDescription?: string;
  otherLangDescription?: string;
  characteristics?: Record<string, string>;
}

export interface SeoRequest {
  productName: string;
  brand?: string;
  category?: string;
  description?: string;
  targetLang: 'uk' | 'ru';
}

export function buildSystemPrompt(body: GenerateRequest): string {
  return `Ти — професійний копірайтер інтернет-магазину nail-індустрії Strong Nail Bits.
Працюєш з описами товарів для nail-майстрів та салонів краси.

СТИЛЬ:
- Професійний, але не сухий — як досвідчений майстер пояснює колезі
- Без води та загальних фраз типу "ідеальний вибір для кожного"
- Конкретні переваги та характеристики
- Без вигаданих характеристик — якщо не знаєш точних даних, не вигадуй
- Мова: ${body.targetLang === 'uk' ? 'українська' : 'російська'}

ФОРМАТ HTML:
- Використовуй <h3> для підзаголовків (не h1, не h2)
- Списки через <ul><li> або <ol><li>
- Абзаци через <p>
- Жирний текст <strong> для ключових характеристик
- НЕ використовуй inline стилі (style="...")
- НЕ використовуй класи CSS
- НЕ додавай зовнішні посилання
- Довжина: 150-400 слів

СТРУКТУРА ОПИСУ:
1. Вступний абзац — що це за товар і для чого (2-3 речення)
2. Особливості / переваги — список 3-6 пунктів
3. Спосіб застосування — якщо релевантно для категорії (крок за кроком)
4. НЕ додавай заключний абзац типу "Замовляйте зараз!"

БРЕНДИ nail-індустрії які ти знаєш:
DARK (український бренд, преміум гель-лаки та бази), LUNA, WEEX, GA&MA, 
F.O.X (стійкі гель-лаки), Siller, DNKa, NUB, Staleks (інструменти), 
EDLEN, Saga, Kodi, HEYLOVE, Micro-NX (фрезери), BUCOS (витяжки).`;
}

export function buildUserPrompt(body: GenerateRequest): string {
  const lang = body.targetLang === 'uk' ? 'українською' : 'російською';
  const productInfo = [
    `Товар: ${body.productName}`,
    body.brand ? `Бренд: ${body.brand}` : '',
    body.category ? `Категорія: ${body.category}` : '',
    body.price ? `Ціна: ${body.price} ₴` : '',
  ].filter(Boolean).join('\n');

  const chars = body.characteristics
    ? Object.entries(body.characteristics)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : '';

  switch (body.action) {
    case 'generate':
      return `Напиши опис товару ${lang} у форматі HTML.

${productInfo}
${chars ? `\nХарактеристики:\n${chars}` : ''}
${body.otherLangDescription ? `\nОпис іншою мовою (для контексту, НЕ просто переклади):\n${body.otherLangDescription.substring(0, 1000)}` : ''}

Верни ТІЛЬКИ HTML-код опису, без пояснень, без markdown, без обгорток \`\`\`.`;

    case 'translate':
      return `Переклади цей опис товару на ${body.targetLang === 'uk' ? 'українську' : 'російську'} мову.
Зберігай HTML-розмітку. Адаптуй під мову (не дослівний переклад).

Товар: ${body.productName}
${body.brand ? `Бренд: ${body.brand}` : ''}

Оригінал:
${body.existingDescription?.substring(0, 3000)}

Верни ТІЛЬКИ HTML-код перекладу, без пояснень.`;

    case 'improve':
      return `Покращ цей опис товару ${lang}:
- Виправ граматичні помилки
- Прибери зайві inline стилі (style="...")
- Додай структуру (h3 заголовки, списки) якщо немає
- Зроби професійніший тон для nail-індустрії
- Прибери воду та повторення
- НЕ змінюй фактичну інформацію
- НЕ додавай вигадані характеристики

Товар: ${body.productName}
${body.brand ? `Бренд: ${body.brand}` : ''}

Поточний опис:
${body.existingDescription?.substring(0, 3000)}

Верни ТІЛЬКИ покращений HTML-код, без пояснень.`;

    case 'seo':
      return `Оптимізуй цей опис товару ${lang} для SEO:
- Додай ключові слова: "${body.productName}", "${body.brand || ''}", "${body.category || ''}"
- Використай h3 заголовки з ключовими словами
- Оптимальна довжина 300-500 слів
- Природне входження ключових слів (не спам)
- Зберігай інформативність та професійний тон

Товар: ${body.productName}
${body.brand ? `Бренд: ${body.brand}` : ''}
${body.category ? `Категорія: ${body.category}` : ''}

${body.existingDescription ? `Поточний опис:\n${body.existingDescription.substring(0, 3000)}` : 'Опису поки немає — створи SEO-оптимізований з нуля.'}

Верни ТІЛЬКИ HTML-код, без пояснень.`;

    default:
      return '';
  }
}

export function buildSeoPrompt(body: SeoRequest): { system: string; user: string } {
  const lang = body.targetLang === 'uk' ? 'українською' : 'російською';

  const system = `Ти — SEO-спеціаліст інтернет-магазину nail-індустрії Strong Nail Bits.
Генеруєш мета-теги для товарів. Відповідай ТІЛЬКИ валідним JSON без markdown.`;

  const user = `Згенеруй SEO мета-теги ${lang} для товару інтернет-магазину nail-індустрії.

Товар: ${body.productName}
${body.brand ? `Бренд: ${body.brand}` : ''}
${body.category ? `Категорія: ${body.category}` : ''}

Верни JSON (без markdown):
{
  "meta_title": "до 60 символів, включає назву товару та бренд",
  "meta_description": "до 160 символів, включає ключові слова, заклик до дії"
}

Правила:
- meta_title: "[Назва товару] | [Бренд] — купити в Strong Nail Bits"
- meta_description: коротко про товар + "Купити [назва] за найкращою ціною. Доставка по Україні."
- НЕ використовуй емоджі
- НЕ використовуй ALL CAPS`;

  return { system, user };
}
