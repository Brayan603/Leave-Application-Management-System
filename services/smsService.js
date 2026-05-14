// backend/services/smsService.js
import AfricasTalking from "africastalking";

let smsClient = null;

const getClient = () => {
  if (!smsClient) {
    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      throw new Error("Africa's Talking credentials missing: AT_API_KEY and AT_USERNAME required");
    }
    const AT = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });
    smsClient = AT.SMS;
  }
  return smsClient;
};

/* ── Message templates ── */
const smsTemplates = {
  leave_submitted: (d) =>
    `[LMS] ${d.employeeName} submitted a ${d.leaveType} request (${d.startDate}–${d.endDate}). Review in the system.`,

  leave_approved: (d) =>
    `[LMS] Your ${d.leaveType} from ${d.startDate} to ${d.endDate} has been APPROVED. Enjoy your leave!`,

  leave_rejected: (d) =>
    `[LMS] Your ${d.leaveType} request (${d.startDate}–${d.endDate}) was REJECTED. Reason: ${d.reason || "See system"}. Contact your manager.`,

  leave_balance_low: (d) =>
    `[LMS] Alert: Your ${d.leaveType} balance is low – ${d.balance} days remaining.`,

  account_action: (d) =>
    `[LMS] Account update: ${d.action} applied to your account by ${d.adminName}. Contact admin if in error.`,

  broadcast: (d) =>
    `[LMS] ${d.title}: ${d.message.substring(0, 120)}${d.message.length > 120 ? "..." : ""}`,

  announcement: (d) =>
    `[LMS] Announcement – ${d.title}: ${d.message.substring(0, 100)}${d.message.length > 100 ? "..." : ""}`,

  secure_message: (d) =>
    `[LMS] Secure message from ${d.senderName}. Please check your portal for details.`,
};

/* ── sendSMS ── */
const sendSMS = async ({ to, type, data, customMessage }) => {
  const client = getClient();

  let message;
  if (customMessage) {
    message = customMessage;
  } else {
    const templateFn = smsTemplates[type];
    if (!templateFn) throw new Error(`Unknown SMS template type: "${type}"`);
    message = templateFn(data);
  }

  const recipients = Array.isArray(to) ? to : [to];

  // Normalize to E.164 (+254...)
  const normalised = recipients.map((num) => {
    const cleaned = num.replace(/\s+/g, "");
    if (cleaned.startsWith("07") || cleaned.startsWith("01")) {
      return "+254" + cleaned.slice(1);
    }
    if (cleaned.startsWith("254") && !cleaned.startsWith("+")) {
      return "+" + cleaned;
    }
    return cleaned;
  });

  const payload = {
    to: normalised,
    message,
    ...(process.env.AT_SENDER_ID && { from: process.env.AT_SENDER_ID }),
  };

  try {
    const result = await client.send(payload);
    const responses = result.SMSMessageData?.Recipients || [];
    responses.forEach((r) => {
      if (r.status === "Success") {
        console.log(`[SMS] Sent to ${r.number} — cost: ${r.cost}`);
      } else {
        console.warn(`[SMS] Failed to ${r.number}: ${r.status}`);
      }
    });
    return result;
  } catch (err) {
    console.error("[SMS] Africa's Talking error:", err);
    throw err;
  }
};

/* ── sendBulkSMS ── */
const sendBulkSMS = async ({ recipients, type, data, customMessage }) => {
  const BATCH_SIZE = 1000;
  const results = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    try {
      const result = await sendSMS({ to: batch, type, data, customMessage });
      results.push({ success: true, batch: i, result });
    } catch (err) {
      results.push({ success: false, batch: i, error: err.message });
    }
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
};

export default { sendSMS, sendBulkSMS };
