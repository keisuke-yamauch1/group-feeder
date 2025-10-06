# GroupFeeder PWA 実装計画

## プロジェクト概要
PWA対応のRSSフィーダーアプリ「GroupFeeder」の完全実装計画。
Next.js 15 (App Router) + TiDB + NextAuth.js v5を使用したモダンなフィード管理システム。

**総タスク数**: 59 (Task 16.5追加により58→59に更新)

---

## Phase 1: プロジェクト初期化 (7タスク)

### 1. Next.js 15プロジェクト初期化
```bash
npx create-next-app@latest group-feeder --typescript --app --tailwind
```
- TypeScript有効
- App Router使用
- Tailwind CSS導入

### 2. Prismaインストール
```bash
npm install prisma @prisma/client @tidbcloud/prisma-adapter
```
- TiDB専用アダプター使用（パフォーマンス最適化）

### 3. prisma/schema.prisma作成
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```
- provider: mysql（TiDB互換）

### 4. 環境変数テンプレート .env.example作成
```env
DATABASE_URL="mysql://user:password@host:4000/dbname"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 5. NextAuth.js v5インストール
```bash
npm install next-auth@beta @auth/prisma-adapter
```
- v5はベータ版を使用（Next.js 15互換性）

### 6. app/api/auth/[...nextauth]/route.ts作成
- Google Provider設定
- JWT Session Strategy（Edge互換性のため）

### 7. auth.ts作成
- NextAuth設定エクスポート
- Prisma Adapter統合
- セッション戦略: JWT

---

## Phase 2: データモデル実装 (11タスク)

### 8. Userモデル定義
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?

  groups        Group[]
  readStatuses  ReadStatus[]
  accounts      Account[]
  sessions      Session[]
}
```

### 9. Groupモデル定義
```prisma
model Group {
  id        Int      @id @default(autoincrement())
  userId    String
  name      String
  sortIndex Int      // タブの並び順
  createdAt DateTime @default(now())

  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  feeds GroupFeed[]

  @@index([userId, sortIndex])
}
```

### 10. Feedモデル定義
```prisma
model Feed {
  id            Int       @id @default(autoincrement())
  url           String    @unique
  title         String
  description   String?   @db.Text
  lastFetchedAt DateTime?
  etag          String?   // HTTP ETag for conditional GET
  lastModified  String?   // HTTP Last-Modified
  createdAt     DateTime  @default(now())

  groups   GroupFeed[]
  articles Article[]
}
```

### 11. GroupFeedモデル定義（中間テーブル）
```prisma
model GroupFeed {
  groupId Int
  feedId  Int

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  feed  Feed  @relation(fields: [feedId], references: [id], onDelete: Cascade)

  @@id([groupId, feedId])
  @@index([groupId])
  @@index([feedId])
}
```

### 12. Articleモデル定義
```prisma
model Article {
  id          String    @id @default(cuid())
  feedId      Int
  guid        String?   @unique  // RSS GUID（最優先）
  link        String    @unique  // フォールバック
  contentHash String?   // 最終フォールバック（title+description+pubDateのCRC）
  title       String
  description String?   @db.Text
  content     String?   @db.Text
  author      String?
  pubDate     DateTime?
  createdAt   DateTime  @default(now())

  feed         Feed         @relation(fields: [feedId], references: [id], onDelete: Cascade)
  readStatuses ReadStatus[]

  @@index([feedId, pubDate(sort: Desc)])
  @@index([createdAt(sort: Desc)])
}
```

### 13. ReadStatusモデル定義
```prisma
model ReadStatus {
  id        String   @id @default(cuid())
  userId    String
  articleId String
  readAt    DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([userId, articleId])
  @@index([userId, readAt(sort: Desc)])
}
```

### 14-15. インデックス作成
- Article: `[feedId, pubDate(sort: Desc)]`, `[createdAt(sort: Desc)]`
- ReadStatus: `[userId, readAt(sort: Desc)]`
- 上記モデル定義に含まれる

### 16. NextAuth用モデル追加
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

---

## Phase 2.5: データベースセットアップ (4タスク)

### 16.5. Docker Compose MySQL環境構築（ローカル開発時のみ）

**目的**: TiDBに置き換え可能なローカル開発環境を構築

#### 作成ファイル1: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # ローカル開発用MySQL（TiDB互換設定）
  mysql:
    image: mysql:8.0
    container_name: groupfeeder-mysql
    environment:
      MYSQL_ROOT_PASSWORD: groupfeeder_root_pass
      MYSQL_DATABASE: group_feeder
      MYSQL_USER: groupfeeder_user
      MYSQL_PASSWORD: groupfeeder_pass
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
```

#### 作成ファイル2: `docker/mysql/init.sql`

```sql
-- TiDB互換性を意識した初期設定
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- データベース確認
USE group_feeder;

-- 必要に応じて初期データを追加
```

#### 作成ファイル3: `.env.local.example`

```env
# ローカル開発用（Docker MySQL）
DATABASE_URL="mysql://groupfeeder_user:groupfeeder_pass@localhost:3306/group_feeder"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-google-client-secret"
```

#### 作成ファイル4: `.env.tidb.example`

```env
# TiDB本番環境用
DATABASE_URL="mysql://user:password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/group_feeder?sslaccept=strict"

# NextAuth.js
NEXTAUTH_SECRET="production-secret-key"
NEXTAUTH_URL="https://your-production-url.vercel.app"

# Google OAuth
GOOGLE_CLIENT_ID="production-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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ret"
```

#### 作成ファイル5: `README.md`更新

既存のREADME.mdに以下のセクションを追加:

```markdown
## 開発環境セットアップ

### ローカル開発（Docker MySQL）

1. Docker Composeでデータベース起動
   ```bash
   docker-compose up -d
   ```

2. データベース起動確認
   ```bash
   docker-compose ps
   ```

3. .envファイル作成
   ```bash
   cp .env.local.example .env
   ```

4. Prismaマイグレーション実行
   ```bash
   npx prisma migrate dev --name init
   ```

5. 開発サーバー起動
   ```bash
   npm run dev
   ```

### 本番環境（TiDB）

1. .envファイル作成
   ```bash
   cp .env.tidb.example .env
   ```

2. TiDB接続情報を.envに設定

3. Prismaマイグレーション実行
   ```bash
   npx prisma migrate deploy
   ```

### 環境切り替え

```bash
# ローカル開発に切り替え
cp .env.local.example .env
docker-compose up -d

# TiDB本番に切り替え
cp .env.tidb.example .env
# TiDB接続情報を編集
```

### Docker コマンド

```bash
# 起動
docker-compose up -d

# 停止
docker-compose down

# ログ確認
docker-compose logs -f mysql

# データベースリセット（データ削除）
docker-compose down -v
docker-compose up -d
```
```

#### TiDB互換性のポイント

1. **MySQL 8.0を使用**: TiDBはMySQL 8.0互換
2. **文字セット**: utf8mb4_unicode_ci（TiDBのデフォルト）
3. **環境切り替え**: .envファイルのコピーだけで完結
4. **@tidbcloud/prisma-adapter**: 環境変数で自動切り替え（Task 19で実装）

#### .gitignore更新

以下を追加:
```
# Environment files
.env
.env.local
.env.tidb

# Docker volumes
docker/mysql/data/
```

### 17. .envファイル作成

#### 手順
1. .env.exampleをコピー
```bash
cp .env.example .env
```

2. DATABASE_URL設定

**オプションA: TiDB使用**
```env
DATABASE_URL="mysql://user:password@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/group_feeder?sslaccept=strict"
```

**オプションB: ローカルMySQL使用**
```env
DATABASE_URL="mysql://root:password@localhost:3306/group_feeder"
```

**オプションC: SQLiteでクイックスタート（開発用）**
```env
DATABASE_URL="file:./dev.db"
```
注: SQLiteを使う場合はschema.prismaのproviderを一時的に"sqlite"に変更

3. NEXTAUTH_SECRET生成
```bash
openssl rand -base64 32
```
生成された値を.envに設定:
```env
NEXTAUTH_SECRET="生成された値"
```

4. Google OAuth設定
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials) でOAuth 2.0クライアントIDを作成
- 認証済みリダイレクトURI: `http://localhost:3000/api/auth/callback/google`
- クライアントIDとシークレットを.envに設定

### 18. Prismaマイグレーション実行
```bash
npx prisma migrate dev --name init
```

**TiDB制限に注意:**
- FULLTEXT非対応（警告が出るが無視してOK）
- ALTER TABLEの多重変更不可（1操作ずつ実行）
- 外部キー制約はv8.5.0以降でサポート

**エラー対処:**
マイグレーションでエラーが出た場合:
```bash
# 代替案: db push を使用（開発環境のみ）
npx prisma db push --accept-data-loss
```

### 19. lib/prisma.ts作成

**TiDB/ローカルMySQL自動切り替え対応版:**

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaAdapter } from '@tidbcloud/prisma-adapter'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// TiDB使用時のみアダプターを適用（自動判定）
const useTiDBAdapter = process.env.DATABASE_URL?.includes('tidbcloud.com') ?? false

export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  useTiDBAdapter ? { adapter: PrismaAdapter() } : {}
)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**補足:**
- `globalForPrisma`パターンは開発時のホットリロード対策
- DATABASE_URLに`tidbcloud.com`が含まれる場合のみTiDBアダプター使用
- ローカルMySQL使用時は通常のPrismaClientを使用
- 環境切り替えが.envファイルの変更だけで完結

---

## Phase 3: コアAPI実装 (10タスク)

### 20. app/api/group/route.ts作成
```typescript
// POST: グループ新規作成
- NextAuthからuserId取得
- sortIndexは既存グループの最大値+1を自動設定
- { name: string } をリクエストボディで受け取る
```

### 21. app/api/group/[id]/route.ts作成
```typescript
// PUT: グループ名変更
- { name: string }

// PATCH: sortIndex一括更新
- { groups: { id: number, sortIndex: number }[] }
- ドラッグ&ドロップ後の並び順を一括更新
```

### 22. app/api/feed/route.ts作成
```typescript
// POST: フィードURL登録
- { url: string, groupIds?: number[] }
- Feedsmithでフィード検証
- タイトル・説明を自動取得
- groupIdsが指定されていればGroupFeedレコード作成
```

### 23. app/api/read-status/route.ts作成
```typescript
// PUT: 既読状態更新（バッチ対応）
- { articleIds: string[], isRead: boolean }
- 複数記事の既読状態を一括更新
- upsert処理（既存レコードは更新、なければ作成）
```

### 24. Feedsmithインストール
```bash
npm install feedsmith
```

### 25. DOMPurifyインストール
```bash
npm install isomorphic-dompurify
```

### 26. lib/feed-fetcher.ts作成
```typescript
import { feedsmith } from 'feedsmith'

// 階層的重複検出ロジック:
// 1. item.guid が存在 → Article.guid で検索
// 2. なければ item.link → Article.link で検索
// 3. どちらもなければ contentHash 生成して検索

async function fetchFeed(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'GroupFeeder/1.0',
      'If-None-Match': feed.etag || '',
      'If-Modified-Since': feed.lastModified || ''
    }
  })

  if (response.status === 304) {
    // Not Modified - キャッシュ利用
    return { updated: false }
  }

  const xml = await response.text()
  const parsed = feedsmith(xml)

  // 記事の重複チェックと保存処理
}
```

### 27. lib/content-hash.ts作成
```typescript
import { createHash } from 'crypto'

export function generateContentHash(item: {
  title: string
  description?: string
  pubDate?: string
}): string {
  const content = `${item.title}|${item.description || ''}|${item.pubDate || ''}`
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}
```

### 28. lib/sanitize.ts作成
```typescript
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}
```

### 29. app/api/feeds/fetch/route.ts作成
```typescript
// GET: 全フィード巡回取得（Cron用）
// - 最終取得から15分以上経過したフィードのみ取得
// - ETag/Last-Modified を活用した条件付きGET
// - 並列取得は5件まで（Promise.all + chunk処理）
// - タイムアウト: 30秒
```

---

## Phase 4: フロントエンド実装 (18タスク)

### 30. app/page.tsx作成
```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LoginButton from '@/components/auth/LoginButton'

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect('/dashboard')
  }

  return <LoginButton />
}
```

### 31. components/auth/LoginButton.tsx作成
```typescript
'use client'
import { signIn } from 'next-auth/react'

export default function LoginButton() {
  return (
    <button onClick={() => signIn('google')}>
      Googleでログイン
    </button>
  )
}
```

### 32. middleware.ts作成
```typescript
export { auth as middleware } from '@/auth'

export const config = {
  matcher: ['/dashboard/:path*', '/api/group/:path*', '/api/feed/:path*']
}
```

### 33. app/dashboard/page.tsx作成
```typescript
// 記事一覧メイン画面
// - ArticleTabsコンポーネント配置
// - ArticleListコンポーネント配置
// - ReadToggleコンポーネント配置
// - useBadgeUpdate統合（未読数取得してバッジ更新）
```

### 34. app/dashboard/settings/page.tsx作成
```typescript
// グループ/フィード管理画面
// - GroupListコンポーネント（ドラッグ&ドロップ）
// - GroupFormコンポーネント（作成/編集）
// - FeedFormコンポーネント（URL登録）
// - FeedListコンポーネント（一覧表示）
```

### 35. components/group/GroupList.tsx作成
```typescript
'use client'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

// ドラッグ&ドロップでsortIndex更新
// onDragEnd時にPATCH /api/group/reorder呼び出し
```

### 36. @dnd-kit/coreインストール
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

### 37. components/group/GroupForm.tsx作成
```typescript
// グループ名入力フォーム
// mode: 'create' | 'edit'
// onSubmit時にPOST /api/group または PUT /api/group/[id]
```

### 38. components/feed/FeedForm.tsx作成
```typescript
// フィードURL入力 + グループ選択ドロップダウン
// URL検証（http/httpsのみ許可）
// POST /api/feed で登録
```

### 39. components/feed/FeedList.tsx作成
```typescript
// グループごとにフィード一覧表示
// 削除ボタン（DELETE /api/feed/[id]）
```

### 40. components/article/ArticleTabs.tsx作成
```typescript
'use client'
// タブ: 「全て」「{グループ名}...」「未分類」
// 選択タブをuseState管理、親コンポーネントにコールバック
```

### 41. components/article/ArticleList.tsx作成
```typescript
// タブ選択に応じたフィルタリング
// - 全て: すべての記事
// - グループ: GroupFeed経由で該当記事のみ
// - 未分類: GroupFeedに存在しない記事
```

### 42. components/article/ArticleCard.tsx作成
```typescript
// data-article-id={article.id} 属性付与
// Intersection Observer監視対象
// 既読状態に応じた視覚スタイル変更
```

### 43. hooks/useIntersectionObserver.ts作成
```typescript
'use client'
import { useEffect, useRef } from 'react'

export function useIntersectionObserver(
  callback: (articleId: string) => void
) {
  const observerRef = useRef<IntersectionObserver>()

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const articleId = entry.target.getAttribute('data-article-id')
            if (articleId) callback(articleId)
          }
        })
      },
      { threshold: 0.5 }
    )

    return () => observerRef.current?.disconnect()
  }, [callback])

  return observerRef.current
}
```

### 44. hooks/useReadStatusBatch.ts作成
```typescript
'use client'
import { useCallback, useRef } from 'react'

export function useReadStatusBatch() {
  const queueRef = useRef(new Set<string>())
  const timerRef = useRef<NodeJS.Timeout>()

  const markAsRead = useCallback((articleId: string) => {
    queueRef.current.add(articleId)

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const articleIds = Array.from(queueRef.current)
      queueRef.current.clear()

      await fetch('/api/read-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds, isRead: true })
      })
    }, 500) // 500msデバウンス
  }, [])

  return { markAsRead }
}
```

### 45. components/article/ReadToggle.tsx作成
```typescript
'use client'
// トグルボタン: 「すべて表示」「未読のみ」
// 状態をuseState管理、親にコールバック
```

---

## Phase 5: PWA機能実装 (11タスク)

### 46. app/manifest.ts作成
```typescript
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GroupFeeder',
    short_name: 'GroupFeeder',
    description: 'RSS Feed Reader with Group Management',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
}
```

### 47. public/icons/ にPWAアイコン配置
- `icon-192x192.png`
- `icon-512x512.png`
- maskable対応（セーフエリア確保）

### 48. Workboxインストール
```bash
npm install workbox-webpack-plugin workbox-window
```

### 49. public/sw.js作成
```javascript
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js')

workbox.routing.registerRoute(
  ({request}) => request.destination === 'document' ||
                  request.destination === 'script' ||
                  request.destination === 'style',
  new workbox.strategies.StaleWhileRevalidate()
)

workbox.routing.registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10
  })
)
```

### 50. Service Workerキャッシング戦略実装
- **NetworkFirst**: API (`/api/*`)
- **CacheFirst**: 静的アセット（画像、フォント）
- **StaleWhileRevalidate**: HTML/CSS/JS

### 51. app/layout.tsx内でService Worker登録
```typescript
'use client'
import { useEffect } from 'react'

export default function RootLayout({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  }, [])

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### 52. components/pwa/InstallButton.tsx作成
```typescript
'use client'
import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (!deferredPrompt) return null
  return <button onClick={handleInstall}>インストール</button>
}
```

### 53. public/sw.js内にBadging API実装
```javascript
self.addEventListener('message', async (event) => {
  if (event.data.type === 'UPDATE_BADGE') {
    if (self.navigator.setAppBadge) {
      const count = event.data.count
      if (count > 0) {
        await self.navigator.setAppBadge(count)
      } else {
        await self.navigator.clearAppBadge()
      }
    }
  }
})
```

### 54. hooks/useBadgeUpdate.ts作成
```typescript
'use client'
import { useEffect } from 'react'

export function useBadgeUpdate(unreadCount: number) {
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_BADGE',
        count: unreadCount
      })
    }

    // フォールバック: クライアントサイドBadging API
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount)
      } else {
        (navigator as any).clearAppBadge()
      }
    }
  }, [unreadCount])
}
```

### 55. app/dashboard/page.tsx内でuseBadgeUpdate統合
```typescript
// 記事一覧読み込み時に未読数更新
```

### 56. lib/security/url-validator.ts作成
```typescript
export function isValidFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // http/httpsのみ許可
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }

    // 内部IPアドレス拒否（SSRF対策）
    const hostname = parsed.hostname
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      return false
    }

    return true
  } catch {
    return false
  }
}
```

### 57. next.config.js内にCSP設定追加
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://accounts.google.com",
              "frame-src https://accounts.google.com"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

---

## セキュリティ対策まとめ

### XSS対策
- DOMPurifyでHTMLサニタイズ（記事内容表示時）
- CSP設定（inline scriptを制限）

### SSRF対策
- フィードURL検証（内部IPアドレス拒否）
- プロトコル制限（http/httpsのみ）

### 認証・認可
- NextAuth.js v5（セキュアなセッション管理）
- middleware.tsで保護ルート設定
- API RouteでuserIdベースのアクセス制御

---

## パフォーマンス最適化

### データベース
- 適切なインデックス設計
- @tidbcloud/prisma-adapter使用
- カスケード削除でデータ整合性維持

### フロントエンド
- Intersection Observerで効率的な既読トラッキング
- バッチ更新（500msデバウンス）でAPI呼び出し削減
- Service Workerキャッシングで高速表示

### フィード取得
- 条件付きGET（ETag/Last-Modified）
- 15分間隔の取得制限
- 並列取得数制限（5件まで）

---

## 実装順序の推奨

1. **Phase 1-2を完了** → データモデル設計完了
2. **Phase 2.5でDB実体化** → データベース基盤確立（環境依存設定）
3. **Phase 3のAPI実装** → バックエンドロジック完成
4. **Phase 4のUI実装** → ユーザー体験構築
5. **Phase 5のPWA機能** → モバイル対応強化

各Phaseの完了時点で動作確認を行い、問題があれば即座に修正することを推奨します。

**Phase 2.5の重要性:**
- Phase 2完了後、スキーマ設計をレビュー可能
- Phase 2.5で環境セットアップを集中実施
- Phase 3開始時点で全ての前提条件が整っている状態を確保
