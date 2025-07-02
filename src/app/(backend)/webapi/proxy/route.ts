import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import https from 'node:https';
import { RequestFilteringAgentOptions, useAgent as ssrfAgent } from 'request-filtering-agent';

import { appEnv } from '@/config/app';

/**
 * just for a proxy
 */
export const POST = async (req: Request) => {
  const url = await req.text();

  try {
    // https://www.npmjs.com/package/request-filtering-agent
    const options: RequestFilteringAgentOptions = {
      allowIPAddressList: appEnv.SSRF_ALLOW_IP_ADDRESS_LIST?.split(',') || [],
      allowMetaIPAddress: appEnv.SSRF_ALLOW_PRIVATE_IP_ADDRESS,
      allowPrivateIPAddress: appEnv.SSRF_ALLOW_PRIVATE_IP_ADDRESS,
      denyIPAddressList: [],
    };

    // Create HTTPS agent with comprehensive SSL handling
    const httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
      // Add additional SSL options for better compatibility
      secureProtocol: 'TLSv1_2_method',
    });

    const agent = ssrfAgent(url, options);

    // Override HTTPS agent to handle self-signed certificates
    const fetchOptions: any = {
      agent,
      timeout: 30_000, // 30 second timeout
    };

    if (url.startsWith('https://')) {
      fetchOptions.agent = httpsAgent;
    }

    const res = await fetch(url, fetchOptions);

    return new Response(await res.arrayBuffer(), {
      headers: {
        ...res.headers,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);

    // More specific error handling for SSL issues
    const err = error as any;
    if (
      err.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
      err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    ) {
      console.error(
        'SSL Certificate error detected. Please check NODE_TLS_REJECT_UNAUTHORIZED environment variable.',
      );
      return NextResponse.json(
        {
          details: err.message,
          error: 'SSL Certificate verification failed. Please check your SSL configuration.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Not support internal host proxy' }, { status: 400 });
  }
};
