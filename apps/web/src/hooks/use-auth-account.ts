/**
 * TanStack Query hooks for account management (v1.5.3).
 *
 * Covers: forgot password, reset password, MFA setup/verify/disable,
 * profile update, and change password.
 */

import { useMutation } from "@tanstack/react-query";
import {
  forgotPassword,
  resetPassword,
  mfaSetup,
  mfaVerify,
  mfaDisable,
  changePassword,
  updateProfile,
} from "@/lib/auth";
import type {
  ForgotPasswordPayload,
  ResetPasswordPayload,
  MfaSetupPayload,
  MfaVerifyPayload,
  MfaDisablePayload,
  ChangePasswordPayload,
  UpdateProfilePayload,
  UpdateProfileResponse,
} from "@/lib/auth";

// ─── Forgot Password ───────────────────────────────────────────────────

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordPayload) => forgotPassword(data),
  });
}

// ─── Reset Password ────────────────────────────────────────────────────

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordPayload) => resetPassword(data),
  });
}

// ─── MFA Setup ─────────────────────────────────────────────────────────

export function useMfaSetup() {
  return useMutation({
    mutationFn: (data: MfaSetupPayload) => mfaSetup(data),
  });
}

// ─── MFA Verify ────────────────────────────────────────────────────────

export function useMfaVerify() {
  return useMutation({
    mutationFn: (data: MfaVerifyPayload) => mfaVerify(data),
  });
}

// ─── MFA Disable ───────────────────────────────────────────────────────

export function useMfaDisable() {
  return useMutation({
    mutationFn: (data: MfaDisablePayload) => mfaDisable(data),
  });
}

// ─── Change Password ───────────────────────────────────────────────────

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => changePassword(data),
  });
}

// ─── Update Profile ────────────────────────────────────────────────────

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: UpdateProfilePayload) => updateProfile(data),
  });
}
