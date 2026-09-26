export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#1C1C1E] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-black mb-8">Политика конфиденциальности</h1>
        <div className="prose prose-invert prose-sm space-y-6 text-white/70 leading-relaxed">
          <p><strong className="text-white">Павлов Иван Андреевич</strong>, самозанятый, ИНН: 332711615676 (далее именуемый «Оператор») заботится о защите персональных данных пользователей сервиса TutorAI (tutorai.app).</p>

          <h2 className="text-xl font-bold text-white mt-8">1. Какие данные мы собираем</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-white">Аудиозаписи уроков</strong> — загружаются для транскрибации и анализа. Хранятся только на устройстве пользователя.</li>
            <li><strong className="text-white">Данные учеников</strong> — имена, уровни, цели обучения (вводятся пользователем).</li>
            <li><strong className="text-white">Данные оплаты</strong> — обрабатываются платёжной системой ЮKassa, мы не храним данные карт.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">2. Как мы используем данные</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Аудиозаписи обрабатываются через API OpenAI (Whisper) для транскрибации и GPT-4o для анализа.</li>
            <li>Данные не передаются третьим лицам, кроме API OpenAI для обработки.</li>
            <li>Данные используются исключительно для предоставления услуг сервиса.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">3. Хранение данных</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Аудиозаписи хранятся только на устройстве пользователя.</li>
            <li>Транскрипции и аналитика хранятся в зашифрованной базе данных.</li>
            <li>Данные удаляются при удалении аккаунта пользователя.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">4. Безопасность</h2>
          <p>Мы используем современные методы шифрования для защиты данных. Все соединения зашифрованы по протоколу HTTPS.</p>

          <h2 className="text-xl font-bold text-white mt-8">5. Контактная информация</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>ФИО: Павлов Иван Андреевич</li>
            <li>Статус: Самозанятый</li>
            <li>ИНН: 332711615676</li>
            <li>Телефон: +7 904 657 77 25</li>
            <li>Email: support.tutorai@gmail.com</li>
          </ul>

          <p className="mt-8 text-white/50">Дата публикации: январь 2026 г.</p>
        </div>
      </div>
    </div>
  );
}
