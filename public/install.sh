#!/bin/bash
set -e

# Configuration
INSTALL_DIR="${HOME}/.local/bin"
GITHUB_REPO="primal-lang/sdk"
BINARY_NAME="primal"
PATH_WAS_MODIFIED=false

# ============================================================================
# Output Capabilities
# ============================================================================

# Colors and in-place redrawing only make sense on an interactive terminal.
# Everything the installer prints goes to stderr, so the rail stays in one
# piece even when the caller redirects stdout.
if [[ -t 2 ]]; then
    IS_TTY=true
else
    IS_TTY=false
fi

RED=''
GREEN=''
DIM=''
BOLD=''
NC=''

if [[ "$IS_TTY" == true ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    DIM='\033[2m'
    BOLD='\033[1m'
    NC='\033[0m' # No Color
fi

# The rail is drawn with box characters, which only render correctly under a
# UTF-8 locale. Anything else falls back to ASCII.
if [[ "${LC_ALL}${LC_CTYPE}${LANG}" == *[Uu][Tt][Ff]* ]] || \
   [[ "$(locale charmap 2>/dev/null)" == *[Uu][Tt][Ff]* ]]; then
    GLYPH_TOP='┌'
    GLYPH_BAR='│'
    GLYPH_PENDING='◇'
    GLYPH_DONE='◆'
    GLYPH_FILL='█'
    GLYPH_TRACK='░'
    GLYPH_ARROW='→'
else
    GLYPH_TOP='+'
    GLYPH_BAR='|'
    GLYPH_PENDING='o'
    GLYPH_DONE='+'
    GLYPH_FILL='#'
    GLYPH_TRACK='.'
    GLYPH_ARROW='->'
fi

# ============================================================================
# Rail Output
# ============================================================================

RAIL_STARTED=false
RAIL_STEP_OPEN=false
RAIL_PROGRESS_OPEN=false
RAIL_STEP_LABEL=""
FAILURE_SUMMARY="Installation failed"

# Where a failure the installer cannot suggest a way out of sends the user.
FAILURE_HINT="https://github.com/primal-lang/sdk/issues/new"

rail_start() {
    printf '%b%s%b  %b%s%b\n' "$DIM" "$GLYPH_TOP" "$NC" "$BOLD" "$1" "$NC" >&2
    RAIL_STARTED=true
}

rail_gap() {
    printf '%b%s%b\n' "$DIM" "$GLYPH_BAR" "$NC" >&2
}

# Opens a step. On a terminal the node is drawn hollow right away so the user
# can see which step is running; the line is then rewritten in place once the
# outcome is known. Without a terminal nothing is printed until it settles.
rail_step() {
    RAIL_STEP_LABEL="$1"
    RAIL_STEP_OPEN=true

    if [[ "$IS_TTY" == true ]]; then
        printf '%b%s%b  %s' "$DIM" "$GLYPH_PENDING" "$NC" "$RAIL_STEP_LABEL" >&2
    fi
}

# Opens a line underneath the current step for a progress bar to live on. The
# node line above it is finished, so it can only be revisited by moving the
# cursor back up when the step settles.
rail_progress_open() {
    RAIL_PROGRESS_OPEN=true

    if [[ "$IS_TTY" == true ]]; then
        printf '\n' >&2
    fi
}

# Closes the open step, filling in its node with the color of the outcome. When
# a progress line was opened underneath, the cursor steps back up to the node
# and the progress line is blanked so the step's detail can take its place.
rail_step_settle() {
    local color="$1"

    if [[ "$IS_TTY" == true ]]; then
        if [[ "$RAIL_PROGRESS_OPEN" == true ]]; then
            printf '\033[1A' >&2
        fi
        printf '\r\033[K' >&2
    fi

    printf '%b%s%b  %s\n' "$color" "$GLYPH_DONE" "$NC" "$RAIL_STEP_LABEL" >&2

    if [[ "$IS_TTY" == true && "$RAIL_PROGRESS_OPEN" == true ]]; then
        printf '\r\033[K' >&2
    fi

    RAIL_STEP_OPEN=false
    RAIL_PROGRESS_OPEN=false
}

rail_step_done() {
    rail_step_settle "$GREEN"
}

rail_step_failed() {
    rail_step_settle "$RED"
}

rail_detail_in() {
    printf '%b%s%b  %b%s%b\n' "$DIM" "$GLYPH_BAR" "$NC" "$1" "$2" "$NC" >&2
}

# The result of a step, printed underneath its node.
rail_detail() {
    rail_detail_in "$DIM" "$1"
}

# Same shape as rail_detail, but highlighted because it explains a failure
# rather than a result.
rail_error_detail() {
    rail_detail_in "$RED" "$1"
}

# The detail of the rail's last row. Nothing follows it, so it is indented to
# the same column instead of hanging off a bar.
rail_last_detail() {
    printf '   %b%s%b\n' "$DIM" "$1" "$NC" >&2
}

rail_node_in() {
    printf '%b%s%b  %s\n' "$1" "$GLYPH_DONE" "$NC" "$2" >&2
}

# A plain filled node: a row that states something rather than reporting the
# outcome of a step, so there is nothing here to succeed or fail.
rail_node() {
    rail_node_in "$GREEN" "$1"
}

# The row the rail ends on when the installer gives up.
rail_node_failed() {
    rail_node_in "$RED" "$1"
}

# The rail's last row: the command to run next, printed underneath it.
rail_next_steps() {
    rail_node "Next"
    rail_last_detail "$1"
}

# Aborts the installer, stating why. Once the rail is open the failure is
# reported as part of it: the step that was running settles as failed, the
# message becomes its detail, and the rail ends on a row stating the outcome
# with the way out underneath it. Callers that know of a way out better than
# reporting the failure pass it as the second argument.
error_exit() {
    local message="$1"
    local hint="${2:-$FAILURE_HINT}"

    if [[ "$RAIL_STARTED" == true ]]; then
        if [[ "$RAIL_STEP_OPEN" == true ]]; then
            rail_step_failed
        fi
        rail_error_detail "$message"
        rail_gap
        rail_node_failed "$FAILURE_SUMMARY"
        rail_last_detail "$hint"
    else
        printf '%bError: %s%b\n' "$RED" "$message" "$NC" >&2
    fi

    exit 1
}

# Shortens paths under the home directory so the rail stays narrow.
display_path() {
    printf '%s' "${1/#$HOME/\~}"
}

show_help() {
    cat << EOF
Primal SDK Installer

Usage: install.sh [OPTIONS]

Options:
    --help                  Show this help message
    --version <version>     Install a specific version (e.g., 0.4.3)
    --install-dir <path>    Override default install location (~/.local/bin)
    --uninstall             Remove Primal binary and PATH entry

Examples:
    install.sh                      Install latest version
    install.sh --version 0.4.3      Install specific version
    install.sh --uninstall          Uninstall Primal

EOF
    exit 0
}

# ============================================================================
# Platform Detection
# ============================================================================

detect_os() {
    case "$(uname -s)" in
        Linux*)  echo "linux" ;;
        Darwin*) echo "macos" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *) error_exit "Unsupported operating system: $(uname -s)" ;;
    esac
}

# A shell running under Rosetta on an Apple Silicon Mac is reported as x86_64
# by 'uname -m', so that answer alone cannot tell the two Macs apart. The CPU
# is asked about directly to settle it: the flag is absent on Intel Macs, where
# sysctl fails and nothing is printed.
is_apple_silicon() {
    if [[ "$(uname -m)" == "arm64" ]]; then
        return 0
    fi

    [[ "$(sysctl -n hw.optional.arm64 2>/dev/null)" == "1" ]]
}

# Each release ships exactly one binary per operating system, so there is no
# choice of artifact to make here. The only question is whether this machine can
# run the one binary its operating system gets: the Linux binary is x86-64 and
# the macOS one is arm64. A machine that cannot has nothing to install and is
# turned away here, before anything is downloaded, rather than being handed a
# binary it cannot execute and finding out at the verification step.
detect_arch() {
    local os="$1"
    local machine

    case "$os" in
        linux)
            machine="$(uname -m)"

            case "$machine" in
                x86_64|amd64) echo "x86-64" ;;
                *) error_exit "Unsupported architecture: ${machine} (the Linux binary is x86-64 only)" ;;
            esac
            ;;
        macos)
            if ! is_apple_silicon; then
                error_exit "Intel Macs are not supported (the macOS binary is arm64 only)"
            fi
            echo "arm64"
            ;;
        windows) echo "x86-64" ;;
        *) error_exit "Unsupported operating system: $os" ;;
    esac
}

# Where the installed binary lives. Windows needs the '.exe' suffix for the file
# to be executable, so what is installed is not always named after the binary
# alone. Settled once, after the install directory is final, so that everything
# looking for an installed binary agrees on where it is.
BINARY_PATH=""

resolve_binary_path() {
    local os="$1"
    local suffix=""

    if [[ "$os" == "windows" ]]; then
        suffix=".exe"
    fi

    BINARY_PATH="${INSTALL_DIR}/${BINARY_NAME}${suffix}"
}

# ============================================================================
# Download Utilities
# ============================================================================

# Whatever the downloader wrote to stderr, kept so a failure can be explained.
DOWNLOAD_ERROR_LOG=""

has_command() {
    command -v "$1" >/dev/null 2>&1
}

progress_bar() {
    local percent="$1"
    local width=20
    local filled=$(( percent * width / 100 ))
    local bar=""
    local i

    for (( i = 0; i < width; i++ )); do
        if (( i < filled )); then
            bar+="$GLYPH_FILL"
        else
            bar+="$GLYPH_TRACK"
        fi
    done

    printf '%s' "$bar"
}

# Redraws the progress line underneath the open step, in place. The bar is
# indented to sit directly below the step's label.
render_download_progress() {
    local percent="$1"

    if [[ "$IS_TTY" != true ]]; then
        return 0
    fi

    printf '\r\033[K   %s %3d%%' "$(progress_bar "$percent")" "$percent" >&2
}

# The completed download, kept as a detail under its node.
download_summary() {
    printf '%s 100%%   %s' "$(progress_bar 100)" "$1"
}

# curl reports progress on stderr as carriage-return separated updates. Reading
# those updates lets the percentage be redrawn inside the rail, instead of
# letting curl paint its own full-width bar across it.
download_with_curl() {
    local url="$1"
    local output="$2"
    local line

    # -f: fail on errors
    # -L: follow redirects
    # --progress-bar: report progress instead of the full statistics table
    curl -fL --progress-bar "$url" -o "$output" 2>&1 |
        while IFS= read -r -d $'\r' line || [[ -n "$line" ]]; do
            if [[ "$line" =~ ([0-9]+)\.[0-9]+% ]]; then
                render_download_progress "${BASH_REMATCH[1]}"
            elif [[ -n "${line//[[:space:]]/}" ]]; then
                printf '%s\n' "$line" >> "$DOWNLOAD_ERROR_LOG"
            fi
        done

    return "${PIPESTATUS[0]}"
}

# wget's progress output is not stable enough to parse, so the step just shows
# that a download is in flight.
download_with_wget() {
    local url="$1"
    local output="$2"

    if [[ "$IS_TTY" == true ]]; then
        printf '\r\033[K   %bdownloading...%b' "$DIM" "$NC" >&2
    fi

    wget -q "$url" -O "$output" 2>> "$DOWNLOAD_ERROR_LOG"
}

download_file() {
    local url="$1"
    local output="$2"

    if has_command curl; then
        rail_progress_open
        download_with_curl "$url" "$output"
    elif has_command wget; then
        rail_progress_open
        download_with_wget "$url" "$output"
    else
        error_exit "Neither curl nor wget found. Please install one of them."
    fi
}

# Downloaders are kept silent about their own failures: a message of theirs
# would be printed straight into the middle of the rail, over the step that is
# still open. Callers report the failure themselves once the step is settled.
fetch_url() {
    local url="$1"

    if has_command curl; then
        curl -fsL "$url"
    elif has_command wget; then
        wget -qO- "$url"
    else
        error_exit "Neither curl nor wget found. Please install one of them."
    fi
}

# Reports the HTTP status code returned by a URL, or an empty string / "000" if
# the request could not be made at all. Unlike fetch_url, an error response is
# not treated as a failure, so callers can react to a specific status.
get_http_status() {
    local url="$1"

    if has_command curl; then
        curl -sSL -o /dev/null -w '%{http_code}' "$url" 2>/dev/null
    elif has_command wget; then
        wget --spider --server-response "$url" 2>&1 | grep -oE 'HTTP/[0-9.]+ [0-9]{3}' | tail -1 | grep -oE '[0-9]{3}$'
    fi
}

# Human readable size of a downloaded file. 'wc -c' is used because 'stat'
# takes different flags on Linux and macOS.
format_file_size() {
    local bytes

    bytes=$(wc -c < "$1" 2>/dev/null | tr -d '[:space:]') || bytes=0

    awk -v bytes="${bytes:-0}" 'BEGIN {
        if (bytes >= 1048576) printf "%.1f MB", bytes / 1048576
        else if (bytes >= 1024) printf "%.1f KB", bytes / 1024
        else printf "%d B", bytes
    }'
}

# ============================================================================
# Version Management
# ============================================================================

# Explains why a GitHub API request failed, based on the status it responds with.
github_api_error_exit() {
    local url="$1"
    local status

    status=$(get_http_status "$url") || true

    case "$status" in
        403|429)
            error_exit "GitHub API rate limit exceeded (HTTP ${status})" "retry later"
            ;;
        404)
            error_exit "No releases found for ${GITHUB_REPO} (HTTP 404)"
            ;;
        000|"")
            error_exit "Could not reach GitHub" "check your internet connection"
            ;;
        *)
            error_exit "Failed to fetch latest release information from GitHub (HTTP ${status})" "retry later"
            ;;
    esac
}

get_latest_version() {
    local api_url="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
    local response
    local version

    if ! response=$(fetch_url "$api_url"); then
        github_api_error_exit "$api_url"
    fi

    # Extract tag_name from JSON response using jq if available, otherwise fall back to grep/sed
    if has_command jq; then
        version=$(echo "$response" | jq -r '.tag_name' | sed 's/^v//')
    else
        # Fallback: extract tag_name using grep/sed (handles both with and without
        # 'v' prefix). '-E' because BSD sed, which macOS ships, has no '\?'.
        version=$(echo "$response" | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed -E 's/.*"v?([^"]*)"$/\1/')
    fi

    echo "$version"
}

get_installed_version() {
    if [[ -x "$BINARY_PATH" ]]; then
        "$BINARY_PATH" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo ""
    else
        echo ""
    fi
}

# ============================================================================
# PATH Management
# ============================================================================

path_contains_install_dir() {
    echo "$PATH" | tr ':' '\n' | grep -q "^${INSTALL_DIR}$"
}

# The user's shell, the file its PATH entry belongs in, and the syntax that file
# needs. Settled once, after the install directory is final, so that everything
# reading or writing the entry agrees on which file it lives in. Picking a file
# the shell never reads would leave the installer reporting a PATH change that
# never takes effect, so the shell's actual startup order decides, not the name
# of its rc file.
SHELL_NAME=""
SHELL_CONFIG_FILE=""
SHELL_CONFIG_KIND=""

resolve_shell_config_file() {
    local os="$1"
    local candidate

    SHELL_NAME="$(basename "$SHELL")"
    SHELL_CONFIG_KIND="posix"

    case "$SHELL_NAME" in
        bash)
            # A macOS terminal starts a login shell, which reads the first of
            # .bash_profile, .bash_login and .profile that exists and never
            # touches .bashrc. Everywhere else a terminal starts an interactive
            # non-login shell, which reads .bashrc alone, so that is the file to
            # write even when it has to be created.
            if [[ "$os" == "macos" ]]; then
                SHELL_CONFIG_FILE="${HOME}/.bash_profile"

                for candidate in .bash_profile .bash_login .profile; do
                    if [[ -f "${HOME}/${candidate}" ]]; then
                        SHELL_CONFIG_FILE="${HOME}/${candidate}"
                        break
                    fi
                done
            else
                SHELL_CONFIG_FILE="${HOME}/.bashrc"
            fi
            ;;
        zsh)
            # zsh takes its startup files from ZDOTDIR when that is set, so
            # ~/.zshrc is not always the file it will look at.
            SHELL_CONFIG_FILE="${ZDOTDIR:-$HOME}/.zshrc"
            ;;
        fish)
            SHELL_CONFIG_FILE="${HOME}/.config/fish/config.fish"
            SHELL_CONFIG_KIND="fish"
            ;;
        csh|tcsh)
            # The csh family reads neither .profile nor POSIX 'export' syntax,
            # so there is nothing here this installer can usefully write. The
            # line is reported for the user to add instead of being written
            # somewhere it would silently do nothing.
            SHELL_CONFIG_FILE="${HOME}/.${SHELL_NAME}rc"
            SHELL_CONFIG_KIND="unsupported"
            ;;
        *)
            # sh, dash, ksh and the like: .profile is read and 'export' parses.
            SHELL_CONFIG_FILE="${HOME}/.profile"
            ;;
    esac
}

# The line a shell this installer cannot configure needs instead.
csh_export_line() {
    printf 'setenv PATH "%s:$PATH"' "$INSTALL_DIR"
}

add_to_path() {
    local path_export_line
    local fish_export_line

    # Define the exact lines we add
    path_export_line="export PATH=\"${INSTALL_DIR}:\$PATH\""
    fish_export_line="set -gx PATH \"${INSTALL_DIR}\" \$PATH"

    # Check if our exact PATH entry already exists in config file
    if [[ -f "$SHELL_CONFIG_FILE" ]]; then
        if grep -qF "$path_export_line" "$SHELL_CONFIG_FILE" 2>/dev/null || \
           grep -qF "$fish_export_line" "$SHELL_CONFIG_FILE" 2>/dev/null; then
            return 0
        fi
    fi

    # Create config file directory if needed (for fish)
    mkdir -p "$(dirname "$SHELL_CONFIG_FILE")"

    # Add PATH entry based on shell type
    echo "" >> "$SHELL_CONFIG_FILE"
    echo "# Added by Primal SDK installer" >> "$SHELL_CONFIG_FILE"

    if [[ "$SHELL_CONFIG_KIND" == "fish" ]]; then
        echo "$fish_export_line" >> "$SHELL_CONFIG_FILE"
    else
        echo "$path_export_line" >> "$SHELL_CONFIG_FILE"
    fi

    PATH_WAS_MODIFIED=true
}

# Returns non-zero when there was no shell config file to clean up.
remove_from_path() {
    if [[ ! -f "$SHELL_CONFIG_FILE" ]]; then
        return 1
    fi

    # Create a temporary file
    local temp_file
    temp_file=$(mktemp)

    # Remove the Primal PATH entries (using fixed string matching for exactness)
    grep -vF "# Added by Primal SDK installer" "$SHELL_CONFIG_FILE" | \
    grep -vF "export PATH=\"${INSTALL_DIR}:\$PATH\"" | \
    grep -vF "set -gx PATH \"${INSTALL_DIR}\" \$PATH" > "$temp_file" || true

    mv "$temp_file" "$SHELL_CONFIG_FILE"
}

# ============================================================================
# Installation Functions
# ============================================================================

# The freshly downloaded binary and its size, shared between the download step
# and the install step that follows it.
DOWNLOAD_FILE=""
DOWNLOAD_SIZE=""

download_binary() {
    local version="$1"
    local os="$2"
    local arch="$3"
    local download_url="https://github.com/${GITHUB_REPO}/raw/refs/tags/v${version}/bin/${BINARY_NAME}-${os}-${arch}"
    local reason=""

    DOWNLOAD_FILE=$(mktemp)
    DOWNLOAD_ERROR_LOG=$(mktemp)

    if ! download_file "$download_url" "$DOWNLOAD_FILE"; then
        # The downloader's own last words, if it had any, explain the failure
        # far better than a generic message does. wget is run quietly and can
        # leave nothing behind, hence the fallback.
        reason=$(grep -v '^[[:space:]]*$' "$DOWNLOAD_ERROR_LOG" 2>/dev/null | tail -1)
        rm -f "$DOWNLOAD_FILE" "$DOWNLOAD_ERROR_LOG"
        error_exit "${reason:-Failed to download v${version}}" "retry, or pick a release with --version"
    fi

    rm -f "$DOWNLOAD_ERROR_LOG"
    DOWNLOAD_SIZE=$(format_file_size "$DOWNLOAD_FILE")
}

install_binary() {
    # Create install directory if it doesn't exist
    mkdir -p "${INSTALL_DIR}"

    # Move binary to install location
    mv "$DOWNLOAD_FILE" "$BINARY_PATH"

    # Set executable permission
    chmod +x "$BINARY_PATH"
}

# What the installed binary reports about itself, used as proof it runs.
VERIFIED_VERSION=""

verify_installation() {
    if [[ -x "$BINARY_PATH" ]]; then
        VERIFIED_VERSION=$("$BINARY_PATH" --version 2>/dev/null | head -1) || true
        if [[ -n "$VERIFIED_VERSION" ]]; then
            return 0
        fi
    fi
    return 1
}

# ============================================================================
# Uninstall Function
# ============================================================================

uninstall() {
    local removed_version

    # Read before the binary goes away, so the summary can name what was removed.
    removed_version=$(get_installed_version)

    FAILURE_SUMMARY="Uninstall failed"

    rail_start "Primal SDK"
    rail_gap

    rail_step "Binary"
    if [[ -f "$BINARY_PATH" ]]; then
        rm -f "$BINARY_PATH"
        rail_step_done
        rail_detail "removed $(display_path "$BINARY_PATH")"
    else
        rail_step_failed
        rail_error_detail "not found at $(display_path "$BINARY_PATH")"
    fi
    rail_gap

    rail_step "Shell PATH"
    if remove_from_path; then
        rail_step_done
        rail_detail "entry removed from $(display_path "$SHELL_CONFIG_FILE")"
    else
        rail_step_failed
        rail_error_detail "no shell config file at $(display_path "$SHELL_CONFIG_FILE")"
    fi
    rail_gap

    rail_node "Primal SDK uninstalled"
    if [[ -n "$removed_version" ]]; then
        rail_detail "v${removed_version} removed from $(display_path "$INSTALL_DIR")"
    else
        rail_detail "nothing was installed in $(display_path "$INSTALL_DIR")"
    fi
    rail_gap

    rail_next_steps "restart your shell to drop the PATH entry"

    exit 0
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    local target_version=""
    local do_uninstall=false
    local os
    local arch
    local installed_version
    local next_step

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help)
                show_help
                ;;
            --version)
                if [[ -z "$2" || "$2" == --* ]]; then
                    error_exit "--version requires a version number (e.g., --version 0.4.3)"
                fi
                target_version="$2"
                shift 2
                ;;
            --install-dir)
                if [[ -z "$2" || "$2" == --* ]]; then
                    error_exit "--install-dir requires a path"
                fi
                INSTALL_DIR="$2"
                shift 2
                ;;
            --uninstall)
                do_uninstall=true
                shift
                ;;
            *)
                error_exit "Unknown option: $1. Use --help for usage information."
                ;;
        esac
    done

    # Settled before anything looks for an installed binary or its PATH entry,
    # and only once the options are parsed because --install-dir moves where both
    # of them live.
    os=$(detect_os)
    resolve_binary_path "$os"
    resolve_shell_config_file "$os"

    # Handle uninstall
    if [[ "$do_uninstall" == true ]]; then
        uninstall
    fi

    # Checked once up front: reporting it from inside a step would nest the
    # failure in a command substitution and close the rail twice.
    if ! has_command curl && ! has_command wget; then
        error_exit "Neither curl nor wget found. Please install one of them."
    fi

    arch=$(detect_arch "$os")

    rail_start "Primal SDK"
    rail_gap

    # Check for existing installation
    rail_step "Existing installation"
    installed_version=$(get_installed_version)
    rail_step_done
    if [[ -n "$installed_version" ]]; then
        rail_detail "v${installed_version}"
    else
        rail_detail "none found"
    fi
    rail_gap

    # Determine target version
    if [[ -n "$target_version" ]]; then
        rail_step "Requested release"
        rail_step_done
    else
        rail_step "Latest release"
        target_version=$(get_latest_version)
        # Anything that is not a version number would end up pasted into the
        # download URL, so a failed parse is caught here rather than by curl.
        if [[ ! "$target_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
            error_exit "Failed to determine latest version" "install a specific release with --version"
        fi
        rail_step_done
    fi
    rail_detail "v${target_version}"
    rail_gap

    # Check if already up to date
    if [[ "$installed_version" == "$target_version" ]]; then
        rail_node "Already up to date (v${target_version})"
        rail_last_detail "$(display_path "$BINARY_PATH")"
        exit 0
    fi

    # Download
    rail_step "Downloading ${BINARY_NAME}-${os}-${arch}"
    download_binary "$target_version" "$os" "$arch"
    rail_step_done
    rail_detail "$(download_summary "$DOWNLOAD_SIZE")"
    rail_gap

    # Install
    rail_step "Installed"
    install_binary
    rail_step_done
    rail_detail "$(display_path "$BINARY_PATH")"

    # Update PATH if needed. Checked on upgrades too, not just fresh installs: an
    # entry that never persisted, or that the user removed, is repaired here
    # rather than staying broken until the next fresh install. Nothing is written
    # when the directory is already reachable or the line is already in the file.
    rail_gap
    rail_step "Shell PATH"
    if path_contains_install_dir; then
        rail_step_done
        rail_detail "already contains $(display_path "$INSTALL_DIR")"
    elif [[ "$SHELL_CONFIG_KIND" == "unsupported" ]]; then
        # Only this step failed, so the rail carries on to report the install
        # that did succeed. What the installer could not do is left as
        # instructions rather than written somewhere the shell would ignore.
        rail_step_failed
        rail_error_detail "${SHELL_NAME} needs this line in $(display_path "$SHELL_CONFIG_FILE"):"
        rail_error_detail "$(csh_export_line)"
    else
        add_to_path
        rail_step_done
        if [[ "$PATH_WAS_MODIFIED" == true ]]; then
            rail_detail "added to $(display_path "$SHELL_CONFIG_FILE")"
        else
            rail_detail "already configured in $(display_path "$SHELL_CONFIG_FILE")"
        fi
    fi

    # Verify installation
    rail_gap
    rail_step "Verified"
    if ! verify_installation; then
        error_exit "Installation verification failed" "check $(display_path "$BINARY_PATH")"
    fi
    rail_step_done
    rail_detail "$VERIFIED_VERSION"
    rail_gap

    next_step="$(basename "$BINARY_PATH") --version"

    # Sourcing the shell config is only worth suggesting when the installer
    # just changed it, and is chained onto the version check so the rail's last
    # row stays a single line.
    if [[ "$PATH_WAS_MODIFIED" == true ]]; then
        next_step="source $(display_path "$SHELL_CONFIG_FILE") && ${next_step}"
    fi

    if [[ -n "$installed_version" ]]; then
        rail_node "Primal v${installed_version} ${GLYPH_ARROW} v${target_version}"
        rail_detail "updated in $(display_path "$INSTALL_DIR")"
    else
        rail_node "Primal v${target_version} ready"
        rail_detail "installed to $(display_path "$INSTALL_DIR")"
    fi
    rail_gap

    rail_next_steps "$next_step"
}

main "$@"
