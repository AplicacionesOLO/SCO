/**
 * Utilidades de autenticación para Edge Functions
 * Manejo de JWT, permisos y auditoría
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthUser {
  id: string;
  email?: string;
  permissions: string[];
}

export interface AuditLog {
  permiso: string;
  recurso: string;
  recurso_id?: number;
  ok: boolean;
  meta?: Record<string, any>;
}

/**
 * Extrae y valida el JWT del header Authorization
 */
export function extractJWT(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Obtiene el usuario autenticado desde el JWT
 */
export async function getAuthenticatedUser(
  supabase: any,
  jwt: string
): Promise<AuthUser | null> {
  try {
    // Verificar el JWT y obtener el usuario
    const { data: { user }, error } = await supabase.auth.getUser(jwt);
    
    if (error || !user) {
      console.error('Error al verificar JWT:', error);
      return null;
    }

    // Obtener permisos del usuario
    const permissions = await getUserPermissions(supabase, user.id);

    return {
      id: user.id,
      email: user.email,
      permissions
    };
  } catch (error) {
    console.error('Error en getAuthenticatedUser:', error);
    return null;
  }
}

/**
 * Cache de permisos en memoria (60 segundos)
 */
const permissionsCache = new Map<string, { permissions: string[]; expires: number }>();

/**
 * Obtiene los permisos de un usuario con cache
 */
export async function getUserPermissions(
  supabase: any,
  userId: string
): Promise<string[]> {
  const now = Date.now();
  const cached = permissionsCache.get(userId);
  
  // Verificar cache válido
  if (cached && cached.expires > now) {
    return cached.permissions;
  }

  try {
    // Llamar a la función SQL para obtener permisos
    const { data, error } = await supabase.rpc('fn_usuario_permisos', {
      uid: userId
    });

    if (error) {
      console.error('Error al obtener permisos:', error);
      return [];
    }

    const permissions = data || [];
    
    // Guardar en cache por 60 segundos
    permissionsCache.set(userId, {
      permissions,
      expires: now + 60000
    });

    return permissions;
  } catch (error) {
    console.error('Error en getUserPermissions:', error);
    return [];
  }
}

/**
 * Verifica si el usuario tiene un permiso específico
 */
export function hasPermission(
  permissions: string[],
  requiredPermission: string,
  ownerId?: string,
  userId?: string
): boolean {
  // Verificar permiso general
  if (permissions.includes(requiredPermission)) {
    return true;
  }

  // Verificar permiso "own" si se proporciona ownerId
  if (ownerId && userId && ownerId === userId) {
    const ownPermission = `${requiredPermission}:own`;
    if (permissions.includes(ownPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware de autorización para Edge Functions
 */
export async function requirePermission(
  supabase: any,
  request: Request,
  requiredPermission: string,
  resourceId?: number
): Promise<{ user: AuthUser; allowed: boolean; error?: string }> {
  // Extraer JWT
  const jwt = extractJWT(request);
  if (!jwt) {
    return {
      user: { id: '', permissions: [] },
      allowed: false,
      error: 'Token de autorización requerido'
    };
  }

  // Obtener usuario autenticado
  const user = await getAuthenticatedUser(supabase, jwt);
  if (!user) {
    return {
      user: { id: '', permissions: [] },
      allowed: false,
      error: 'Token inválido o expirado'
    };
  }

  // Verificar si necesitamos validar ownership
  let ownerId: string | undefined;
  if (resourceId && requiredPermission.includes(':own')) {
    // Aquí deberías implementar la lógica para obtener el owner del recurso
    // Por ahora, asumimos que se pasa como parámetro adicional
  }

  // Verificar permiso
  const allowed = hasPermission(
    user.permissions,
    requiredPermission,
    ownerId,
    user.id
  );

  return { user, allowed };
}

/**
 * Registra una acción en la auditoría
 */
export async function logAudit(
  supabase: any,
  auditData: AuditLog
): Promise<void> {
  try {
    await supabase.rpc('fn_registrar_auditoria', {
      p_permiso: auditData.permiso,
      p_recurso: auditData.recurso,
      p_recurso_id: auditData.recurso_id,
      p_ok: auditData.ok,
      p_meta: auditData.meta || {}
    });
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
}

/**
 * Obtiene información del cliente (IP, User-Agent)
 */
export function getClientInfo(request: Request) {
  return {
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  };
}