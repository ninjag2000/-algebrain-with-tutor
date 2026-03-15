# Публикация AlgeBrain в App Store

Приложение собрано на **Vite + React** и упаковано в нативное iOS-приложение через **Capacitor**. Ниже — пошаговая инструкция по загрузке в App Store.

---

## Что нужно заранее

1. **Apple Developer Program** — аккаунт разработчика ($99/год): [developer.apple.com](https://developer.apple.com).
2. **Mac с Xcode** — сборка и загрузка в App Store возможны только на macOS (на Windows можно только собрать веб-часть и синхронизировать проект в папку `ios/`).
3. **App Store Connect** — приложение должно быть создано в [App Store Connect](https://appstoreconnect.apple.com) (название, Bundle ID `com.algebrain.tutor`, скриншоты, описание, политика конфиденциальности и т.д.).

---

## Шаг 1: Сборка и синхронизация (можно на Windows)

Обнови веб-сборку и скопируй её в iOS-проект:

```bash
npm run build
```

```bash
npx cap sync ios
```

Либо одной командой:

```bash
npm run ios:build
```

После этого папка `ios/App` содержит актуальный нативный проект с твоим веб-контентом из `dist/`.

---

## Шаг 2: Открыть проект на Mac в Xcode

1. На Mac скопируй весь репозиторий (или только папки `ios/`, `dist/` и конфиги, если переносишь вручную).
2. Открой **именно workspace**, не `.xcodeproj`:
   ```
   ios/App/App.xcworkspace
   ```
3. В левой панели выбери проект **App** → таргет **App**.

---

## Шаг 3: Подпись и команда (Signing & Capabilities)

1. Вкладка **Signing & Capabilities**.
2. Укажи **Team** (твой Apple Developer аккаунт).
3. Включи **Automatically manage signing** (или настрой вручную Provisioning Profile).
4. **Bundle Identifier** должен совпадать с тем, что в App Store Connect: `com.algebrain.tutor`.

---

## Шаг 4: Версия и сборка (Version / Build)

1. **Version** (например `1.0.0`) — то, что видит пользователь.
2. **Build** (например `1`) — при каждой загрузке в App Store Connect нужно увеличивать (1, 2, 3…).

Обычно это в **General** → **Identity** или в настройках таргета.

---

## Шаг 5: Архивация и загрузка в App Store

1. В Xcode выбери схему **App** и устройство **Any iOS Device (arm64)** (не симулятор).
2. Меню **Product** → **Archive**.
3. После успешной архивации откроется **Organizer**.
4. Выбери только что созданный архив → **Distribute App**.
5. Выбери **App Store Connect** → **Upload**.
6. Следуй шагам (подпись, опции) и дождись окончания загрузки.

---

## Шаг 6: Настройка в App Store Connect

1. Зайди в [App Store Connect](https://appstoreconnect.apple.com) → твоё приложение.
2. В разделе **TestFlight / App Store** появится новая сборка (через несколько минут).
3. Заполни/обнови:
   - описание, ключевые слова, категорию;
   - скриншоты (обязательно для всех поддерживаемых размеров iPhone/iPad, если поддерживаешь iPad);
   - политику конфиденциальности (URL);
   - рейтинг возраста, контакт поддержки.
4. Выбери эту сборку для версии (например 1.0.0) и отправь на **Review**.

---

## Краткий чеклист

- [ ] Apple Developer аккаунт оплачен.
- [ ] В App Store Connect создано приложение с Bundle ID `com.algebrain.tutor`.
- [ ] `npm run build` и `npx cap sync ios` выполнены (или `npm run ios:build`).
- [ ] На Mac открыт `ios/App/App.xcworkspace`, настроена подпись (Team).
- [ ] Собран Archive и загружен через **Distribute App** → App Store Connect.
- [ ] В App Store Connect заполнены метаданные, скриншоты, политика конфиденциальности.
- [ ] Сборка отправлена на проверку (Submit for Review).

---

## Если что-то пошло не так

- **«No signing certificate»** — в Xcode добавь Team и включи автоматическую подпись; при необходимости создай сертификат в [developer.apple.com](https://developer.apple.com/account/resources/certificates).
- **«Bundle ID уже занят»** — в App Store Connect должно быть создано приложение с тем же Bundle ID, что и в Xcode (`com.algebrain.tutor`).
- **Сборка не появляется в App Store Connect** — подожди 5–15 минут; проверь почту на письма от Apple об ошибках обработки сборки.

После первой успешной загрузки дальнейшие обновления: снова `npm run ios:build` → открыть Xcode → увеличить Build → Archive → Distribute App → Submit for Review.
