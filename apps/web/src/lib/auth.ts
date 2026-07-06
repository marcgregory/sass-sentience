/**
 * Auth API client functions for account management endpoints.
 *
 * @see apps/api/src/routes/auth.ts for the corresponding backend routes.
 */

import { post, put } from "./api-client";

// ─── Types ─────────────────────────────────────────────────────────────

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface MfaSetupResponse {
  secret: string;
  otpauth: string;
  message: string;
}

export interface MfaVerifyPayload {
  code: string;
  mfaToken?: string;
}

export interface MfaVerifyResponse {
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    mfaEnabled: boolean;
    avatar?: string;
  };
  message?: string;
  mfaEnabled?: boolean;
}

export interface MfaStatusResponse {
  mfaEnabled: boolean;
  mfaSetupComplete: boolean;
}

export interface MfaSetupPayload {
  password: string;
}

export interface MfaDisablePayload {
  password: string;
  code?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
}

export interface UpdateProfileResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
}

// ─── API Functions ─────────────────────────────────────────────────────

export function forgotPassword(data: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
  return post("/auth/forgot-password", data);
}

export function resetPassword(data: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  return post("/auth/reset-password", data);
}

export function mfaSetup(data: MfaSetupPayload): Promise<MfaSetupResponse> {
  return post("/auth/mfa/setup", data);
}

export function mfaVerify(data: MfaVerifyPayload): Promise<MfaVerifyResponse> {
  return post("/auth/mfa/verify", data);
}

export function mfaDisable(data: MfaDisablePayload): Promise<MfaStatusResponse> {
  return post("/auth/mfa/disable", data);
}

export function mfaStatus(): Promise<MfaStatusResponse> {
  return post("/auth/mfa/status", {});
}

export function changePassword(data: ChangePasswordPayload): Promise<ChangePasswordResponse> {
  return post("/auth/change-password", data);
}

export function updateProfile(data: UpdateProfilePayload): Promise<UpdateProfileResponse> {
  return put("/auth/me", data);
}
