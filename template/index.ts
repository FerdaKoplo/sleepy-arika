import { igniteArika } from "./arika/engine";
import {
  clusteredProfileRoute,
  unclusteredProfileRoute,
} from "./whispers/profile";

igniteArika({
  port: parseInt(process.env.PORT || "3005", 10),
  syncIntervalMs: 10000,
  whispers: [clusteredProfileRoute, unclusteredProfileRoute],
});
