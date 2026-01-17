export async function sendMail(options: Record<string, any>) {
  // Send an email
  console.log("Sending email to", options.to, { ...options });
}
