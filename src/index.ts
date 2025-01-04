import { createHash, createHmac } from 'node:crypto';
import { normalize as normalizePath } from 'node:path';
import { URL } from 'node:url';
import { parse as xmlParse, simplify as xmlSimplify } from 'txml/txml';

// https://docs.aws.amazon.com/AmazonS3/latest/API/RESTAuthentication.html
// https://github.com/paulhammond/s3simple/blob/main/s3simple

interface SignRequest {
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD';
  bucket: string;
  key: string;
  extraHeaders: Record<string, string>;
  file: S3File | null;
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

export interface S3ClientOpts {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string; // optional
  apiURL?: string; // defaults to 'https://s3.amazonaws.com'
  retries?: number; // max of 5, min of 0 to disable, defaults to 3
}

export class S3Client {
  private accessKeyId: string;
  private secretAccessKey: string;
  private sessionToken: string | undefined;
  private apiURL: string;
  private protocol: string;
  private retries = 3;
  private isLocal = false;
  private retryableStatusCodes = new Set([
    400, 403, 408, 429, 500, 502, 503, 504, 509,
  ]);

  constructor(opts: S3ClientOpts) {
    const cleanedAccessKeyId = opts.accessKeyId?.trim();
    const cleanedSecretAccessKey = opts.secretAccessKey?.trim();
    const cleanedSessionToken = opts?.sessionToken?.trim();

    const errors: string[] = [];
    if (cleanedAccessKeyId === '') {
      errors.push('accessKeyId cannot be empty');
    }

    if (cleanedSecretAccessKey === '') {
      errors.push('secretAccessKey cannot be empty');
    }

    if (opts?.apiURL?.trim()) {
      this.apiURL = new URL(opts?.apiURL?.trim())?.host;
      this.protocol = new URL(opts?.apiURL?.trim())?.protocol;
      if (!this.apiURL) {
        errors.push('invalid apiURL');
      }
      this.isLocal = this.apiURL.includes('localhost');
    } else {
      this.protocol = 'https:';
      this.apiURL = 's3.amazonaws.com';
    }

    if (errors.length) {
      throw new Error(errors.join(', '));
    }

    if (typeof opts?.retries === 'number') {
      if (opts.retries <= 0) {
        this.retries = 0;
      } else if (opts.retries > 5) {
        this.retries = 5;
      } else {
        this.retries = opts.retries;
      }
    } else {
      this.retries = 3;
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

  private date(): Date {
    return new Date();
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

    const date = `${this.date().toISOString().replaceAll('-', '').replaceAll(':', '').slice(0, 15)}Z`;
    const headersObj: Record<string, string> = {};

    if (this?.sessionToken) {
      headersObj['x-amz-security-token'] = this.sessionToken;
    }

    for (const [key, value] of Object.entries(req?.extraHeaders || {})) {
      headersObj[key.toLowerCase()] = value;
    }

    const headersToSign =
      Object.keys(headersObj)
        .sort()
        .map((key) => {
          return `${key}:${headersObj[key]}`;
        }) || [];

    const stringToSign = `${req.method}
${fileMD5}
${req?.file?.contentType || ''}
${date}
${headersToSign.join('\n')}
/${req.bucket}/${req.key}`;

    const hmac = createHmac('sha1', this.secretAccessKey);
    hmac.write(stringToSign);
    hmac.end();
    const signedHeaders: Record<string, string> = {
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

    let reqURL = '';
    if (this.isLocal) {
      reqURL = `${this.protocol}//${this.apiURL}/${req.key}`;
    } else {
      reqURL = `${this.protocol}//${req.bucket}.${this.apiURL}/${req.key}`;
    }

    return {
      signedHeaders,
      reqURL: reqURL,
      cleanedKey: req.key,
      cleanedBucket: req.bucket,
    };
  }

  public async get(
    bucket: string,
    key: string,
    headers?: Record<string, string>,
  ): Promise<S3Response | string> {
    return this.do(bucket, key, 'GET', 200, null, 0, headers || {});
  }

  public async put(
    bucket: string,
    key: string,
    file: S3File,
    headers?: Record<string, string>,
  ): Promise<S3Response | string> {
    return this.do(bucket, key, 'PUT', 200, file, 0, headers || {});
  }

  public async head(
    bucket: string,
    key: string,
    headers?: Record<string, string>,
  ): Promise<S3Response | string> {
    return this.do(bucket, key, 'HEAD', 200, null, 0, headers || {});
  }

  public async delete(
    bucket: string,
    key: string,
    headers?: Record<string, string>,
  ): Promise<S3Response | string> {
    return this.do(bucket, key, 'DELETE', 204, null, 0, headers || {});
  }

  private async do(
    bucket: string,
    key: string,
    method: 'GET' | 'PUT' | 'DELETE' | 'HEAD',
    desiredStatus: number,
    file: S3File | null,
    attempt: number,
    headers: Record<string, string>,
  ): Promise<S3Response | string> {
    let signedHeaders: Record<string, string>;
    let reqURL: string;
    let cleanedBucket: string;
    let cleanedKey: string;

    try {
      ({ signedHeaders, reqURL, cleanedBucket, cleanedKey } = this.sign({
        method: method,
        bucket,
        key,
        file,
        extraHeaders: headers,
      }));
    } catch (e) {
      return Promise.reject(e);
    }

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

    const resp = await fetch(reqURL, opts);

    if (
      !resp ||
      (this.retryableStatusCodes.has(resp.status) && attempt < this.retries - 1)
    ) {
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

    const r: S3Response = {
      Bucket: cleanedBucket,
      Key: cleanedKey,
      Status: resp.status,
      Resp: {},
    };

    const respText = await resp.text();

    if (resp?.status !== desiredStatus) {
      const xml = xmlParse(respText, {
        keepComments: false,
        keepWhitespace: false,
      });

      const filteredXml = xml.filter((node) => typeof node !== 'string');

      const respObj: Record<string, string> = xmlSimplify(filteredXml);
      r.Resp = respObj;

      // biome-ignore lint/performance/noDelete: need to remove before JSON.stringify
      delete respObj['?xml'];
      return Promise.reject(r);
    }

    if (method === 'GET') {
      return Promise.resolve(respText);
    }

    return Promise.resolve(r);
  }
}
