/**
 * Utilidades para respuestas JSON con CORS en Edge Functions
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

/**
 * Headers CORS estándar
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Respuesta exitosa con CORS
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: CORS_HEADERS
  });
}

/**
 * Respuesta de error con CORS
 */
export function errorResponse(
  error: string,
  code?: string,
  status: number = 400
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    code
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: CORS_HEADERS
  });
}

/**
 * Respuesta de error de validación
 */
export function validationErrorResponse(
  error: string,
  details?: any
): Response {
  return errorResponse(error, 'VALIDATION_FAIL', 400);
}

/**
 * Respuesta de error de autenticación
 */
export function unauthorizedResponse(
  error: string = 'No autorizado'
): Response {
  return errorResponse(error, 'UNAUTH', 401);
}

/**
 * Respuesta de error de permisos
 */
export function forbiddenResponse(
  error: string = 'Sin permisos suficientes'
): Response {
  return errorResponse(error, 'FORBIDDEN', 403);
}

/**
 * Respuesta de conflicto
 */
export function conflictResponse(
  error: string,
  details?: any
): Response {
  return errorResponse(error, 'CONFLICT', 409);
}

/**
 * Respuesta para OPTIONS (preflight)
 */
export function optionsResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}

/**
 * Maneja automáticamente las requests OPTIONS
 */
export function handleCORS(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }
  return null;
}