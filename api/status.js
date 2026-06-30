module.exports = function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  var configured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);

  return response.status(200).json({
    configured: configured,
    model: configured ? process.env.OPENAI_MODEL : null
  });
};
