import { createHash, createHmac } from 'node:crypto';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public base URL with no trailing slash, e.g. https://pub-….r2.dev */
  publicBaseUrl: string;
};

export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
};

/**
 * Minimal S3-compatible PutObject against Cloudflare R2 (SigV4). No AWS SDK —
 * the pipeline stays dependency-light and CI already has the same credentials
 * for `aws s3 cp` of the snapshot.
 */
export async function putR2Object(
  config: R2Config,
  input: PutObjectInput,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${config.bucket}/${input.key}`;
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(input.body);
  const region = 'auto';
  const service = 's3';

  const headers: Record<string, string> = {
    host,
    'content-type': input.contentType,
    'content-length': String(input.body.byteLength),
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (input.cacheControl) headers['cache-control'] = input.cacheControl;

  const signedHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');
  const canonicalHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .map((k) => `${k}:${headers[k]!.trim()}\n`)
    .join('');

  const canonicalRequest = [
    'PUT',
    `/${config.bucket}/${input.key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetchImpl(endpoint, {
    method: 'PUT',
    headers,
    body: input.body,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`R2 PutObject ${response.status}: ${text.slice(0, 200)}`);
  }

  return `${config.publicBaseUrl.replace(/\/$/, '')}/${input.key}`;
}

export function readR2ConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): R2Config | null {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = env.R2_BUCKET?.trim();
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function formatAmzDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function getSignatureKey(
  secret: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = createHmac('sha256', `AWS4${secret}`).update(dateStamp, 'utf8').digest();
  const kRegion = createHmac('sha256', kDate).update(region, 'utf8').digest();
  const kService = createHmac('sha256', kRegion).update(service, 'utf8').digest();
  return createHmac('sha256', kService).update('aws4_request', 'utf8').digest();
}
