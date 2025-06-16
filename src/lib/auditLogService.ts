
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import type { AuditActionType, AuditLogDetails } from '@/types/guildmaster';

export async function logGuildActivity(
  guildId: string,
  actorId: string,
  actorDisplayName: string | null,
  action: AuditActionType,
  details?: AuditLogDetails
): Promise<void> {
  try {
    const logEntry = {
      timestamp: serverTimestamp(),
      actorId,
      actorDisplayName: actorDisplayName || 'Sistema', // Fallback if display name is null
      action,
      details: details || {},
    };
    // Ensure details object is not undefined before attempting to clean it
    if (logEntry.details) {
        // Remove undefined values from details to prevent Firestore errors
        Object.keys(logEntry.details).forEach(key => {
            const K = key as keyof AuditLogDetails;
            if (logEntry.details![K] === undefined) {
                delete logEntry.details![K];
            }
        });
    }

    await addDoc(collection(db, `guilds/${guildId}/auditLogs`), logEntry);
  } catch (error) {
    console.error("Error logging guild activity:", error, "Log details:", {guildId, actorId, actorDisplayName, action, details});
    // Optionally, you could re-throw the error or handle it by, for example,
    // notifying an error tracking service. For now, we'll log to console.
  }
}
