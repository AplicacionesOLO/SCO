// Configuración centralizada para APIs externas
export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Cliente API genérico
export class ApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  private async request<T>(
    endpoint: string,
    options: Parameters<typeof fetch>[1] = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.config.headers,
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          ...(options?.headers as Record<string, string> | undefined),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(endpoint + url.search, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

export const createApiClient = (config: ApiConfig) => new ApiClient(config);

export const apiConfigs = {
  inventarioExterno: {
    baseUrl: 'https://api.ejemplo.com/v1',
    timeout: 15000,
  },
  precios: {
    baseUrl: 'https://api.precios.com/v2',
    timeout: 10000,
  },
  proveedores: {
    baseUrl: 'https://api.proveedores.com/v1',
    timeout: 12000,
  },
};

export const handleApiError = (error: any): string => {
  if (error?.message) {
    if (error.message.includes('Failed to fetch')) {
      return 'Error de conexión. Verifica tu conexión a internet.';
    }
    if (error.message.includes('timeout')) {
      return 'La solicitud tardó demasiado. Intenta nuevamente.';
    }
    if (error.message.includes('401')) {
      return 'No autorizado. Verifica tu API key.';
    }
    if (error.message.includes('404')) {
      return 'Recurso no encontrado.';
    }
    if (error.message.includes('500')) {
      return 'Error del servidor. Intenta más tarde.';
    }
  }
  
  return error?.message || 'Error desconocido en la API';
};

export const useApi = (config: ApiConfig) => {
  const client = new ApiClient(config);
  
  return {
    client,
    get: client.get.bind(client),
    post: client.post.bind(client),
    put: client.put.bind(client),
    delete: client.delete.bind(client),
  };
};
