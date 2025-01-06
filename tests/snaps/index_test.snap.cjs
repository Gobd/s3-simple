exports[`s3-lite DELETE > should sign a request 1`] = `
{
  "signedHeaders": {
    "Authorization": "AWS asdID:oBTx/gWFghH4Y/Wq4+rxc58tTbk=",
    "date": "20210101T000000Z"
  },
  "reqURL": "https://asdBucket.s3.amazonaws.com/asdKey",
  "cleanedKey": "asdKey",
  "cleanedBucket": "asdBucket"
}
`;

exports[`s3-lite DELETE > should sign a request with extra headers 1`] = `
{
  "signedHeaders": {
    "Authorization": "AWS asdID:hCITid406IipyThf1RtUGzi7Zjc=",
    "date": "20210101T000000Z"
  },
  "reqURL": "https://asdBucket.s3.amazonaws.com/asdKey",
  "cleanedKey": "asdKey",
  "cleanedBucket": "asdBucket"
}
`;

exports[`s3-lite GET > should sign a request 1`] = `
{
  "signedHeaders": {
    "Authorization": "AWS asdID:gyyV7uuNc0QwltEgiLriKRlR2+k=",
    "date": "20210101T000000Z"
  },
  "reqURL": "https://asdBucket.s3.amazonaws.com/asdKey",
  "cleanedKey": "asdKey",
  "cleanedBucket": "asdBucket"
}
`;

exports[`s3-lite GET > should sign a request with extra headers 1`] = `
{
  "signedHeaders": {
    "Authorization": "AWS asdID:Z/1jA8NqmXG7R99fuguhS76rhNA=",
    "date": "20210101T000000Z"
  },
  "reqURL": "https://asdBucket.s3.amazonaws.com/asdKey",
  "cleanedKey": "asdKey",
  "cleanedBucket": "asdBucket"
}
`;

exports[`s3-lite GET > should sign with session token 1`] = `
{
  "signedHeaders": {
    "Authorization": "AWS asdID:bqUJxTOEVDA6O7w0dBbR1sDzUYw=",
    "date": "20210101T000000Z",
    "x-amz-security-token": "asdToken"
  },
  "reqURL": "https://asdBucket.s3.amazonaws.com/asdKey",
  "cleanedKey": "asdKey",
  "cleanedBucket": "asdBucket"
}
`;

exports[`s3-lite PUT > should sign a request 1`] = `
{
  "signedHeaders": {
    "Authorization": "AWS asdID:0vyT1wKpEwV2f8hXiaFMnDC4aSg=",
    "date": "20210101T000000Z",
    "Content-MD5": "lqnTkjmDigTWGjuDuV3Kng=="
  },
  "reqURL": "https://asdBucket.s3.amazonaws.com/asdKey",
  "cleanedKey": "asdKey",
  "cleanedBucket": "asdBucket"
}
`;

exports[`s3-lite PUT > should sign a request with extra headers 1`] = `
{
  "signedHeaders": {
    "Authorization": "AWS asdID:xPXxFguantuHbYs/RIZaoEzbBuc=",
    "date": "20210101T000000Z",
    "Content-MD5": "lqnTkjmDigTWGjuDuV3Kng==",
    "Content-Type": "text/plain"
  },
  "reqURL": "https://asdBucket.s3.amazonaws.com/asdKey",
  "cleanedKey": "asdKey",
  "cleanedBucket": "asdBucket"
}
`;
