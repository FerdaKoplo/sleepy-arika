import { defineWhisper } from "@arika/tools/router";
import { ProfileSchema } from "compartments/interfaces";
import { ProfileWake } from "wakes/profile.wake";

export const clusteredProfileWhisper = defineWhisper<ProfileSchema>({
  method: "POST",
  url: "/api/clustered/profile/:id",

  handler: (request, reply, context) => {
    const userId = request.params.id;
    const { username, actionsLogged } = request.body;

    const updatedProfile = ProfileWake.syncClusteredProfile(
      userId,
      username,
      actionsLogged,
      context,
    );

    return {
      message: "Memory cluster updated instantly",
      data: updatedProfile,
    };
  },
});
