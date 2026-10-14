import type { Api } from './types'
import { mockApi } from './mock/mockApi'
import { httpApi } from './http/httpApi'

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'

/** API activa: simulada en el navegador (por defecto) o el API Gateway real. */
export const api: Api = USE_MOCK ? mockApi : httpApi
export { mockApi }
export { ApiError } from './errors'
