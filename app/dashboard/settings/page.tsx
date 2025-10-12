import { auth } from '@/auth'

type PlaceholderProps = {
  title: string
  description: string
}

function SettingsSectionPlaceholder({ title, description }: PlaceholderProps) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-6 py-10 text-center shadow-inner">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
    </div>
  )
}

export default async function DashboardSettingsPage() {
  const session = await auth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="border-b border-slate-800/60 bg-slate-950/80 px-8 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">GroupFeeder</p>
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">設定</h1>
            <p className="mt-2 text-sm text-slate-400">
              グループとフィードの管理機能は今後のタスクで実装予定です。現時点ではレイアウトのみ用意しています。
            </p>
          </div>
          {session?.user?.name ? (
            <div className="rounded-full border border-slate-800/60 bg-slate-900 px-4 py-2 text-sm text-slate-300">
              {session.user.name}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-8 py-8">
        <SettingsSectionPlaceholder
          title="GroupList（Task35予定）"
          description="ドラッグ&ドロップでグループの並び替えを行うUIを配置します。今後のTask35でDNDロジックを実装します。"
        />
        <SettingsSectionPlaceholder
          title="GroupForm（Task37予定）"
          description="グループの作成・編集フォームをここに配置します。Task37でフォームとAPI連携を実装します。"
        />
        <SettingsSectionPlaceholder
          title="FeedForm（Task38予定）"
          description="フィードURL登録フォームを配置予定です。URL検証やPOST処理はTask38で対応します。"
        />
        <SettingsSectionPlaceholder
          title="FeedList（Task39予定）"
          description="登録済みフィードの一覧表示を行う領域です。削除アクションなどはTask39で組み込みます。"
        />
      </main>
    </div>
  )
}

