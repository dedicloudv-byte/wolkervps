// Nautika Worker Script - Full Version
// Proxy and routing script for Cloudflare Workers

const PROXY_IP = '8.8.8.8';
const PROXY_PORT = 443;
const SUBDOMAIN = 'worker';
const TLS_ENABLED = true;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Health check endpoint
  if (path === '/health') {
    return new Response('OK', { status: 200 });
  }
  
  // Info endpoint
  if (path === '/info') {
    const info = {
      worker: 'Nautika Proxy',
      version: '1.0.0',
      ip: PROXY_IP,
      port: PROXY_PORT,
      tls: TLS_ENABLED,
      timestamp: new Date().toISOString()
    };
    return new Response(JSON.stringify(info, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Proxy handling
  try {
    return await handleProxy(request);
  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
}

async function handleProxy(request) {
  const { protocol, hostname, pathname, search } = new URL(request.url);
  
  // Create target URL
  const targetUrl = new URL(request.url);
  targetUrl.hostname = PROXY_IP;
  targetUrl.port = PROXY_PORT;
  targetUrl.protocol = TLS_ENABLED ? 'https:' : 'http:';
  
  // Clone request headers
  const headers = new Headers(request.headers);
  headers.set('Host', hostname);
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
  headers.set('X-Forwarded-Proto', protocol);
  
  // Create proxy request
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'follow'
  });
  
  // Fetch from target
  const response = await fetch(proxyRequest);
  
  // Clone response headers
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  responseHeaders.set('X-Proxy-By', 'Nautika Worker');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

// Utility functions
function isValidIP(ip) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function isValidPort(port) {
  const portNum = parseInt(port);
  return portNum > 0 && portNum <= 65535;
}

// Advanced routing
class Router {
  constructor() {
    this.routes = new Map();
  }
  
  get(path, handler) {
    this.addRoute('GET', path, handler);
  }
  
  post(path, handler) {
    this.addRoute('POST', path, handler);
  }
  
  put(path, handler) {
    this.addRoute('PUT', path, handler);
  }
  
  delete(path, handler) {
    this.addRoute('DELETE', path, handler);
  }
  
  addRoute(method, path, handler) {
    const key = `${method}:${path}`;
    this.routes.set(key, handler);
  }
  
  async handle(method, path, request) {
    const key = `${method}:${path}`;
    const handler = this.routes.get(key);
    
    if (handler) {
      return await handler(request);
    }
    
    // Try pattern matching
    for (const [routeKey, routeHandler] of this.routes) {
      const [routeMethod, routePath] = routeKey.split(':');
      if (routeMethod === method && this.matchPath(routePath, path)) {
        return await routeHandler(request);
      }
    }
    
    return null;
  }
  
  matchPath(routePath, requestPath) {
    // Simple pattern matching
    const routeParts = routePath.split('/');
    const pathParts = requestPath.split('/');
    
    if (routeParts.length !== pathParts.length) return false;
    
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) continue; // Parameter
      if (routeParts[i] !== pathParts[i]) return false;
    }
    
    return true;
  }
}

// Create router instance
const router = new Router();

// Define routes
router.get('/health', async (request) => {
  return new Response('OK', { status: 200 });
});

router.get('/info', async (request) => {
  const info = {
    worker: 'Nautika Proxy',
    version: '1.0.0',
    ip: PROXY_IP,
    port: PROXY_PORT,
    tls: TLS_ENABLED,
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries())
  };
  
  return new Response(JSON.stringify(info, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.get('/proxy/:target', async (request) => {
  const url = new URL(request.url);
  const target = url.pathname.split('/')[2];
  
  if (!isValidIP(target)) {
    return new Response('Invalid target IP', { status: 400 });
  }
  
  // Proxy to target
  const proxyUrl = new URL(request.url);
  proxyUrl.hostname = target;
  proxyUrl.port = PROXY_PORT;
  proxyUrl.protocol = TLS_ENABLED ? 'https:' : 'http:';
  proxyUrl.pathname = url.pathname.replace(`/proxy/${target}`, '');
  
  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
  
  return await fetch(proxyRequest);
});

// Main handler with routing
async function handleRequest(event) {
  const { request } = event;
  const { method, url } = request;
  const { pathname } = new URL(url);
  
  // Try to handle with router
  const response = await router.handle(method, pathname, request);
  if (response) {
    return response;
  }
  
  // Default proxy behavior
  return await handleProxy(request);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleRequest,
    Router,
    isValidIP,
    isValidPort
  };
}