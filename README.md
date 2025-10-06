# GroupFeeder

PWA対応のRSSフィーダーアプリ。グループ（タブ）でフィードを整理でき、スクロール自動既読、未読バッジ表示などモダンな機能を搭載。

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: TiDB (本番) / MySQL 8.0 (開発)
- **Authentication**: NextAuth.js v5 (Google OAuth)
- **PWA**: Service Worker, Workbox, Badging API

## 開発環境セットアップ

### ローカル開発（Docker MySQL）

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **Docker Composeでデータベース起動**
   ```bash
   docker-compose up -d
   ```

3. **データベース起動確認**
   ```bash
   docker-compose ps
   ```

4. **.envファイル作成**
   ```bash
   cp .env.local.example .env
   ```

5. **NEXTAUTH_SECRET生成**
   ```bash
   openssl rand -base64 32
   ```
   生成された値を`.env`の`NEXTAUTH_SECRET`に設定

6. **Prismaマイグレーション実行**
   ```bash
   npx prisma migrate dev --name init
   ```

7. **開発サーバー起動**
   ```bash
   npm run dev
   ```

8. ブラウザで [http://localhost:3000](http://localhost:3000) を開く

### 本番環境（TiDB）

1. **.envファイル作成**
   ```bash
   cp .env.tidb.example .env
   ```

2. **TiDB接続情報を.envに設定**
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - Google OAuth認証情報

3. **Prismaマイグレーション実行**
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

# MySQLコンソール接続
docker-compose exec mysql mysql -u groupfeeder_user -p group_feeder

# データベースリセット（データ削除）
docker-compose down -v
docker-compose up -d
```

## Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. プロジェクトを作成または選択
3. 「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
4. アプリケーションの種類: ウェブアプリケーション
5. 承認済みのリダイレクト URI:
   - ローカル: `http://localhost:3000/api/auth/callback/google`
   - 本番: `https://your-domain.com/api/auth/callback/google`
6. クライアントIDとシークレットを`.env`に設定

## プロジェクト構成

```
.
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   └── dashboard/         # ダッシュボード画面
├── components/            # Reactコンポーネント
├── lib/                   # ユーティリティ関数
├── prisma/                # Prismaスキーマ
├── docker/                # Docker関連ファイル
├── ARCHITECTURE.md        # アーキテクチャ設計書
├── IMPLEMENTATION_PLAN.md # 実装計画
└── TODO.md               # タスク管理
```

## ドキュメント

- [ARCHITECTURE.md](./ARCHITECTURE.md) - システム設計・技術仕様
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - 実装手順詳細
- [TODO.md](./TODO.md) - タスク管理・進捗状況

## License

MIT
