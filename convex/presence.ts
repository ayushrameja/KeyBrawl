import { mutation, query, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const HEARTBEAT_TIMEOUT_MS = 30_000;
const MAX_PLAYERS = 8;

export const registerPresence = mutation({
  args: {
    playerId: v.string(),
    username: v.string(),
    roomId: v.optional(v.id("rooms")),
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("in_room"),
      v.literal("in_race")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_player_id", (q) => q.eq("playerId", args.playerId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        roomId: args.roomId,
        status: args.status,
        lastHeartbeatAt: now,
      });
      return;
    }
    await ctx.db.insert("presence", {
      playerId: args.playerId,
      username: args.username,
      roomId: args.roomId,
      status: args.status,
      lastHeartbeatAt: now,
      connectedAt: now,
    });
  },
});

export const keepAlive = mutation({
  args: {
    playerId: v.string(),
    status: v.optional(v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("in_room"),
      v.literal("in_race")
    )),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_player_id", (q) => q.eq("playerId", args.playerId))
      .unique();
    if (!existing) return;
    await ctx.db.patch(existing._id, {
      lastHeartbeatAt: Date.now(),
      ...(args.status !== undefined ? { status: args.status } : {}),
    });
  },
});

export const removePresence = mutation({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_player_id", (q) => q.eq("playerId", args.playerId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const expireStalePresence = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - HEARTBEAT_TIMEOUT_MS;
    const stale = await ctx.db
      .query("presence")
      .withIndex("by_last_heartbeat", (q) => q.lt("lastHeartbeatAt", cutoff))
      .collect();
    for (const p of stale) {
      if (p.roomId) {
        const room = await ctx.db.get(p.roomId);
        if (room) {
          const nextPlayers = room.players.filter((pl) => pl.playerId !== p.playerId);
          if (nextPlayers.length === 0) {
            await ctx.db.delete(p.roomId);
          } else {
            const newHost = room.createdBy === p.playerId ? nextPlayers[0].playerId : room.createdBy;
            await ctx.db.patch(p.roomId, {
              players: nextPlayers,
              createdBy: newHost,
            });
          }
        }
      }
      await ctx.db.delete(p._id);
    }
  },
});
