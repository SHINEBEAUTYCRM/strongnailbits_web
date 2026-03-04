import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kqgtxmdruxwtocmvsvwh.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZ3R4bWRydXh3dG9jbXZzdndoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ3ODA3MSwiZXhwIjoyMDg2MDU0MDcxfQ.xqMhDqc8fTGmyhr-ex5hDx183HF_dKGbI2tJzUALnd8";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const FEATURES = [
  {
    name_uk: "Об'єм",
    handle: "obiem",
    feature_type: "S",
    filter_position: 1,
    variants: [
      "3 мл","4 мл","5 мл","6 мл","7 мл","8 мл","9 мл","10 мл","12 мл","13 мл",
      "14 мл","15 мл","17 мл","20 мл","30 мл","50 мл","60 мл","100 мл",
      "120 мл","150 мл","200 мл","250 мл","300 мл","500 мл",
    ],
  },
  {
    name_uk: "Вага",
    handle: "vaga",
    feature_type: "S",
    filter_position: 2,
    variants: ["1 г","2 г","3 г","5 г","7 г","10 г","15 г","20 г","30 г","50 г"],
  },
  {
    name_uk: "Тип товару",
    handle: "typ-tovaru",
    feature_type: "S",
    filter_position: 3,
    variants: [
      "База","Топ","База і топ","Гель-лак","Гель-фарба","Однофазний гель-лак",
      "Камуфлююча база","Каучукова база","Камуфлюючий гель","Будівельний гель",
      "Скульптурний гель","Полігель","Акрил-гель","Акрилова пудра","Мономер",
      "Набір для манікюру","Набір гель-лаків",
    ],
  },
  {
    name_uk: "Колір",
    handle: "kolir",
    feature_type: "S",
    filter_position: 4,
    variants: [
      "Білий","Чорний","Сірий","Бежевий","Нюдовий","Рожевий","Червоний","Бордовий",
      "Помаранчевий","Жовтий","Зелений","Блакитний","Синій","Фіолетовий","Коричневий",
      "Молочний","Прозорий","Натуральний","Пастельний","Неоновий","Темний","Світлий","Мультиколор",
    ],
  },
  {
    name_uk: "Ефект",
    handle: "efekt",
    feature_type: "S",
    filter_position: 5,
    variants: [
      "Глянцевий","Матовий","Напівматовий","Шимерний","Зі слюдою","З глітером",
      "Сріблястий","Перламутровий","Металік","Кошаче око","Хамелеон","Дзеркальний",
      "Хромований","Вітражний","Світловідбивний","Неоновий","Термо","З блиском",
      "Світиться в темряві",
    ],
  },
  {
    name_uk: "Щільність",
    handle: "shchilnist",
    feature_type: "S",
    filter_position: 6,
    variants: ["Щільний","Середньої щільності","Напівпрозорий","Прозорий"],
  },
  {
    name_uk: "Фініш",
    handle: "finish",
    feature_type: "S",
    filter_position: 7,
    variants: ["Глянцевий","Матовий","Сатиновий","Оксамитовий","З ефектом гелю","З блискітками"],
  },
  {
    name_uk: "Призначення покриття",
    handle: "pryznachennia-pokryttia",
    feature_type: "M",
    filter_position: 8,
    variants: [
      "Для манікюру","Для педикюру","Для френчу","Для дизайну",
      "Для зміцнення нігтів","Для проблемних нігтів","Для тонких нігтів","Для ламких нігтів",
    ],
  },
  {
    name_uk: "Тип гель-лаку",
    handle: "typ-gel-laku",
    feature_type: "S",
    filter_position: 9,
    variants: [
      "Класичний гель-лак","Однофазний гель-лак","Камуфлюючий гель-лак",
      "Гель-лак «Кошаче око»","Неоновий гель-лак","Термогель-лак",
      "Світловідбивний гель-лак","Гель-лак з глітером","Дзеркальний гель-лак",
      "Хромовий гель-лак","Вітражний гель-лак","Пастельний гель-лак",
    ],
  },
  {
    name_uk: "Система",
    handle: "systema",
    feature_type: "S",
    filter_position: 10,
    variants: ["Soak-off","Твердий гель-лак","Жорсткий гель-лак"],
  },
  {
    name_uk: "Колекція",
    handle: "kolektsiia",
    feature_type: "S",
    filter_position: 11,
    variants: [
      "Базова колекція","Сезонна колекція","Лімітована колекція",
      "Літня колекція","Осіння колекція","Зимова колекція",
      "Весняна колекція","Новорічна колекція","Неонова колекція","Нюд колекція",
    ],
  },
  {
    name_uk: "Липкий шар",
    handle: "lypkyi-shar",
    feature_type: "S",
    filter_position: 12,
    variants: ["З липким шаром","Без липкого шару (no wipe)"],
  },
  {
    name_uk: "Каучуковість",
    handle: "kauchukovist",
    feature_type: "S",
    filter_position: 13,
    variants: ["Каучукова","Не каучукова"],
  },
  {
    name_uk: "Камуфляж",
    handle: "kamufliazh",
    feature_type: "S",
    filter_position: 14,
    variants: ["Прозора","Камуфлююча","Камуфлююча з шиммером","Камуфлююча з глітером"],
  },
  {
    name_uk: "УФ-фільтри",
    handle: "uf-filtry",
    feature_type: "S",
    filter_position: 15,
    variants: ["З УФ-фільтрами","Без УФ-фільтрів"],
  },
  {
    name_uk: "Призначення бази/топу",
    handle: "pryznachennia-bazy-topu",
    feature_type: "M",
    filter_position: 16,
    variants: [
      "Для гель-лаку","Для гелю","Для акрил-гелю",
      "Для педикюру","Для чутливих нігтів","Для алергіків",
    ],
  },
  {
    name_uk: "Тип гелю",
    handle: "typ-geliu",
    feature_type: "S",
    filter_position: 17,
    variants: [
      "Будівельний гель","Камуфлюючий гель","Однофазний гель",
      "Скульптурний гель","Камуфлюючий будівельний гель",
    ],
  },
  {
    name_uk: "В'язкість",
    handle: "viazkist",
    feature_type: "S",
    filter_position: 18,
    variants: ["Низька в'язкість","Середня в'язкість","Висока в'язкість"],
  },
  {
    name_uk: "Самовирівнювання",
    handle: "samovyrivniuvannia",
    feature_type: "S",
    filter_position: 19,
    variants: ["Самовирівнювальний","Не самовирівнювальний"],
  },
  {
    name_uk: "Жорсткість",
    handle: "zhorstkist",
    feature_type: "S",
    filter_position: 20,
    variants: ["Жорсткий","Середньої жорсткості","Еластичний"],
  },
  {
    name_uk: "Тепловий ефект",
    handle: "teplovyi-efekt",
    feature_type: "S",
    filter_position: 21,
    variants: ["З вираженим тепловиділенням","З мінімальним тепловиділенням"],
  },
  {
    name_uk: "Колір гелю",
    handle: "kolir-geliu",
    feature_type: "S",
    filter_position: 22,
    variants: [
      "Прозорий","Молочний","Камуфлюючий бежевий",
      "Камуфлюючий рожевий","Білий (для френчу)","Натуральний ніготь",
    ],
  },
  {
    name_uk: "Тип акрилу / полігелю",
    handle: "typ-akrylu-poligeliu",
    feature_type: "S",
    filter_position: 23,
    variants: [
      "Акрилова пудра","Мономер","Акрил-гель",
      "Полігель","Набір акриловий","Набір полігелів",
    ],
  },
  {
    name_uk: "Швидкість схоплювання",
    handle: "shvydkist-skhopliuvannia",
    feature_type: "S",
    filter_position: 24,
    variants: ["Швидкий","Середній","Повільний"],
  },
  {
    name_uk: "Тип інструменту",
    handle: "typ-instrumentu",
    feature_type: "S",
    filter_position: 25,
    variants: [
      "Пилка для нігтів","Баф","Фреза","Кусачки для нігтів","Кусачки для шкіри",
      "Кусачки для кутикули","Ножиці для нігтів","Ножиці для кутикули",
      "Лопатка","Пушер","Пінцет","Терка для п'ят",
      "Манікюрний набір","Кисть для дизайну","Кисть для гелю",
    ],
  },
  {
    name_uk: "Серія інструмента",
    handle: "seriia-instrumenta",
    feature_type: "S",
    filter_position: 26,
    variants: ["CLASSIC","SMART","EXPERT","EXCLUSIVE","Beauty & Care","Staleks PRO"],
  },
  {
    name_uk: "Призначення інструмента",
    handle: "pryznachennia-instrumenta",
    feature_type: "M",
    filter_position: 27,
    variants: [
      "Для манікюру","Для педикюру","Для нігтів","Для шкіри",
      "Для кутикули","Для бров","Для вій","Для подології",
    ],
  },
  {
    name_uk: "Матеріал інструмента",
    handle: "material-instrumenta",
    feature_type: "S",
    filter_position: 28,
    variants: [
      "Нержавіюча сталь","Хірургічна сталь","Високолегована сталь",
      "Сталь з титанованим покриттям","Сталь з PVD-покриттям",
      "Пластик","Комбінований (сталь+пластик)",
    ],
  },
  {
    name_uk: "Довжина ріжучої частини",
    handle: "dovzhyna-rizhuchoi-chastyny",
    feature_type: "S",
    filter_position: 29,
    variants: ["3 мм","5 мм","6 мм","7 мм","8 мм","9 мм","10 мм","11 мм","14 мм","18 мм","20 мм","21 мм"],
  },
  {
    name_uk: "Загальна довжина інструмента",
    handle: "zahalna-dovzhyna-instrumenta",
    feature_type: "S",
    filter_position: 30,
    variants: ["80 мм","90 мм","94 мм","100 мм","110 мм","120 мм","130 мм"],
  },
  {
    name_uk: "Сторонність",
    handle: "storonnist",
    feature_type: "S",
    filter_position: 31,
    variants: ["Для правші","Для лівші","Універсальний"],
  },
  {
    name_uk: "Заточування",
    handle: "zatochuvannia",
    feature_type: "S",
    filter_position: 32,
    variants: ["Ручне заточування","Заводське заточування","Можливість повторного заточування"],
  },
  {
    name_uk: "Абразивність",
    handle: "abrazyvnist",
    feature_type: "S",
    filter_position: 33,
    variants: [
      "80 grit","100 grit","120 grit","150 grit","180 grit","220 grit",
      "240 grit","280 grit","320 grit","400 grit",
      "100/100","100/150","100/180","150/150","150/180","150/240",
    ],
  },
  {
    name_uk: "Форма робочої частини",
    handle: "forma-robochoi-chastyny",
    feature_type: "S",
    filter_position: 34,
    variants: [
      "Пряма","Загнута","Сферична","Конусна","Полумениста",
      "Циліндрична","Кульова","Крапля","Кукурудза","Лайнер",
    ],
  },
  {
    name_uk: "Матеріал фрези",
    handle: "material-frezy",
    feature_type: "S",
    filter_position: 35,
    variants: ["Алмазна","Керамічна","Твердосплавна","Карбідна","Силіконова","Абразивна"],
  },
  {
    name_uk: "Тип лампи",
    handle: "typ-lampy",
    feature_type: "S",
    filter_position: 36,
    variants: ["UV","LED","UV/LED","Гібридна"],
  },
  {
    name_uk: "Потужність",
    handle: "potuzhnist",
    feature_type: "S",
    filter_position: 37,
    variants: ["24 Вт","36 Вт","48 Вт","54 Вт","60 Вт","72 Вт","80 Вт","96 Вт"],
  },
  {
    name_uk: "Режими таймера",
    handle: "rezhymy-taimera",
    feature_type: "M",
    filter_position: 38,
    variants: ["10 с","30 с","60 с","90 с","120 с","Low heat mode"],
  },
  {
    name_uk: "Датчик руху",
    handle: "datchyk-rukhu",
    feature_type: "S",
    filter_position: 39,
    variants: ["З датчиком","Без датчика"],
  },
  {
    name_uk: "Тип апарату для манікюру",
    handle: "typ-aparatu",
    feature_type: "S",
    filter_position: 40,
    variants: ["Портативний апарат","Стаціонарний апарат","Апарат з педаллю","Апарат без педалі"],
  },
  {
    name_uk: "Оберти апарата",
    handle: "oberty-aparata",
    feature_type: "S",
    filter_position: 41,
    variants: [
      "До 20 000 об/хв","До 30 000 об/хв","До 35 000 об/хв",
      "До 40 000 об/хв","Понад 40 000 об/хв",
    ],
  },
  {
    name_uk: "Тип догляду",
    handle: "typ-dohliadu",
    feature_type: "S",
    filter_position: 42,
    variants: [
      "Крем для рук","Крем для ніг","Лосьйон для рук","Лосьйон для тіла",
      "Олія для кутикули","Олія для нігтів","Скраб для рук","Скраб для ніг",
      "Маска для рук","Маска для ніг","Бальзам для п'ят",
    ],
  },
  {
    name_uk: "Призначення догляду",
    handle: "pryznachennia-dohliadu",
    feature_type: "M",
    filter_position: 43,
    variants: [
      "Зволоження","Живлення","Відновлення","Проти сухості","Проти тріщин",
      "Охолоджувальний ефект","Розігріваючий ефект",
      "Для чутливої шкіри","Для проблемної шкіри п'ят",
    ],
  },
  {
    name_uk: "Консистенція",
    handle: "konsystentsiia",
    feature_type: "S",
    filter_position: 44,
    variants: ["Крем","Бальзам","Масло","Гель","Мус","Сироватка"],
  },
  {
    name_uk: "Тип декору",
    handle: "typ-dekoru",
    feature_type: "S",
    filter_position: 45,
    variants: [
      "Стрази","Блискітки","Фольга","Перекладна фольга","Лита фольга",
      "Наклейки","Слайдери","Бульйон","Пісок","Ювелірні елементи",
      "Пудра","Цукровий пісок","Поталь","Стрічка","Тейп-стрічка",
    ],
  },
  {
    name_uk: "Розмір декору",
    handle: "rozmir-dekoru",
    feature_type: "S",
    filter_position: 46,
    variants: ["Дрібний","Середній","Крупний","Мікс розмірів","SS3","SS5","SS7","SS10","SS12"],
  },
  {
    name_uk: "Колір декору",
    handle: "kolir-dekoru",
    feature_type: "S",
    filter_position: 47,
    variants: [
      "Прозорий","Кристальний","Металевий золотий","Металевий срібний",
      "Металевий бронзовий","Голографічний","Неоновий","Пастельний",
      "Чорний","Білий","Кольоровий мікс",
    ],
  },
  {
    name_uk: "Тип рідини",
    handle: "typ-ridyny",
    feature_type: "S",
    filter_position: 48,
    variants: [
      "Знежирювач","Клінсер","Ремувер гель-лаку","Ремувер акрилу",
      "Ремувер полігелю","Ремувер кутикули","Антисептик для рук",
      "Антисептик для шкіри","Дезінфектор для інструментів",
      "Дегідратор","Праймер","Кислотний праймер","Безкислотний праймер",
      "Розбавник для гель-лаку",
    ],
  },
  {
    name_uk: "Кислотність",
    handle: "kyslotnist",
    feature_type: "S",
    filter_position: 49,
    variants: ["Кислотний","Безкислотний"],
  },
  {
    name_uk: "Призначення рідини",
    handle: "pryznachennia-ridyny",
    feature_type: "M",
    filter_position: 50,
    variants: [
      "Для підготовки нігтів","Для зняття покриття","Для дезінфекції рук",
      "Для дезінфекції інструментів","Для розм'якшення кутикули",
      "Для чищення поверхонь","Для чищення апаратів",
    ],
  },
];

async function importAll() {
  console.log(`\n🚀 Імпорт ${FEATURES.length} характеристик...\n`);

  let created = 0, updated = 0, skipped = 0, errors = 0;
  let totalVariantsCreated = 0;

  for (const f of FEATURES) {
    const { variants, ...fields } = f;
    const insertFields = {
      ...fields,
      name_ru: fields.name_uk,
      is_filter: true,
      filterable: true,
      status: "active",
    };

    // Check if feature already exists
    const { data: existing } = await supabase
      .from("features")
      .select("id, name_uk")
      .eq("handle", fields.handle)
      .single();

    let featureId;

    if (existing) {
      featureId = existing.id;
      console.log(`⏩ "${fields.name_uk}" вже існує — перевіряю варіанти...`);

      // Get existing variants
      const { data: existingVars } = await supabase
        .from("feature_variants")
        .select("value_uk")
        .eq("feature_id", featureId);

      const existingValues = new Set((existingVars || []).map((v) => v.value_uk));
      const newVariants = variants.filter((v) => !existingValues.has(v));

      if (newVariants.length > 0) {
        const startPos = existingValues.size;
        const rows = newVariants.map((v, i) => ({
          feature_id: featureId,
          value_uk: v,
          value_ru: v,
          position: startPos + i,
          metadata: {},
        }));
        const { error: varErr } = await supabase.from("feature_variants").insert(rows);
        if (varErr) {
          console.error(`   ❌ Помилка варіантів: ${varErr.message}`);
        } else {
          console.log(`   ➕ Додано ${newVariants.length} нових варіантів`);
          totalVariantsCreated += newVariants.length;
        }
        updated++;
      } else {
        console.log(`   ✓ Всі варіанти вже є`);
        skipped++;
      }
      continue;
    }

    // Create new feature
    const { data: feature, error } = await supabase
      .from("features")
      .insert(insertFields)
      .select()
      .single();

    if (error || !feature) {
      console.error(`❌ "${fields.name_uk}": ${error?.message}`);
      errors++;
      continue;
    }

    featureId = feature.id;

    // Create variants
    const rows = variants.map((v, i) => ({
      feature_id: featureId,
      value_uk: v,
      value_ru: v,
      position: i,
      metadata: {},
    }));

    const { error: varErr } = await supabase.from("feature_variants").insert(rows);
    if (varErr) {
      console.error(`   ❌ Варіанти: ${varErr.message}`);
    } else {
      totalVariantsCreated += rows.length;
    }

    console.log(`✅ "${fields.name_uk}" — ${rows.length} варіантів`);
    created++;
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Створено нових: ${created}`);
  console.log(`🔄 Оновлено (додано варіанти): ${updated}`);
  console.log(`⏩ Без змін: ${skipped}`);
  console.log(`❌ Помилок: ${errors}`);
  console.log(`📋 Варіантів додано всього: ${totalVariantsCreated}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

importAll().catch(console.error);
