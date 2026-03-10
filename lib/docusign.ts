/**
 * DocuSign eSignature: JWT auth and envelope helpers.
 * Set DOCUSIGN_* env vars to enable. Used for sending receipts (and other docs) for signature.
 */

import { createSign } from "crypto";

function getDocuSignBaseUrls(): { oauth: string; rest: string; aud: string } {
  const prod = process.env.DOCUSIGN_PRODUCTION === "true" || process.env.DOCUSIGN_PRODUCTION === "1";
  if (prod) {
    return {
      oauth: "https://account.docusign.com",
      rest: "https://www.docusign.net/restapi",
      aud: "account.docusign.com",
    };
  }
  return {
    oauth: "https://account-d.docusign.com",
    rest: "https://demo.docusign.net/restapi",
    aud: "account-d.docusign.com",
  };
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Normalize PEM so it works when env strips newlines (e.g. pasted in Vercel). */
function getPrivateKey(): string | null {
  const raw = process.env.DOCUSIGN_PRIVATE_KEY;
  if (!raw) return null;
  let pem = raw.replace(/\\n/g, "\n");
  if (pem.includes("-----BEGIN") && pem.includes("-----END") && !pem.includes("\n")) {
    const beginEnd = pem.indexOf("-----", 26);
    const endBegin = pem.indexOf("-----END");
    const header = pem.slice(0, beginEnd + 5);
    const footer = pem.slice(endBegin);
    const body = pem.slice(beginEnd + 5, endBegin).replace(/\s/g, "");
    const lines = body.match(/.{1,64}/g) ?? [body];
    pem = header + "\n" + lines.join("\n") + "\n" + footer;
  }
  return pem;
}

/** Build a JWT for DocuSign OAuth (RS256). */
export function createDocuSignJwt(
  integrationKey: string,
  userId: string,
  privateKeyPem: string,
  expirySeconds = 3600,
  aud = "account-d.docusign.com"
): string {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud,
    scope: "signature impersonation",
    iat: now,
    exp: now + expirySeconds,
  };
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const message = `${headerB64}.${payloadB64}`;
  const sign = createSign("RSA-SHA256");
  sign.update(message);
  const sig = sign.sign(privateKeyPem, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${message}.${sig}`;
}

export type TokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: string };

/** Exchange JWT for access token. Returns detailed error if DocuSign rejects the request. */
export async function getDocuSignAccessToken(): Promise<TokenResult> {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const privateKeyPem = getPrivateKey();

  if (!integrationKey)
    return { ok: false, error: "DOCUSIGN_INTEGRATION_KEY is not set." };
  if (!userId)
    return { ok: false, error: "DOCUSIGN_USER_ID is not set. In DocuSign Admin go to Users, open the user, copy the User ID (GUID)." };
  if (!privateKeyPem)
    return { ok: false, error: "DOCUSIGN_PRIVATE_KEY is not set. Use the RSA private key PEM (from Generate RSA), with \\n for newlines in env." };

  const { oauth, aud } = getDocuSignBaseUrls();
  const jwt = createDocuSignJwt(integrationKey, userId, privateKeyPem, 3600, aud);
  const res = await fetch(`${oauth}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (res.ok && data.access_token)
    return { ok: true, accessToken: data.access_token };
  const msg = [data.error, data.error_description].filter(Boolean).join(" — ") || `HTTP ${res.status}`;
  return {
    ok: false,
    error: `DocuSign token failed: ${msg}. Ensure DOCUSIGN_USER_ID is the User GUID (Admin → Users); grant JWT consent once (see .env.example); use the private key that matches the app’s RSA public key.`,
  };
}

/** Optional second recipient (e.g. for testing); gets the envelope at the same time as the main signer. */
export type CarbonCopyRecipient = { email: string; name: string };

/** Create an envelope with one HTML document and one or two signers; return envelope ID and optional recipient view URL for the first signer. */
export async function sendEnvelopeForSignature(
  accessToken: string,
  accountId: string,
  documentHtml: string,
  documentName: string,
  signerEmail: string,
  signerName: string,
  ccRecipient?: CarbonCopyRecipient
): Promise<{ envelopeId: string; signingUrl?: string } | null> {
  const docBase64 = Buffer.from(documentHtml, "utf-8").toString("base64");
  const signers: Array<{
    email: string;
    name: string;
    recipientId: string;
    routingOrder: string;
    tabs: { signHereTabs: Array<Record<string, string>> };
  }> = [
    {
      email: signerEmail,
      name: signerName,
      recipientId: "1",
      routingOrder: "1",
      tabs: {
        signHereTabs: [
          {
            documentId: "1",
            pageNumber: "1",
            recipientId: "1",
            tabLabel: "Signature",
            xPosition: "100",
            yPosition: "400",
          },
        ],
      },
    },
  ];
  if (ccRecipient?.email) {
    signers.push({
      email: ccRecipient.email,
      name: ccRecipient.name,
      recipientId: "2",
      routingOrder: "1",
      tabs: {
        signHereTabs: [
          {
            documentId: "1",
            pageNumber: "1",
            recipientId: "2",
            tabLabel: "Signature2",
            xPosition: "100",
            yPosition: "450",
          },
        ],
      },
    });
  }
  const envelope = {
    emailSubject: `Please sign: ${documentName}`,
    documents: [
      {
        documentBase64: docBase64,
        name: documentName,
        fileExtension: "html",
        documentId: "1",
      },
    ],
    recipients: { signers },
    status: "sent",
  };

  const { rest } = getDocuSignBaseUrls();
  const createRes = await fetch(
    `${rest}/v2.1/accounts/${accountId}/envelopes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelope),
    }
  );
  if (!createRes.ok) return null;
  const createData = (await createRes.json()) as { envelopeId?: string };
  const envelopeId = createData.envelopeId;
  if (!envelopeId) return null;

  const viewRes = await fetch(
    `${rest}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/receipt/signed`,
        authenticationMethod: "none",
        email: signerEmail,
        userName: signerName,
        clientUserId: "1",
      }),
    }
  );
  let signingUrl: string | undefined;
  if (viewRes.ok) {
    const viewData = (await viewRes.json()) as { url?: string };
    signingUrl = viewData.url;
  }

  return { envelopeId, signingUrl };
}
