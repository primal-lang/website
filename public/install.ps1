#Requires -Version 5.1
<#
.SYNOPSIS
    Primal SDK Installer for Windows

.DESCRIPTION
    Downloads and installs the Primal programming language SDK.

.PARAMETER Version
    Install a specific version (e.g., 0.4.3). If not specified, installs the latest version.

.PARAMETER InstallDir
    Override default install location ($env:LOCALAPPDATA\Primal\bin)

.PARAMETER Uninstall
    Remove Primal binary and PATH entry

.EXAMPLE
    .\install.ps1
    Install the latest version

.EXAMPLE
    .\install.ps1 -Version 0.4.3
    Install a specific version

.EXAMPLE
    .\install.ps1 -Uninstall
    Uninstall Primal
#>

param(
    [string]$Version,
    [string]$InstallDir,
    [switch]$Uninstall,
    [switch]$Help
)

# ============================================================================
# Configuration
# ============================================================================

$script:GITHUB_REPO = "primal-lang/sdk"
$script:BINARY_NAME = "primal"
$script:BINARY_FILE = "primal.exe"
$script:DEFAULT_INSTALL_DIR = "$env:LOCALAPPDATA\Primal\bin"
$script:USER_AGENT = "primal-installer"
$script:PATH_WAS_MODIFIED = $false

if ($InstallDir) {
    $script:INSTALL_DIR = $InstallDir
} else {
    $script:INSTALL_DIR = $script:DEFAULT_INSTALL_DIR
}

# GitHub refuses anything older, and the default on this Windows version may
# still be TLS 1.0.
[Net.ServicePointManager]::SecurityProtocol =
    [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# ============================================================================
# Output Capabilities
# ============================================================================

# In-place redrawing only makes sense on an interactive console. Colors are
# always safe: Write-Host asks the host to color the text rather than emitting
# escape codes, so a redirected run is left with plain text either way.
$script:IS_TTY = $false

try {
    if (-not [Console]::IsOutputRedirected) {
        $null = $Host.UI.RawUI.CursorPosition
        $script:IS_TTY = $true
    }
}
catch {
    $script:IS_TTY = $false
}

$script:COLOR_RED = "Red"
$script:COLOR_GREEN = "Green"
$script:COLOR_DIM = "DarkGray"
$script:COLOR_BOLD = "White"

# The rail is drawn with box characters, which the console can only render
# under a UTF-8 code page. Anything else falls back to ASCII. The original
# encoding is put back before the script ends.
$script:ORIGINAL_OUTPUT_ENCODING = $null
$script:GLYPH_UNICODE = $false

try {
    if ([Console]::OutputEncoding.CodePage -ne 65001) {
        $script:ORIGINAL_OUTPUT_ENCODING = [Console]::OutputEncoding
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    }

    $script:GLYPH_UNICODE = ([Console]::OutputEncoding.CodePage -eq 65001)
}
catch {
    $script:GLYPH_UNICODE = $false
}

# Written as code points rather than literals: Windows PowerShell reads a
# script without a byte order mark as ANSI, which would mangle them.
if ($script:GLYPH_UNICODE) {
    $script:GLYPH_TOP = [string][char]0x250C     # top left corner
    $script:GLYPH_BAR = [string][char]0x2502     # vertical bar
    $script:GLYPH_END = [string][char]0x2514     # bottom left corner
    $script:GLYPH_PENDING = [string][char]0x25C7 # hollow diamond
    $script:GLYPH_DONE = [string][char]0x25C6    # filled diamond
    $script:GLYPH_FILL = [string][char]0x2588    # full block
    $script:GLYPH_TRACK = [string][char]0x2591   # light shade
    $script:GLYPH_ARROW = [string][char]0x2192   # right arrow
} else {
    $script:GLYPH_TOP = "+"
    $script:GLYPH_BAR = "|"
    $script:GLYPH_END = "``"
    $script:GLYPH_PENDING = "o"
    $script:GLYPH_DONE = "+"
    $script:GLYPH_FILL = "#"
    $script:GLYPH_TRACK = "."
    $script:GLYPH_ARROW = "->"
}

function Move-CursorUp {
    if (-not $script:IS_TTY) {
        return
    }

    try {
        $position = $Host.UI.RawUI.CursorPosition

        if ($position.Y -gt 0) {
            $position.Y = $position.Y - 1
            $Host.UI.RawUI.CursorPosition = $position
        }
    }
    catch { }
}

# Blanks the line the cursor sits on and leaves the cursor at its start, so
# whatever is written next takes the line's place.
function Clear-CurrentLine {
    if (-not $script:IS_TTY) {
        return
    }

    try {
        $position = $Host.UI.RawUI.CursorPosition
        $position.X = 0
        $Host.UI.RawUI.CursorPosition = $position

        $width = [Math]::Max($Host.UI.RawUI.BufferSize.Width - 1, 0)
        Write-Host (" " * $width) -NoNewline

        $Host.UI.RawUI.CursorPosition = $position
    }
    catch { }
}

# ============================================================================
# Rail Output
# ============================================================================

$script:RAIL_STARTED = $false
$script:RAIL_STEP_OPEN = $false
$script:RAIL_PROGRESS_OPEN = $false
$script:RAIL_STEP_LABEL = ""
$script:FAILURE_SUMMARY = "Installation failed"

function Start-Rail {
    param([string]$Title)

    Write-Host $script:GLYPH_TOP -ForegroundColor $script:COLOR_DIM -NoNewline
    Write-Host "  $Title" -ForegroundColor $script:COLOR_BOLD

    $script:RAIL_STARTED = $true
}

function Write-RailGap {
    Write-Host $script:GLYPH_BAR -ForegroundColor $script:COLOR_DIM
}

# Opens a step. On a console the node is drawn hollow right away so the user
# can see which step is running; the line is then rewritten in place once the
# outcome is known. Without a console nothing is printed until it settles.
function Write-RailStep {
    param([string]$Label)

    $script:RAIL_STEP_LABEL = $Label
    $script:RAIL_STEP_OPEN = $true

    if ($script:IS_TTY) {
        Write-Host $script:GLYPH_PENDING -ForegroundColor $script:COLOR_DIM -NoNewline
        Write-Host "  $Label" -NoNewline
    }
}

# Opens a line underneath the current step for a progress bar to live on. The
# node line above it is finished, so it can only be revisited by moving the
# cursor back up when the step settles.
function Open-RailProgress {
    $script:RAIL_PROGRESS_OPEN = $true

    if ($script:IS_TTY) {
        Write-Host ""
    }
}

# Closes the open step, filling in its node with the color of the outcome. When
# a progress line was opened underneath, the cursor steps back up to the node
# and the progress line is blanked so the step's detail can take its place.
function Close-RailStep {
    param([switch]$Failed)

    $color = if ($Failed) { $script:COLOR_RED } else { $script:COLOR_GREEN }

    if ($script:IS_TTY) {
        if ($script:RAIL_PROGRESS_OPEN) {
            Move-CursorUp
        }

        Clear-CurrentLine
    }

    Write-Host $script:GLYPH_DONE -ForegroundColor $color -NoNewline
    Write-Host "  $script:RAIL_STEP_LABEL"

    if ($script:IS_TTY -and $script:RAIL_PROGRESS_OPEN) {
        Clear-CurrentLine
    }

    $script:RAIL_STEP_OPEN = $false
    $script:RAIL_PROGRESS_OPEN = $false
}

function Write-RailDetailLine {
    param(
        [string]$Text,
        [string]$Color
    )

    Write-Host $script:GLYPH_BAR -ForegroundColor $script:COLOR_DIM -NoNewline
    Write-Host "  $Text" -ForegroundColor $Color
}

# The result of a step, printed underneath its node.
function Write-RailDetail {
    param([string]$Text)

    Write-RailDetailLine -Text $Text -Color $script:COLOR_DIM
}

# Same shape as Write-RailDetail, but highlighted because it explains a failure
# rather than a result.
function Write-RailErrorDetail {
    param([string]$Text)

    Write-RailDetailLine -Text $Text -Color $script:COLOR_RED
}

function Close-Rail {
    param(
        [string]$Message,
        [switch]$Failed
    )

    $color = if ($Failed) { $script:COLOR_RED } else { $script:COLOR_GREEN }

    Write-Host $script:GLYPH_END -ForegroundColor $color -NoNewline
    Write-Host "  $Message"
}

# A plain filled node: a row that states something rather than reporting the
# outcome of a step, so there is nothing here to succeed or fail.
function Write-RailNode {
    param([string]$Text)

    Write-Host $script:GLYPH_DONE -ForegroundColor $script:COLOR_GREEN -NoNewline
    Write-Host "  $Text"
}

# The rail's last row: the follow-up commands, listed underneath it. Nothing
# follows them, so they are indented to the same column instead of hanging off
# a bar.
function Write-RailNextSteps {
    param([string[]]$Steps)

    Write-RailNode "Next"

    foreach ($step in $Steps) {
        Write-Host "   $step" -ForegroundColor $script:COLOR_DIM
    }
}

# Aborts the installer. The message states the failure and any details are
# printed underneath it as context. Once the rail is open the failure is
# reported as part of it, so the output always ends with a closed rail.
function Exit-WithError {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [string[]]$Detail = @()
    )

    if ($script:RAIL_STARTED) {
        if ($script:RAIL_STEP_OPEN) {
            Close-RailStep -Failed
        }

        Write-RailErrorDetail $Message
    } else {
        Write-Host "Error: $Message" -ForegroundColor $script:COLOR_RED
    }

    foreach ($line in $Detail) {
        if ($line) {
            if ($script:RAIL_STARTED) {
                Write-RailDetail $line
            } else {
                Write-Host $line
            }
        }
    }

    if ($script:RAIL_STARTED) {
        Close-Rail -Message $script:FAILURE_SUMMARY -Failed
    }

    exit 1
}

# Shortens paths under the home directory so the rail stays narrow.
function Get-DisplayPath {
    param([string]$Path)

    if ($Path -and $env:USERPROFILE -and
        $Path.StartsWith($env:USERPROFILE, [System.StringComparison]::OrdinalIgnoreCase)) {
        return "~" + $Path.Substring($env:USERPROFILE.Length)
    }

    return $Path
}

function Show-Help {
    Write-Host @'
Primal SDK Installer

Usage: install.ps1 [OPTIONS]

Options:
    -Help                   Show this help message
    -Version <version>      Install a specific version (e.g., 0.4.3)
    -InstallDir <path>      Override default install location (%LOCALAPPDATA%\Primal\bin)
    -Uninstall              Remove Primal binary and PATH entry

Examples:
    .\install.ps1                      Install latest version
    .\install.ps1 -Version 0.4.3       Install specific version
    .\install.ps1 -Uninstall           Uninstall Primal

'@

    exit 0
}

# ============================================================================
# Platform Detection
# ============================================================================

# Each release ships exactly one binary per operating system, and for Windows
# that binary is x86-64 only.
function Get-Architecture {
    $architecture = [System.Environment]::GetEnvironmentVariable("PROCESSOR_ARCHITECTURE")

    switch ($architecture) {
        "AMD64" { return "x86-64" }
        "x86" { Exit-WithError "32-bit Windows is not supported. Only x86-64 is currently supported." }
        default { Exit-WithError "Unsupported architecture: $architecture. Only x86-64 is currently supported." }
    }
}

# ============================================================================
# Download Utilities
# ============================================================================

function Get-ProgressBar {
    param([int]$Percent)

    $width = 20
    $filled = [int][Math]::Floor(($Percent * $width) / 100)
    $filled = [Math]::Min([Math]::Max($filled, 0), $width)

    return ($script:GLYPH_FILL * $filled) + ($script:GLYPH_TRACK * ($width - $filled))
}

# Redraws the progress line underneath the open step, in place. The bar is
# indented to sit directly below the step's label.
function Write-DownloadProgress {
    param([int]$Percent)

    if (-not $script:IS_TTY) {
        return
    }

    Clear-CurrentLine
    Write-Host ("   {0} {1,3}%" -f (Get-ProgressBar $Percent), $Percent) -NoNewline
}

# Shown when the server does not announce a size, which leaves nothing to
# compute a percentage from. The step just shows that a download is in flight.
function Write-DownloadPending {
    if (-not $script:IS_TTY) {
        return
    }

    Clear-CurrentLine
    Write-Host "   downloading..." -ForegroundColor $script:COLOR_DIM -NoNewline
}

# The completed download, kept as a detail under its node.
function Get-DownloadSummary {
    param([string]$Size)

    return "{0} 100%   {1}" -f (Get-ProgressBar 100), $Size
}

function Format-FileSize {
    param([long]$Bytes)

    $invariant = [System.Globalization.CultureInfo]::InvariantCulture

    if ($Bytes -ge 1MB) {
        return ($Bytes / 1MB).ToString("F1", $invariant) + " MB"
    }

    if ($Bytes -ge 1KB) {
        return ($Bytes / 1KB).ToString("F1", $invariant) + " KB"
    }

    return "$Bytes B"
}

# Reads the response in chunks rather than handing the whole download to
# Invoke-WebRequest, so the percentage can be redrawn inside the rail instead
# of letting PowerShell paint its own full-width bar across it. Returns the
# downloader's own last words on failure, and nothing at all on success.
function Invoke-Download {
    param(
        [string]$Url,
        [string]$OutFile
    )

    Open-RailProgress

    $response = $null
    $stream = $null
    $file = $null

    try {
        $request = [System.Net.WebRequest]::Create($Url)
        $request.UserAgent = $script:USER_AGENT
        $response = $request.GetResponse()

        $total = $response.ContentLength
        $stream = $response.GetResponseStream()
        $file = [System.IO.File]::Create($OutFile)

        $buffer = New-Object byte[] 65536
        $downloaded = 0L
        $lastPercent = -1

        if ($total -le 0) {
            Write-DownloadPending
        }

        while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $file.Write($buffer, 0, $read)
            $downloaded += $read

            if ($total -gt 0) {
                $percent = [int][Math]::Floor(($downloaded * 100) / $total)

                if ($percent -ne $lastPercent) {
                    Write-DownloadProgress $percent
                    $lastPercent = $percent
                }
            }
        }

        return $null
    }
    catch {
        # A failed .NET call arrives wrapped in a MethodInvocationException whose
        # message just repeats the call site. The innermost one is the part that
        # actually says what went wrong.
        $exception = $_.Exception

        while ($exception.InnerException) {
            $exception = $exception.InnerException
        }

        return $exception.Message
    }
    finally {
        if ($file) { $file.Dispose() }
        if ($stream) { $stream.Dispose() }
        if ($response) { $response.Dispose() }
    }
}

# Reports the HTTP status code carried by a failed web request, or 0 when the
# request could not be made at all.
function Get-ErrorStatusCode {
    param($ErrorRecord)

    $response = $ErrorRecord.Exception.Response

    if ($response -and $response.StatusCode) {
        return [int]$response.StatusCode
    }

    return 0
}

# ============================================================================
# Version Management
# ============================================================================

# Explains why a GitHub API request failed, based on the status it responds with.
function Exit-GitHubApiError {
    param([int]$Status)

    switch ($Status) {
        { $_ -eq 403 -or $_ -eq 429 } {
            Close-RailStep -Failed
            Write-RailErrorDetail "GitHub API rate limit exceeded (HTTP $Status)"
            Write-RailDetail "Unauthenticated requests are limited to 60 per hour per IP address."
            Write-RailGap
            Write-RailDetail "Wait for the limit to reset, or install a specific version:"
            Write-RailDetail "  install.ps1 -Version <version>"
            Write-RailDetail "  https://github.com/$script:GITHUB_REPO/releases"
            Close-Rail -Message $script:FAILURE_SUMMARY -Failed
            exit 1
        }
        404 {
            Exit-WithError "No releases found for $script:GITHUB_REPO (HTTP 404)"
        }
        0 {
            Exit-WithError "Could not reach GitHub. Please check your internet connection."
        }
        default {
            Exit-WithError "Failed to fetch latest release information from GitHub (HTTP $Status)"
        }
    }
}

function Get-LatestVersion {
    $apiUrl = "https://api.github.com/repos/$script:GITHUB_REPO/releases/latest"

    try {
        $response = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing -UserAgent $script:USER_AGENT
    }
    catch {
        Exit-GitHubApiError -Status (Get-ErrorStatusCode $_)
    }

    return ($response.tag_name -replace '^v', '')
}

function Get-InstalledVersion {
    $binaryPath = Join-Path $script:INSTALL_DIR $script:BINARY_FILE

    if (Test-Path $binaryPath) {
        try {
            # Flattened to a single string first: matching against the raw
            # output filters it line by line instead of capturing a group when
            # the binary reports more than one line.
            $output = & $binaryPath --version 2>$null | Out-String

            if ($output -match '(\d+\.\d+\.\d+)') {
                return $matches[1]
            }
        }
        catch {
            return $null
        }
    }

    return $null
}

# ============================================================================
# PATH Management
# ============================================================================

function Test-PathListContainsInstallDir {
    param([string]$PathList)

    if (-not $PathList) {
        return $false
    }

    $normalized = $script:INSTALL_DIR.TrimEnd('\')
    $entries = $PathList -split ';' | ForEach-Object { $_.TrimEnd('\') }

    return $entries -contains $normalized
}

# The PATH this session is running with, which is what decides whether the
# binary can be invoked right away.
function Test-SessionPathContainsInstallDir {
    return Test-PathListContainsInstallDir $env:Path
}

# The persisted user PATH, which is what decides whether the entry survives a
# restart.
function Test-UserPathContainsInstallDir {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")

    return Test-PathListContainsInstallDir $userPath
}

function Add-ToPath {
    if (Test-UserPathContainsInstallDir) {
        return
    }

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")

    if ($userPath) {
        $newPath = "$script:INSTALL_DIR;$userPath"
    } else {
        $newPath = $script:INSTALL_DIR
    }

    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")

    # Also update current session
    $env:Path = "$script:INSTALL_DIR;$env:Path"

    $script:PATH_WAS_MODIFIED = $true
}

# Returns false when there was no PATH entry to clean up.
function Remove-FromPath {
    if (-not (Test-UserPathContainsInstallDir)) {
        return $false
    }

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $normalized = $script:INSTALL_DIR.TrimEnd('\')

    $entries = $userPath -split ';' | Where-Object { $_.TrimEnd('\') -ne $normalized }
    [Environment]::SetEnvironmentVariable("Path", ($entries -join ';'), "User")

    return $true
}

# ============================================================================
# Installation Functions
# ============================================================================

# The freshly downloaded binary and its size, shared between the download step
# and the install step that follows it.
$script:DOWNLOAD_FILE = ""
$script:DOWNLOAD_SIZE = ""

function Save-Binary {
    param(
        [string]$TargetVersion,
        [string]$Architecture
    )

    $downloadUrl = "https://github.com/$script:GITHUB_REPO/raw/refs/tags/v$TargetVersion/bin/$script:BINARY_NAME-windows-$Architecture"

    $script:DOWNLOAD_FILE = [System.IO.Path]::GetTempFileName()

    $reason = Invoke-Download -Url $downloadUrl -OutFile $script:DOWNLOAD_FILE

    if ($reason) {
        Remove-Item $script:DOWNLOAD_FILE -Force -ErrorAction SilentlyContinue
        Exit-WithError "Failed to download from $downloadUrl" $reason
    }

    $script:DOWNLOAD_SIZE = Format-FileSize ((Get-Item $script:DOWNLOAD_FILE).Length)
}

function Install-Binary {
    $binaryPath = Join-Path $script:INSTALL_DIR $script:BINARY_FILE

    # Create install directory if it doesn't exist
    if (-not (Test-Path $script:INSTALL_DIR)) {
        New-Item -ItemType Directory -Path $script:INSTALL_DIR -Force | Out-Null
    }

    # Move binary to install location
    Move-Item -Path $script:DOWNLOAD_FILE -Destination $binaryPath -Force

    # Unblock the file (Windows blocks downloaded executables)
    Unblock-File -Path $binaryPath -ErrorAction SilentlyContinue

    return $binaryPath
}

# What the installed binary reports about itself, used as proof it runs.
$script:VERIFIED_VERSION = ""

function Test-Installation {
    $binaryPath = Join-Path $script:INSTALL_DIR $script:BINARY_FILE

    if (-not (Test-Path $binaryPath)) {
        return $false
    }

    try {
        $output = & $binaryPath --version 2>$null | Select-Object -First 1
    }
    catch {
        return $false
    }

    if ($output) {
        $script:VERIFIED_VERSION = ([string]$output).Trim()
        return $true
    }

    return $false
}

# ============================================================================
# Uninstall Function
# ============================================================================

function Uninstall-Primal {
    $binaryPath = Join-Path $script:INSTALL_DIR $script:BINARY_FILE

    # Read before the binary goes away, so the summary can name what was removed.
    $removedVersion = Get-InstalledVersion

    $script:FAILURE_SUMMARY = "Uninstall failed"

    Start-Rail "Primal SDK"
    Write-RailGap

    Write-RailStep "Binary"
    if (Test-Path $binaryPath) {
        Remove-Item $binaryPath -Force
        Close-RailStep
        Write-RailDetail "removed $(Get-DisplayPath $binaryPath)"
    } else {
        Close-RailStep -Failed
        Write-RailErrorDetail "not found at $(Get-DisplayPath $binaryPath)"
    }
    Write-RailGap

    Write-RailStep "User PATH"
    if (Remove-FromPath) {
        Close-RailStep
        Write-RailDetail "entry removed from the user PATH"
    } else {
        Close-RailStep -Failed
        Write-RailErrorDetail "no entry for $(Get-DisplayPath $script:INSTALL_DIR) in the user PATH"
    }
    Write-RailGap

    # Unlike the shared install directory on other platforms, this one belongs
    # to Primal alone, so an empty one is left behind by us.
    if ((Test-Path $script:INSTALL_DIR) -and
        ((Get-ChildItem $script:INSTALL_DIR | Measure-Object).Count -eq 0)) {
        Remove-Item $script:INSTALL_DIR -Force
    }

    Write-RailNode "Primal SDK uninstalled"
    if ($removedVersion) {
        Write-RailDetail "v$removedVersion removed from $(Get-DisplayPath $script:INSTALL_DIR)"
    } else {
        Write-RailDetail "nothing was installed in $(Get-DisplayPath $script:INSTALL_DIR)"
    }
    Write-RailGap

    Write-RailNextSteps "restart your terminal to drop the PATH entry"

    exit 0
}

# ============================================================================
# Main Script
# ============================================================================

function Main {
    if ($Help) {
        Show-Help
    }

    if ($Uninstall) {
        Uninstall-Primal
    }

    # Checked once up front: reporting it from inside a step would leave the
    # rail open on an architecture the installer can do nothing about.
    $architecture = Get-Architecture

    Start-Rail "Primal SDK"
    Write-RailGap

    # Check for existing installation
    Write-RailStep "Existing installation"
    $installedVersion = Get-InstalledVersion
    Close-RailStep
    if ($installedVersion) {
        Write-RailDetail "v$installedVersion"
    } else {
        Write-RailDetail "none found"
    }
    Write-RailGap

    # Determine target version
    $targetVersion = $Version

    if ($targetVersion) {
        Write-RailStep "Requested release"
        Close-RailStep
    } else {
        Write-RailStep "Latest release"
        $targetVersion = Get-LatestVersion
        # Anything that is not a version number would end up pasted into the
        # download URL, so a failed parse is caught here rather than by the
        # download itself.
        if ($targetVersion -notmatch '^\d+\.\d+\.\d+') {
            Exit-WithError "Failed to determine latest version"
        }
        Close-RailStep
    }
    Write-RailDetail "v$targetVersion"
    Write-RailGap

    # Check if already up to date
    if ($installedVersion -eq $targetVersion) {
        Close-Rail -Message "Already up to date (v$targetVersion)"
        exit 0
    }

    # Download
    Write-RailStep "Downloading $script:BINARY_NAME-windows-$architecture"
    Save-Binary -TargetVersion $targetVersion -Architecture $architecture
    Close-RailStep
    Write-RailDetail (Get-DownloadSummary $script:DOWNLOAD_SIZE)
    Write-RailGap

    # Install
    Write-RailStep "Installed"
    $installedPath = Install-Binary
    Close-RailStep
    Write-RailDetail (Get-DisplayPath $installedPath)

    # Update PATH if needed (only on fresh install)
    if (-not $installedVersion) {
        Write-RailGap
        Write-RailStep "User PATH"
        if (Test-SessionPathContainsInstallDir) {
            Close-RailStep
            Write-RailDetail "already contains $(Get-DisplayPath $script:INSTALL_DIR)"
        } else {
            Add-ToPath
            Close-RailStep
            if ($script:PATH_WAS_MODIFIED) {
                Write-RailDetail "added $(Get-DisplayPath $script:INSTALL_DIR) to the user PATH"
            } else {
                Write-RailDetail "already configured in the user PATH"
            }
        }
    }

    # Verify installation
    Write-RailGap
    Write-RailStep "Verified"
    if (-not (Test-Installation)) {
        Exit-WithError "Installation verification failed. Please check the installation manually."
    }
    Close-RailStep
    Write-RailDetail $script:VERIFIED_VERSION
    Write-RailGap

    $nextSteps = @()

    if ($script:PATH_WAS_MODIFIED) {
        $nextSteps += "restart your terminal to pick up the PATH entry"
    }

    $nextSteps += "$script:BINARY_FILE --version"

    if ($installedVersion) {
        Write-RailNode "Primal v$installedVersion $script:GLYPH_ARROW v$targetVersion"
        Write-RailDetail "updated in $(Get-DisplayPath $script:INSTALL_DIR)"
    } else {
        Write-RailNode "Primal v$targetVersion ready"
        Write-RailDetail "installed to $(Get-DisplayPath $script:INSTALL_DIR)"
    }
    Write-RailGap

    Write-RailNextSteps $nextSteps
}

try {
    Main
}
catch {
    Exit-WithError "An unexpected error occurred: $_"
}
finally {
    if ($script:ORIGINAL_OUTPUT_ENCODING) {
        try { [Console]::OutputEncoding = $script:ORIGINAL_OUTPUT_ENCODING } catch { }
    }
}
