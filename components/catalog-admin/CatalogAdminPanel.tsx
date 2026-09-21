'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  saveCatalogAdminCategory,
  saveCatalogAdminProduct,
} from '@/lib/catalog/management/catalog-admin-actions'
import { PRODUCTION_MODES, PRODUCTION_STATION_CODES } from '@/types/production'
import type {
  ProductionMode,
  ProductionStationCode,
} from '@/types/production'
import type {
  CatalogAdminCategory,
  CatalogAdminProduct,
  CatalogAdminSnapshot,
} from '@/types/catalog-management'

type CatalogAdminPanelProps = {
  initialSnapshot: CatalogAdminSnapshot
  operatorLabel: string
}

type ProductFormState = {
  id: number | null
  categoryId: number
  name: string
  description: string
  price: string
  imageUrl: string
  available: boolean
  sortOrder: string
  productionStation: ProductionStationCode
  productionMode: ProductionMode
}

type CategoryFormState = {
  id: number | null
  name: string
  emoji: string
  sortOrder: string
}

const emptyProduct: ProductFormState = {
  id: null,
  categoryId: 0,
  name: '',
  description: '',
  price: '0',
  imageUrl: '',
  available: true,
  sortOrder: '0',
  productionStation: 'kitchen',
  productionMode: 'preparation',
}

function productFormFromProduct(
  product: CatalogAdminProduct
): ProductFormState {
  return {
    id: product.id,
    categoryId: product.category_id,
    name: product.name,
    description: product.description ?? '',
    price: String(product.price),
    imageUrl: product.image_url ?? '',
    available: product.available,
    sortOrder: String(product.sort_order),
    productionStation: product.production_station,
    productionMode: product.production_mode,
  }
}

function categoryFormFromCategory(
  category: CatalogAdminCategory
): CategoryFormState {
  return {
    id: category.id,
    name: category.name,
    emoji: category.emoji ?? '',
    sortOrder: String(category.sort_order),
  }
}

function money(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function CatalogAdminPanel({
  initialSnapshot,
  operatorLabel,
}: CatalogAdminPanelProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [productForm, setProductForm] = useState<ProductFormState>({
    ...emptyProduct,
    categoryId: initialSnapshot.categories[0]?.id ?? 0,
  })
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    id: null,
    name: '',
    emoji: '',
    sortOrder: String(initialSnapshot.categories.length + 1),
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const productsByCategory = useMemo(
    () =>
      snapshot.categories.map((category) => ({
        category,
        products: snapshot.products.filter(
          (product) => product.category_id === category.id
        ),
      })),
    [snapshot.categories, snapshot.products]
  )

  async function refreshSnapshot() {
    const response = await fetch('/api/catalog-admin/snapshot', {
      cache: 'no-store',
    })

    if (!response.ok) return

    const body = (await response.json()) as CatalogAdminSnapshot
    setSnapshot(body)
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setError(null)

    const result = await saveCatalogAdminProduct({
      id: productForm.id,
      categoryId: productForm.categoryId,
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price),
      imageUrl: productForm.imageUrl,
      available: productForm.available,
      sortOrder: Number(productForm.sortOrder),
      productionStation: productForm.productionStation,
      productionMode: productForm.productionMode,
    })

    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setMessage('Produto salvo.')
    setProductForm({
      ...emptyProduct,
      categoryId: snapshot.categories[0]?.id ?? 0,
    })
    await refreshSnapshot()
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setError(null)

    const result = await saveCatalogAdminCategory({
      id: categoryForm.id,
      name: categoryForm.name,
      emoji: categoryForm.emoji,
      sortOrder: Number(categoryForm.sortOrder),
    })

    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setMessage('Categoria salva.')
    setCategoryForm({
      id: null,
      name: '',
      emoji: '',
      sortOrder: String(snapshot.categories.length + 1),
    })
    await refreshSnapshot()
  }

  return (
    <main className="catalog-admin-shell">
      <header className="catalog-admin-hero">
        <div>
          <p>MODARA · Catalog Management</p>
          <h1>Administração do catálogo</h1>
          <span>{operatorLabel}</span>
          <small>Unidade: {snapshot.unitId}</small>
        </div>
        <div className="catalog-admin-metrics">
          <strong>{snapshot.categories.length}</strong>
          <span>categorias</span>
          <strong>{snapshot.products.length}</strong>
          <span>produtos</span>
        </div>
      </header>

      {snapshot.issues.length > 0 || !snapshot.infrastructureAvailable ? (
        <section className="catalog-admin-warning">
          <strong>Infraestrutura pendente</strong>
          <p>
            A leitura pública continua preservada. Escrita administrativa
            requer a migration MODARA-003 aplicada.
          </p>
          {snapshot.issues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </section>
      ) : null}

      {message ? <p className="catalog-admin-message">{message}</p> : null}
      {error ? <p className="catalog-admin-error">{error}</p> : null}

      <section className="catalog-admin-grid">
        <form className="catalog-admin-form" onSubmit={handleProductSubmit}>
          <h2>{productForm.id ? 'Editar produto' : 'Novo produto'}</h2>
          <label>
            Nome
            <input
              value={productForm.name}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Descrição
            <textarea
              value={productForm.description}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <div className="catalog-admin-two">
            <label>
              Preço
              <input
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Ordem
              <input
                type="number"
                min="0"
                step="1"
                value={productForm.sortOrder}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Categoria
            <select
              value={productForm.categoryId}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  categoryId: Number(event.target.value),
                }))
              }
            >
              {snapshot.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Imagem
            <input
              placeholder="/images/produto.jpg ou https://..."
              value={productForm.imageUrl}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  imageUrl: event.target.value,
                }))
              }
            />
          </label>
          <div className="catalog-admin-two">
            <label>
              Estação
              <select
                value={productForm.productionStation}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    productionStation:
                      event.target.value as ProductionStationCode,
                  }))
                }
              >
                {PRODUCTION_STATION_CODES.map((station) => (
                  <option key={station} value={station}>
                    {station}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Modo
              <select
                value={productForm.productionMode}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    productionMode: event.target.value as ProductionMode,
                  }))
                }
              >
                {PRODUCTION_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="catalog-admin-check">
            <input
              type="checkbox"
              checked={productForm.available}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  available: event.target.checked,
                }))
              }
            />
            Produto ativo
          </label>
          <button type="submit" disabled={pending}>
            {pending ? 'Salvando...' : 'Salvar produto'}
          </button>
        </form>

        <form className="catalog-admin-form" onSubmit={handleCategorySubmit}>
          <h2>{categoryForm.id ? 'Editar categoria' : 'Nova categoria'}</h2>
          <label>
            Nome
            <input
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Emoji/ícone textual
            <input
              value={categoryForm.emoji}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  emoji: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Ordem
            <input
              type="number"
              min="0"
              step="1"
              value={categoryForm.sortOrder}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  sortOrder: event.target.value,
                }))
              }
            />
          </label>
          <button type="submit" disabled={pending}>
            {pending ? 'Salvando...' : 'Salvar categoria'}
          </button>
        </form>
      </section>

      <section className="catalog-admin-list">
        {productsByCategory.map(({ category, products }) => (
          <article key={category.id} className="catalog-admin-category">
            <header>
              <button
                type="button"
                onClick={() =>
                  setCategoryForm(categoryFormFromCategory(category))
                }
              >
                editar categoria
              </button>
              <h2>{category.name}</h2>
              <span>ordem {category.sort_order}</span>
            </header>
            {products.map((product) => (
              <div key={product.id} className="catalog-admin-product">
                <div>
                  <strong>{product.name}</strong>
                  <span>
                    {money(product.price)} · {product.available ? 'ativo' : 'inativo'} ·{' '}
                    {product.production_station}/{product.production_mode}
                  </span>
                  {product.description ? <p>{product.description}</p> : null}
                  {product.image_url ? <small>{product.image_url}</small> : null}
                </div>
                <button
                  type="button"
                  onClick={() => setProductForm(productFormFromProduct(product))}
                >
                  editar
                </button>
              </div>
            ))}
          </article>
        ))}
      </section>
    </main>
  )
}
