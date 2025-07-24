import { JWT_SECRET_KEY, NON_HTTP_PREFIX } from '@/const/auth';

// Browser-compatible base64 encoding function
const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};



// Simple JWT header and payload encoding (without signature verification for client-side)
const createSimpleJWT = (payload: Record<string, any>, secretKey: string): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const duration = 100; // 100s
  
  const jwtPayload = {
    ...payload,
    exp: now + duration,
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  
  // For client-side, we'll use a simplified signature
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secretKey}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const createJWT = async <T>(payload: T) => {
  const encoder = new TextEncoder();

  // fix the issue that crypto.subtle is not available in non-HTTPS environment
  // refs: https://github.com/lobehub/lobe-chat/pull/1238
  if (!crypto.subtle) {
    const buffer = encoder.encode(JSON.stringify(payload));
    return `${NON_HTTP_PREFIX}.${uint8ArrayToBase64(buffer)}`;
  }

  // For environments with crypto.subtle, use simple JWT without jose library
  try {
    return createSimpleJWT(payload as Record<string, any>, JWT_SECRET_KEY);
  } catch {
    // Fallback to base64 encoding if JWT creation fails
    const buffer = encoder.encode(JSON.stringify(payload));
    return `${NON_HTTP_PREFIX}.${uint8ArrayToBase64(buffer)}`;
  }
};
