import { AdminLoginForm } from './AdminLoginForm'

export default function AdminLoginPage() {
  return (
    <main className="catalog-admin-shell">
      <section className="mx-auto w-full max-w-md">
        <h1>Acesso administrativo</h1>
        <AdminLoginForm />
      </section>
    </main>
  )
}
