import { createHash, createHmac } from 'node:crypto';
import { normalize as normalizePath } from 'node:path';
import { parse as xmlParse, simplify as xmlSimplify } from 'txml';

// https://docs.aws.amazon.com/AmazonS3/latest/API/RESTAuthentication.html

enum Method {
  Get = 'GET',
  Put = 'PUT',
  Delete = 'DELETE',
}

interface SignRequest {
  method: Method;
  bucket: string;
  key: string;
  // If PUT request
  file?: S3File;
}

interface SignResponse {
  signedHeaders: Record<string, string>;
  reqURL: string;
  cleanedBucket: string;
  cleanedKey: string;
}

export interface S3Response {
  Bucket: string;
  Key: string;
  Status: number;
  Resp: Record<string, string>;
}

export interface S3File {
  content: string;
  contentType?: string;
}

export class S3Client {
  private accessKeyId: string;
  private secretAccessKey: string;
  private sessionToken: string;
  private apiURL: string;
  private retryableStatusCodes = new Set([
    400, 403, 408, 429, 500, 502, 503, 504, 509,
  ]);

  constructor(
    accessKeyId: string,
    secretAccessKey: string,
    sessionToken: string,
    apiURL?: string,
  ) {
    const cleanedAccessKeyId = accessKeyId?.trim();
    const cleanedSecretAccessKey = secretAccessKey?.trim();
    const cleanedSessionToken = sessionToken?.trim();

    if (cleanedAccessKeyId === '') {
      throw new Error('accessKeyId cannot be empty');
    }

    if (cleanedSecretAccessKey === '') {
      throw new Error('secretAccessKey cannot be empty');
    }

    if (apiURL?.trim()) {
      this.apiURL = new URL(apiURL?.trim())?.hostname;
      if (!this.apiURL) {
        throw new Error('Invalid API URL');
      }
    } else {
      this.apiURL = 's3.amazonaws.com';
    }

    this.accessKeyId = cleanedAccessKeyId;
    this.secretAccessKey = cleanedSecretAccessKey;
    this.sessionToken = cleanedSessionToken;
  }

  private cleanPath(inputPath: string, key: string): string {
    const cleanedInputPath = normalizePath(inputPath.trim()).replace(
      /^\/|\/$/g,
      '',
    );
    if (cleanedInputPath === '') {
      throw new Error(`${key} cannot be empty`);
    }
    return cleanedInputPath;
  }

  private sign(req: SignRequest): SignResponse {
    req.bucket = this.cleanPath(req.bucket, 'bucket');
    req.key = this.cleanPath(req.key, 'key');
    req.key = encodeURIComponent(req.key);

    let fileMD5 = '';
    if (req?.file?.content) {
      const md5 = createHash('md5');
      md5.write(req.file.content);
      md5.end();
      fileMD5 = md5.read().toString('base64');
    }

    const date = `${new Date().toISOString().replaceAll('-', '').replaceAll(':', '').slice(0, 15)}Z`;
    const tokenHeader = this?.sessionToken
      ? `x-amz-security-token:${this.sessionToken}`
      : '';

    const stringToSign = `${req.method}
${fileMD5}
${req?.file?.contentType || ''}
${date}
${tokenHeader}
/${req.bucket}/${req.key}`;

    const hmac = createHmac('sha1', this.secretAccessKey);
    hmac.write(stringToSign);
    hmac.end();
    const signedHeaders = {
      Authorization: `AWS ${this.accessKeyId}:${hmac.read().toString('base64')}`,
      date,
    };

    if (this?.sessionToken) {
      signedHeaders['x-amz-security-token'] = this.sessionToken;
    }

    if (fileMD5) {
      signedHeaders['Content-MD5'] = fileMD5;
    }

    if (req?.file?.contentType) {
      signedHeaders['Content-Type'] = req.file.contentType;
    }

    return {
      signedHeaders,
      reqURL: `https://${req.bucket}.${this.apiURL}/${req.key}`,
      cleanedKey: req.key,
      cleanedBucket: req.bucket,
    };
  }

  public async get(
    bucket: string,
    key: string,
    headers?: Record<string, string>,
  ): Promise<S3Response> {
    return this.do(bucket, key, Method.Get, 200, null, 0, headers);
  }

  public async put(
    bucket: string,
    key: string,
    file: S3File,
    headers?: Record<string, string>,
  ): Promise<S3Response> {
    return this.do(bucket, key, Method.Put, 200, file, 0, headers);
  }

  public async delete(
    bucket: string,
    key: string,
    headers?: Record<string, string>,
  ): Promise<S3Response> {
    return this.do(bucket, key, Method.Delete, 204, null, 0, headers);
  }

  private async do(
    bucket: string,
    key: string,
    method: Method,
    desiredStatus: number,
    file: S3File,
    attempt: number,
    headers?: Record<string, string>,
  ): Promise<S3Response> {
    const { signedHeaders, reqURL, cleanedBucket, cleanedKey } = this.sign({
      method: method,
      bucket,
      key,
      file,
    });

    const opts: RequestInit = {
      method: method,
      headers: {
        ...signedHeaders,
        ...headers,
      },
    };

    if (file?.content) {
      opts.body = file?.content;
    }

    console.log(reqURL, opts);

    const resp = await fetch(reqURL, opts);

    if (!resp || (this.retryableStatusCodes.has(resp.status) && attempt < 3)) {
      const newAttempt = attempt + 1;
      return this.do(
        bucket,
        key,
        method,
        desiredStatus,
        file,
        newAttempt,
        headers,
      );
    }

    const respText = await resp.text();
    const respObj = xmlSimplify(xmlParse(respText));
    // biome-ignore lint/performance/noDelete: need to remove before JSON.stringify
    delete respObj['?xml'];
    const r: S3Response = {
      Bucket: cleanedBucket,
      Key: cleanedKey,
      Status: resp.status,
      Resp: respObj,
    };

    if (resp?.status !== desiredStatus) {
      throw new Error(JSON.stringify(r));
    }

    return Promise.resolve(r);
  }
}
