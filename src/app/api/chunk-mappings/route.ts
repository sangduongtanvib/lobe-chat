import { getChunkMappings } from '@/utils/waf-server-utils';

export async function GET() {
  try {
    const mappings = getChunkMappings();

    return Response.json(mappings, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error getting chunk mappings:', error);

    return Response.json({ error: 'Failed to get chunk mappings' }, { status: 500 });
  }
}
