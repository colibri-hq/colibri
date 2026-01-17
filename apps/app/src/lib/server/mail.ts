export async function sendMail(options: Record<string, unknown>) {
  // Send an email
  console.log("Sending email to", options.to, { ...options });
}
