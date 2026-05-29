Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@

$hwnd = [WinAPI]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 256
if ([WinAPI]::GetWindowText($hwnd, $title, 256) -gt 0) {
    Write-Output "TITLE: $($title.ToString())"
} else {
    Write-Output "TITLE: Unknown"
}
