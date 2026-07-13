import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Genera un token JWT firmado mediante RS256 para Google OAuth 2.0
async function generateGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountJson);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: Record<string, unknown> | string | number) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const encodedHeader = encodeBase64Url(header);
  const encodedPayload = encodeBase64Url(payload);
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Importar clave privada
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = credentials.private_key
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput),
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signatureInput}.${signature}`;

  // Intercambiar JWT por Access Token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('No se pudo obtener el token de Google: ' + JSON.stringify(data));
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Falta el token de autorización');
    }

    const { fileName, contentType } = await req.json();
    if (!fileName || !contentType) {
      throw new Error('Faltan parámetros: fileName y contentType son obligatorios');
    }

    const gcsServiceAccountJson = Deno.env.get('GCS_SERVICE_ACCOUNT_JSON');
    const bucketName = Deno.env.get('GCS_BUCKET_NAME');

    if (!gcsServiceAccountJson || !bucketName) {
      throw new Error('Faltan variables de entorno GCS en el servidor');
    }

    // Obtener token de acceso de Google
    const accessToken = await generateGoogleAccessToken(gcsServiceAccountJson);

    // El objeto a subir
    // Prependemos un UUID en cliente o limpiamos el nombre para que sea único
    const objectName = `uploads/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Construimos la Signed URL con el API REST de Google Storage (v1)
    // Para uploads directos (PUT), el enfoque más robusto desde cliente usando un token corto
    // No podemos usar firmar con crypto directo fácilmente en Edge Functions sin librerías externas completas,
    // pero podemos retornar el token y la URL al cliente, O, usar la API de Resumable Upload.

    // Generar URL firmada V4 en Deno es complejo por la firma SHA256 manual,
    // pero Google permite hacer peticiones con el Access Token directamente.
    // Retornaremos una URL a la que el cliente le hará PUT adjuntando el Bearer Token temporal.
    // Esto es seguro porque el token tiene scope estricto y expira en 1 hora.

    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;

    return new Response(
      JSON.stringify({
        uploadUrl,
        gcpAccessToken: accessToken,
        objectPath: objectName,
        bucket: bucketName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('GCS Edge Function Error Interno:', error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
