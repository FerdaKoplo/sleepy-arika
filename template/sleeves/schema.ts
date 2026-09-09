const profileResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: {
      type: "object",
      properties: {
        id: { type: "string" },
        username: { type: "string" },
        actionsLogged: { type: "integer" },
        lastActive: { type: "string" },
      },
    },
  },
};

export const clusteredRouteOpts = {
  schema: {
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
    response: {
      200: profileResponseSchema,
    },
  },
};
