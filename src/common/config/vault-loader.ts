import vault from "node-vault";
import dotenv from "dotenv";

dotenv.config();

/**
 * Load secrets from Vault and merge into process.env
 */
export async function loadVaultIntoEnv(): Promise<void> {
  if (process.env.ENABLE_VAULT === "false") {
    console.log("Vault is disabled, skipping Vault secrets loading");
    return;
  }

  const vaultAddr = process.env.VAULT_ADDR;
  const vaultToken = process.env.VAULT_TOKEN;
  const vaultSecretPath = process.env.VAULT_SECRET_PATH;
  const vaultApiVersion = process.env.VAULT_API_VERSION;

  if (!vaultToken || !vaultAddr || !vaultSecretPath || !vaultApiVersion) {
    console.warn(
      "Vault configuration is not complete, skipping Vault secrets loading",
    );
    return;
  }

  try {
    console.log(`Connecting to Vault at ${vaultAddr}...`);

    const client = vault({
      endpoint: vaultAddr,
      token: vaultToken,
      apiVersion: vaultApiVersion,
    });

    // Test connection
    await client.health();

    console.log(`Loading secrets from Vault path: ${vaultSecretPath}`);

    const response = await client.read(vaultSecretPath);

    let secrets: Record<string, any> = {};

    if (response?.data?.data) {
      secrets = response.data.data;
    } else if (response?.data) {
      secrets = response.data;
    }

    if (Object.keys(secrets).length === 0) {
      console.warn(`No secrets found in Vault path: ${vaultSecretPath}`);
      return;
    }

    let loadedCount = 0;
    for (const [key, value] of Object.entries(secrets)) {
      if (!process.env[key] || process.env[key] === "") {
        process.env[key] = String(value);
        loadedCount++;
      }
    }

    console.log(
      `✅ Loaded ${loadedCount} secrets from Vault (${Object.keys(secrets).length} total available)`,
    );
  } catch (error: any) {
    if (error.response?.statusCode === 404) {
      console.warn(`Secret not found in Vault: ${vaultSecretPath}`);
    } else {
      console.error("Failed to load secrets from Vault:", error.message);
    }
  }
}
