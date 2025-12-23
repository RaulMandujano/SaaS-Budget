import * as functions from "firebase-functions";
import fetch from "node-fetch";

type SlackOAuthResponse = {
  ok?: boolean;
  error?: string;
  team?: {
    id?: string;
    name?: string;
  };
};

export const slackOAuthCallback = functions.https.onRequest(
  async (req, res) => {
    try {
      const code = req.query.code as string;

      if (!code) {
        res.status(400).send("Missing OAuth code");
        return;
      }

      // ✅ LEER DESDE ENV PRIMERO (GEN 2 SAFE)
      const clientId =
        process.env.SLACK_CLIENT_ID ||
        functions.config()?.slack?.client_id;

      const clientSecret =
        process.env.SLACK_CLIENT_SECRET ||
        functions.config()?.slack?.client_secret;

      if (!clientId || !clientSecret) {
        console.error("❌ Missing Slack OAuth env vars", {
          clientIdExists: !!clientId,
          clientSecretExists: !!clientSecret,
        });
        res.status(500).send("Slack OAuth env vars not configured");
        return;
      }

      const response = await fetch(
        "https://slack.com/api/oauth.v2.access",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri:
              "https://us-central1-saas-budget-b3c59.cloudfunctions.net/slackOAuthCallback",
          }),
        }
      );

      const data = await response.json();

      if (!data.ok) {
        console.error("❌ Slack OAuth failed:", data);
        res.status(400).json(data);
        return;
      }

      console.log("✅ Slack OAuth OK:", {
        team: data.team?.name,
        teamId: data.team?.id,
      });

      res.send("✅ Slack OAuth OK, app installed successfully.");
    } catch (error) {
      console.error("❌ OAuth Callback Crash:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
