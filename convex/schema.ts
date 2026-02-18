import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roomStatus = v.union(
  v.literal("waiting"),
  v.literal("countdown"),
  v.literal("racing"),
  v.literal("finished")
);

const playerInRoom = v.object({
  playerId: v.string(),
  username: v.string(),
  progress: v.number(),
  wpm: v.number(),
  mistakes: v.number(),
  finished: v.boolean(),
});

export default defineSchema({
  rooms: defineTable({
    name: v.string(),
    isPublic: v.boolean(),
    password: v.optional(v.string()),
    createdBy: v.string(),
    status: roomStatus,
    textToType: v.string(),
    textSeed: v.string(),
    duration: v.number(),
    countdown: v.number(),
    timeLeft: v.number(),
    createdAt: v.number(),
    maxPlayers: v.number(),
    players: v.array(playerInRoom),
    roomCode: v.string(),
  })
    .index("by_room_code", ["roomCode"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_public_waiting", ["isPublic", "status", "createdAt"]),

  presence: defineTable({
    playerId: v.string(),
    username: v.string(),
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("in_room"),
      v.literal("in_race")
    ),
    roomId: v.optional(v.id("rooms")),
    lastHeartbeatAt: v.number(),
    connectedAt: v.number(),
  })
    .index("by_player_id", ["playerId"])
    .index("by_room_id", ["roomId"])
    .index("by_last_heartbeat", ["lastHeartbeatAt"]),

  rateLimits: defineTable({
    playerId: v.string(),
    actionType: v.union(v.literal("create"), v.literal("join")),
    count: v.number(),
    windowStart: v.number(),
  })
    .index("by_player_action", ["playerId", "actionType"]),
});
