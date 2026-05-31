Add-Type -AssemblyName System.Runtime.WindowsRuntime

[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime]
[void][Windows.Storage.Streams.IInputStream, Windows.Storage, ContentType=WindowsRuntime]

$asTaskGeneric = $null
foreach ($m in [System.WindowsRuntimeSystemExtensions].GetMethods()) {
    if ($m.Name -eq 'AsTask' -and $m.GetParameters().Count -eq 1 -and $m.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation*') {
        $asTaskGeneric = $m
        break
    }
}

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $mgr.GetCurrentSession()
if (-not $session) { Write-Output "NO SESSION"; exit }

$info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
Write-Output "Title: $($info.Title)"

if ($info.Thumbnail) {
    try {
        $winStream = Await ($info.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        Write-Output "WinRT stream OK"
        
        # Get the AsStreamForRead method that takes IInputStream
        $asStreamMethod = $null
        foreach ($m in [System.IO.WindowsRuntimeStreamExtensions].GetMethods()) {
            if ($m.Name -eq 'AsStreamForRead' -and $m.GetParameters().Count -eq 1) {
                $asStreamMethod = $m
                break
            }
        }
        
        # Cast to IInputStream via the interface
        $inputStream = [Windows.Storage.Streams.IInputStream]$winStream
        Write-Output "Cast to IInputStream OK"
        
        $dotnetStream = $asStreamMethod.Invoke($null, @($inputStream))
        Write-Output "DotNet stream OK"
        
        $memStream = New-Object System.IO.MemoryStream
        $dotnetStream.CopyTo($memStream)
        $bytes = $memStream.ToArray()
        Write-Output "Bytes: $($bytes.Length)"
        $b64 = [Convert]::ToBase64String($bytes)
        Write-Output "Base64 length: $($b64.Length)"
        [System.IO.File]::WriteAllBytes("$env:TEMP\smtc_thumb_final.jpg", $bytes)
        Write-Output "Saved!"
    } catch {
        Write-Output "ERROR: $_"
    }
}
