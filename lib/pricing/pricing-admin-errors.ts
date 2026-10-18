/** Fronteira HTTP: códigos do banco ficam no log, nunca no texto operacional. */
export function pricingAdminError(message: string) {
  const conflict = /^pricing_promotion_conflict:(\d+)$/.exec(message)
  if (conflict) return {
    status: 409,
    body: { error: 'Já existe outra promoção ativa ou programada para este produto nesse período. Confira a oferta existente ou ajuste a agenda.', conflictPromotionId: Number(conflict[1]) },
  }
  if (message.includes('archived_promotion_immutable')) return {
    status: 409, body: { error: 'Esta promoção está no histórico e não pode ser alterada. Crie uma nova oferta para usá-la novamente.' },
  }
  if (message.includes('forbidden')) return { status: 403, body: { error: 'Você não tem permissão para administrar promoções.' } }
  if (message.includes('invalid_required_quantity')) return { status: 400, body: { error: 'Informe uma quantidade de compra inteira e positiva.' } }
  if (message.includes('promotion_not_found')) return { status: 404, body: { error: 'A promoção não foi encontrada. Atualize a lista e tente novamente.' } }
  return { status: 400, body: { error: 'Não foi possível salvar esta alteração. Confira os produtos, os valores e a agenda e tente novamente.' } }
}

export const pricingUpdatePending = 'As promoções estão em atualização neste ambiente. Você pode consultar as ofertas, mas a ativação e a edição aguardam a atualização do sistema.'
