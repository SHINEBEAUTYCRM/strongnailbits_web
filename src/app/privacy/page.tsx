import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Політика конфіденційності",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6">
      <h1 className="font-unbounded text-2xl font-black text-dark sm:text-3xl">
        Політика конфіденційності
      </h1>
      <p className="mt-2 text-sm text-[var(--t2)]">
        Остання редакція: {new Date().toLocaleDateString("uk-UA")}
      </p>

      <div className="prose-article mt-8 flex flex-col gap-6 text-sm leading-relaxed text-[var(--t2)]">
        <section>
          <h2 className="font-unbounded mb-2 text-base font-bold text-dark">
            1. Загальні положення
          </h2>
          <p>
            Інтернет-магазин SHINE SHOP (далі — &quot;Магазин&quot;) поважає
            конфіденційність своїх відвідувачів та клієнтів. Ця Політика
            конфіденційності описує, які персональні дані ми збираємо, як їх
            використовуємо та захищаємо.
          </p>
        </section>

        <section>
          <h2 className="font-unbounded mb-2 text-base font-bold text-dark">
            2. Які дані ми збираємо
          </h2>
          <ul className="list-disc pl-5">
            <li>Ім&apos;я та прізвище</li>
            <li>Номер телефону</li>
            <li>Адреса електронної пошти</li>
            <li>Адреса доставки</li>
            <li>Інформація про замовлення</li>
            <li>Назва компанії (за бажанням)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-unbounded mb-2 text-base font-bold text-dark">
            3. Мета збору даних
          </h2>
          <p>Персональні дані використовуються для:</p>
          <ul className="list-disc pl-5">
            <li>Оформлення та доставки замовлень</li>
            <li>Зв&apos;язку з клієнтом щодо замовлення</li>
            <li>Надання знижок та персональних пропозицій</li>
            <li>Покращення роботи сайту</li>
            <li>Виконання вимог законодавства</li>
          </ul>
        </section>

        <section>
          <h2 className="font-unbounded mb-2 text-base font-bold text-dark">
            4. Захист даних
          </h2>
          <p>
            Ми використовуємо сучасні засоби захисту інформації, включаючи
            шифрування SSL, безпечне зберігання даних та обмеження доступу
            співробітників до персональної інформації клієнтів.
          </p>
        </section>

        <section>
          <h2 className="font-unbounded mb-2 text-base font-bold text-dark">
            5. Передача даних третім особам
          </h2>
          <p>
            Ми не передаємо персональні дані третім особам, за виключенням
            випадків, передбачених законодавством України, а також для:
          </p>
          <ul className="list-disc pl-5">
            <li>Служб доставки (Нова Пошта, УкрПошта) — для відправки замовлення</li>
            <li>Платіжних систем — для обробки оплати</li>
          </ul>
        </section>

        <section>
          <h2 className="font-unbounded mb-2 text-base font-bold text-dark">
            6. Права користувачів
          </h2>
          <p>
            Ви маєте право запросити доступ, виправлення або видалення ваших
            персональних даних. Для цього зверніться до нас за адресою
            {" "}
            <a
              href="mailto:shine.shop.od@gmail.com"
              className="text-coral hover:text-coral-2"
            >
              shine.shop.od@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-unbounded mb-2 text-base font-bold text-dark">
            7. Файли Cookie
          </h2>
          <p>
            Сайт використовує файли cookie для забезпечення роботи кошика,
            авторизації та аналітики. Продовжуючи використання сайту, ви
            погоджуєтесь з використанням cookie.
          </p>
        </section>

        <section>
          <h2 className="font-unbounded mb-2 text-base font-bold text-dark">
            8. Контактна інформація
          </h2>
          <p>
            З питань щодо конфіденційності зверніться до нас:
          </p>
          <ul className="list-none pl-0">
            <li>
              Email:{" "}
              <a
                href="mailto:shine.shop.od@gmail.com"
                className="text-coral hover:text-coral-2"
              >
                shine.shop.od@gmail.com
              </a>
            </li>
            <li>
              Телефон:{" "}
              <a href="tel:+380937443889" className="text-coral hover:text-coral-2">
                +38 (093) 744-38-89
              </a>
            </li>
            <li>
              Адреса: м. Одеса, Грецька площа 3/4, ТЦ &quot;Афіна&quot;, 4 поверх
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
