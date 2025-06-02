import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const geminiKey = process.env.VITE_GEMINI_API_KEY;
    const mistralKey = process.env.VITE_MISTRAL_API_KEY;
    const groqKey = process.env.VITE_GROQ_API_KEY;

    // It's good practice to confirm that keys exist,
    // though you might not want to expose *which* specific keys are missing to the client.
    // For the frontend to attempt initialization, we'll send what we have.
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        geminiKey: geminiKey || null,
        mistralKey: mistralKey || null,
        groqKey: groqKey || null,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error retrieving API keys" }),
    };
  }
};

export { handler };