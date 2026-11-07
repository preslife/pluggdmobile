#!/usr/bin/env python3
"""Compile the installed video library’s real ownership methods against isolated media-center fixtures."""
from pathlib import Path
import subprocess, tempfile, sys
app=Path(__file__).resolve().parents[1]
if sys.platform != 'darwin': raise SystemExit('This exact-source Swift check requires macOS and Xcode command-line tools.')
scratch=Path(tempfile.mkdtemp(prefix='pluggd-nowplaying-check-'))
s=(app/'node_modules/expo-video/ios/NowPlayingManager.swift').read_text()
def block(start):
 a=s.index(start);i=s.index('{',a)+1;d=1
 while d:
  d+=(s[i]=='{')-(s[i]=='}');i+=1
 return s[a:i]
methods='\n'.join(block(x) for x in ['func registerPlayer(', 'func unregisterPlayer(', 'private func removeNowPlayingTargets(']).replace('DispatchQueue.main.async','MainQueue.async')
fields='\n'.join(line.replace('private ','') for line in s.splitlines() if any(x in line for x in ['var registeredPlayerIDs =', 'var players =', 'var playTarget:', 'var pauseTarget:', 'var skipForwardTarget:', 'var skipBackwardTarget:', 'var playbackPositionTarget:', 'weak var mostRecentInteractionPlayer:']))
stub=r'''import Foundation
class AVPlayer: NSObject { var rate: Float = 0 }
class Observer { func registerDelegate(delegate: Manager) {}; func unregisterDelegate(delegate: Manager) {} }
class VideoPlayer: NSObject { let ref = AVPlayer(); var observer: Observer? = Observer(); var playbackRate: Float { ref.rate } }
class Token: NSObject {}
class MPRemoteCommand {
 var tokens: [Token] = []
 var nilRemovals = 0
 func removeTarget(_ target: Any?) { guard let target = target as? Token else { nilRemovals += 1; tokens.removeAll(); return }; tokens.removeAll { $0 === target } }
}
class MPRemoteCommandCenter {
 static let instance = MPRemoteCommandCenter()
 static func shared() -> MPRemoteCommandCenter { instance }
 let playCommand = MPRemoteCommand(); let pauseCommand = MPRemoteCommand(); let skipForwardCommand = MPRemoteCommand(); let skipBackwardCommand = MPRemoteCommand(); let changePlaybackPositionCommand = MPRemoteCommand()
 var commands: [MPRemoteCommand] { [playCommand,pauseCommand,skipForwardCommand,skipBackwardCommand,changePlaybackPositionCommand] }
}
class MPNowPlayingInfoCenter { static let instance = MPNowPlayingInfoCenter(); static func `default`() -> MPNowPlayingInfoCenter { instance }; var nowPlayingInfo: [String:String]? }
enum MainQueue { static var work: [() -> Void] = []; static func async(execute: @escaping () -> Void) { work.append(execute) }; static func flush() { while !work.isEmpty { let next = work.removeFirst(); next() } } }
class Manager {
FIELDS
METHODS
 func setMostRecentInteractionPlayer(player: AVPlayer?) { mostRecentInteractionPlayer = player }
 func seedOwnTargets() { let own = (0..<5).map { _ in Token() }; for (command, token) in zip(MPRemoteCommandCenter.shared().commands, own) { command.tokens.append(token) }; playTarget = own[0]; pauseTarget = own[1]; skipForwardTarget = own[2]; skipBackwardTarget = own[3]; playbackPositionTarget = own[4] }
 func cleanupTargets() { removeNowPlayingTargets(commandCenter: .shared()) }
}
let center = MPRemoteCommandCenter.shared()
let music = (0..<5).map { _ in Token() }
func seedMusic() { for (command,token) in zip(center.commands,music) { command.tokens = [token] }; MPNowPlayingInfoCenter.default().nowPlayingInfo = ["title":"Amachill", "rate":"0"] }
func assertMusicTargets() { for (command,token) in zip(center.commands,music) { precondition(command.tokens.contains { $0 === token }, "Preview removed a music remote-command target"); precondition(command.nilRemovals == 0, "Cleanup called removeTarget(nil)") } }
func assertMusicInfo() { precondition(MPNowPlayingInfoCenter.default().nowPlayingInfo?["title"] == "Amachill", "Unregistered preview erased paused music metadata") }
seedMusic()
let manager = Manager()
let preview = VideoPlayer()
manager.unregisterPlayer(preview); MainQueue.flush()
assertMusicInfo(); assertMusicTargets()
manager.unregisterPlayer(preview); MainQueue.flush()
assertMusicInfo(); assertMusicTargets()
print("PASS never-registered preview setup and repeated teardown preserve paused music")
manager.cleanupTargets(); MainQueue.flush()
assertMusicTargets(); assertMusicInfo()
print("PASS nil Expo tokens never remove unrelated music targets")
let first = VideoPlayer(); let second = VideoPlayer()
manager.registerPlayer(first); manager.registerPlayer(first); manager.registerPlayer(second)
manager.seedOwnTargets()
manager.unregisterPlayer(first); MainQueue.flush()
assertMusicInfo(); assertMusicTargets()
precondition(center.commands.allSatisfy { $0.tokens.count == 2 })
manager.players.remove(second) // weak registry may clear before deinit calls unregister
manager.unregisterPlayer(second); MainQueue.flush()
precondition(MPNowPlayingInfoCenter.default().nowPlayingInfo?.isEmpty == true)
assertMusicTargets(); precondition(center.commands.allSatisfy { $0.tokens.count == 1 })
print("PASS duplicate registration, multiple owners and weak-table teardown clean only owned targets")
seedMusic();manager.unregisterPlayer(second);MainQueue.flush()
assertMusicInfo();assertMusicTargets()
print("PASS duplicate legitimate-owner teardown does not erase newer paused music")
'''
out=scratch/'now-playing.swift'
out.write_text(stub.replace('FIELDS',fields).replace('METHODS',methods))
subprocess.run(['xcrun','swiftc',str(out),'-o',str(scratch/'now-playing-check')],check=True)
subprocess.run([str(scratch/'now-playing-check')],check=True)
