import { Arika } from "@arika/tools/loom";
import { ProfileSyncDream } from "dreams/profile-sync.dream";
import { clusteredProfileWhisper } from "whispers/profile.whisper";

const arika = new Arika();

arika.onSync(ProfileSyncDream).whispers([clusteredProfileWhisper]).wake(3005);
