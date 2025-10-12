import { auth } from '@/auth'
import { BadgeUpdater } from './_components/BadgeUpdater'

type PlaceholderProps = {
  title: string
  description: string
}

function SectionPlaceholder({ title, description }: PlaceholderProps) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-6 py-10 text-center shadow-inner">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  // TODO: Replace with actual unread count once feed aggregation API is available.
  const unreadCount = 0

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <BadgeUpdater unreadCount={unreadCount} />
      <header className="border-b border-slate-800/60 bg-slate-950/80 px-8 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">GroupFeeder</p>
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">ダッシュボード</h1>
          </div>
          {session?.user?.name ? (
            <div className="rounded-full border border-slate-800/60 bg-slate-900 px-4 py-2 text-sm text-slate-300">
              {session.user.name}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-8 py-8">
        <SectionPlaceholder
          title="ArticleTabs（Task40予定）"
          description="記事リストの表示範囲をタブで切り替えるUIをここに配置します。"
        />
        <SectionPlaceholder
          title="ReadToggle（Task45予定）"
          description="既読・未読フィルタを切り替えるトグルコンポーネントを配置します。"
        />
        <SectionPlaceholder
          title="ArticleList（Task41予定）"
          description="選択中のタブに応じた記事一覧を表示します。未読バッジやスクロール既読連携も統合予定です。"
        />
      </main>
    </div>
  )
}
