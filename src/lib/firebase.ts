import admin from "firebase-admin";

// =============================================================================
// Firebase Admin — FCM Push Notifications
// =============================================================================

const globalForFirebase = globalThis as unknown as {
  firebaseApp: admin.app.App | undefined;
};

function getFirebaseApp(): admin.app.App {
  if (globalForFirebase.firebaseApp) {
    return globalForFirebase.firebaseApp;
  }

  const app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });

  if (process.env.NODE_ENV !== "production") {
    globalForFirebase.firebaseApp = app;
  }

  return app;
}

// =============================================================================
// Send Push Notification
// =============================================================================

export interface PushNotificationParams {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Send a push notification to a single device via FCM.
 */
export async function sendPushNotification(
  params: PushNotificationParams
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const app = getFirebaseApp();
    const messaging = admin.messaging(app);

    const message: admin.messaging.Message = {
      token: params.token,
      notification: {
        title: params.title,
        body: params.body,
        ...(params.imageUrl && { imageUrl: params.imageUrl }),
      },
      data: params.data,
      webpush: {
        notification: {
          title: params.title,
          body: params.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72x72.png",
          ...(params.imageUrl && { image: params.imageUrl }),
        },
        fcmOptions: {
          link: params.data?.url ?? "/",
        },
      },
    };

    const messageId = await messaging.send(message);

    return { success: true, messageId };
  } catch (error) {
    console.error("FCM send error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}

/**
 * Send a push notification to multiple devices.
 */
export async function sendPushToMultiple(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ sent: number; failed: number }> {
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  try {
    const app = getFirebaseApp();
    const messaging = admin.messaging(app);

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          title,
          body,
          icon: "/icons/icon-192.png",
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    return {
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error("FCM multicast error:", error);
    return { sent: 0, failed: tokens.length };
  }
}

/**
 * Send a push notification to a topic (e.g., "tenant_xxx_drivers").
 */
export async function sendPushToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const app = getFirebaseApp();
    const messaging = admin.messaging(app);

    const message: admin.messaging.Message = {
      topic,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          title,
          body,
          icon: "/icons/icon-192.png",
        },
      },
    };

    const messageId = await messaging.send(message);

    return { success: true, messageId };
  } catch (error) {
    console.error("FCM topic send error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send to topic",
    };
  }
}
