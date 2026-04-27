import { Effect, Layer, Stream } from "effect";

import {
  buildSeededNitroMapSnapshot,
  decodeNitroMapProjectionSnapshot,
  makeNitroMapSubscriptionEvent,
  NitroMapProjection,
} from "../Services/NitroMapProjection.ts";

export const NitroMapProjectionLive = Layer.effect(
  NitroMapProjection,
  Effect.succeed({
    getProjectSnapshot: (input) =>
      decodeNitroMapProjectionSnapshot(
        // Seeded projections are render-only until the Cartographer service exists.
        // They must not enable Nitro episodes or pretend ownership has been computed.
        buildSeededNitroMapSnapshot(input, { cartographerStatus: "not-run" }),
      ),
    subscribeProject: (input) =>
      Stream.concat(
        Stream.fromEffect(
          decodeNitroMapProjectionSnapshot(
            buildSeededNitroMapSnapshot(input, { cartographerStatus: "not-run" }),
          ).pipe(Effect.flatMap((snapshot) => makeNitroMapSubscriptionEvent(input, snapshot))),
        ),
        Stream.never,
      ),
  }),
);
