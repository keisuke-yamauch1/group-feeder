-- TiDB互換性を意識した初期設定
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 必要なデータベースを作成
CREATE DATABASE IF NOT EXISTS group_feeder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS prisma_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- デフォルトスキーマを選択
USE group_feeder;

-- 必要に応じて初期データを追加
