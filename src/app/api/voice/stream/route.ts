import { NextRequest, NextResponse } from 'next/server';
import { LocalStorageProvider } from '@/lib/storage/local-storage';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const expiresStr = searchParams.get('expires');
    const sig = searchParams.get('sig');

    if (!key || !expiresStr || !sig) {
      return new NextResponse('Access denied: missing signature parameters', { status: 403 });
    }

    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires)) {
      return new NextResponse('Access denied: invalid expiration timestamp', { status: 403 });
    }

    // Verify HMAC token
    const isValid = LocalStorageProvider.verifySignedToken(key, expires, sig);
    if (!isValid) {
      return new NextResponse('Access denied: invalid or expired signature', { status: 403 });
    }

    const provider = new LocalStorageProvider();
    const fileData = await provider.readStream(key);

    if (!fileData) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Determine MIME type from extension
    const ext = path.extname(key).toLowerCase().replace('.', '');
    let contentType = 'audio/webm';
    if (ext === 'mp3') contentType = 'audio/mpeg';
    else if (ext === 'wav') contentType = 'audio/wav';
    else if (ext === 'ogg') contentType = 'audio/ogg';
    else if (ext === 'mp4' || ext === 'm4a') contentType = 'audio/mp4';
    else if (ext === 'aac') contentType = 'audio/aac';

    const fileSize = fileData.size;
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const chunk = new Uint8Array(fileData.buffer.subarray(start, end + 1));

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length.toString(),
          'Content-Type': contentType,
        },
      });
    }

    return new NextResponse(new Uint8Array(fileData.buffer), {
      status: 200,
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error serving audio stream:', error);
    return new NextResponse('Internal error processing stream', { status: 500 });
  }
}
