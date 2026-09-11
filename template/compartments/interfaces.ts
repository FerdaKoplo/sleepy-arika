export interface ProfileData {
  id: string;
  username: string;
  actionsLogged: number;
  lastActive: Date;
}

export interface ProfileSchema {
  Params: { id: string };
  Body: { username?: string; actionsLogged?: number };
}
