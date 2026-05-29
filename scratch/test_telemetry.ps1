Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}

public class SCSTelemetry {
    public static Dictionary<string, object> GetData() {
        var result = new Dictionary<string, object>();
        
        try {
            var hwnd = WinAPI.GetForegroundWindow();
            var title = new StringBuilder(256);
            if (WinAPI.GetWindowText(hwnd, title, 256) > 0) {
                result["activeTitle"] = title.ToString();
            } else {
                result["activeTitle"] = "Unknown";
            }
        } catch {
            result["activeTitle"] = "Unknown";
        }

        try {
            using (var mmf = MemoryMappedFile.OpenExisting("Local\\SCSTelemetry")) {
                using (var accessor = mmf.CreateViewAccessor()) {
                    byte[] raw = new byte[8192];
                    accessor.ReadArray(0, raw, 0, 8192);

                    uint major = BitConverter.ToUInt32(raw, 44);
                    result["gameVersion"] = major;
                    result["connected"] = true;
                }
            }
        } catch (Exception ex) {
            result["error"] = "not_running";
            result["exception"] = ex.Message;
        }
        return result;
    }
}
"@

$data = [SCSTelemetry]::GetData()
$data | ConvertTo-Json
