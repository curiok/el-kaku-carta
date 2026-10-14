Add-Type -AssemblyName System.Drawing

function Create-AppIcon {
    param(
        [string]$SourcePath,
        [string]$DestinationPath,
        [int]$Size,
        [bool]$IsAdmin = $false
    )

    $src = [System.Drawing.Image]::FromFile($SourcePath)
    $bmp = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark background #17130D
    $bgBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 23, 19, 13))
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    if ($IsAdmin) {
        # Gold outer border
        $goldPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 201, 154, 22), [Math]::Max(2, [int]($Size * 0.02)))
        $g.DrawRectangle($goldPen, 1, 1, $Size - 2, $Size - 2)
        $goldPen.Dispose()
    }

    # Draw logo scaled with padding
    $pad = if ($IsAdmin) { [int]($Size * 0.12) } else { [int]($Size * 0.08) }
    $targetW = $Size - ($pad * 2)
    $targetH = $Size - ($pad * 2)
    if ($IsAdmin) {
        $targetH = [int]($targetH * 0.78) # leave room for admin badge
    }

    # Aspect ratio fit
    $scale = [Math]::Min($targetW / $src.Width, $targetH / $src.Height)
    $drawW = [int]($src.Width * $scale)
    $drawH = [int]($src.Height * $scale)
    $drawX = [int](($Size - $drawW) / 2)
    $drawY = if ($IsAdmin) { [int]($pad * 0.8) } else { [int](($Size - $drawH) / 2) }

    $g.DrawImage($src, $drawX, $drawY, $drawW, $drawH)

    if ($IsAdmin) {
        # Draw ADMIN Badge
        $badgeH = [int]($Size * 0.18)
        $badgeW = [int]($Size * 0.65)
        $badgeX = [int](($Size - $badgeW) / 2)
        $badgeY = [int]($Size - $badgeH - ($Size * 0.07))

        # Gold background for badge
        $badgeBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 201, 154, 22))
        $g.FillRectangle($badgeBg, $badgeX, $badgeY, $badgeW, $badgeH)

        # Inner dark rectangle
        $badgeInner = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 23, 19, 13))
        $border = [Math]::Max(1, [int]($Size * 0.01))
        $g.FillRectangle($badgeInner, $badgeX + $border, $badgeY + $border, $badgeW - ($border * 2), $badgeH - ($border * 2))

        # Text "ADMIN"
        $fontSize = [Math]::Max(8, [int]($badgeH * 0.55))
        $font = [System.Drawing.Font]::new("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
        $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 245, 197, 66))
        $sf = [System.Drawing.StringFormat]::new()
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        $textRect = [System.Drawing.RectangleF]::new($badgeX, $badgeY, $badgeW, $badgeH)
        $g.DrawString("ADMIN", $font, $textBrush, $textRect, $sf)

        $font.Dispose()
        $textBrush.Dispose()
        $sf.Dispose()
        $badgeBg.Dispose()
        $badgeInner.Dispose()
    }

    $bmp.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $src.Dispose()
    $bmp.Dispose()
    $g.Dispose()
    $bgBrush.Dispose()
}

$logo = "logo.png"

# Public menu icons
Create-AppIcon -SourcePath $logo -DestinationPath "public-menu/public/apple-touch-icon.png" -Size 180 -IsAdmin $false
Create-AppIcon -SourcePath $logo -DestinationPath "public-menu/public/icon-192.png" -Size 192 -IsAdmin $false
Create-AppIcon -SourcePath $logo -DestinationPath "public-menu/public/icon-512.png" -Size 512 -IsAdmin $false

# Admin icons
Create-AppIcon -SourcePath $logo -DestinationPath "admin/public/apple-touch-icon-admin.png" -Size 180 -IsAdmin $true
Create-AppIcon -SourcePath $logo -DestinationPath "admin/public/icon-admin-192.png" -Size 192 -IsAdmin $true
Create-AppIcon -SourcePath $logo -DestinationPath "admin/public/icon-admin-512.png" -Size 512 -IsAdmin $true

Write-Output "Icons generated successfully!"
