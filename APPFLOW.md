# Ionic Appflow — сборки и Live Updates

Проект настроен для **Ionic Appflow**: облачные нативные сборки (iOS/Android) и **Live Updates** без повторной публикации в сторах.

---

## Что уже сделано в репозитории

- Установлен **@capacitor/live-updates** и добавлена конфигурация в `capacitor.config.ts`.
- В корне создан **appflow.config.json** (команда веб-сборки и пути к iOS/Android).

После создания приложения в Appflow нужно подставить **App ID** в двух местах:
1. `appflow.config.json` → `appId`
2. `capacitor.config.ts` → `plugins.LiveUpdates.appId`

App ID виден на странице приложения в [Appflow Dashboard](https://dashboard.ionic.io/).

---

## 1. Добавить приложение в Appflow

1. Зайди в [dashboard.ionic.io](https://dashboard.ionic.io/) и войди в аккаунт.
2. **Apps** → **New app** → **Import app**.
3. Выбери **Capacitor** как native runtime.
4. Подключи **Git-хост** (GitHub / GitLab / Bitbucket) и выбери репозиторий с этим проектом.
5. После импорта открой приложение и скопируй **App ID** (на странице обзора приложения).

Замени `YOUR_APPFLOW_APP_ID` в:
- `appflow.config.json`
- `capacitor.config.ts` (секция `plugins.LiveUpdates.appId`)

Затем выполни локально:

```bash
npm run build
```

```bash
npx cap sync
```

Закоммить и запушь изменения.

---

## 2. Нативные сборки (iOS / Android в облаке)

### iOS

1. В [Apple Developer](https://developer.apple.com) создай **Signing Certificate** и **Provisioning Profile** (Development и/или Distribution для App Store).
2. В Appflow: **Build** → **Signing Certificates** → **Add Profile** — загрузи `.p12`, `.mobileprovision` и пароль. Bundle ID должен совпадать с `com.algebrain.tutor`.
3. **Capacitor 8 и SPM:** проект использует Swift Package Manager (без CocoaPods). В Appflow нужно включить поддержку SPM:
   - **Build** → **Environments** → открой окружение, с которым запускаешь сборку (или создай новое).
   - В **Variables** добавь: имя `ENABLE_SPM_SUPPORT`, значение `true`.
   - Сохрани. Без этой переменной сборка падает с ошибкой «No .xcworkspace found».
4. **Build** → **Builds** → **New Build**:
   - Выбери коммит (с уже подставленным `appId` в конфигах).
   - Платформа: **iOS**.
   - Тип: **Development** (тест на устройстве) или **App Store** (для загрузки в App Store).
   - Выбери созданный профиль подписи и **окружение с ENABLE_SPM_SUPPORT=true**.
   - Выбери стек сборки.

Сборка выполнится в облаке; по окончании можно скачать `.ipa`.

### Android

1. В Appflow при необходимости настрой **Credentials** для Android (keystore для release).
2. **New Build** → платформа **Android**, выбери коммит и профиль подписи.

---

## 3. Live Updates (обновление веб-части без новой сборки в сторах)

1. В Appflow открой приложение → **Deploy** → **Live Updates**.
2. Создай канал, например **Production** (имя должно совпадать с `channel` в `capacitor.config.ts`).
3. Собери веб-билд:
   - **Commits** → выбери коммит → **Build** (тип — веб-билд для Live Update).
   - Либо через **Deploy** → **Live Updates** → создание деплоя из выбранного коммита.
4. Назначь собранную версию на канал **Production**.

На устройствах с установленным приложением (собранным с `@capacitor/live-updates` и `channel: 'Production'`) при следующем запуске подтянется новая веб-версия (режим `background`).

---

## 4. Команды для локальной разработки

Сборка веба и синхронизация с нативными проектами:

```bash
npm run build
```

```bash
npx cap sync
```

Одной командой (если добавлен скрипт):

```bash
npm run ios:build
```

После изменения `appId` в конфигах снова выполни `npm run build` и `npx cap sync`, затем закоммить и запушь.

---

## 5. Публикация в App Store через Appflow

Для автоматической отправки в App Store Connect используй **Deploy to App Stores (DTAS)** в Appflow:

- Настрой **Destinations** → Apple App Store Connect (учётные данные, app-specific password).
- После успешной iOS-сборки типа **App Store** выбери сборку и отправь в нужный destination.

Подробнее: [Deploy to App Stores — Apple](https://ionic.io/docs/appflow/destinations/apple) в документации Appflow.

---

## Краткий чеклист

- [ ] Аккаунт Ionic / Appflow, приложение импортировано из Git.
- [ ] App ID подставлен в `appflow.config.json` и `capacitor.config.ts`.
- [ ] Выполнены `npm run build` и `npx cap sync`, изменения запушены.
- [ ] Для iOS: сертификаты и профили загружены в Appflow, успешная облачная сборка.
- [ ] Для Live Updates: канал Production создан, веб-билд назначен на канал.
- [ ] При необходимости: настроен DTAS для отправки в App Store.
