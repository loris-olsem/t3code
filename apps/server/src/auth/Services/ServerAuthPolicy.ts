import type { ServerAuthDescriptor } from "@nitrocode/contracts";
import { Context } from "effect";
import type { Effect } from "effect";

export interface ServerAuthPolicyShape {
  readonly getDescriptor: () => Effect.Effect<ServerAuthDescriptor>;
}

export class ServerAuthPolicy extends Context.Service<ServerAuthPolicy, ServerAuthPolicyShape>()(
  "nitrocode/auth/Services/ServerAuthPolicy",
) {}
