import { Link } from 'react-router-dom'
import { PrimaryButton, SurfaceCard } from '../../../shared/ui/primitives'

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-lg text-center">
      <SurfaceCard>
        <h1 className="text-2xl font-semibold text-slate-900">Страница не найдена</h1>
        <p className="mt-2 text-slate-600">Возможно, ссылка устарела или введена с ошибкой.</p>
        <Link to="/" className="mt-4 inline-block">
          <PrimaryButton>На главную</PrimaryButton>
        </Link>
      </SurfaceCard>
    </section>
  )
}
