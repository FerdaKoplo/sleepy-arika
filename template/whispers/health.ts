import { defineWhisper } from "../arika/router";

export const healthCheckWhisper = defineWhisper({
  method: "GET",
  url: "/api/health",
  handler: async () => {
    return {
      status: "Arika is awake and dreaming beyond.",
      timestamp: new Date().toISOString(),
    };
  },
});
