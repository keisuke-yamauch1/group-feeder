# GroupFeeder 実装TODOリスト

**作成日**: 2025-10-05
**総タスク数**: 56

---

## Phase 1: プロジェクト初期化 (7タスク)

- [x] 1. Next.js 15プロジェクト初期化
  ```bash
  npx create-next-app@latest --typescript --app --tailwind
  ```
  ✅ 完了日: 2025-10-05

- [x] 2. Prismaインストール
  ```bash
  npm install prisma @prisma/client @tidbcloud/prisma-adapter
  ```
  ✅ 完了日: 2025-10-05

- [x] 3. prisma/schema.prisma作成
  - provider: mysql
  - TiDB互換設定
  
  ✅ 完了日: 2025-10-05

- [x] 4. 環境変数テンプレート .env.example作成
  - DATABASE_URL
  - NEXTAUTH_SECRET
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET

  ✅ 完了日: 2025-10-06

- [x] 5. NextAuth.js v5インストール
  ```bash
  npm install next-auth@beta @auth/prisma-adapter
  ```
  ✅ 完了日: 2025-10-06

- [x] 6. app/api/auth/[...nextauth]/route.ts作成
  - Google Provider設定
  - JWT Session Strategy

  ✅ 完了日: 2025-10-06

- [x] 7. auth.ts作成
  - NextAuth設定エクスポート
  - Prisma Adapter設定

  ✅ 完了日: 2025-10-06

---

## Phase 2: データモデル実装 (11タスク)

- [x] 8. Userモデル定義
  - id: String @id @default(cuid())
  - email: String @unique
  - name, image

  ✅ 完了日: 2025-10-06

- [x] 9. Groupモデル定義
  - id: Int @id @default(autoincrement())
  - userId, name, sortIndex

  ✅ 完了日: 2025-10-06

- [x] 10. Feedモデル定義
  - id: Int @id
  - url: String @unique
  - title, lastFetchedAt: DateTime?

  ✅ 完了日: 2025-10-06

- [x] 11. GroupFeedモデル定義
  - groupId, feedId
  - @@id([groupId, feedId]) 中間テーブル

  ✅ 完了日: 2025-10-06

- [x] 12. Articleモデル定義
  - id, feedId
  - guid?: String @unique
  - link: String @unique
  - contentHash?, title, description, content
  - author?, pubDate?, createdAt

  ✅ 完了日: 2025-10-06

- [x] 13. ReadStatusモデル定義
  - id, userId, articleId
  - readAt
  - @@unique([userId, articleId])

  ✅ 完了日: 2025-10-06

- [x] 14. Article用インデックス作成
  - @@index([feedId, pubDate(sort: Desc)])
  - @@index([createdAt(sort: Desc)])

  ✅ 完了日: 2025-10-06

- [x] 15. ReadStatus用インデックス作成
  - @@index([userId, readAt(sort: Desc)])

  ✅ 完了日: 2025-10-06

- [ ] 16. NextAuth用モデル追加
  - Account, Session, VerificationToken
  - @auth/prisma-adapter仕様準拠

- [ ] 17. Prismaマイグレーション実行
  ```bash
  npx prisma migrate dev --name init
  ```
  - TiDB制限に注意

- [ ] 18. lib/prisma.ts作成
  - PrismaClientシングルトンインスタンス
  - @tidbcloud/prisma-adapter統合

---

## Phase 3: コアAPI実装 (10タスク)

- [ ] 19. app/api/group/route.ts作成
  - POST: グループ新規作成
  - userId取得
  - sortIndex自動設定

- [ ] 20. app/api/group/[id]/route.ts作成
  - PUT: グループ名変更
  - PATCH: sortIndex一括更新

- [ ] 21. app/api/feed/route.ts作成
  - POST: フィードURL登録
  - Feedsmith検証
  - グループ割り当て

- [ ] 22. app/api/read-status/route.ts作成
  - PUT: 既読状態更新
  - バッチ更新対応 - 複数articleId配列受付

- [ ] 23. Feedsmithインストール
  ```bash
  npm install feedsmith
  ```

- [ ] 24. DOMPurifyインストール
  ```bash
  npm install isomorphic-dompurify
  ```

- [ ] 25. lib/feed-fetcher.ts作成
  - Feedsmith使用
  - 階層的重複検出: guid→link→contentHash

- [ ] 26. lib/content-hash.ts作成
  - title+description+pubDateからCRCハッシュ生成関数

- [ ] 27. lib/sanitize.ts作成
  - DOMPurifyラッパー
  - HTMLサニタイズ関数

- [ ] 28. app/api/feeds/fetch/route.ts作成
  - 全フィード巡回
  - 15分間隔制御
  - ETag/Last-Modified対応

---

## Phase 4: フロントエンド実装 (18タスク)

- [ ] 29. app/page.tsx作成
  - 未認証: Google Loginボタン表示
  - 認証済み: /dashboardリダイレクト

- [ ] 30. components/auth/LoginButton.tsx作成
  - signIn('google')呼び出し

- [ ] 31. middleware.ts作成
  - 認証保護ルート設定
  - /dashboard/*を保護

- [ ] 32. app/dashboard/page.tsx作成
  - 記事一覧メイン画面
  - タブ切り替えUI配置

- [ ] 33. app/dashboard/settings/page.tsx作成
  - グループ/フィード管理画面

- [ ] 34. components/group/GroupList.tsx作成
  - グループ一覧表示
  - ドラッグ&ドロップ並び替え - @dnd-kit/core使用

- [ ] 35. @dnd-kit/coreインストール
  ```bash
  npm install @dnd-kit/core @dnd-kit/sortable
  ```

- [ ] 36. components/group/GroupForm.tsx作成
  - グループ名入力フォーム
  - 作成/編集モード対応

- [ ] 37. components/feed/FeedForm.tsx作成
  - フィードURL入力
  - グループ選択ドロップダウン

- [ ] 38. components/feed/FeedList.tsx作成
  - フィード一覧
  - グループ別表示
  - 削除ボタン

- [ ] 39. components/article/ArticleTabs.tsx作成
  - 全て/ユーザーグループ/未分類タブ切り替え

- [ ] 40. components/article/ArticleList.tsx作成
  - 記事一覧
  - タブ選択に応じたフィルタリング

- [ ] 41. components/article/ArticleCard.tsx作成
  - 記事カード
  - data-article-id属性付与
  - Intersection Observer用

- [ ] 42. hooks/useIntersectionObserver.ts作成
  - 共有Observer
  - threshold: 0.5
  - 500msデバウンス

- [ ] 43. hooks/useReadStatusBatch.ts作成
  - 既読状態バッチ更新Hook
  - Set<articleId>キューイング

- [ ] 44. components/article/ReadToggle.tsx作成
  - 既読/未読フィルタートグルボタン

---

## Phase 5: PWA機能実装 (9タスク)

- [ ] 45. app/manifest.ts作成
  - name: GroupFeeder
  - short_name, theme_color, background_color
  - display: standalone
  - icons配置

- [ ] 46. public/icons/配下にPWAアイコン配置
  - 192x192
  - 512x512
  - maskable対応

- [ ] 47. Workboxインストール
  ```bash
  npm install workbox-webpack-plugin workbox-window
  ```

- [ ] 48. public/sw.js作成
  - Service Worker本体
  - Workboxインポート
  - キャッシング戦略定義

- [ ] 49. Service Workerキャッシング戦略実装
  - NetworkFirst: API
  - CacheFirst: 静的アセット

- [ ] 50. app/layout.tsx内でService Worker登録
  - useEffect内でnavigator.serviceWorker.register('/sw.js')

- [ ] 51. components/pwa/InstallButton.tsx作成
  - beforeinstallpromptイベントハンドリング
  - インストールプロンプト表示

- [ ] 52. public/sw.js内にBadging API実装
  - self.addEventListener('message', setAppBadge処理)

- [ ] 53. hooks/useBadgeUpdate.ts作成
  - 未読数取得
  - navigator.setAppBadge()呼び出し
  - 機能検出

- [ ] 54. app/dashboard/page.tsx内でuseBadgeUpdate統合
  - 記事一覧読み込み時に未読数更新

- [ ] 55. lib/security/url-validator.ts作成
  - SSRF対策: http/httpsのみ許可
  - 内部IPアドレス拒否

- [ ] 56. next.config.js内にCSP設定追加
  - Content-Security-Policy headers

---

## 📝 進捗管理

### Phase 1: プロジェクト初期化
進捗: 7/7 (100%) ✅ 完了

### Phase 2: データモデル実装
進捗: 8/11 (73%)

### Phase 3: コアAPI実装
進捗: 0/10 (0%)

### Phase 4: フロントエンド実装
進捗: 0/18 (0%)

### Phase 5: PWA機能実装
進捗: 0/9 (0%)

**総進捗: 15/56 (27%)**

---

## 🔑 重要な技術選定

1. **next-pwa不使用** → Next.js 15ネイティブPWA（Turbopack互換性問題回避）
2. **Feedsmith採用** → rss-parserより高機能（99%テストカバレッジ）
3. **@tidbcloud/prisma-adapter** → TiDB最適化
4. **階層的重複検出** → RSS仕様準拠（GUID優先）
5. **バッチ更新戦略** → API負荷軽減（500msデバウンス）

---

## 📚 参照ドキュメント

- **IMPLEMENTATION_PLAN.md**: 各タスクの詳細実装手順
- **ARCHITECTURE.md**: 技術設計書・データモデル・セキュリティ対策
- **CONVERSATION_LOG.md**: プロジェクト開始時の会話ログ
- **.env.example**: 環境変数テンプレート

---

**最終更新**: 2025-10-06 (Task14, 15完了)
