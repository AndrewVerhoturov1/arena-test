$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Join-Path $PSScriptRoot "dist"
$index = Join-Path $root "index.html"

if (-not (Test-Path $index -PathType Leaf)) {
  Write-Host "Не найдена папка dist или файл dist\index.html." -ForegroundColor Red
  Write-Host "Архив должен быть распакован полностью, вместе с папкой dist." -ForegroundColor Yellow
  Read-Host "Нажмите Enter для выхода"
  exit 1
}

function Get-ContentType([string]$path) {
  switch -Regex ($path.ToLowerInvariant()) {
    "\.html$" { return "text/html; charset=utf-8" }
    "\.js$"   { return "text/javascript; charset=utf-8" }
    "\.mjs$"  { return "text/javascript; charset=utf-8" }
    "\.css$"  { return "text/css; charset=utf-8" }
    "\.json$" { return "application/json; charset=utf-8" }
    "\.svg$"  { return "image/svg+xml" }
    "\.png$"  { return "image/png" }
    "\.jpg$"  { return "image/jpeg" }
    "\.jpeg$" { return "image/jpeg" }
    "\.gif$"  { return "image/gif" }
    "\.webp$" { return "image/webp" }
    "\.ico$"  { return "image/x-icon" }
    default    { return "application/octet-stream" }
  }
}

function Write-Response($stream, [int]$status, [string]$statusText, [byte[]]$body, [string]$contentType) {
  $headers = "HTTP/1.1 $status $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($body.Length -gt 0) {
    $stream.Write($body, 0, $body.Length)
  }
}

$port = 5173
$listener = $null
while ($port -le 5199) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    $listener.Start()
    break
  } catch {
    $port += 1
  }
}

if ($null -eq $listener) {
  Write-Host "Не удалось занять порт 5173-5199." -ForegroundColor Red
  Read-Host "Нажмите Enter для выхода"
  exit 1
}

$url = "http://127.0.0.1:$port/"
Write-Host "Редактор запущен локально:" -ForegroundColor Green
Write-Host $url -ForegroundColor Cyan
Write-Host "Чтобы остановить сервер, закройте это окно или нажмите Ctrl+C."
Start-Process $url

$rootFull = [System.IO.Path]::GetFullPath($root)

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
    $requestLine = $reader.ReadLine()

    if ([string]::IsNullOrWhiteSpace($requestLine)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Bad Request")
      Write-Response $stream 400 "Bad Request" $body "text/plain; charset=utf-8"
      continue
    }

    while ($true) {
      $line = $reader.ReadLine()
      if ($null -eq $line -or $line -eq "") { break }
    }

    $parts = $requestLine.Split(" ")
    if ($parts.Length -lt 2) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Bad Request")
      Write-Response $stream 400 "Bad Request" $body "text/plain; charset=utf-8"
      continue
    }

    $urlPath = $parts[1].Split("?")[0]
    $urlPath = [System.Uri]::UnescapeDataString($urlPath)
    if ($urlPath -eq "/") { $urlPath = "/index.html" }

    $relative = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $file = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

    if (-not $file.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
      Write-Response $stream 403 "Forbidden" $body "text/plain; charset=utf-8"
      continue
    }

    if (-not (Test-Path $file -PathType Leaf)) {
      $file = $index
    }

    $bytes = [System.IO.File]::ReadAllBytes($file)
    Write-Response $stream 200 "OK" $bytes (Get-ContentType $file)
  } catch {
    try {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Server error: $($_.Exception.Message)")
      Write-Response $stream 500 "Internal Server Error" $body "text/plain; charset=utf-8"
    } catch {}
  } finally {
    $client.Close()
  }
}
