export type EmailTemplateKey =
  | "welcome"
  | "magic_link"
  | "reset_password"
  | "team_invite"
  | "payment_receipt"
  | "dunning"
  | "cancellation"
  | "plan_change";

const ENV_MAP: Record<EmailTemplateKey, string> = {
  welcome: "MAILTRAP_TPL_WELCOME",
  magic_link: "MAILTRAP_TPL_MAGIC_LINK",
  reset_password: "MAILTRAP_TPL_RESET_PASSWORD",
  team_invite: "MAILTRAP_TPL_TEAM_INVITE",
  payment_receipt: "MAILTRAP_TPL_PAYMENT_RECEIPT",
  dunning: "MAILTRAP_TPL_DUNNING",
  cancellation: "MAILTRAP_TPL_CANCELLATION",
  plan_change: "MAILTRAP_TPL_PLAN_CHANGE",
};

/** Resolves a logical template key to its Mailtrap hosted template UUID from env. */
export function getTemplateUuid(key: EmailTemplateKey): string {
  const uuid = process.env[ENV_MAP[key]];
  if (!uuid) {
    throw new Error(`${ENV_MAP[key]} is not set`);
  }
  return uuid;
}
