# Create Desktop Shortcut for Droguerie Management System (Lightning Mode)

$WshShell = New-Object -comObject WScript.Shell
$Desktop = $WshShell.SpecialFolders.Item("Desktop")

# Create the shortcut
$Shortcut = $WshShell.CreateShortcut("$Desktop\Droguerie Management System.lnk")
$Shortcut.TargetPath = "C:\Users\lenovo\Desktop\Platform StockD\Platform StockD\start-droguerie.bat"
$Shortcut.WorkingDirectory = "C:\Users\lenovo\Desktop\Platform StockD\Platform StockD"
$Shortcut.Description = "Start Droguerie Management System in Lightning Mode and open in browser"
$Shortcut.IconLocation = "C:\Program Files\nodejs\node.exe,0"
$Shortcut.Save()

Write-Host "Desktop shortcut updated successfully!" -ForegroundColor Green
Write-Host "Location: $Desktop\Droguerie Management System.lnk" -ForegroundColor Yellow
Write-Host "Now uses Lightning Mode for ultra-fast compilation!" -ForegroundColor Cyan
Write-Host "Double-click the shortcut to start your application!" -ForegroundColor White
