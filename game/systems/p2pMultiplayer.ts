import {
  ItemId,
  ModGameplayTweaks,
  ModularVehicleData,
  MultiplayerPeerInfo,
  MultiplayerStatusSnapshot,
  PlacedStructure,
  StructuralBlock,
  WeatherType,
} from '../types';
import { apiUrl } from './apiConfig';

export type RemoteAnimState =
  | 'idle'
  | 'walk'
  | 'sprint'
  | 'crouch'
  | 'swim'
  | 'drive';

export type P2PPacket =
  | {
      type: 'player_state';
      peerId: string;
      name: string;
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      anim: RemoteAnimState;
      heldItemId: ItemId | null;
      biome: string;
      vehicleId: string | null;
      vx?: number;
      vz?: number;
      vyaw?: number;
      gunSkinId?: string | null;
      backpackSkinId?: string | null;
    }
  | {
      type: 'place_structure';
      structure: PlacedStructure;
    }
  | {
      type: 'place_block';
      block: StructuralBlock;
    }
  | {
      type: 'vehicle_upsert';
      vehicle: ModularVehicleData;
    }
  | {
      type: 'combat_shot';
      peerId: string;
      fromX: number;
      fromY: number;
      fromZ: number;
      toX: number;
      toY: number;
      toZ: number;
      weaponId: ItemId | null;
    }
  | {
      type: 'creature_damage';
      creatureId: string;
      damage: number;
      fromX: number;
      fromZ: number;
    }
  | {
      type: 'player_hit';
      targetPeerId: string;
      damage: number;
      attackerName: string;
    }
  | {
      type: 'world_sync';
      dayCount: number;
      timeOfDay: number;
      weather: WeatherType;
      structures: PlacedStructure[];
      structuralBlocks: StructuralBlock[];
      vehicles: ModularVehicleData[];
      tweaks?: ModGameplayTweaks;
    }
  | {
      type: 'mod_tweaks';
      tweaks: ModGameplayTweaks;
    }
  | {
      type: 'chat';
      peerId: string;
      name: string;
      text: string;
    }
  | {
      type: 'lost_world_sync';
      kind: string;
      payload: Record<string, unknown>;
    };

interface PeerConnectionEntry {
  peerId: string;
  name: string;
  pc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  dcOpen: boolean;
  initiator: boolean;
  lastSeen: number;
  x: number;
  y: number;
  z: number;
  biome: string;
  transport: 'webrtc' | 'relay' | 'local';
}

export interface P2PManagerCallbacks {
  onPacket: (fromPeerId: string, packet: P2PPacket) => void;
  onPeerJoined: (peerId: string, name: string) => void;
  onPeerLeft: (peerId: string) => void;
  onStatusChanged: () => void;
}

export class P2PMultiplayerManager {
  public readonly localPeerId: string;
  public playerName: string;
  public roomCode: string | null = null;
  public isHost = false;
  public connected = false;
  public pvpEnabled = true;
  public statusMessage = 'Offline · Play solo or host/join a P2P Island Room';

  public micMuted = false;
  public micEnabled = false;
  public voiceMode: 'party' | 'proximity' = 'party';
  public localSpeaking = false;
  public speakingPeers = new Set<string>();
  private localAudioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAudioElements = new Map<string, HTMLAudioElement>();
  private remoteAnalysers = new Map<string, AnalyserNode>();
  private remoteGains = new Map<string, GainNode>();
  private remoteSourceStreams = new Map<string, MediaStream>();
  private localPosition = { x: 0, y: 0, z: 112 };
  private voiceCheckTimer: number | null = null;

  private peers = new Map<string, PeerConnectionEntry>();
  private broadcastChannel: BroadcastChannel | null = null;
  private pollTimer: number | null = null;
  private callbacks: P2PManagerCallbacks;
  private relayQueue: { packet: P2PPacket; toId?: string }[] = [];
  private relayFlushTimer: number | null = null;

  constructor(callbacks: P2PManagerCallbacks) {
    this.callbacks = callbacks;
    this.localPeerId =
      'peer_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
    this.playerName = `Survivor-${this.localPeerId.slice(-4).toUpperCase()}`;
  }

  public setPlayerName(name: string): void {
    const clean = name.trim().slice(0, 24);
    if (clean) {
      this.playerName = clean;
      this.callbacks.onStatusChanged();
    }
  }

  public setPvpEnabled(enabled: boolean): void {
    this.pvpEnabled = enabled;
    this.callbacks.onStatusChanged();
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  public async initMicrophone(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      const hasLiveStream = Boolean(
        this.localAudioStream &&
          this.localAudioStream.getAudioTracks().some((t) => t.readyState === 'live'),
      );
      let stream = this.localAudioStream;
      if (!hasLiveStream || !stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        this.localAudioStream = stream;
      }

      this.micEnabled = true;
      this.micMuted = false;
      for (const track of stream.getTracks()) {
        track.enabled = true;
      }

      const ctx = this.ensureAudioContext();
      if (ctx && !this.localAnalyser) {
        const source = ctx.createMediaStreamSource(stream);
        this.localAnalyser = ctx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        source.connect(this.localAnalyser);
      }

      for (const [peerId, entry] of this.peers.entries()) {
        const pc = entry.pc;
        if (!pc) continue;
        const existingTracks = new Set(
          pc
            .getSenders()
            .map((s) => s.track)
            .filter((t): t is MediaStreamTrack => Boolean(t)),
        );
        let addedTrack = false;
        for (const track of stream.getTracks()) {
          if (!existingTracks.has(track)) {
            pc.addTrack(track, stream);
            addedTrack = true;
          }
        }
        if (addedTrack && this.roomCode && pc.signalingState === 'stable') {
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              if (!this.roomCode || !pc.localDescription) return;
              return fetch(apiUrl('/api/p2p'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'signal',
                  roomCode: this.roomCode,
                  fromId: this.localPeerId,
                  toId: peerId,
                  signal: { type: 'sdp', sdp: pc.localDescription },
                }),
              });
            })
            .catch(() => {});
        }
      }

      this.startVoiceCheck();
      this.callbacks.onStatusChanged();
      return true;
    } catch {
      this.micEnabled = false;
      this.callbacks.onStatusChanged();
      return false;
    }
  }

  public toggleMicMute(): boolean {
    if (!this.localAudioStream || !this.micEnabled) {
      this.micMuted = false;
      void this.initMicrophone();
      this.callbacks.onStatusChanged();
      return this.micMuted;
    }
    this.micMuted = !this.micMuted;
    for (const track of this.localAudioStream.getTracks()) {
      track.enabled = !this.micMuted;
    }
    if (this.micMuted && this.localSpeaking) {
      this.localSpeaking = false;
    }
    this.callbacks.onStatusChanged();
    return this.micMuted;
  }

  public setVoiceMode(mode: 'party' | 'proximity'): void {
    this.voiceMode = mode;
    this.updateProximityGains();
    this.callbacks.onStatusChanged();
  }

  public updatePlayerPosition(x: number, y: number, z: number): void {
    this.localPosition = { x, y, z };
    this.updateProximityGains();
  }

  private updateProximityGains(): void {
    for (const [peerId, gainNode] of this.remoteGains.entries()) {
      const entry = this.peers.get(peerId);
      if (!gainNode || !this.audioContext) continue;
      if (this.voiceMode === 'party' || !entry) {
        gainNode.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.1);
      } else {
        const dist = Math.hypot(this.localPosition.x - entry.x, this.localPosition.z - entry.z);
        const gain = Math.max(0, Math.min(1.0, 1 - dist / 28));
        gainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.1);
      }
    }
  }

  private startVoiceCheck(): void {
    if (this.voiceCheckTimer !== null) return;
    const dataArray = new Uint8Array(128);
    this.voiceCheckTimer = window.setInterval(() => {
      if (this.localAnalyser && !this.micMuted && this.localAudioStream) {
        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const speaking = avg > 12;
        if (speaking !== this.localSpeaking) {
          this.localSpeaking = speaking;
          this.callbacks.onStatusChanged();
        }
      } else if (this.localSpeaking) {
        this.localSpeaking = false;
        this.callbacks.onStatusChanged();
      }

      let changed = false;
      for (const [peerId, analyser] of this.remoteAnalysers.entries()) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const speaking = avg > 12;
        const wasSpeaking = this.speakingPeers.has(peerId);
        if (speaking && !wasSpeaking) {
          this.speakingPeers.add(peerId);
          changed = true;
        } else if (!speaking && wasSpeaking) {
          this.speakingPeers.delete(peerId);
          changed = true;
        }
      }
      if (changed) {
        this.callbacks.onStatusChanged();
      }
    }, 150);
  }

  private attachRemoteAudio(peerId: string, stream: MediaStream): void {
    if (typeof window === 'undefined') return;
    if (this.remoteSourceStreams.get(peerId) === stream) return;
    this.remoteSourceStreams.set(peerId, stream);

    let audioEl = this.remoteAudioElements.get(peerId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      document.body.appendChild(audioEl);
      this.remoteAudioElements.set(peerId, audioEl);
    }
    audioEl.srcObject = stream;

    const ctx = this.ensureAudioContext();
    if (ctx) {
      // Mute raw <audio> element output when routed through Web Audio GainNode to prevent double playback and enable Proximity attenuation
      audioEl.muted = true;
      try {
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const gainNode = ctx.createGain();
        source.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(ctx.destination);

        this.remoteAnalysers.set(peerId, analyser);
        this.remoteGains.set(peerId, gainNode);
        this.updateProximityGains();
        this.startVoiceCheck();
      } catch {
        audioEl.muted = false;
        audioEl.play().catch(() => {});
      }
    } else {
      audioEl.play().catch(() => {});
    }
  }

  public getStatusSnapshot(): MultiplayerStatusSnapshot {
    const peerList: MultiplayerPeerInfo[] = [];
    for (const p of this.peers.values()) {
      peerList.push({
        peerId: p.peerId,
        name: p.name,
        x: p.x,
        y: p.y,
        z: p.z,
        biome: p.biome,
        connected: p.dcOpen || p.transport !== 'webrtc',
        transport: p.dcOpen ? 'webrtc' : p.transport,
      });
    }
    return {
      connected: this.connected,
      isHost: this.isHost,
      roomCode: this.roomCode,
      localPeerId: this.localPeerId,
      playerName: this.playerName,
      peers: peerList,
      pvpEnabled: this.pvpEnabled,
      statusMessage: this.statusMessage,
      micMuted: this.micMuted,
      micEnabled: this.micEnabled,
      voiceMode: this.voiceMode,
      localSpeaking: this.localSpeaking,
      speakingPeers: Array.from(this.speakingPeers),
    };
  }

  public async createRoom(playerName?: string): Promise<string | null> {
    if (playerName) this.setPlayerName(playerName);
    this.leaveRoom();

    try {
      const res = await fetch(apiUrl('/api/p2p'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          peerId: this.localPeerId,
          name: this.playerName,
        }),
      });
      if (!res.ok) throw new Error('Room creation failed');
      const data = await res.json();
      this.roomCode = data.roomCode;
      this.isHost = true;
      this.connected = true;
      this.statusMessage = `Hosting Island Room ${this.roomCode}`;
      this.startRoomTransport();
      this.ensureAudioContext();
      void this.initMicrophone();
      this.callbacks.onStatusChanged();
      return this.roomCode;
    } catch {
      // Pure offline local tab fallback room code
      const localCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      this.roomCode = localCode;
      this.isHost = true;
      this.connected = true;
      this.statusMessage = `Hosting Local Tab Room ${localCode}`;
      this.startBroadcastChannel();
      this.ensureAudioContext();
      void this.initMicrophone();
      this.callbacks.onStatusChanged();
      return localCode;
    }
  }

  public async joinRoom(roomCodeInput: string, playerName?: string): Promise<boolean> {
    if (playerName) this.setPlayerName(playerName);
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return false;
    this.leaveRoom();

    try {
      const res = await fetch(apiUrl('/api/p2p'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomCode: code,
          peerId: this.localPeerId,
          name: this.playerName,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.statusMessage = err.error || `Room ${code} not found`;
        this.callbacks.onStatusChanged();
        return false;
      }
      const data = await res.json();
      this.roomCode = data.roomCode;
      this.isHost = data.hostId === this.localPeerId;
      this.connected = true;
      this.statusMessage = `Joined Island Room ${this.roomCode}`;
      this.startRoomTransport();
      this.ensureAudioContext();
      void this.initMicrophone();

      const peers: { peerId: string; name: string }[] = data.peers || [];
      for (const p of peers) {
        if (p.peerId !== this.localPeerId) {
          this.ensurePeer(p.peerId, p.name, false);
        }
      }
      this.callbacks.onStatusChanged();
      return true;
    } catch {
      this.roomCode = code;
      this.isHost = false;
      this.connected = true;
      this.statusMessage = `Joined Local Tab Room ${code}`;
      this.startBroadcastChannel();
      this.ensureAudioContext();
      void this.initMicrophone();
      this.callbacks.onStatusChanged();
      return true;
    }
  }

  private cleanupPeerAudio(peerId: string): void {
    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudioElements.delete(peerId);
    }
    this.remoteAnalysers.delete(peerId);
    this.remoteGains.delete(peerId);
    this.remoteSourceStreams.delete(peerId);
    this.speakingPeers.delete(peerId);
  }

  public leaveRoom(): void {
    const oldCode = this.roomCode;
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.relayFlushTimer !== null) {
      window.clearTimeout(this.relayFlushTimer);
      this.relayFlushTimer = null;
    }
    if (this.voiceCheckTimer !== null) {
      window.clearInterval(this.voiceCheckTimer);
      this.voiceCheckTimer = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          kind: 'leave',
          peerId: this.localPeerId,
        });
        this.broadcastChannel.close();
      } catch {
        // Ignore close errors
      }
      this.broadcastChannel = null;
    }
    for (const [pid, entry] of this.peers.entries()) {
      try {
        entry.dc?.close();
        entry.pc?.close();
      } catch {
        // Ignore cleanup errors
      }
      this.cleanupPeerAudio(pid);
      this.callbacks.onPeerLeft(pid);
    }
    if (this.localAudioStream) {
      for (const track of this.localAudioStream.getTracks()) {
        track.stop();
      }
      this.localAudioStream = null;
    }
    this.localAnalyser = null;
    this.localSpeaking = false;
    this.micEnabled = false;
    this.speakingPeers.clear();
    this.peers.clear();
    this.relayQueue = [];
    this.connected = false;
    this.isHost = false;
    this.roomCode = null;
    this.statusMessage = 'Offline · Play solo or host/join a P2P Island Room';

    if (oldCode) {
      fetch(apiUrl('/api/p2p'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          roomCode: oldCode,
          peerId: this.localPeerId,
        }),
      }).catch(() => {});
    }
    this.callbacks.onStatusChanged();
  }

  public sendToPeer(peerId: string, packet: P2PPacket): void {
    if (!this.connected || !this.roomCode) return;
    const entry = this.peers.get(peerId);
    if (entry?.dc && entry.dc.readyState === 'open') {
      try {
        entry.dc.send(JSON.stringify(packet));
        return;
      } catch {
        // Fall through to local/relay
      }
    }
    if (entry?.transport === 'local' && this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        kind: 'packet',
        fromId: this.localPeerId,
        toId: peerId,
        packet,
      });
      return;
    }
    this.queueRelay(packet, peerId);
  }

  public broadcast(packet: P2PPacket): void {
    if (!this.connected || !this.roomCode) return;
    const serialized = JSON.stringify(packet);
    let anyNeedServerRelay = false;

    for (const entry of this.peers.values()) {
      if (entry.dc && entry.dc.readyState === 'open') {
        try {
          entry.dc.send(serialized);
          continue;
        } catch {
          // Fall through
        }
      }
      if (entry.transport !== 'local') {
        anyNeedServerRelay = true;
      }
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          kind: 'packet',
          fromId: this.localPeerId,
          packet,
        });
      } catch {
        // Ignore BroadcastChannel errors
      }
    }

    if (anyNeedServerRelay) {
      this.queueRelay(packet);
    }
  }

  private queueRelay(packet: P2PPacket, toId?: string): void {
    // Keep only latest player_state per sender in relay queue to prevent backlog
    if (packet.type === 'player_state') {
      this.relayQueue = this.relayQueue.filter((q) => q.packet.type !== 'player_state');
    }
    this.relayQueue.push({ packet, toId });
    if (this.relayFlushTimer === null) {
      this.relayFlushTimer = window.setTimeout(() => {
        this.relayFlushTimer = null;
        this.flushRelays();
      }, 75);
    }
  }

  private async flushRelays(): Promise<void> {
    if (!this.connected || !this.roomCode || this.relayQueue.length === 0) return;
    const batch = this.relayQueue.splice(0, 6);
    for (const item of batch) {
      try {
        await fetch(apiUrl('/api/p2p'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'relay',
            roomCode: this.roomCode,
            fromId: this.localPeerId,
            toId: item.toId,
            packet: item.packet,
          }),
        });
      } catch {
        // Ignore transient network errors
      }
    }
  }

  private startRoomTransport(): void {
    this.startBroadcastChannel();
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
    }
    this.pollSignaling();
    this.pollTimer = window.setInterval(() => {
      this.pollSignaling();
    }, 320);
  }

  private startBroadcastChannel(): void {
    if (!this.roomCode || typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel(`survival-island-p2p-${this.roomCode}`);
      this.broadcastChannel.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || msg.fromId === this.localPeerId || msg.peerId === this.localPeerId) return;
        if (msg.kind === 'hello') {
          this.ensureLocalTabPeer(msg.peerId, msg.name);
          this.broadcastChannel?.postMessage({
            kind: 'hello_ack',
            peerId: this.localPeerId,
            name: this.playerName,
          });
        } else if (msg.kind === 'hello_ack') {
          this.ensureLocalTabPeer(msg.peerId, msg.name);
        } else if (msg.kind === 'leave') {
          this.removePeer(msg.peerId);
        } else if (msg.kind === 'packet') {
          if (msg.toId && msg.toId !== this.localPeerId) return;
          this.handleIncomingPacket(msg.fromId, msg.packet as P2PPacket);
        }
      };
      this.broadcastChannel.postMessage({
        kind: 'hello',
        peerId: this.localPeerId,
        name: this.playerName,
      });
    } catch {
      // BroadcastChannel unavailable
    }
  }

  private ensureLocalTabPeer(peerId: string, name: string): void {
    const existing = this.peers.get(peerId);
    if (existing) {
      existing.lastSeen = Date.now();
      existing.name = name || existing.name;
      if (!existing.dcOpen) existing.transport = 'local';
      return;
    }
    this.peers.set(peerId, {
      peerId,
      name: name || 'Survivor',
      pc: null,
      dc: null,
      dcOpen: false,
      initiator: false,
      lastSeen: Date.now(),
      x: 0,
      y: 2,
      z: 112,
      biome: 'beach',
      transport: 'local',
    });
    this.callbacks.onPeerJoined(peerId, name || 'Survivor');
    this.callbacks.onStatusChanged();
  }

  private async pollSignaling(): Promise<void> {
    if (!this.connected || !this.roomCode) return;
    try {
      const url = apiUrl(`/api/p2p?roomCode=${encodeURIComponent(this.roomCode)}&peerId=${encodeURIComponent(
        this.localPeerId,
      )}&name=${encodeURIComponent(this.playerName)}`);
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      this.isHost = data.hostId === this.localPeerId;

      const remotePeers: { peerId: string; name: string }[] = data.peers || [];
      const activeIds = new Set(remotePeers.map((p) => p.peerId));

      for (const p of remotePeers) {
        if (p.peerId === this.localPeerId) continue;
        // Deterministic initiator: higher peerId initiates WebRTC offer to avoid glare
        const shouldInitiate = this.localPeerId > p.peerId;
        this.ensurePeer(p.peerId, p.name, shouldInitiate);
      }

      for (const [pid, entry] of this.peers.entries()) {
        if (!activeIds.has(pid) && entry.transport !== 'local') {
          this.removePeer(pid);
        }
      }

      const signals: { fromId: string; signal: Record<string, unknown> }[] =
        data.signals || [];
      for (const s of signals) {
        await this.handleSignal(s.fromId, s.signal);
      }

      const relays: { fromId: string; packet: P2PPacket }[] = data.relays || [];
      for (const r of relays) {
        this.handleIncomingPacket(r.fromId, r.packet);
      }
    } catch {
      // Ignore polling hiccup
    }
  }

  private ensurePeer(peerId: string, name: string, initiator: boolean): PeerConnectionEntry {
    const existing = this.peers.get(peerId);
    if (existing) {
      existing.name = name || existing.name;
      existing.lastSeen = Date.now();
      return existing;
    }

    const entry: PeerConnectionEntry = {
      peerId,
      name: name || 'Survivor',
      pc: null,
      dc: null,
      dcOpen: false,
      initiator,
      lastSeen: Date.now(),
      x: 0,
      y: 2,
      z: 112,
      biome: 'beach',
      transport: 'relay',
    };
    this.peers.set(peerId, entry);

    if (typeof RTCPeerConnection !== 'undefined') {
      // Zero external STUN/TURN APIs: direct host/mDNS ICE candidates with automatic built-in relay fallback
      const pc = new RTCPeerConnection({ iceServers: [] });
      entry.pc = pc;

      if (this.localAudioStream) {
        for (const track of this.localAudioStream.getTracks()) {
          pc.addTrack(track, this.localAudioStream);
        }
      }

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          this.attachRemoteAudio(peerId, stream);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && this.roomCode) {
          fetch(apiUrl('/api/p2p'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'signal',
              roomCode: this.roomCode,
              fromId: this.localPeerId,
              toId: peerId,
              signal: { type: 'candidate', candidate: e.candidate.toJSON() },
            }),
          }).catch(() => {});
        }
      };

      const wireChannel = (dc: RTCDataChannel) => {
        entry.dc = dc;
        dc.onopen = () => {
          entry.dcOpen = true;
          entry.transport = 'webrtc';
          this.callbacks.onStatusChanged();
        };
        dc.onclose = () => {
          entry.dcOpen = false;
          entry.transport = 'relay';
          this.callbacks.onStatusChanged();
        };
        dc.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(String(ev.data)) as P2PPacket;
            this.handleIncomingPacket(peerId, parsed);
          } catch {
            // Ignore malformed message
          }
        };
      };

      if (initiator) {
        const dc = pc.createDataChannel('survival-sync', { ordered: true });
        wireChannel(dc);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (!this.roomCode || !pc.localDescription) return;
            return fetch(apiUrl('/api/p2p'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'signal',
                roomCode: this.roomCode,
                fromId: this.localPeerId,
                toId: peerId,
                signal: { type: 'sdp', sdp: pc.localDescription },
              }),
            });
          })
          .catch(() => {});
      } else {
        pc.ondatachannel = (ev) => {
          wireChannel(ev.channel);
        };
      }
    }

    this.callbacks.onPeerJoined(peerId, entry.name);
    this.callbacks.onStatusChanged();
    return entry;
  }

  private async handleSignal(
    fromId: string,
    signal: Record<string, unknown>,
  ): Promise<void> {
    const entry = this.ensurePeer(fromId, 'Survivor', false);
    const pc = entry.pc;
    if (!pc || !this.roomCode) return;

    try {
      if (signal.type === 'sdp' && signal.sdp) {
        const desc = new RTCSessionDescription(
          signal.sdp as RTCSessionDescriptionInit,
        );
        await pc.setRemoteDescription(desc);
        if (desc.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await fetch(apiUrl('/api/p2p'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'signal',
              roomCode: this.roomCode,
              fromId: this.localPeerId,
              toId: fromId,
              signal: { type: 'sdp', sdp: pc.localDescription },
            }),
          });
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        await pc.addIceCandidate(
          new RTCIceCandidate(signal.candidate as RTCIceCandidateInit),
        );
      }
    } catch {
      // Ignore out-of-order WebRTC signal
    }
  }

  private removePeer(peerId: string): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    try {
      entry.dc?.close();
      entry.pc?.close();
    } catch {
      // Ignore
    }
    this.cleanupPeerAudio(peerId);
    this.peers.delete(peerId);
    this.callbacks.onPeerLeft(peerId);
    this.callbacks.onStatusChanged();
  }

  private handleIncomingPacket(fromId: string, packet: P2PPacket): void {
    const entry = this.peers.get(fromId);
    if (entry) {
      entry.lastSeen = Date.now();
      if (packet.type === 'player_state') {
        entry.name = packet.name || entry.name;
        entry.x = packet.x;
        entry.y = packet.y;
        entry.z = packet.z;
        entry.biome = packet.biome || entry.biome;
      }
    }
    this.callbacks.onPacket(fromId, packet);
  }
}
