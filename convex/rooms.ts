import { mutation, query, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const roomCodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_CREATES_PER_HOUR = 10;
const MAX_JOINS_PER_HOUR = 30;

async function checkRateLimit(
  ctx: MutationCtx,
  playerId: string,
  actionType: "create" | "join"
): Promise<boolean> {
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_player_action", (q) =>
      q.eq("playerId", playerId).eq("actionType", actionType)
    )
    .unique();
  const now = Date.now();
  const limit = actionType === "create" ? MAX_CREATES_PER_HOUR : MAX_JOINS_PER_HOUR;
  if (!existing) {
    await ctx.db.insert("rateLimits", {
      playerId,
      actionType,
      count: 1,
      windowStart: now,
    });
    return true;
  }
  if (now - existing.windowStart > RATE_WINDOW_MS) {
    await ctx.db.patch(existing._id, { count: 1, windowStart: now });
    return true;
  }
  if (existing.count >= limit) return false;
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
  return true;
}

function createRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += roomCodeChars[Math.floor(Math.random() * roomCodeChars.length)];
  }
  return code;
}

async function getUniqueRoomCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = createRoomCode();
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_room_code", (q) => q.eq("roomCode", code))
      .first();
    if (!existing) return code;
  }
  return `${createRoomCode().slice(0, 4)}${Date.now().toString().slice(-2)}`;
}

function buildPlayer(playerId: string, username: string) {
  return {
    playerId,
    username,
    progress: 0,
    wpm: 0,
    mistakes: 0,
    finished: false,
  };
}

export const createRoom = mutation({
  args: {
    name: v.string(),
    isPublic: v.boolean(),
    password: v.optional(v.string()),
    maxPlayers: v.number(),
    duration: v.number(),
    textToType: v.string(),
    textSeed: v.string(),
    createdBy: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.maxPlayers < MIN_PLAYERS || args.maxPlayers > MAX_PLAYERS) {
      throw new Error(`maxPlayers must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}`);
    }
    const allowed = await checkRateLimit(ctx, args.createdBy, "create");
    if (!allowed) {
      throw new Error("Rate limit: too many rooms created. Try again later.");
    }
    const roomCode = await getUniqueRoomCode(ctx);
    const roomId = await ctx.db.insert("rooms", {
      name: args.name.trim().slice(0, 80),
      isPublic: args.isPublic,
      password: args.password?.trim() || undefined,
      createdBy: args.createdBy,
      status: "waiting",
      textToType: args.textToType,
      textSeed: args.textSeed,
      duration: args.duration,
      countdown: 3,
      timeLeft: args.duration,
      createdAt: Date.now(),
      maxPlayers: args.maxPlayers,
      players: [buildPlayer(args.createdBy, args.username)],
      roomCode,
    });
    return { roomId, roomCode };
  },
});

export const listPublicRooms = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_public_waiting", (q) =>
        q.eq("isPublic", true).eq("status", "waiting")
      )
      .order("desc")
      .take(50);
    return rooms.map((r) => ({
      _id: r._id,
      name: r.name,
      roomCode: r.roomCode,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      hasPassword: !!r.password,
      createdAt: r.createdAt,
    }));
  },
});

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

export const getRoomByCode = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const code = args.roomCode.trim().toUpperCase();
    return await ctx.db
      .query("rooms")
      .withIndex("by_room_code", (q) => q.eq("roomCode", code))
      .first();
  },
});

export const joinRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    username: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allowed = await checkRateLimit(ctx, args.playerId, "join");
    if (!allowed) {
      return { ok: false as const, error: "Rate limit: too many joins. Try again later." };
    }
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return { ok: false as const, error: "Room not found" };
    }
    if (room.status !== "waiting") {
      return { ok: false as const, error: "Room already started" };
    }
    if (room.players.some((p) => p.playerId === args.playerId)) {
      return { ok: true as const, roomId: args.roomId };
    }
    if (room.players.length >= room.maxPlayers) {
      return { ok: false as const, error: "Room is full" };
    }
    if (room.password && room.password !== (args.password ?? "").trim()) {
      return { ok: false as const, error: "Wrong password" };
    }
    await ctx.db.patch(args.roomId, {
      players: [...room.players, buildPlayer(args.playerId, args.username)],
    });
    return { ok: true as const, roomId: args.roomId };
  },
});

export const joinRoomByCode = mutation({
  args: {
    roomCode: v.string(),
    playerId: v.string(),
    username: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allowed = await checkRateLimit(ctx, args.playerId, "join");
    if (!allowed) {
      return { ok: false as const, error: "Rate limit: too many joins. Try again later." };
    }
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_code", (q) =>
        q.eq("roomCode", args.roomCode.trim().toUpperCase())
      )
      .first();
    if (!room) return { ok: false as const, error: "Room not found" };
    if (room.status !== "waiting") return { ok: false as const, error: "Room already started" };
    if (room.players.some((p) => p.playerId === args.playerId)) {
      return { ok: true as const, roomId: room._id };
    }
    if (room.players.length >= room.maxPlayers) return { ok: false as const, error: "Room is full" };
    if (room.password && room.password !== (args.password ?? "").trim()) {
      return { ok: false as const, error: "Wrong password" };
    }
    await ctx.db.patch(room._id, {
      players: [...room.players, buildPlayer(args.playerId, args.username)],
    });
    return { ok: true as const, roomId: room._id };
  },
});

export const leaveRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return { ok: false as const };
    const nextPlayers = room.players.filter((p) => p.playerId !== args.playerId);
    if (nextPlayers.length === 0) {
      await ctx.db.delete(args.roomId);
      return { ok: true as const, deleted: true as const };
    }
    const newHost =
      room.createdBy === args.playerId ? nextPlayers[0].playerId : room.createdBy;
    await ctx.db.patch(args.roomId, {
      players: nextPlayers,
      createdBy: newHost,
    });
    return { ok: true as const, deleted: false as const };
  },
});

export const startRace = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return { ok: false as const, error: "Room not found" };
    if (room.createdBy !== args.playerId) {
      return { ok: false as const, error: "Only host can start" };
    }
    if (room.status !== "waiting") {
      return { ok: false as const, error: "Race already started" };
    }
    if (room.players.length < MIN_PLAYERS) {
      return { ok: false as const, error: "Need at least 2 players to start" };
    }
    const resetPlayers = room.players.map((p) => ({
      ...p,
      progress: 0,
      wpm: 0,
      mistakes: 0,
      finished: false,
    }));
    await ctx.db.patch(args.roomId, {
      status: "countdown",
      countdown: 3,
      timeLeft: room.duration,
      players: resetPlayers,
    });
    return { ok: true as const };
  },
});

export const setCountdown = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.createdBy !== args.playerId) return { ok: false as const };
    const status = args.count <= 0 ? "racing" : "countdown";
    await ctx.db.patch(args.roomId, { countdown: args.count, status });
    return { ok: true as const };
  },
});

export const setTimeLeft = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    timeLeft: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.createdBy !== args.playerId) return { ok: false as const };
    const status = args.timeLeft <= 0 ? "finished" : "racing";
    await ctx.db.patch(args.roomId, { timeLeft: args.timeLeft, status });
    return { ok: true as const };
  },
});

export const updatePlayerProgress = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    progress: v.number(),
    wpm: v.number(),
    mistakes: v.number(),
    finished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return { ok: false as const };
    const playerIndex = room.players.findIndex((p) => p.playerId === args.playerId);
    if (playerIndex === -1) return { ok: false as const };
    const nextPlayers = [...room.players];
    nextPlayers[playerIndex] = {
      ...nextPlayers[playerIndex],
      progress: Math.max(0, Math.min(100, args.progress)),
      wpm: Math.max(0, args.wpm),
      mistakes: Math.max(0, args.mistakes),
      finished: args.finished,
    };
    await ctx.db.patch(args.roomId, {
      players: nextPlayers,
      ...(args.finished ? { status: "finished" as const } : {}),
    });
    return { ok: true as const };
  },
});

export const finishRace = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return { ok: false as const };
    const isIn = room.players.some((p) => p.playerId === args.playerId);
    if (!isIn) return { ok: false as const };
    await ctx.db.patch(args.roomId, { status: "finished" });
    return { ok: true as const };
  },
});

export const updateUsernameInRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return { ok: false as const };
    const playerIndex = room.players.findIndex((p) => p.playerId === args.playerId);
    if (playerIndex === -1) return { ok: false as const };
    const nextPlayers = [...room.players];
    nextPlayers[playerIndex] = { ...nextPlayers[playerIndex], username: args.username.trim().slice(0, 32) };
    await ctx.db.patch(args.roomId, { players: nextPlayers });
    return { ok: true as const };
  },
});

export const cleanupStaleRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const TEN_MIN = 10 * 60 * 1000;
    const ONE_HOUR = 60 * 60 * 1000;
    const waiting = await ctx.db
      .query("rooms")
      .withIndex("by_status_created", (q) => q.eq("status", "waiting"))
      .collect();
    for (const room of waiting) {
      if (now - room.createdAt > TEN_MIN) await ctx.db.delete(room._id);
    }
    const finished = await ctx.db
      .query("rooms")
      .withIndex("by_status_created", (q) => q.eq("status", "finished"))
      .collect();
    for (const room of finished) {
      if (now - room.createdAt > ONE_HOUR) await ctx.db.delete(room._id);
    }
  },
});
