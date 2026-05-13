type D1Param = string | number | boolean | null;

type CloudflareError = {
  code?: number;
  message?: string;
};

type CloudflareD1QueryResult<T> = {
  results?: T[];
  success?: boolean;
  meta?: {
    changes?: number;
    rows_read?: number;
    rows_written?: number;
  };
};

type CloudflareD1Response<T> = {
  success: boolean;
  errors?: CloudflareError[];
  result?: CloudflareD1QueryResult<T>[];
};

type D1Config = {
  accountId: string;
  databaseId: string;
  apiToken: string;
};

function getD1Config(): D1Config {
  const accountId = process.env.CLOUDFLARE_D1_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

  if (!accountId) throw new Error("CLOUDFLARE_D1_ACCOUNT_ID is not configured");
  if (!databaseId) throw new Error("CLOUDFLARE_D1_DATABASE_ID is not configured");
  if (!apiToken) throw new Error("CLOUDFLARE_D1_API_TOKEN is not configured");

  return { accountId, databaseId, apiToken };
}

function getCloudflareErrorMessage(errors: CloudflareError[] | undefined): string {
  const first = errors?.find((error) => error.message);
  return first?.message ?? "Cloudflare D1 query failed";
}

export async function queryD1<T>(
  sql: string,
  params: D1Param[] = [],
): Promise<CloudflareD1QueryResult<T>> {
  const config = getD1Config();
  const endpoint = new URL(
    `/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`,
    "https://api.cloudflare.com",
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiToken}`,
    },
    body: JSON.stringify({ sql, params }),
  });

  const data = (await response.json().catch(() => null)) as
    | CloudflareD1Response<T>
    | null;

  if (!response.ok || !data?.success) {
    throw new Error(getCloudflareErrorMessage(data?.errors));
  }

  const result = data.result?.[0];
  if (!result?.success) {
    throw new Error("Cloudflare D1 query did not complete successfully");
  }

  return result;
}

export async function firstD1<T>(
  sql: string,
  params: D1Param[] = [],
): Promise<T | null> {
  const result = await queryD1<T>(sql, params);
  return result.results?.[0] ?? null;
}
