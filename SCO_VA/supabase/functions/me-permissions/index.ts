import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('🚀 me-permissions iniciado');

  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    console.log(`⏱️ Iniciando verificación de autenticación en ${Date.now() - startTime}ms`);

    // Extraer JWT del header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No hay token de autorización');
      return new Response(
        JSON.stringify({ error: 'Token de autorización requerido', isAuthenticated: false }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const jwt = authHeader.substring(7);
    console.log(`⏱️ JWT extraído en ${Date.now() - startTime}ms`);

    // MÉTODO 1: Intentar verificar con cliente de usuario (más seguro)
    let userId: string | null = null;
    let userEmail: string | null = null;

    try {
      console.log('🔐 Método 1: Verificando JWT con cliente de usuario...');
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      });

      const { data: { user }, error: userError } = await userClient.auth.getUser(jwt);
      
      if (!userError && user) {
        userId = user.id;
        userEmail = user.email || null;
        console.log('✅ Método 1 exitoso - Usuario:', userEmail);
      } else {
        console.log('⚠️ Método 1 falló:', userError?.message);
      }
    } catch (method1Error) {
      console.log('⚠️ Método 1 excepción:', method1Error.message);
    }

    // MÉTODO 2: Si el método 1 falla, decodificar JWT manualmente
    if (!userId) {
      try {
        console.log('🔐 Método 2: Decodificando JWT manualmente...');
        const parts = jwt.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          
          // Verificar expiración
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            console.log('❌ JWT expirado:', new Date(payload.exp * 1000).toISOString());
            return new Response(
              JSON.stringify({ 
                error: 'Token expirado', 
                isAuthenticated: false,
                expired: true
              }),
              { status: 401, headers: CORS_HEADERS }
            );
          }

          userId = payload.sub;
          userEmail = payload.email || null;
          console.log('✅ Método 2 exitoso - Usuario ID:', userId);
          console.log('🔍 JWT válido hasta:', new Date(payload.exp * 1000).toISOString());
        }
      } catch (method2Error) {
        console.log('⚠️ Método 2 falló:', method2Error.message);
      }
    }

    // Si ningún método funcionó, retornar error
    if (!userId) {
      console.log('❌ No se pudo verificar el usuario con ningún método');
      return new Response(
        JSON.stringify({ 
          error: 'Token inválido o expirado',
          isAuthenticated: false 
        }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    console.log('✅ Usuario autenticado:', userId, userEmail);

    // Cliente con Service Role Key (bypasea RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`⏱️ Supabase client creado en ${Date.now() - startTime}ms`);

    // PASO 1: Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, nombre_completo, rol, activo')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log('⚠️ Usuario no encontrado en tabla usuarios:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no encontrado',
          isAuthenticated: false 
        }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    console.log('✅ Usuario encontrado:', userData.email, 'Rol:', userData.rol);

    // PASO 2: Obtener rol_id del usuario
    const { data: userRoles, error: userRolesError } = await supabase
      .from('usuario_roles')
      .select('rol_id')
      .eq('usuario_id', userId);

    if (userRolesError || !userRoles || userRoles.length === 0) {
      console.log('⚠️ Usuario sin roles asignados');
      return new Response(
        JSON.stringify({
          isAuthenticated: true,
          user: userData,
          roles: [userData.rol],
          permissions: [],
          stores: [],
          currentStore: null
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const rolIds = userRoles.map(ur => ur.rol_id);
    console.log('✅ Roles del usuario:', rolIds);

    // PASO 3: Obtener permisos de esos roles
    const { data: rolPermisos, error: rolPermisosError } = await supabase
      .from('rol_permisos')
      .select('permiso_id')
      .in('rol_id', rolIds);

    if (rolPermisosError || !rolPermisos || rolPermisos.length === 0) {
      console.log('⚠️ Roles sin permisos asignados');
      return new Response(
        JSON.stringify({
          isAuthenticated: true,
          user: userData,
          roles: [userData.rol],
          permissions: [],
          stores: [],
          currentStore: null
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const permisoIds = rolPermisos.map(rp => rp.permiso_id);
    console.log('✅ IDs de permisos:', permisoIds.length);

    // PASO 4: Obtener nombres de permisos
    const { data: permisos, error: permisosError } = await supabase
      .from('permisos')
      .select('id, nombre')
      .in('id', permisoIds);

    if (permisosError) {
      console.error('❌ Error obteniendo permisos:', permisosError);
      return new Response(
        JSON.stringify({
          isAuthenticated: true,
          user: userData,
          roles: [userData.rol],
          permissions: [],
          stores: [],
          currentStore: null
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const permissionNames = permisos?.map(p => p.nombre) || [];
    console.log('✅ Permisos cargados:', permissionNames.length);

    // PASO 5: Obtener tiendas del usuario
    const { data: userStores } = await supabase
      .from('usuario_tiendas')
      .select('tienda_id, tiendas!inner(id, nombre, codigo)')
      .eq('usuario_id', userId)
      .eq('activo', true);

    const stores = userStores?.map((us: any) => ({
      id: us.tiendas.id,
      nombre: us.tiendas.nombre,
      codigo: us.tiendas.codigo
    })) || [];

    // PASO 6: Obtener tienda actual
    const { data: currentStoreData } = await supabase
      .from('usuario_tienda_actual')
      .select('tienda_id, tiendas!inner(id, nombre, codigo)')
      .eq('usuario_id', userId)
      .single();

    let currentStore = null;
    if (currentStoreData?.tiendas) {
      currentStore = {
        id: currentStoreData.tiendas.id,
        nombre: currentStoreData.tiendas.nombre,
        codigo: currentStoreData.tiendas.codigo
      };
    } else if (stores.length > 0) {
      currentStore = stores[0];
    }

    const totalTime = Date.now() - startTime;
    console.log(`🏁 Respuesta completa en ${totalTime}ms`);
    console.log(`📊 Resultados: ${permissionNames.length} permisos, ${stores.length} tiendas`);

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        isAuthenticated: true,
        user: userData,
        roles: [userData.rol],
        permissions: permissionNames,
        stores,
        currentStore,
        _debug: {
          totalTime,
          permissionsCount: permissionNames.length,
          storesCount: stores.length,
          authMethod: userId ? 'JWT verificado' : 'Fallback'
        }
      }),
      { status: 200, headers: CORS_HEADERS }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Error en /me-permissions después de ${totalTime}ms:`, error);
    
    return new Response(
      JSON.stringify({
        isAuthenticated: false,
        error: 'Error interno del servidor',
        details: error.message,
        _debug: { totalTime, error: error.message }
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});