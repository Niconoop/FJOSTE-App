using System;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Globalization;

namespace OpenPipeClub {
    internal static class WinAPI {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

        [DllImport("kernel32.dll")]
        public static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);

        [DllImport("kernel32.dll")]
        public static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int dwSize, out IntPtr lpNumberOfBytesRead);

        [DllImport("kernel32.dll")]
        public static extern bool CloseHandle(IntPtr hObject);
    }

    internal class TrafficVehicle {
        public uint Id;
        public float X, Y, Z, Heading, Speed, Width, Height, Length;
        public bool IsTrailer, IsTmp;
    }

    internal class SemaphoreItem {
        public int Id;
        public float X, Y, Z;
        public float Heading;
        public int Type; // 1 = traffic light, 2 = gate
        public int State; // 0=off, 1=yellow, 2=red, 4=red-yellow, 8=green, 32=sleep
        public float TimeRemaining;
    }

    public class Program {
        private static MemoryMappedFile _routeMmf = null;
        private static MemoryMappedViewAccessor _routeAccessor = null;
        private static uint _lastRouteSeq = 0xFFFFFFFF;

        private static MemoryMappedFile _trafficMmf = null;
        private static MemoryMappedViewAccessor _trafficAccessor = null;
        private static uint _lastTrafficSeq = 0xFFFFFFFF;
        private static List<TrafficVehicle> _cachedTraffic = null;

        private static MemoryMappedFile _semaphoreMmf = null;
        private static MemoryMappedViewAccessor _semaphoreAccessor = null;
        private static List<SemaphoreItem> _cachedSemaphores = null;

        private static IntPtr _gameProcessHandle = IntPtr.Zero;
        private static int _gameProcessId = 0;
        private static long _cachedBaseCtrlPtrAddr = 0;
        private static byte[] _procBuffer8 = new byte[8];
        private static byte[] _procBuffer16 = new byte[16];
        private static byte[] _procBuffer32 = new byte[32];
        private static byte[] _procBuffer80 = new byte[80];
        private static byte[] _kdopBuffer = new byte[512 * 8];
        private static byte[] _instBuffer = new byte[32 * 16];
        private static byte[] _ruleBuffer = new byte[0xC0];
        private static byte[] _fastCheck = new byte[7];
        private static byte[] _scanChunk = new byte[2 * 1024 * 1024];

        private static byte[] _rawBuffer = new byte[8192];
        private static StringBuilder _sb = new StringBuilder(16384);
        private static bool _isTruckersMp = false;
        private static int _lastTmpCheckTick = 0;

        private static bool DetectTruckersMp(Process p) {
            try {
                if (p == null || p.HasExited) return false;
                foreach (ProcessModule mod in p.Modules) {
                    string name = mod.ModuleName;
                    if (name.IndexOf("ets2mp", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        name.IndexOf("atsmp", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        name.IndexOf("truckersmp", StringComparison.OrdinalIgnoreCase) >= 0) {
                        return true;
                    }
                }
            } catch { }
            return false;
        }

        public static void Main(string[] args) {
            Console.OutputEncoding = Encoding.UTF8;

            int parentPid = 0;
            for (int i = 0; i < args.Length; i++) {
                if ((args[i] == "-ParentPid" || args[i] == "--parent-pid") && i + 1 < args.Length) {
                    int.TryParse(args[i + 1], out parentPid);
                } else if (args[i].StartsWith("--parent-pid=")) {
                    int.TryParse(args[i].Substring("--parent-pid=".Length), out parentPid);
                }
            }

            Process parentProcess = null;
            if (parentPid > 0) {
                try {
                    parentProcess = Process.GetProcessById(parentPid);
                } catch {
                    return; // Parent already dead
                }
            }

            int checkCounter = 0;
            while (true) {
                if (parentProcess != null && ++checkCounter >= 30) {
                    checkCounter = 0;
                    try {
                        if (parentProcess.HasExited) return;
                    } catch {
                        return;
                    }
                }

                bool isConnected = false;
                try {
                    _sb.Length = 0;
                    _sb.Append('{');

                    // 1. Foreground Window Title
                    string activeTitle = "Unknown";
                    try {
                        IntPtr hwnd = WinAPI.GetForegroundWindow();
                        StringBuilder titleBuf = new StringBuilder(256);
                        if (WinAPI.GetWindowText(hwnd, titleBuf, 256) > 0) {
                            activeTitle = titleBuf.ToString();
                        }
                    } catch { }
                    AppendJsonProp(_sb, "activeTitle", activeTitle);

                    // 2. Active Steam User
                    string steamId = null;
                    try {
                        using (var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam\ActiveProcess")) {
                            if (key != null) {
                                object activeUser = key.GetValue("ActiveUser");
                                if (activeUser != null) {
                                    long activeUserId = Convert.ToInt64(activeUser);
                                    if (activeUserId != 0) {
                                        steamId = (activeUserId + 76561197960265728L).ToString();
                                    }
                                }
                            }
                        }
                    } catch { }
                    if (steamId != null) {
                        _sb.Append(',');
                        AppendJsonProp(_sb, "steamId", steamId);
                    }

                    // 3. SCS Telemetry
                    try {
                        using (var mmf = MemoryMappedFile.OpenExisting(@"Local\SCSTelemetry")) {
                            using (var accessor = mmf.CreateViewAccessor()) {
                                accessor.ReadArray(0, _rawBuffer, 0, 8192);
                                uint major = BitConverter.ToUInt32(_rawBuffer, 44);
                                _sb.Append(',');
                                AppendJsonProp(_sb, "gameVersion", major);

                                if (major != 0) {
                                    isConnected = true;
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "multiplayerTimeOffset", BitConverter.ToInt64(_rawBuffer, 32));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "gameType", BitConverter.ToUInt32(_rawBuffer, 52));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "speed", BitConverter.ToSingle(_rawBuffer, 948) * 3.6f);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "rpm", BitConverter.ToSingle(_rawBuffer, 952));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "fuel", BitConverter.ToSingle(_rawBuffer, 1000));

                                    float mass = BitConverter.ToSingle(_rawBuffer, 748) / 1000f;
                                    if (mass <= 0) {
                                        float unitMass = BitConverter.ToSingle(_rawBuffer, 944) / 1000f;
                                        uint unitCount = BitConverter.ToUInt32(_rawBuffer, 92);
                                        if (unitMass > 0 && unitCount > 0) {
                                            mass = unitMass * unitCount;
                                        }
                                    }
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "cargoMass", mass);

                                    float range = BitConverter.ToSingle(_rawBuffer, 1008);
                                    float avgCons = BitConverter.ToSingle(_rawBuffer, 1004);
                                    if (range <= 0 && avgCons > 0) {
                                        range = BitConverter.ToSingle(_rawBuffer, 1000) / avgCons;
                                    }
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "fuelRange", range);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "wearTruck", BitConverter.ToSingle(_rawBuffer, 1048) * 100f);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "wearCargo", BitConverter.ToSingle(_rawBuffer, 1468) * 100f);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "nextRest", BitConverter.ToInt32(_rawBuffer, 500));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "gear", BitConverter.ToInt32(_rawBuffer, 508));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "cruiseControl", BitConverter.ToSingle(_rawBuffer, 512) * 3.6f);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "navTime", BitConverter.ToSingle(_rawBuffer, 1064));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "navDistance", BitConverter.ToSingle(_rawBuffer, 1060));
                                    _sb.Append(',');
                                    float rawSpeedLimit = BitConverter.ToSingle(_rawBuffer, 1068);
                                    float speedLimit = (rawSpeedLimit > 0 && !float.IsNaN(rawSpeedLimit) && !float.IsInfinity(rawSpeedLimit)) ? rawSpeedLimit * 3.6f : 0f;
                                    if (speedLimit <= 0) {
                                        try {
                                            if (_routeMmf == null) {
                                                _routeMmf = MemoryMappedFile.OpenExisting(@"Local\OPCRouteData");
                                                _routeAccessor = _routeMmf.CreateViewAccessor();
                                            }
                                            if (_routeAccessor != null) {
                                                uint magic = _routeAccessor.ReadUInt32(0);
                                                if (magic == 0x4F505243) {
                                                    float routeSpeedLimit = _routeAccessor.ReadSingle(48);
                                                    if (routeSpeedLimit > 0 && !float.IsNaN(routeSpeedLimit) && !float.IsInfinity(routeSpeedLimit)) {
                                                        speedLimit = routeSpeedLimit * 3.6f;
                                                    }
                                                }
                                            }
                                        } catch { }
                                    }
                                    AppendJsonProp(_sb, "speedLimit", (float)Math.Round(speedLimit));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "avgConsumption", BitConverter.ToSingle(_rawBuffer, 1004));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "paused", _rawBuffer[4] > 0);

                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "brand", GetString(_rawBuffer, 2364, 64));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "model", GetString(_rawBuffer, 2492, 64));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "cargo", GetString(_rawBuffer, 2620, 64));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "dest", GetString(_rawBuffer, 2748, 64));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "dest_company", GetString(_rawBuffer, 2876, 64));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "source", GetString(_rawBuffer, 3004, 64));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "source_company", GetString(_rawBuffer, 3132, 64));

                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "posX", BitConverter.ToDouble(_rawBuffer, 2200));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "posY", BitConverter.ToDouble(_rawBuffer, 2208));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "posZ", BitConverter.ToDouble(_rawBuffer, 2216));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "heading", BitConverter.ToDouble(_rawBuffer, 2224));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "pitch", BitConverter.ToDouble(_rawBuffer, 2232));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "roll", BitConverter.ToDouble(_rawBuffer, 2240));

                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "income", BitConverter.ToUInt64(_rawBuffer, 4000));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "plannedDistance", BitConverter.ToUInt32(_rawBuffer, 100));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "odometer", BitConverter.ToSingle(_rawBuffer, 1056));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "jobDeliveredRevenue", BitConverter.ToInt64(_rawBuffer, 4208));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "jobDeliveredDistanceKm", BitConverter.ToSingle(_rawBuffer, 1104));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "jobDeliveredCargoDamage", BitConverter.ToSingle(_rawBuffer, 1100) * 100f);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "jobDeliveredEarnedXp", BitConverter.ToInt32(_rawBuffer, 636));
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "jobMarket", GetString(_rawBuffer, 3404, 32));

                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "parkBrake", _rawBuffer[1566] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "blinkerLeftActive", _rawBuffer[1578] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "blinkerRightActive", _rawBuffer[1579] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "blinkerLeftOn", _rawBuffer[1580] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "blinkerRightOn", _rawBuffer[1581] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "lightsBeamLow", _rawBuffer[1583] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "lightsBeamHigh", _rawBuffer[1584] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "lightsHazard", _rawBuffer[1588] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "lightsBeacon", _rawBuffer[1585] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "fuelWarning", _rawBuffer[1570] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "airPressureWarning", _rawBuffer[1568] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "oilPressureWarning", _rawBuffer[1572] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "waterTemperatureWarning", _rawBuffer[1573] > 0);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "batteryVoltageWarning", _rawBuffer[1574] > 0);

                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "connected", true);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "isTruckersMp", _isTruckersMp);

                                    // 4. In-Game GPS Route (OPCRouteData)
                                    try {
                                        if (_routeMmf == null) {
                                            _routeMmf = MemoryMappedFile.OpenExisting(@"Local\OPCRouteData");
                                            _routeAccessor = _routeMmf.CreateViewAccessor();
                                        }
                                        uint magic = _routeAccessor.ReadUInt32(0);
                                        if (magic == 0x4F505243) {
                                            uint seq = _routeAccessor.ReadUInt32(12);
                                            if (seq != _lastRouteSeq) {
                                                _lastRouteSeq = seq;
                                                uint count = _routeAccessor.ReadUInt32(8);
                                                _sb.Append(',');
                                                _sb.Append("\"routeWaypoints\":[");
                                                if (count > 0 && count <= 2000) {
                                                    for (uint i = 0; i < count; i++) {
                                                        long offset = 68 + (i * 12);
                                                        float wx = _routeAccessor.ReadSingle(offset);
                                                        float wy = _routeAccessor.ReadSingle(offset + 4);
                                                        float wz = _routeAccessor.ReadSingle(offset + 8);
                                                        if (i > 0) _sb.Append(',');
                                                        _sb.Append('[').Append(wx.ToString("F2", CultureInfo.InvariantCulture))
                                                           .Append(',').Append(wy.ToString("F2", CultureInfo.InvariantCulture))
                                                           .Append(',').Append(wz.ToString("F2", CultureInfo.InvariantCulture))
                                                           .Append(']');
                                                    }
                                                }
                                                _sb.Append(']');
                                                _sb.Append(',');
                                                AppendJsonProp(_sb, "routeCount", count);
                                            }
                                            _sb.Append(',');
                                            AppendJsonProp(_sb, "routeSeq", seq);
                                        }
                                    } catch {
                                        if (_routeAccessor != null) { try { _routeAccessor.Dispose(); } catch { } _routeAccessor = null; }
                                        if (_routeMmf != null) { try { _routeMmf.Dispose(); } catch { } _routeMmf = null; }
                                        _lastRouteSeq = 0xFFFFFFFF;
                                    }

                                    // 5. Nearby Traffic (OPCTrafficData)
                                    try {
                                        if (_trafficMmf == null) {
                                            _trafficMmf = MemoryMappedFile.OpenExisting(@"Local\OPCTrafficData");
                                            _trafficAccessor = _trafficMmf.CreateViewAccessor();
                                        }
                                        uint magic = _trafficAccessor.ReadUInt32(0);
                                        if (magic == 0x4F505452) {
                                            uint trafficSeq = _trafficAccessor.ReadUInt32(12);
                                            if (trafficSeq != _lastTrafficSeq || _cachedTraffic == null) {
                                                _lastTrafficSeq = trafficSeq;
                                                uint count = _trafficAccessor.ReadUInt32(8);
                                                var vehicles = new List<TrafficVehicle>();
                                                if (count > 0 && count <= 1024) {
                                                    for (uint i = 0; i < count; i++) {
                                                        long offset = 64 + (i * 48);
                                                        var v = new TrafficVehicle();
                                                        v.Id = _trafficAccessor.ReadUInt32(offset);
                                                        v.X = _trafficAccessor.ReadSingle(offset + 4);
                                                        v.Y = _trafficAccessor.ReadSingle(offset + 8);
                                                        v.Z = _trafficAccessor.ReadSingle(offset + 12);
                                                        v.Heading = _trafficAccessor.ReadSingle(offset + 16);
                                                        v.Speed = _trafficAccessor.ReadSingle(offset + 20);
                                                        v.Width = _trafficAccessor.ReadSingle(offset + 24);
                                                        v.Height = _trafficAccessor.ReadSingle(offset + 28);
                                                        v.Length = _trafficAccessor.ReadSingle(offset + 32);
                                                        v.IsTrailer = _trafficAccessor.ReadByte(offset + 36) == 1;
                                                        v.IsTmp = _trafficAccessor.ReadByte(offset + 37) == 1;
                                                        if (v.IsTmp) _isTruckersMp = true;
                                                        vehicles.Add(v);
                                                    }
                                                }
                                                _cachedTraffic = vehicles;
                                            }

                                            _sb.Append(',');
                                            _sb.Append("\"nearbyVehicles\":[");
                                            if (_cachedTraffic != null) {
                                                for (int i = 0; i < _cachedTraffic.Count; i++) {
                                                    if (i > 0) _sb.Append(',');
                                                    var v = _cachedTraffic[i];
                                                    _sb.Append("{\"id\":").Append(v.Id)
                                                       .Append(",\"x\":").Append(v.X.ToString("F2", CultureInfo.InvariantCulture))
                                                       .Append(",\"y\":").Append(v.Y.ToString("F2", CultureInfo.InvariantCulture))
                                                       .Append(",\"z\":").Append(v.Z.ToString("F2", CultureInfo.InvariantCulture))
                                                       .Append(",\"heading\":").Append(v.Heading.ToString("F3", CultureInfo.InvariantCulture))
                                                       .Append(",\"speed\":").Append(v.Speed.ToString("F1", CultureInfo.InvariantCulture))
                                                       .Append(",\"width\":").Append(v.Width.ToString("F2", CultureInfo.InvariantCulture))
                                                       .Append(",\"height\":").Append(v.Height.ToString("F2", CultureInfo.InvariantCulture))
                                                       .Append(",\"length\":").Append(v.Length.ToString("F2", CultureInfo.InvariantCulture))
                                                       .Append(",\"isTrailer\":").Append(v.IsTrailer ? "true" : "false")
                                                       .Append(",\"isTmp\":").Append(v.IsTmp ? "true" : "false")
                                                       .Append('}');
                                                }
                                            }
                                            _sb.Append(']');
                                            _sb.Append(',');
                                            AppendJsonProp(_sb, "nearbyCount", _cachedTraffic != null ? _cachedTraffic.Count : 0);
                                        }
                                    } catch {
                                        if (_trafficAccessor != null) { try { _trafficAccessor.Dispose(); } catch { } _trafficAccessor = null; }
                                        if (_trafficMmf != null) { try { _trafficMmf.Dispose(); } catch { } _trafficMmf = null; }
                                        _lastTrafficSeq = 0xFFFFFFFF;
                                        _cachedTraffic = null;
                                    }

                                    // 6. Semaphores / Traffic Lights (Local\ETS2LASemaphore or Local\OPCSemaphoreData, with Direct Process Fallback)
                                    try {
                                        var semaphores = new List<SemaphoreItem>();
                                        if (_semaphoreMmf == null) {
                                            try {
                                                _semaphoreMmf = MemoryMappedFile.OpenExisting(@"Local\ETS2LASemaphore");
                                            } catch {
                                                try {
                                                    _semaphoreMmf = MemoryMappedFile.OpenExisting(@"Local\OPCSemaphoreData");
                                                } catch { }
                                            }
                                            if (_semaphoreMmf != null) {
                                                _semaphoreAccessor = _semaphoreMmf.CreateViewAccessor();
                                            }
                                        }
                                        if (_semaphoreAccessor != null) {
                                            for (int i = 0; i < 40; i++) {
                                                long offset = i * 48;
                                                int semType = _semaphoreAccessor.ReadInt32(offset + 32);
                                                if (semType <= 0) continue;

                                                float px = _semaphoreAccessor.ReadSingle(offset);
                                                float py = _semaphoreAccessor.ReadSingle(offset + 4);
                                                float pz = _semaphoreAccessor.ReadSingle(offset + 8);
                                                short cx = _semaphoreAccessor.ReadInt16(offset + 12);
                                                short cy = _semaphoreAccessor.ReadInt16(offset + 14);
                                                float rw = _semaphoreAccessor.ReadSingle(offset + 16);
                                                float rx = _semaphoreAccessor.ReadSingle(offset + 20);
                                                float ry = _semaphoreAccessor.ReadSingle(offset + 24);
                                                float rz = _semaphoreAccessor.ReadSingle(offset + 28);
                                                float timeRem = _semaphoreAccessor.ReadSingle(offset + 36);
                                                int state = _semaphoreAccessor.ReadInt32(offset + 40);
                                                int id = _semaphoreAccessor.ReadInt32(offset + 44);

                                                float worldX = px + (float)cx * 512.0f;
                                                float worldY = py;
                                                float worldZ = pz + (float)cy * 512.0f;

                                                if (float.IsNaN(worldX) || float.IsInfinity(worldX) || Math.Abs(worldX) > 2000000.0f) continue;

                                                float siny_cosp = 2.0f * (rw * ry + rx * rz);
                                                float cosy_cosp = 1.0f - 2.0f * (ry * ry + rz * rz);
                                                float heading = (float)Math.Atan2(siny_cosp, cosy_cosp);

                                                var s = new SemaphoreItem();
                                                s.Id = id;
                                                s.X = worldX;
                                                s.Y = worldY;
                                                s.Z = worldZ;
                                                s.Heading = heading;
                                                s.Type = semType;
                                                s.State = state;
                                                s.TimeRemaining = timeRem;
                                                semaphores.Add(s);
                                            }
                                        }

                                        // If MMF has no active semaphores (e.g. singleplayer or older DLL locked), read directly from ETS2 memory
                                        if (semaphores.Count == 0) {
                                            ReadSemaphoresFromGameProcess(semaphores);
                                        }

                                        _cachedSemaphores = semaphores;
                                        _sb.Append(',');
                                        _sb.Append("\"semaphores\":[");
                                        for (int i = 0; i < _cachedSemaphores.Count; i++) {
                                            if (i > 0) _sb.Append(',');
                                            var s = _cachedSemaphores[i];
                                            _sb.Append("{\"id\":").Append(s.Id)
                                               .Append(",\"x\":").Append(s.X.ToString("F2", CultureInfo.InvariantCulture))
                                               .Append(",\"y\":").Append(s.Y.ToString("F2", CultureInfo.InvariantCulture))
                                               .Append(",\"z\":").Append(s.Z.ToString("F2", CultureInfo.InvariantCulture))
                                               .Append(",\"heading\":").Append(s.Heading.ToString("F3", CultureInfo.InvariantCulture))
                                               .Append(",\"type\":").Append(s.Type)
                                               .Append(",\"state\":").Append(s.State)
                                               .Append(",\"timeRemaining\":").Append(s.TimeRemaining.ToString("F1", CultureInfo.InvariantCulture))
                                               .Append('}');
                                        }
                                        _sb.Append(']');
                                    } catch {
                                        if (_semaphoreAccessor != null) { try { _semaphoreAccessor.Dispose(); } catch { } _semaphoreAccessor = null; }
                                        if (_semaphoreMmf != null) { try { _semaphoreMmf.Dispose(); } catch { } _semaphoreMmf = null; }
                                        _cachedSemaphores = null;
                                        _sb.Append(",\"semaphores\":[]");
                                    }
                                } else {
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "connected", false);
                                    _sb.Append(',');
                                    AppendJsonProp(_sb, "error", "no_data");
                                }
                            }
                        }
                    } catch {
                        _sb.Append(',');
                        AppendJsonProp(_sb, "connected", false);
                        _sb.Append(',');
                        AppendJsonProp(_sb, "error", "not_running");
                    }

                    _sb.Append('}');
                    Console.WriteLine(_sb.ToString());
                } catch {
                    Console.WriteLine("{\"error\":\"bridge_error\",\"connected\":false}");
                }

                // Adaptive Sleep: 30ms (~33 FPS) when in-game, 800ms when game disconnected (saves CPU & RAM)
                Thread.Sleep(isConnected ? 30 : 800);
            }
        }

        private static void ReadSemaphoresFromGameProcess(List<SemaphoreItem> semaphores) {
            try {
                if (_gameProcessHandle == IntPtr.Zero || _cachedBaseCtrlPtrAddr == 0) {
                    Process[] procs = Process.GetProcessesByName("eurotrucks2");
                    if (procs.Length == 0) procs = Process.GetProcessesByName("amtrucks");
                    if (procs.Length == 0) return;

                    Process p = procs[0];
                    if (Math.Abs(Environment.TickCount - _lastTmpCheckTick) > 5000) {
                        _lastTmpCheckTick = Environment.TickCount;
                        if (DetectTruckersMp(p)) _isTruckersMp = true;
                    }
                    if (_gameProcessHandle == IntPtr.Zero || _gameProcessId != p.Id) {
                        if (_gameProcessHandle != IntPtr.Zero) {
                            try { WinAPI.CloseHandle(_gameProcessHandle); } catch { }
                            _gameProcessHandle = IntPtr.Zero;
                        }
                        _gameProcessId = p.Id;
                        _gameProcessHandle = WinAPI.OpenProcess(0x0010, false, p.Id);
                        _cachedBaseCtrlPtrAddr = 0;
                    }

                    if (_gameProcessHandle == IntPtr.Zero) return;

                    long modBase = p.MainModule.BaseAddress.ToInt64();
                    long modSize = p.MainModule.ModuleMemorySize;

                    // 1. Fast check at known offset 0x77D8BA
                    IntPtr readFast;
                    if (WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(modBase + 0x77D8BA), _fastCheck, 7, out readFast)) {
                        if (_fastCheck[0] == 0x48 && _fastCheck[1] == 0x8B && _fastCheck[2] == 0x15) {
                            int disp = BitConverter.ToInt32(_fastCheck, 3);
                            _cachedBaseCtrlPtrAddr = (modBase + 0x77D8BA) + 7 + disp;
                        }
                    }

                    // 2. Pattern scan fallback if offset shifted
                    if (_cachedBaseCtrlPtrAddr == 0) {
                        int chunkSize = _scanChunk.Length;
                        for (long offset = 0; offset < modSize; offset += chunkSize - 64) {
                            IntPtr read;
                            if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(modBase + offset), _scanChunk, chunkSize, out read)) continue;
                            int len = read.ToInt32();
                            for (int i = 0; i < len - 20; i++) {
                                if (_scanChunk[i] == 0x48 && _scanChunk[i+1] == 0x8B && _scanChunk[i+2] == 0x15 &&
                                    _scanChunk[i+7] == 0x48 && _scanChunk[i+8] == 0x8B &&
                                    _scanChunk[i+10] == 0x48 && _scanChunk[i+11] == 0x8B && _scanChunk[i+12] == 0x41 &&
                                    _scanChunk[i+14] == 0x48 && _scanChunk[i+15] == 0x8B && _scanChunk[i+16] == 0x92) {
                                    int disp = BitConverter.ToInt32(_scanChunk, i + 3);
                                    _cachedBaseCtrlPtrAddr = (modBase + offset + i) + 7 + disp;
                                    break;
                                }
                            }
                            if (_cachedBaseCtrlPtrAddr != 0) break;
                        }
                    }
                }

                if (_gameProcessHandle == IntPtr.Zero || _cachedBaseCtrlPtrAddr == 0) return;

                IntPtr bytesRead;
                if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(_cachedBaseCtrlPtrAddr), _procBuffer8, 8, out bytesRead)) {
                    try { WinAPI.CloseHandle(_gameProcessHandle); } catch { }
                    _gameProcessHandle = IntPtr.Zero;
                    _cachedBaseCtrlPtrAddr = 0;
                    return;
                }

                long baseCtrlInst = BitConverter.ToInt64(_procBuffer8, 0);
                if (baseCtrlInst == 0) return;

                // kdop is at baseCtrlInst + 0x648 (pointer at +8, count at +16)
                if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(baseCtrlInst + 0x648), _procBuffer32, 24, out bytesRead)) return;
                long kdopItems = BitConverter.ToInt64(_procBuffer32, 8);
                long kdopCount = BitConverter.ToInt64(_procBuffer32, 16);
                if (kdopCount <= 0 || kdopItems == 0) return;

                int maxKdop = (int)Math.Min(kdopCount, 512);
                if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(kdopItems), _kdopBuffer, maxKdop * 8, out bytesRead)) return;

                for (int ki = 0; ki < maxKdop && semaphores.Count < 40; ki++) {
                    long item = BitConverter.ToInt64(_kdopBuffer, ki * 8);
                    if (item == 0) continue;

                    if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(item), _procBuffer80, 80, out bytesRead)) continue;
                    byte itemType = _procBuffer80[0x0A];
                    if (itemType != 4) continue; // 4 = prefab

                    long segment = BitConverter.ToInt64(_procBuffer80, 0x48);
                    if (segment == 0) continue;

                    if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(segment + 0x88), _procBuffer16, 16, out bytesRead)) continue;
                    long semInstPtr = BitConverter.ToInt64(_procBuffer16, 0);
                    long semInstCount = BitConverter.ToInt64(_procBuffer16, 8);
                    if (semInstPtr == 0 || semInstCount <= 0) continue;

                    int maxSem = (int)Math.Min(semInstCount, 32);
                    if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(semInstPtr), _instBuffer, maxSem * 16, out bytesRead)) return;

                    for (int si = 0; si < maxSem && semaphores.Count < 40; si++) {
                        uint semId = BitConverter.ToUInt32(_instBuffer, si * 16);
                        long actorPtr = BitConverter.ToInt64(_instBuffer, si * 16 + 8);
                        if (actorPtr == 0) continue;

                        // placement_t is at actorPtr + 0x28 (32 bytes)
                        if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(actorPtr + 0x28), _procBuffer32, 32, out bytesRead)) continue;
                        float px = BitConverter.ToSingle(_procBuffer32, 0);
                        float py = BitConverter.ToSingle(_procBuffer32, 4);
                        float pz = BitConverter.ToSingle(_procBuffer32, 8);
                        short cx = BitConverter.ToInt16(_procBuffer32, 12);
                        short cz = BitConverter.ToInt16(_procBuffer32, 14);
                        float rw = BitConverter.ToSingle(_procBuffer32, 16);
                        float rx = BitConverter.ToSingle(_procBuffer32, 20);
                        float ry = BitConverter.ToSingle(_procBuffer32, 24);
                        float rz = BitConverter.ToSingle(_procBuffer32, 28);

                        // trafficRule pointer is at actorPtr + 0x100
                        if (!WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(actorPtr + 0x100), _procBuffer8, 8, out bytesRead)) continue;
                        long trafficRule = BitConverter.ToInt64(_procBuffer8, 0);

                        int semType = 2; // Gate
                        int state = 0;
                        float timeRem = 0;

                        if (trafficRule != 0) {
                            semType = 1; // Traffic light
                            if (WinAPI.ReadProcessMemory(_gameProcessHandle, new IntPtr(trafficRule), _ruleBuffer, 0xC0, out bytesRead)) {
                                state = BitConverter.ToInt32(_ruleBuffer, 0x70);
                                timeRem = BitConverter.ToSingle(_ruleBuffer, 0xB8);
                            }
                        }

                        float worldX = px + (float)cx * 512.0f;
                        float worldY = py;
                        float worldZ = pz + (float)cz * 512.0f;

                        if (float.IsNaN(worldX) || float.IsInfinity(worldX) || Math.Abs(worldX) > 2000000.0f) continue;

                        float siny_cosp = 2.0f * (rw * ry + rx * rz);
                        float cosy_cosp = 1.0f - 2.0f * (ry * ry + rz * rz);
                        float heading = (float)Math.Atan2(siny_cosp, cosy_cosp);

                        var s = new SemaphoreItem();
                        s.Id = (int)semId;
                        s.X = worldX;
                        s.Y = worldY;
                        s.Z = worldZ;
                        s.Heading = heading;
                        s.Type = semType;
                        s.State = state;
                        s.TimeRemaining = timeRem;
                        semaphores.Add(s);
                    }
                }
            } catch {
                // Ignore transient memory read exceptions
            }
        }

        private static void AppendJsonProp(StringBuilder sb, string key, string val) {
            sb.Append('"').Append(key).Append("\":\"").Append(EscapeJson(val ?? "")).Append('"');
        }
        private static void AppendJsonProp(StringBuilder sb, string key, bool val) {
            sb.Append('"').Append(key).Append("\":").Append(val ? "true" : "false");
        }
        private static void AppendJsonProp(StringBuilder sb, string key, int val) {
            sb.Append('"').Append(key).Append("\":").Append(val);
        }
        private static void AppendJsonProp(StringBuilder sb, string key, uint val) {
            sb.Append('"').Append(key).Append("\":").Append(val);
        }
        private static void AppendJsonProp(StringBuilder sb, string key, long val) {
            sb.Append('"').Append(key).Append("\":").Append(val);
        }
        private static void AppendJsonProp(StringBuilder sb, string key, ulong val) {
            sb.Append('"').Append(key).Append("\":").Append(val);
        }
        private static void AppendJsonProp(StringBuilder sb, string key, float val) {
            if (float.IsNaN(val) || float.IsInfinity(val)) val = 0;
            sb.Append('"').Append(key).Append("\":").Append(val.ToString("G9", CultureInfo.InvariantCulture));
        }
        private static void AppendJsonProp(StringBuilder sb, string key, double val) {
            if (double.IsNaN(val) || double.IsInfinity(val)) val = 0;
            sb.Append('"').Append(key).Append("\":").Append(val.ToString("G17", CultureInfo.InvariantCulture));
        }

        private static string EscapeJson(string s) {
            if (string.IsNullOrEmpty(s)) return "";
            bool needsEscape = false;
            for (int i = 0; i < s.Length; i++) {
                char ch = s[i];
                if (ch < ' ' || ch == '\\' || ch == '"') {
                    needsEscape = true;
                    break;
                }
            }
            if (!needsEscape) return s;

            StringBuilder b = new StringBuilder(s.Length + 8);
            for (int i = 0; i < s.Length; i++) {
                char c = s[i];
                switch (c) {
                    case '\\': b.Append(@"\\"); break;
                    case '"': b.Append(@"\"""); break;
                    case '\n': b.Append(@"\n"); break;
                    case '\r': b.Append(@"\r"); break;
                    case '\t': b.Append(@"\t"); break;
                    default:
                        if (c < ' ') {
                            b.AppendFormat(@"\u{0:x4}", (int)c);
                        } else {
                            b.Append(c);
                        }
                        break;
                }
            }
            return b.ToString();
        }

        private static string GetString(byte[] data, int offset, int length) {
            if (offset + length > data.Length) return "";
            int len = 0;
            while (len < length && data[offset + len] != 0) len++;
            if (len == 0) return "";
            string s = Encoding.UTF8.GetString(data, offset, len);
            if (s.Contains("\uFFFD")) {
                try {
                    return Encoding.GetEncoding(1252).GetString(data, offset, len).Trim();
                } catch { }
            }
            return s.Trim();
        }
    }
}
