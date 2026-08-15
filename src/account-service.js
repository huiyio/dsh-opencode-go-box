import { createHash } from "node:crypto";
import { ModelTestService } from "./model-test-service.js";
import { UsageError, UsageService } from "./usage-service.js";

const ENVIRONMENT_ACCOUNT_ID = "environment";

function environmentAccount(apiKey) {
  return {
    id: ENVIRONMENT_ACCOUNT_ID,
    label: "Environment key",
    maskedKey: `••••••••${apiKey.slice(-4)}`,
    enabled: true,
    editable: false,
    source: "environment",
    createdAt: null,
    updatedAt: null,
  };
}

export class AccountService {
  constructor({
    config,
    keyStore,
    createUsageService = (options) => new UsageService(options),
    createModelTestService = (options) => new ModelTestService(options),
  }) {
    this.config = config;
    this.keyStore = keyStore;
    this.createUsageService = createUsageService;
    this.createModelTestService = createModelTestService;
    this.usageServices = new Map();
  }

  listAccounts({ includeDisabled = false } = {}) {
    const accounts = [];
    if (this.config.apiKey) accounts.push(environmentAccount(this.config.apiKey));
    accounts.push(...this.keyStore.list({ includeDisabled }));
    return accounts;
  }

  get configured() {
    return this.listAccounts().length > 0;
  }

  get adminEnabled() {
    return Boolean(this.config.webUsername && this.config.webPassword && this.keyStore.writable);
  }

  async getUsage(accountId, { force = false } = {}) {
    const account = this.#resolveAccount(accountId);
    const secret = account.source === "environment"
      ? { ...account, key: this.config.apiKey }
      : this.keyStore.getSecret(account.id);
    if (!secret.enabled) throw new UsageError("account_disabled", "Account is disabled", 409);

    const signature = createHash("sha256").update(secret.key).digest("hex");
    let entry = this.usageServices.get(secret.id);
    if (!entry || entry.signature !== signature) {
      entry = {
        signature,
        service: this.createUsageService({
          apiKey: secret.key,
          usageUrl: this.config.usageUrl,
          timeoutMs: this.config.timeoutMs,
          cacheTtlMs: this.config.cacheTtlMs,
        }),
      };
      this.usageServices.set(secret.id, entry);
    }
    const usage = await entry.service.getUsage({ force });
    return { account, ...usage };
  }

  async testModel(accountId, model) {
    const account = this.#resolveAccount(accountId);
    const secret = account.source === "environment"
      ? { ...account, key: this.config.apiKey }
      : this.keyStore.getSecret(account.id);
    if (!secret.enabled) throw new UsageError("account_disabled", "Account is disabled", 409);
    const service = this.createModelTestService({
      apiKey: secret.key,
      modelTestUrl: this.config.modelTestUrl,
      modelListUrl: this.config.modelListUrl,
      model: typeof model === "string" && model.trim() ? model.trim() : this.config.modelTestModel,
      timeoutMs: this.config.timeoutMs,
    });
    return { account, ...(await service.test()) };
  }

  async listTestModels() {
    const service = this.createModelTestService({
      apiKey: "model-list",
      modelTestUrl: this.config.modelTestUrl,
      modelListUrl: this.config.modelListUrl,
      model: this.config.modelTestModel,
      timeoutMs: this.config.timeoutMs,
    });
    return service.listModels();
  }

  async addAccount(input) {
    const account = await this.keyStore.add(input);
    return account;
  }

  async updateAccount(id, input) {
    const account = await this.keyStore.update(id, input);
    this.usageServices.delete(id);
    return account;
  }

  async removeAccount(id) {
    const account = await this.keyStore.remove(id);
    this.usageServices.delete(id);
    return account;
  }

  async exportBackup() {
    return this.keyStore.exportBackup();
  }

  async restoreBackup(backup) {
    const result = await this.keyStore.restoreBackup(backup);
    this.usageServices.clear();
    return result;
  }

  #resolveAccount(accountId) {
    const accounts = this.listAccounts({ includeDisabled: true });
    if (accounts.length === 0) {
      throw new UsageError("no_accounts", "No OpenCode Go accounts are configured", 503);
    }
    if (!accountId) return accounts.find((account) => account.enabled) || accounts[0];
    const account = accounts.find((candidate) => candidate.id === accountId);
    if (!account) throw new UsageError("account_not_found", "Account not found", 404);
    return account;
  }
}
