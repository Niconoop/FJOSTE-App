Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Force-load WinRT namespaces by using their full type names
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime]

# Get the AsTask generic method
$asTaskGeneric = $null
foreach ($method in [System.WindowsRuntimeSystemExtensions].GetMethods()) {
    if ($method.Name -eq 'AsTask' -and $method.GetParameters().Count -eq 1) {
        $param = $method.GetParameters()[0]
        if ($param.ParameterType.Name -like 'IAsyncOperation*') {
            $asTaskGeneric = $method
            break
        }
    }
}

if (-not $asTaskGeneric) {
    Write-Output "FAIL: asTaskGeneric not found"
    exit
}

Write-Output "asTaskGeneric: OK"

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

try {
    $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    Write-Output "Manager: OK"
    
    $sessions = $mgr.GetSessions()
    Write-Output "Total sessions: $($sessions.Count)"
    
    foreach ($s in $sessions) {
        Write-Output "Session source: $($s.SourceAppUserModelId)"
        $info = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        Write-Output "  Title: $($info.Title)"
        Write-Output "  Artist: $($info.Artist)"
    }
    
    $session = $mgr.GetCurrentSession()
    if ($session) {
        Write-Output "Current session: $($session.SourceAppUserModelId)"
        $info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        Write-Output "Current title: $($info.Title)"
    } else {
        Write-Output "GetCurrentSession: NULL"
    }
} catch {
    Write-Output "ERROR: $_"
}
