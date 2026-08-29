declare module 'web-push' {
  interface VapidKeys {
    publicKey: string
    privateKey: string
  }
  interface PushSubscription {
    endpoint: string
    keys?: { p256dh: string; auth: string }
  }
  interface SendResult {
    statusCode: number
    body: string
    headers: Record<string, string>
  }
  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  function generateVAPIDKeys(): VapidKeys
  function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: Record<string, unknown>
  ): Promise<SendResult>
  export = { setVapidDetails, generateVAPIDKeys, sendNotification }
}
