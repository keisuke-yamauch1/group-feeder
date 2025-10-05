# GroupFeeder アーキテクチャ設計書

## システム概要

GroupFeeder は、グループ（タブ）でフィードを整理できるPWA対応RSSリーダーです。
スクロール自動既読、未読バッジ表示、オフライン対応などモダンな機能を備えています。

---

## 技術スタック

### フロントエンド
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **@dnd-kit** (ドラッグ&ドロップ)

### バックエンド
- **Next.js API Routes**
- **Prisma ORM**
- **TiDB** (MySQL 8.0互換)
- **@tidbcloud/prisma-adapter**

### 認証
- **NextAuth.js v5 (Auth.js)**
- **Google OAuth 2.0**
- **JWT Session Strategy**

### PWA
- **Next.js 15 Native PWA** (next-pwa不使用)
- **Workbox** (Service Worker)
- **Badging API**

### フィード処理
- **Feedsmith** (RSS/Atom/JSONフィードパーサー)
- **isomorphic-dompurify** (XSS対策)

---

## データモデル

### ER図（テキスト表現）

```
User (1) ----< (n) Group (n) >----< (n) Feed
 |                                          |
 |                                          |
 +--(1)----< (n) ReadStatus (n) >----(1)--+
                      |
                      v
                  Article
```

### モデル詳細

#### User（ユーザー）
- NextAuth.js管理
- Google認証のみ対応
- 複数のGroupとReadStatusを所有

#### Group（グループ/タブ）
- ユーザーごとのフィード整理用
- sortIndex でタブ並び順を管理
- GroupFeed 中間テーブルで Feed と多対多関係

#### Feed（フィード）
- RSS/AtomのURL
- 複数のGroupに所属可能（多対多）
- ETag/Last-Modified を保存して条件付きGET

#### Article（記事）
- 各Feedに属する記事
- **階層的ユニーク識別子**:
  1. `guid` (RSS標準) - 最優先
  2. `link` (URL) - フォールバック
  3. `contentHash` (title+description+pubDateのハッシュ) - 最終手段

#### ReadStatus（既読状態）
- User と Article の多対多関係
- ユーザーごとの既読管理
- `@@unique([userId, articleId])` で重複防止

---

## 重複検出戦略（RSS仕様準拠）

### 階層的アプローチ

```typescript
// 優先順位:
1. item.guid が存在 → Article.guid で検索
2. guid がない → item.link で検索
3. link もない/信頼できない → contentHash 生成して検索

const uniqueId = item.guid || item.link || generateContentHash(item)
```

### Content Hash生成

```typescript
function generateContentHash(item: {
  title: string
  description?: string
  pubDate?: string
}): string {
  const content = `${item.title}|${item.description || ''}|${item.pubDate || ''}`
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}
```

---

## 既読管理システム

### Intersection Observer方式

#### 動作フロー
1. ArticleCardコンポーネントに `data-article-id` 属性付与
2. 共有Intersection Observerで全記事を監視
3. **threshold: 0.5**（50%表示）で既読判定
4. 500msデバウンス後にバッチ更新

#### パフォーマンス最適化

```typescript
// バッチ更新キュー
const readQueue = new Set<string>()

// 500msデバウンス
clearTimeout(timer)
timer = setTimeout(() => {
  const articleIds = Array.from(readQueue)
  readQueue.clear()

  // 一括API呼び出し
  fetch('/api/read-status', {
    method: 'PUT',
    body: JSON.stringify({ articleIds, isRead: true })
  })
}, 500)
```

**効果:**
- API呼び出し回数を大幅削減
- サーバー負荷軽減
- UX向上（スムーズなスクロール）

---

## PWA実装戦略

### なぜnext-pwaを使わないか？

**問題点（Gemini検証結果）:**
- Turbopack（Next.js 15デフォルト）との競合
- App Routerサポート未成熟
- デプロイ時のエラー多発

**解決策:**
Next.js 15公式PWAガイドに従ったネイティブ実装

### Service Worker構成

#### キャッシング戦略

```javascript
// NetworkFirst: API
workbox.routing.registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10
  })
)

// CacheFirst: 静的アセット
workbox.routing.registerRoute(
  ({request}) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30日
      })
    ]
  })
)

// StaleWhileRevalidate: HTML/CSS/JS
workbox.routing.registerRoute(
  ({request}) => request.destination === 'document' ||
                  request.destination === 'script' ||
                  request.destination === 'style',
  new workbox.strategies.StaleWhileRevalidate()
)
```

### Badging API（未読数表示）

#### ブラウザサポート状況
- ✅ Chrome/Edge (Windows/macOS) - PWAインストール時のみ
- ✅ Safari (iOS/iPadOS 16.4+)
- ❌ Firefox
- ❌ Android Chrome（通知の未読数を自動表示）

#### 実装パターン

```typescript
// Service Worker経由
self.addEventListener('message', async (event) => {
  if (event.data.type === 'UPDATE_BADGE') {
    if (self.navigator.setAppBadge) {
      await self.navigator.setAppBadge(event.data.count)
    }
  }
})

// フォールバック: クライアントサイド
if ('setAppBadge' in navigator) {
  (navigator as any).setAppBadge(unreadCount)
}
```

**機能検出必須:**
```typescript
if ('setAppBadge' in navigator) {
  // Badging API使用可能
}
```

---

## セキュリティ設計

### XSS対策

#### DOMPurifyサニタイズ
```typescript
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}
```

#### CSP（Content Security Policy）
```javascript
// next.config.js
headers: [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://accounts.google.com"
    ].join('; ')
  }
]
```

### SSRF対策

#### URL検証
```typescript
export function isValidFeedUrl(url: string): boolean {
  const parsed = new URL(url)

  // プロトコル制限
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return false
  }

  // 内部IPアドレス拒否
  const hostname = parsed.hostname
  const blockedPatterns = [
    'localhost',
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./
  ]

  return !blockedPatterns.some(pattern =>
    typeof pattern === 'string'
      ? hostname === pattern
      : pattern.test(hostname)
  )
}
```

### 認証・認可

#### NextAuth.js設定
```typescript
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GoogleProvider],
  session: { strategy: 'jwt' }, // Edge互換性
  callbacks: {
    session: async ({ session, token }) => {
      session.user.id = token.sub
      return session
    }
  }
})
```

#### Middleware保護
```typescript
// middleware.ts
export { auth as middleware } from '@/auth'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/group/:path*',
    '/api/feed/:path*',
    '/api/read-status/:path*'
  ]
}
```

---

## パフォーマンス最適化

### データベース最適化

#### インデックス戦略
```prisma
model Article {
  // 複合インデックス: フィード内の記事を日付降順で取得
  @@index([feedId, pubDate(sort: Desc)])

  // 最新記事取得用
  @@index([createdAt(sort: Desc)])
}

model ReadStatus {
  // ユーザーの既読履歴を日付降順で取得
  @@index([userId, readAt(sort: Desc)])
}

model Group {
  // グループをsortIndex順で取得
  @@index([userId, sortIndex])
}
```

#### TiDB特有の注意点
- ❌ FULLTEXT インデックス非対応
- ❌ SPATIAL インデックス非対応
- ❌ ALTER TABLEの多重変更不可（1操作ずつ実行）
- ✅ 外部キー制約（v8.5.0以降）

### フィード取得最適化

#### 条件付きGET（帯域削減）
```typescript
const response = await fetch(feedUrl, {
  headers: {
    'User-Agent': 'GroupFeeder/1.0',
    'If-None-Match': feed.etag || '',
    'If-Modified-Since': feed.lastModified || ''
  }
})

if (response.status === 304) {
  // Not Modified - サーバー負荷削減
  return { updated: false }
}
```

#### 取得頻度制御
```typescript
// 最終取得から15分以上経過したフィードのみ取得
const feedsToFetch = await prisma.feed.findMany({
  where: {
    OR: [
      { lastFetchedAt: null },
      { lastFetchedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } }
    ]
  }
})
```

#### 並列取得制限
```typescript
// 5件ずつチャンク処理
const chunks = chunk(feedsToFetch, 5)
for (const feedChunk of chunks) {
  await Promise.all(feedChunk.map(feed => fetchFeed(feed)))
}
```

### フロントエンド最適化

#### バッチ更新（API呼び出し削減）
- Intersection Observerで検知
- 500msデバウンス
- Set<articleId>でキューイング
- 一括PUT /api/read-status

#### 無限スクロール（将来的に実装推奨）
```typescript
// 初期は50件、スクロールで追加読み込み
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['articles', groupId],
  queryFn: ({ pageParam = 0 }) =>
    fetch(`/api/articles?skip=${pageParam}&take=50`),
  getNextPageParam: (lastPage) => lastPage.nextCursor
})
```

---

## API設計

### エンドポイント一覧

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/group` | グループ作成 |
| PUT | `/api/group/[id]` | グループ名変更 |
| PATCH | `/api/group/reorder` | sortIndex一括更新 |
| DELETE | `/api/group/[id]` | グループ削除 |
| POST | `/api/feed` | フィード登録 |
| DELETE | `/api/feed/[id]` | フィード削除 |
| PUT | `/api/read-status` | 既読状態更新（バッチ） |
| GET | `/api/feeds/fetch` | 全フィード巡回（Cron用） |
| GET | `/api/articles` | 記事一覧取得 |

### リクエスト/レスポンス例

#### POST /api/group
```json
// Request
{
  "name": "テクノロジー"
}

// Response
{
  "id": 1,
  "userId": "clxxx",
  "name": "テクノロジー",
  "sortIndex": 0
}
```

#### PUT /api/read-status（バッチ更新）
```json
// Request
{
  "articleIds": ["article1", "article2", "article3"],
  "isRead": true
}

// Response
{
  "updated": 3
}
```

#### POST /api/feed
```json
// Request
{
  "url": "https://example.com/feed.xml",
  "groupIds": [1, 2]
}

// Response
{
  "id": 5,
  "url": "https://example.com/feed.xml",
  "title": "Example Blog",
  "description": "A tech blog",
  "groups": [
    { "id": 1, "name": "テクノロジー" },
    { "id": 2, "name": "ニュース" }
  ]
}
```

---

## デプロイ戦略

### 環境変数
```env
# データベース
DATABASE_URL="mysql://user:password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/dbname?sslaccept=strict"

# NextAuth.js
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://groupfeeder.vercel.app"

# Google OAuth
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
```

### Vercel推奨設定
```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "next dev"
}
```

### Cron設定（フィード取得）
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/feeds/fetch",
      "schedule": "0 */15 * * *"
    }
  ]
}
```
- 15分ごとに全フィード巡回
- Vercel Cron Jobsを使用

---

## 今後の拡張予定

### Phase 6: 高度な機能（優先度中）
- [ ] 全文検索（記事タイトル・本文）
- [ ] フィードカテゴリ自動分類（AI）
- [ ] OPML インポート/エクスポート
- [ ] ダークモード対応

### Phase 7: モバイル最適化（優先度高）
- [ ] スワイプジェスチャー（既読/未読切り替え）
- [ ] プルリフレッシュ
- [ ] オフライン記事保存

### Phase 8: パフォーマンス改善（優先度中）
- [ ] 無限スクロール実装
- [ ] 記事画像の遅延ロード
- [ ] Service Worker更新通知

---

## トラブルシューティング

### TiDBマイグレーションエラー
```bash
# FULLTEXTインデックスエラーが出た場合
# → 警告は無視してOK（データは正常にpush）
npx prisma db push --accept-data-loss
```

### Service Worker更新されない
```typescript
// app/layout.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      registration.update() // 強制更新
    })
  }
}, [])
```

### Badging APIが動作しない
1. PWAインストール済みか確認
2. ブラウザサポート確認（Chrome/Edge/Safari）
3. 機能検出コード追加
```typescript
if ('setAppBadge' in navigator) {
  console.log('Badging API対応')
} else {
  console.log('Badging API非対応 - フォールバック処理')
}
```

---

## 参考リンク

- [Next.js 15 PWAガイド](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [NextAuth.js v5ドキュメント](https://authjs.dev/)
- [Prisma TiDB統合](https://www.prisma.io/docs/orm/overview/databases/tidb)
- [Feedsmith](https://github.com/shinnn/feedsmith)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Badging API](https://developer.mozilla.org/en-US/docs/Web/API/Badging_API)
