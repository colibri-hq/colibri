import { json, type RequestHandler } from "@sveltejs/kit";

export const POST = async function handle({ request }) {
  // TODO: Implement RFC 7591, "OAuth 2.0 Dynamic Client Registration Protocol"
  //       https://datatracker.ietf.org/doc/html/rfc7591
  //       This endpoint should allow clients to register themselves with the authorization server.
  //       The client should POST a JSON object with the client's metadata to this endpoint.
  //       The server should then validate the request and return a JSON object with the client's
  //       metadata, including a client_id and client_secret.
  //       Additionally, we'll want to add support for the extension RFC 7592, "OAuth 2.0 Dynamic
  //       Client Registration Management Protocol".
  //       https://datatracker.ietf.org/doc/html/rfc7592
  //       This extension allows clients to update their metadata and delete themselves.

  return json({
    status: 200,
    body: {
      integrity: request.integrity,
      message: "Hello from the server!",
    },
  });
} satisfies RequestHandler;
