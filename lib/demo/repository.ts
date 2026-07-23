import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessCodeStatus,
  DemoPackageId,
  DemoRequestStatus,
  EncryptedCredential,
} from "@/lib/demo/types";

export interface DemoRequestRecord {
  id: string;
  accessCodeId: string;
  name: string;
  packageId: DemoPackageId;
  providerIdempotencyKey: string;
  status: DemoRequestStatus;
  attemptCount: number;
  username: string | null;
  password: EncryptedCredential | null;
  providerExpiresAt: string | null;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface AccessCodeRecord {
  id: string;
  codeHash: string;
  displaySuffix: string;
  status: AccessCodeStatus;
  sessionHash: string | null;
  generationAttemptCount: number;
  activationIp: string | null;
  activatedAt: string | null;
  sessionDeadline: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessCodeWithRequest extends AccessCodeRecord {
  request: DemoRequestRecord | null;
}

export interface ActivationAttempt {
  codeFingerprint: string;
  ip: string;
  success: boolean;
  errorCode: string | null;
  createdAt: string;
}

export interface AdminCodeFilters {
  status?: AccessCodeStatus;
  search?: string;
  limit?: number;
}

export interface DemoRepository {
  createCode(input: {
    codeHash: string;
    displaySuffix: string;
  }): Promise<AccessCodeRecord>;
  activateCode(input: {
    codeHash: string;
    sessionHash: string;
    ip: string;
  }): Promise<AccessCodeRecord | null>;
  countFailedActivations(ip: string, since: string): Promise<number>;
  recordActivationAttempt(input: ActivationAttempt): Promise<void>;
  findBySessionHash(
    sessionHash: string,
  ): Promise<AccessCodeWithRequest | null>;
  claimGenerationAttempt(sessionHash: string): Promise<number | null>;
  listCodes(filters: AdminCodeFilters): Promise<AccessCodeWithRequest[]>;
  revokeCode(id: string): Promise<boolean>;
  expireSessions(): Promise<number>;
  redactAudit(): Promise<number>;
}

type DatabaseRow = Record<string, any>;

function requireServerEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function serverSupabaseClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    requireServerEnvironment("SUPABASE_URL");
  const serviceRoleKey = requireServerEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRequest(row: DatabaseRow | null | undefined): DemoRequestRecord | null {
  if (!row) return null;
  const hasPassword =
    row.password_ciphertext && row.password_iv && row.password_tag;
  return {
    id: row.id,
    accessCodeId: row.access_code_id,
    name: row.name,
    packageId: row.package_id,
    providerIdempotencyKey: row.provider_idempotency_key,
    status: row.status,
    attemptCount: row.attempt_count,
    username: row.username,
    password: hasPassword
      ? {
          ciphertext: row.password_ciphertext,
          iv: row.password_iv,
          tag: row.password_tag,
        }
      : null,
    providerExpiresAt: row.provider_expires_at,
    errorCode: row.error_code,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function mapAccessCode(row: DatabaseRow): AccessCodeRecord {
  return {
    id: row.id,
    codeHash: row.code_hash,
    displaySuffix: row.display_suffix,
    status: row.status,
    sessionHash: row.session_hash,
    generationAttemptCount: row.generation_attempt_count,
    activationIp: row.activation_ip,
    activatedAt: row.activated_at,
    sessionDeadline: row.session_deadline,
    usedAt: row.used_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAccessCodeWithRequest(row: DatabaseRow): AccessCodeWithRequest {
  const relation = row.demo_requests;
  const request = Array.isArray(relation) ? relation[0] : relation;
  return { ...mapAccessCode(row), request: mapRequest(request) };
}

export class SupabaseDemoRepository implements DemoRepository {
  constructor(private readonly client: SupabaseClient = serverSupabaseClient()) {}

  async createCode(input: {
    codeHash: string;
    displaySuffix: string;
  }): Promise<AccessCodeRecord> {
    const { data, error } = await this.client
      .from("demo_access_codes")
      .insert({
        code_hash: input.codeHash,
        display_suffix: input.displaySuffix,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapAccessCode(data);
  }

  async activateCode(input: {
    codeHash: string;
    sessionHash: string;
    ip: string;
  }): Promise<AccessCodeRecord | null> {
    const { data, error } = await this.client.rpc("activate_demo_code", {
      p_code_hash: input.codeHash,
      p_session_hash: input.sessionHash,
      p_ip: input.ip,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row ? mapAccessCode(row) : null;
  }

  async countFailedActivations(ip: string, since: string): Promise<number> {
    const { count, error } = await this.client
      .from("demo_activation_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("created_at", since);
    if (error) throw error;
    return count ?? 0;
  }

  async recordActivationAttempt(input: ActivationAttempt): Promise<void> {
    const { error } = await this.client.from("demo_activation_attempts").insert({
      code_fingerprint: input.codeFingerprint,
      ip: input.ip,
      success: input.success,
      error_code: input.errorCode,
      created_at: input.createdAt,
    });
    if (error) throw error;
  }

  async findBySessionHash(
    sessionHash: string,
  ): Promise<AccessCodeWithRequest | null> {
    const { data, error } = await this.client
      .from("demo_access_codes")
      .select("*, demo_requests(*)")
      .eq("session_hash", sessionHash)
      .maybeSingle();
    if (error) throw error;
    return data ? mapAccessCodeWithRequest(data) : null;
  }

  async claimGenerationAttempt(sessionHash: string): Promise<number | null> {
    const { data, error } = await this.client.rpc(
      "claim_demo_generation_attempt",
      { p_session_hash: sessionHash },
    );
    if (error) throw error;
    return typeof data === "number" ? data : null;
  }

  async getOrCreateRequest(input: {
    accessCodeId: string;
    name: string;
    packageId: DemoPackageId;
  }): Promise<{ record: DemoRequestRecord; created: boolean }> {
    const inserted = await this.client
      .from("demo_requests")
      .insert({
        access_code_id: input.accessCodeId,
        name: input.name,
        package_id: input.packageId,
      })
      .select("*")
      .maybeSingle();
    if (!inserted.error && inserted.data) {
      return { record: mapRequest(inserted.data)!, created: true };
    }
    if (inserted.error?.code !== "23505") throw inserted.error;

    const existing = await this.client
      .from("demo_requests")
      .select("*")
      .eq("access_code_id", input.accessCodeId)
      .single();
    if (existing.error) throw existing.error;
    return { record: mapRequest(existing.data)!, created: false };
  }

  async prepareRequestRetry(
    requestId: string,
  ): Promise<DemoRequestRecord | null> {
    const current = await this.client
      .from("demo_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (current.error) throw current.error;
    if (
      !current.data ||
      current.data.status !== "error" ||
      current.data.attempt_count >= 3
    ) {
      return null;
    }

    const updated = await this.client
      .from("demo_requests")
      .update({
        status: "creating",
        attempt_count: current.data.attempt_count + 1,
        error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "error")
      .eq("attempt_count", current.data.attempt_count)
      .select("*")
      .maybeSingle();
    if (updated.error) throw updated.error;
    return mapRequest(updated.data);
  }

  async completeGeneration(input: {
    sessionHash: string;
    requestId: string;
    externalId: string;
    username: string;
    password: EncryptedCredential;
    expiresAt: string | null;
  }): Promise<boolean> {
    const { data, error } = await this.client.rpc("complete_demo_generation", {
      p_session_hash: input.sessionHash,
      p_request_id: input.requestId,
      p_external_id: input.externalId,
      p_username: input.username,
      p_password_ciphertext: input.password.ciphertext,
      p_password_iv: input.password.iv,
      p_password_tag: input.password.tag,
      p_expires_at: input.expiresAt,
    });
    if (error) throw error;
    return data === true;
  }

  async markRequestFailure(input: {
    requestId: string;
    status: "error" | "ambiguous";
    errorCode: string;
  }): Promise<void> {
    const { error } = await this.client
      .from("demo_requests")
      .update({
        status: input.status,
        error_code: input.errorCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.requestId)
      .eq("status", "creating");
    if (error) throw error;
  }

  async listCodes(filters: AdminCodeFilters): Promise<AccessCodeWithRequest[]> {
    let query = this.client
      .from("demo_access_codes")
      .select("*, demo_requests(*)")
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 100);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.search?.trim()) {
      query = query.ilike("display_suffix", `%${filters.search.trim()}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapAccessCodeWithRequest);
  }

  async revokeCode(id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("demo_access_codes")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["pending", "active"])
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async expireSessions(): Promise<number> {
    const { data, error } = await this.client.rpc("expire_demo_sessions");
    if (error) throw error;
    return Number(data ?? 0);
  }

  async redactAudit(): Promise<number> {
    const { data, error } = await this.client.rpc("redact_demo_audit");
    if (error) throw error;
    return Number(data ?? 0);
  }
}

export function createSupabaseDemoRepository(): SupabaseDemoRepository {
  return new SupabaseDemoRepository();
}
