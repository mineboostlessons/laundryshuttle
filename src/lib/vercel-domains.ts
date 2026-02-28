/**
 * Vercel Domains API wrapper.
 *
 * Adds / removes custom domains from the Vercel project so that
 * Vercel provisions SSL certificates and routes traffic.
 *
 * Integration is **optional** — if VERCEL_API_TOKEN or VERCEL_PROJECT_ID
 * are not set the helpers return `{ success: false }` and log a warning.
 */

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

interface VercelResult {
  success: boolean;
  error?: string;
}

interface VercelDomainConfig {
  success: boolean;
  configuredBy?: string | null;
  misconfigured?: boolean;
  error?: string;
}

function hasVercelCredentials(): boolean {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn(
      "[vercel-domains] VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set — skipping Vercel domain management"
    );
    return false;
  }
  return true;
}

function vercelHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/**
 * Add a custom domain to the Vercel project.
 * POST /v10/projects/{projectId}/domains
 */
export async function addDomainToVercel(domain: string): Promise<VercelResult> {
  if (!hasVercelCredentials()) {
    return { success: false, error: "Vercel credentials not configured" };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
      {
        method: "POST",
        headers: vercelHeaders(),
        body: JSON.stringify({ name: domain }),
      }
    );

    if (response.ok) {
      console.log(`[vercel-domains] Added domain ${domain} to Vercel project`);
      return { success: true };
    }

    const data = (await response.json()) as { error?: { code?: string; message?: string } };

    // Domain already exists on this project — treat as success
    if (data.error?.code === "domain_already_in_use" || response.status === 409) {
      console.log(`[vercel-domains] Domain ${domain} already exists on Vercel project`);
      return { success: true };
    }

    const errorMsg = data.error?.message || `Vercel API returned ${response.status}`;
    console.error(`[vercel-domains] Failed to add domain ${domain}: ${errorMsg}`);
    return { success: false, error: errorMsg };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[vercel-domains] Error adding domain ${domain}: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Remove a custom domain from the Vercel project.
 * DELETE /v9/projects/{projectId}/domains/{domain}
 */
export async function removeDomainFromVercel(domain: string): Promise<VercelResult> {
  if (!hasVercelCredentials()) {
    return { success: false, error: "Vercel credentials not configured" };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}`,
      {
        method: "DELETE",
        headers: vercelHeaders(),
      }
    );

    if (response.ok) {
      console.log(`[vercel-domains] Removed domain ${domain} from Vercel project`);
      return { success: true };
    }

    // Domain not found — already removed, treat as success
    if (response.status === 404) {
      console.log(`[vercel-domains] Domain ${domain} not found on Vercel (already removed)`);
      return { success: true };
    }

    const data = (await response.json()) as { error?: { message?: string } };
    const errorMsg = data.error?.message || `Vercel API returned ${response.status}`;
    console.error(`[vercel-domains] Failed to remove domain ${domain}: ${errorMsg}`);
    return { success: false, error: errorMsg };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[vercel-domains] Error removing domain ${domain}: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Check the configuration status of a domain on Vercel.
 * GET /v6/domains/{domain}/config
 */
export async function getVercelDomainConfig(domain: string): Promise<VercelDomainConfig> {
  if (!hasVercelCredentials()) {
    return { success: false, error: "Vercel credentials not configured" };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v6/domains/${encodeURIComponent(domain)}/config`,
      {
        method: "GET",
        headers: vercelHeaders(),
      }
    );

    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      return {
        success: false,
        error: data.error?.message || `Vercel API returned ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      configuredBy?: string | null;
      misconfigured?: boolean;
    };

    return {
      success: true,
      configuredBy: data.configuredBy,
      misconfigured: data.misconfigured ?? false,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[vercel-domains] Error checking domain config ${domain}: ${msg}`);
    return { success: false, error: msg };
  }
}
