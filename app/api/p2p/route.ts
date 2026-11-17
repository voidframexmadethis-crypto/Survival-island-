import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface QueuedSignal {
  fromId: string;
  signal: unknown;
  ts: number;
}

interface QueuedPacket {
  fromId: string;
  packet: unknown;
  ts: number;
}

interface RoomPeer {
  peerId: string;
  name: string;
  lastSeen: number;
  signals: QueuedSignal[];
  relays: QueuedPacket[];
}

interface SignalingRoom {
  code: string;
  hostId: string;
  createdAt: number;
  peers: Map<string, RoomPeer>;
}

const globalForP2P = globalThis as unknown as {
  __survivalP2PRooms?: Map<string, SignalingRoom>;
};

const rooms =
  globalForP2P.__survivalP2PRooms ||
  (globalForP2P.__survivalP2PRooms = new Map<string, SignalingRoom>());

function pruneStaleRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    for (const [pid, peer] of room.peers.entries()) {
      if (now - peer.lastSeen > 45_000) {
        room.peers.delete(pid);
      }
    }
    if (room.peers.size === 0 || now - room.createdAt > 12 * 3600_000) {
      rooms.delete(code);
    }
  }
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function POST(req: NextRequest) {
  pruneStaleRooms();
  try {
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'create') {
      const peerId = String(body.peerId || '').slice(0, 48);
      const name = String(body.name || 'Host Survivor').slice(0, 24);
      if (!peerId) {
        return NextResponse.json({ error: 'Missing peerId' }, { status: 400 });
      }
      let code = generateRoomCode();
      while (rooms.has(code)) code = generateRoomCode();

      const room: SignalingRoom = {
        code,
        hostId: peerId,
        createdAt: Date.now(),
        peers: new Map(),
      };
      room.peers.set(peerId, {
        peerId,
        name,
        lastSeen: Date.now(),
        signals: [],
        relays: [],
      });
      rooms.set(code, room);
      return NextResponse.json({
        roomCode: code,
        hostId: room.hostId,
        peers: [{ peerId, name }],
      });
    }

    if (action === 'join') {
      const roomCode = String(body.roomCode || '')
        .trim()
        .toUpperCase()
        .slice(0, 12);
      const peerId = String(body.peerId || '').slice(0, 48);
      const name = String(body.name || 'Survivor').slice(0, 24);
      const room = rooms.get(roomCode);
      if (!room) {
        return NextResponse.json(
          { error: `Room "${roomCode}" not found or expired.` },
          { status: 404 },
        );
      }
      if (!peerId) {
        return NextResponse.json({ error: 'Missing peerId' }, { status: 400 });
      }
      room.peers.set(peerId, {
        peerId,
        name,
        lastSeen: Date.now(),
        signals: [],
        relays: [],
      });
      const peers = Array.from(room.peers.values()).map((p) => ({
        peerId: p.peerId,
        name: p.name,
      }));
      return NextResponse.json({
        roomCode: room.code,
        hostId: room.hostId,
        peers,
      });
    }

    if (action === 'signal') {
      const roomCode = String(body.roomCode || '').trim().toUpperCase();
      const fromId = String(body.fromId || '');
      const toId = String(body.toId || '');
      const room = rooms.get(roomCode);
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      const sender = room.peers.get(fromId);
      if (sender) sender.lastSeen = Date.now();
      const target = room.peers.get(toId);
      if (target) {
        target.signals.push({ fromId, signal: body.signal, ts: Date.now() });
        if (target.signals.length > 64) target.signals.shift();
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'relay') {
      const roomCode = String(body.roomCode || '').trim().toUpperCase();
      const fromId = String(body.fromId || '');
      const toId = body.toId ? String(body.toId) : null;
      const room = rooms.get(roomCode);
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      const sender = room.peers.get(fromId);
      if (sender) sender.lastSeen = Date.now();
      for (const [pid, peer] of room.peers.entries()) {
        if (pid === fromId) continue;
        if (toId && pid !== toId) continue;
        peer.relays.push({ fromId, packet: body.packet, ts: Date.now() });
        if (peer.relays.length > 96) peer.relays.shift();
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'leave') {
      const roomCode = String(body.roomCode || '').trim().toUpperCase();
      const peerId = String(body.peerId || '');
      const room = rooms.get(roomCode);
      if (room) {
        room.peers.delete(peerId);
        if (room.hostId === peerId && room.peers.size > 0) {
          const nextHost = room.peers.keys().next().value;
          if (nextHost) room.hostId = nextHost;
        }
        if (room.peers.size === 0) rooms.delete(roomCode);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  pruneStaleRooms();
  const { searchParams } = req.nextUrl;
  const roomCode = String(searchParams.get('roomCode') || '')
    .trim()
    .toUpperCase();
  const peerId = String(searchParams.get('peerId') || '');
  const name = String(searchParams.get('name') || '');

  const room = rooms.get(roomCode);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  let peer = room.peers.get(peerId);
  if (!peer && peerId) {
    peer = {
      peerId,
      name: name || 'Survivor',
      lastSeen: Date.now(),
      signals: [],
      relays: [],
    };
    room.peers.set(peerId, peer);
  }
  if (peer) {
    peer.lastSeen = Date.now();
  }

  const signals = peer ? peer.signals.splice(0, peer.signals.length) : [];
  const relays = peer ? peer.relays.splice(0, peer.relays.length) : [];
  const peers = Array.from(room.peers.values()).map((p) => ({
    peerId: p.peerId,
    name: p.name,
  }));

  return NextResponse.json({
    roomCode: room.code,
    hostId: room.hostId,
    peers,
    signals,
    relays,
  });
}
