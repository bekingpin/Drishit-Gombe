param(
    [string]$ImagePath,
    [string]$Name
)

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

if ([string]::IsNullOrWhiteSpace($ImagePath)) {
    Write-Error "ImagePath was not supplied."
    exit 1
}

if (-not (Test-Path -LiteralPath $ImagePath)) {
    Write-Error "Image file not found: $ImagePath"
    exit 1
}

$ImagePath = [System.IO.Path]::GetFullPath($ImagePath)

Write-Host "Loading image:"
Write-Host $ImagePath


# =========================================================
# WINDOW
# =========================================================

$window = New-Object System.Windows.Window

$window.Width = 180
$window.Height = 330

$window.WindowStyle = "None"
$window.ResizeMode = "NoResize"

$window.ShowInTaskbar = $true
$window.Topmost = $true

$window.AllowsTransparency = $true
$window.Background =
    [System.Windows.Media.Brushes]::Transparent

$window.Title = $Name


# =========================================================
# CANVAS
# =========================================================

$canvas =
    New-Object System.Windows.Controls.Canvas

$window.Content = $canvas


# =========================================================
# CHARM POSITION
# =========================================================

$imageWidth = 135
$imageLeft = 22.5

$charmCenterX =
    $imageLeft + ($imageWidth / 2)


# =========================================================
# ROPE
# =========================================================

$rope =
    New-Object System.Windows.Shapes.Line

$rope.Stroke =
    [System.Windows.Media.Brushes]::BurlyWood

$rope.StrokeThickness = 3

$rope.StrokeStartLineCap =
    [System.Windows.Media.PenLineCap]::Round

$rope.StrokeEndLineCap =
    [System.Windows.Media.PenLineCap]::Round

$rope.X1 = $charmCenterX
$rope.Y1 = 4

$rope.X2 = $charmCenterX
$rope.Y2 = 100

$canvas.Children.Add($rope)


# =========================================================
# ROPE SHADOW
# =========================================================

$ropeShadow =
    New-Object System.Windows.Shapes.Line

$ropeShadow.Stroke =
    [System.Windows.Media.Brushes]::SaddleBrown

$ropeShadow.StrokeThickness = 5

$ropeShadow.StrokeStartLineCap =
    [System.Windows.Media.PenLineCap]::Round

$ropeShadow.StrokeEndLineCap =
    [System.Windows.Media.PenLineCap]::Round

$ropeShadow.X1 = $charmCenterX
$ropeShadow.Y1 = 4

$ropeShadow.X2 = $charmCenterX
$ropeShadow.Y2 = 100

$canvas.Children.Insert(
    0,
    $ropeShadow
)


# =========================================================
# TOP KNOT
# =========================================================

$knot =
    New-Object System.Windows.Shapes.Ellipse

$knot.Width = 12
$knot.Height = 12

$knot.Fill =
    [System.Windows.Media.Brushes]::SaddleBrown

[System.Windows.Controls.Canvas]::SetLeft(
    $knot,
    $charmCenterX - 6
)

[System.Windows.Controls.Canvas]::SetTop(
    $knot,
    -2
)

$canvas.Children.Add($knot)


# =========================================================
# IMAGE
# =========================================================

$image =
    New-Object System.Windows.Controls.Image

$image.Width = $imageWidth
$image.Height = 135

$image.Stretch =
    [System.Windows.Media.Stretch]::Uniform

$image.HorizontalAlignment =
    "Center"


# =========================================================
# LOAD IMAGE
# =========================================================

$fileStream =
    [System.IO.File]::OpenRead($ImagePath)

$bitmap =
    New-Object System.Windows.Media.Imaging.BitmapImage

$bitmap.BeginInit()

$bitmap.CacheOption =
    [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad

$bitmap.StreamSource =
    $fileStream

$bitmap.EndInit()

$fileStream.Close()
$fileStream.Dispose()

$image.Source = $bitmap


# =========================================================
# ROTATION
# =========================================================

$rotate =
    New-Object System.Windows.Media.RotateTransform

$rotate.Angle = 0

$rotate.CenterX = 0.5
$rotate.CenterY = 0.0

$image.RenderTransform =
    $rotate


# =========================================================
# INITIAL IMAGE POSITION
# =========================================================

$startY = 40

[System.Windows.Controls.Canvas]::SetLeft(
    $image,
    $imageLeft
)

[System.Windows.Controls.Canvas]::SetTop(
    $image,
    $startY
)

$canvas.Children.Add($image)


# =========================================================
# NAME
# =========================================================

$nameText =
    New-Object System.Windows.Controls.TextBlock

$nameText.Text = $Name

$nameText.FontSize = 9

$nameText.Foreground =
    [System.Windows.Media.Brushes]::White

$nameText.HorizontalAlignment =
    "Center"

$nameText.TextAlignment =
    "Center"

$nameText.Width =
    $imageWidth

[System.Windows.Controls.Canvas]::SetLeft(
    $nameText,
    $imageLeft
)

[System.Windows.Controls.Canvas]::SetTop(
    $nameText,
    $startY + 140
)

$canvas.Children.Add($nameText)


# =========================================================
# WINDOW POSITION
# =========================================================

$screenWidth =
    [System.Windows.SystemParameters]::PrimaryScreenWidth

$window.Left =
    $screenWidth - $window.Width

$window.Top = 0


# =========================================================
# PERSISTENT PHYSICS STATE
# =========================================================

$state = @{
    Y = $startY
    Velocity = 0.0
    Gravity = 0.72
    RestY = 150.0
    Bounce = 0.48
    Settled = 0
}


# =========================================================
# UPDATE ROPE
# =========================================================

function Update-Rope {

    $rope.X1 =
        $charmCenterX

    $rope.Y1 =
        4

    $rope.X2 =
        $charmCenterX

    $rope.Y2 =
        $state.Y

    $ropeShadow.X1 =
        $charmCenterX

    $ropeShadow.Y1 =
        4

    $ropeShadow.X2 =
        $charmCenterX

    $ropeShadow.Y2 =
        $state.Y
}


# =========================================================
# ANIMATION TIMER
# =========================================================

$timer =
    New-Object System.Windows.Threading.DispatcherTimer

$timer.Interval =
    [TimeSpan]::FromMilliseconds(16)


$timer.Add_Tick({

    # -----------------------------------------------------
    # GRAVITY
    # -----------------------------------------------------

    $state.Velocity =
        $state.Velocity +
        $state.Gravity


    # -----------------------------------------------------
    # MOVEMENT
    # -----------------------------------------------------

    $state.Y =
        $state.Y +
        $state.Velocity


    # -----------------------------------------------------
    # COLLISION / BOUNCE
    # -----------------------------------------------------

    if ($state.Y -ge $state.RestY) {

        $state.Y =
            $state.RestY


        $state.Velocity =
            -(
                [Math]::Abs(
                    $state.Velocity
                ) *
                $state.Bounce
            )


        if (
            [Math]::Abs(
                $state.Velocity
            ) -lt 1.5
        ) {

            $state.Velocity = 0

            $state.Settled++

        }
        else {

            $state.Settled = 0

        }
    }


    # -----------------------------------------------------
    # NATURAL ROTATION
    # -----------------------------------------------------

    $rotation =
        $state.Velocity * 0.08


    if ($rotation -gt 3) {
        $rotation = 3
    }

    if ($rotation -lt -3) {
        $rotation = -3
    }


    $rotate.Angle =
        $rotation


    # -----------------------------------------------------
    # UPDATE IMAGE
    # -----------------------------------------------------

    [System.Windows.Controls.Canvas]::SetTop(
        $image,
        $state.Y
    )


    [System.Windows.Controls.Canvas]::SetTop(
        $nameText,
        $state.Y + 140
    )


    # -----------------------------------------------------
    # UPDATE ROPE
    # -----------------------------------------------------

    Update-Rope


    # -----------------------------------------------------
    # STOP WHEN SETTLED
    # -----------------------------------------------------

    if ($state.Settled -gt 10) {

        $state.Velocity = 0

        $rotate.Angle = 0

        $timer.Stop()

        Write-Host "Charm settled."

    }

})


# =========================================================
# DRAGGING
# =========================================================

$window.Add_MouseLeftButtonDown({

    $timer.Stop()

    $window.DragMove()

})


# =========================================================
# DOUBLE CLICK TO CLOSE
# =========================================================

$window.Add_MouseDoubleClick({

    $window.Close()

})


# =========================================================
# START ANIMATION
# =========================================================

$window.Add_ContentRendered({

    $timer.Start()

})


# =========================================================
# SHOW
# =========================================================

$window.ShowDialog() |
    Out-Null