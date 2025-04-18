import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = Response>(
  methodOrUrl: string,
  urlOrData?: string | unknown,
  data?: unknown | undefined,
): Promise<T> {
  // Detecta se está usando a assinatura antiga (método, url, data) ou nova (url, data)
  let method: string;
  let url: string;
  let bodyData: unknown | undefined;
  
  if (urlOrData && typeof urlOrData === 'string') {
    // Formato antigo: apiRequest(método, url, data)
    method = methodOrUrl;
    url = urlOrData;
    bodyData = data;
  } else {
    // Novo formato: apiRequest(url, data)
    method = 'GET';
    url = methodOrUrl;
    bodyData = urlOrData;
  }
  
  const res = await fetch(url, {
    method,
    headers: bodyData ? { "Content-Type": "application/json" } : {},
    body: bodyData ? JSON.stringify(bodyData) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Se T não é Response, tenta fazer parse para JSON
  if (res.headers.get('content-type')?.includes('application/json')) {
    try {
      return res.json() as Promise<T>;
    } catch (error) {
      console.error('Error parsing JSON in apiRequest:', error);
      return {} as T;
    }
  }
  
  return res as unknown as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    try {
      return await res.json();
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      return [];
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
