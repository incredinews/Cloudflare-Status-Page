// Respond to OPTIONS method
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
};

// Set CORS to all /api responses
export const onRequest: PagesFunction = async (context) => {
  const API_URL = "https://status.jh0project.com/api/kv/2025-08";
  // The endpoint you want the CORS reverse proxy to be on
  const PROXY_ENDPOINT = "/api/";
  const request = context.request;
if (
        request.method === "GET" || 
        request.method === "HEAD" ||
        request.method === "POST"
      ) {
        // Handle requests to the API server
  const host = req.headers.get('host');
  const referrer = req.headers.get('referer');
  const url = new URL(request.url);

      let apiHost=null
      apiHost = url.searchParams.get("apiHost");
      if (apihost == null) {
        let apiUrl = API_URL; 
      } else {
        let apiUrl="https://"+apihost+url.pathname
      }

      // Rewrite request to point to API URL. This also makes the request mutable
      // so you can add the correct Origin header to make the API server think
      // that this request is not cross-site.
      request = new Request(apiUrl, request);
      request.headers.set("Origin", new URL(apiUrl).origin);
      let response = await fetch(request);
      // Recreate the response so you can modify the headers

      response = new Response(response.body, response);
      // Set CORS headers

      response.headers.set("Access-Control-Allow-Origin", url.origin);
      response.headers.set("Access-Control-Allow-Headers", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");

      // Append to/Add Vary header so browser will cache response correctly
      response.headers.append("Vary", "Origin");
      return response;
  //return new Response(null, {
  //  status: 204,
  //  headers: {
  //    "Access-Control-Allow-Origin": "*",
  //    "Access-Control-Allow-Headers": "*",
  //    "Access-Control-Allow-Methods": "GET, OPTIONS",
  //    "Access-Control-Max-Age": "86400",
  //  },
  //});
       
      } else {
        return new Response(null, {
          status: 405,
          statusText: "Method Not Allowed",
        });
      }
  
};
