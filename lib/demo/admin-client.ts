import type {
  AccessCodeWithRequest,
  DemoRequestRecord,
} from "@/lib/demo/repository";
import type {
  AccessCodeStatus,
  DemoCredentialType,
  DemoDeliveryStatus,
} from "@/lib/demo/types";
import { maskPhone } from "@/lib/whatsapp/phone";

export interface AdminRequestView {
  name: string;
  packageId: 6 | 7;
  status: DemoRequestRecord["status"];
  attemptCount: number;
  username: string | null;
  maskedPhone: string | null;
  deliveryStatus: DemoDeliveryStatus;
  providerExpiresAt: string | null;
  errorCode: string | null;
}

export interface AdminCodeView {
  id: string;
  displaySuffix: string;
  credentialType: DemoCredentialType;
  status: AccessCodeStatus;
  generationAttemptCount: number;
  activationIp: string | null;
  activatedAt: string | null;
  sessionDeadline: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  request: AdminRequestView | null;
}

export function toAdminCodeView(record: AccessCodeWithRequest): AdminCodeView {
  return {
    id: record.id,
    displaySuffix: record.displaySuffix,
    credentialType: record.credentialType,
    status: record.status,
    generationAttemptCount: record.generationAttemptCount,
    activationIp: record.activationIp,
    activatedAt: record.activatedAt,
    sessionDeadline: record.sessionDeadline,
    usedAt: record.usedAt,
    revokedAt: record.revokedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    request: record.request
      ? {
          name: record.request.name,
          packageId: record.request.packageId,
          status: record.request.status,
          attemptCount: record.request.attemptCount,
          username: record.request.username,
          maskedPhone: maskPhone(record.request.phone),
          deliveryStatus: record.request.deliveryStatus,
          providerExpiresAt: record.request.providerExpiresAt,
          errorCode: record.request.errorCode,
        }
      : null,
  };
}
