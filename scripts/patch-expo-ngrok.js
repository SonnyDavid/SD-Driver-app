/**
 * @expo/ngrok throws "Cannot read properties of undefined (reading 'body')"
 * when the local ngrok agent is unreachable (no HTTP response from `got`).
 * Re-apply a safe error handler after npm install.
 */
const fs = require("fs");
const path = require("path");

const clientPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@expo",
  "ngrok",
  "src",
  "client.js"
);

if (!fs.existsSync(clientPath)) {
  console.warn("[patch-expo-ngrok] @expo/ngrok not installed, skipping.");
  process.exit(0);
}

const patchedRequestCatch = `    } catch (error) {
      const responseBody = error.response?.body;
      let clientError;
      try {
        const response = JSON.parse(responseBody);
        clientError = new NgrokClientError(
          response.msg,
          error.response,
          response
        );
      } catch (e) {
        const message =
          typeof responseBody === "string"
            ? responseBody
            : error.message || "Ngrok request failed";
        clientError = new NgrokClientError(
          message,
          error.response,
          responseBody
        );
      }
      throw clientError;
    }`;

const patchedBooleanCatch = `    } catch (error) {
      const responseBody = error.response?.body;
      try {
        const response = JSON.parse(responseBody);
        throw new NgrokClientError(response.msg, error.response, response);
      } catch (e) {
        const message =
          typeof responseBody === "string"
            ? responseBody
            : error.message || "Ngrok request failed";
        throw new NgrokClientError(message, error.response, responseBody);
      }
    }`;

let source = fs.readFileSync(clientPath, "utf8");

if (source.includes("error.response?.body")) {
  console.log("[patch-expo-ngrok] Already patched.");
  process.exit(0);
}

const requestCatchPattern =
  /    } catch \(error\) {\s*let clientError;\s*try {\s*const response = JSON\.parse\(error\.response\.body\);[\s\S]*?throw clientError;\s*}/;

const booleanCatchPattern =
  /    } catch \(error\) {\s*const response = JSON\.parse\(error\.response\.body\);[\s\S]*?throw new NgrokClientError\(response\.msg, error\.response, response\);\s*}/;

if (!requestCatchPattern.test(source) || !booleanCatchPattern.test(source)) {
  console.error("[patch-expo-ngrok] Unexpected @expo/ngrok client.js format; patch not applied.");
  process.exit(1);
}

source = source.replace(requestCatchPattern, patchedRequestCatch);
source = source.replace(booleanCatchPattern, patchedBooleanCatch);
fs.writeFileSync(clientPath, source);
console.log("[patch-expo-ngrok] Patched @expo/ngrok/src/client.js");
