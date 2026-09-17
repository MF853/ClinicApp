import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { connect } from 'node:net';
import { encrypt, decrypt } from './crypto.js';
const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION ?? 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! } });
const Bucket = process.env.S3_BUCKET ?? 'clinicapp-private';
export async function ensureBucket() { try { await client.send(new HeadBucketCommand({ Bucket })); } catch (error) { if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error; await client.send(new CreateBucketCommand({ Bucket })); } }
export async function storeObject(Key: string, data: Buffer) { await client.send(new PutObjectCommand({ Bucket, Key, Body: encrypt(data), ContentType: 'application/octet-stream' })); }
export async function readObject(Key: string) { const result = await client.send(new GetObjectCommand({ Bucket, Key })); return decrypt(Buffer.from(await result.Body!.transformToByteArray())); }
export async function deleteObject(Key: string) { await client.send(new DeleteObjectCommand({ Bucket, Key })); }
export function signDownload(id: string, userId: string, expires: number) { return createHmac('sha256', process.env.DOWNLOAD_KEY!).update(`${id}:${userId}:${expires}`).digest('hex'); }
export function verifyDownload(id: string, userId: string, expires: number, signature: string) { const expected = signDownload(id, userId, expires); return expires > Date.now() && expires <= Date.now() + 120000 && /^[a-f0-9]{64}$/.test(signature) && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); }
export async function scan(data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = connect(Number(process.env.CLAMAV_PORT ?? 3310), process.env.CLAMAV_HOST ?? '127.0.0.1'); let reply = '';
    socket.setTimeout(20000, () => socket.destroy(new Error('SCANNER_TIMEOUT')));
    socket.on('connect', () => { socket.write('zINSTREAM\0'); for (let i = 0; i < data.length; i += 65536) { const chunk = data.subarray(i, i + 65536), length = Buffer.alloc(4); length.writeUInt32BE(chunk.length); socket.write(length); socket.write(chunk); } socket.write(Buffer.alloc(4)); });
    socket.on('data', chunk => reply += chunk.toString()); socket.on('error', () => reject(new Error('SCANNER_UNAVAILABLE')));
    socket.on('end', () => reply.includes(' OK') ? resolve() : reject(new Error(reply.includes('FOUND') ? 'MALWARE_FOUND' : 'SCAN_INCONCLUSIVE')));
  });
}
